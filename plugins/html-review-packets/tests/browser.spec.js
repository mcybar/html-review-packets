import { test, expect } from "@playwright/test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeCommentableHtmlString } from "../src/inject.js";

test("review runtime exposes packet API and stores comments", async ({ page }) => {
  const root = await mkdtemp(join(tmpdir(), "hrp-browser-"));
  const html = makeCommentableHtmlString(`<!doctype html><title>Browser Test</title><main><h1>Browser Test</h1><p>Original sentence needs review.</p></main>`);
  const file = join(root, "browser.review.html");
  await writeFile(file, html, "utf8");

  await page.goto(`file://${file}`);
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
});

