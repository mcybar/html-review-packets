import { test, expect } from "@playwright/test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeCommentableHtmlString } from "../src/inject.js";

async function openReviewPage(page, title = "Browser Test") {
  const root = await mkdtemp(join(tmpdir(), "hrp-browser-"));
  const html = makeCommentableHtmlString(`<!doctype html><title>${title}</title><main><h1>${title}</h1><p>Original sentence needs review.</p></main>`);
  const file = join(root, `${title.toLowerCase().replace(/\s+/g, "-")}.review.html`);
  await writeFile(file, html, "utf8");
  await page.goto(`file://${file}`);
}

test("review runtime exposes packet API and stores comments", async ({ page }) => {
  await openReviewPage(page);
  await page.evaluate(() => {
    window.HTMLReviewPackets.addCommentForTest({
      section: "Browser Test",
      selectedText: "Original sentence",
      comment: "Rewrite this sentence."
    });
  });

  const packet = await page.evaluate(() => window.HTMLReviewPackets.getPacket());
  expect(packet.schema).toBe("html_review_packet.v1");
  expect(packet.comments).toHaveLength(1);
  expect(packet.comments[0].comment).toContain("Rewrite");

  await page.evaluate(() => {
    window.HTMLReviewPackets.setProgressForTest({
      id: "test-progress",
      status: "agent_running",
      phase: "apply",
      percent: 55,
      message: "Applying edits.",
      terminal: false,
      steps: [
        { key: "submitted", label: "Packet submitted", status: "done" },
        { key: "apply", label: "Apply edits", status: "running" }
      ]
    });
  });

  const progress = await page.evaluate(() => window.HTMLReviewPackets.getProgress());
  expect(progress.status).toBe("agent_running");
  expect(progress.percent).toBe(55);
  await page.locator(".hrp-fab").click();
  await expect(page.locator(".hrp-progress")).toBeVisible();
  await expect(page.locator(".hrp-progress-title")).toContainText("Agent working");
  await expect(page.locator(".hrp-progress-message")).toContainText("Applying edits.");
});

test("submit packet shows bridge progress in the review panel", async ({ page }) => {
  await page.route("http://127.0.0.1:8783/api/review-packet", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: corsHeaders(),
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        reviewId: "test-submit",
        reviewPath: ".html-review-packets/packets/test-submit.json",
        markdownPath: ".html-review-packets/packets/test-submit.md",
        statusPath: ".html-review-packets/status/test-submit.json",
        statusUrl: "/api/review-status?id=test-submit",
        agentStarted: false,
        progress: {
          schema: "html_review_progress.v1",
          id: "test-submit",
          status: "waiting_for_agent",
          phase: "submitted",
          percent: 20,
          message: "Review packet saved. Waiting for an agent to apply it.",
          terminal: false,
          steps: [
            { key: "submitted", label: "Packet submitted", status: "done" },
            { key: "apply", label: "Apply requested amendments", status: "pending" }
          ]
        }
      })
    });
  });
  await page.route("http://127.0.0.1:8783/api/review-status?id=test-submit", async (route) => {
    await route.fulfill({
      status: 200,
      headers: corsHeaders(),
      contentType: "application/json",
      body: JSON.stringify({
        schema: "html_review_progress.v1",
        id: "test-submit",
        status: "agent_running",
        phase: "apply",
        percent: 60,
        message: "Applying requested amendments.",
        terminal: false,
        steps: [
          { key: "submitted", label: "Packet submitted", status: "done" },
          { key: "apply", label: "Apply requested amendments", status: "running" }
        ]
      })
    });
  });

  await openReviewPage(page, "Submit Test");
  await page.evaluate(() => {
    window.HTMLReviewPackets.addCommentForTest({
      section: "Submit Test",
      selectedText: "Original sentence",
      comment: "Rewrite this sentence."
    });
  });

  await page.locator(".hrp-fab").click();
  await page.locator('[data-hrp-action="submit-packet"]').click();

  await expect(page.locator(".hrp-progress")).toBeVisible();
  await expect(page.locator(".hrp-progress-title")).toContainText("Agent working");
  await expect(page.locator(".hrp-progress-message")).toContainText("Applying requested amendments.");
});

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}
