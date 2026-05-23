import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeCommentableHtmlFile } from "../src/inject.js";
import { serveBridge } from "../src/server.js";

const root = await mkdtemp(join(tmpdir(), "hrp-task-"));

try {
  const input = join(root, "report.html");
  const output = join(root, "report.review.html");
  await writeFile(input, [
    "<!doctype html>",
    "<html><head><title>Scratch Review</title></head><body>",
    "<main><h1>Scratch Review</h1><p>The claim is important but vague.</p></main>",
    "</body></html>"
  ].join("\n"), "utf8");

  await makeCommentableHtmlFile({
    input,
    output,
    sourcePath: input,
    generatorPath: "",
    force: true
  });

  const reviewable = await readFile(output, "utf8");
  assert.match(reviewable, /html-review-packets-runtime/);

  const server = await serveBridge({ root, port: 0, host: "127.0.0.1" });
  const address = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/review-packet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema: "html_review_packet.v1",
        document: { title: "Scratch Review", file: input, generator: "" },
        comments: [{
          section: "Scratch Review",
          selectedText: "important but vague",
          comment: "Replace this with concrete evidence.",
          proposedReplacement: "important because two renewal workflows currently depend on manual review"
        }]
      })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    await stat(join(root, body.reviewPath));
    await stat(join(root, body.markdownPath));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log("Scratch test task passed.");
} finally {
  await rm(root, { recursive: true, force: true });
}

