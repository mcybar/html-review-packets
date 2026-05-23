import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { serveBridge } from "../src/server.js";

test("bridge writes packet json and markdown", async () => {
  const root = await mkdtemp(join(tmpdir(), "hrp-server-"));
  const server = await serveBridge({ root, port: 0, host: "127.0.0.1" });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/api/review-packet`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema: "html_review_packet.v1",
        document: { title: "Server Test" },
        comments: [{ comment: "Tighten this.", selectedText: "loose sentence" }]
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.progress.status, "waiting_for_agent");
    await stat(join(root, body.reviewPath));
    await stat(join(root, body.statusPath));
    const markdown = await readFile(join(root, body.markdownPath), "utf8");
    assert.match(markdown, /Tighten this/);
    assert.match(markdown, /Progress status endpoint/);

    const statusResponse = await fetch(`http://127.0.0.1:${address.port}${body.statusUrl}`);
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json();
    assert.equal(status.id, body.reviewId);

    const updateResponse = await fetch(`http://127.0.0.1:${address.port}${body.statusUrl}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "agent_running",
        phase: "apply",
        percent: 55,
        message: "Applying edits.",
        step: { key: "apply", status: "running" }
      })
    });
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.status, "agent_running");
    assert.equal(updated.steps.find((step) => step.key === "apply").status, "running");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
