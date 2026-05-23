import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeCommentableHtmlString, removeExistingInjection } from "../src/inject.js";

test("injects review UI into head and body", async () => {
  const html = await readFile(new URL("./fixtures/basic.html", import.meta.url), "utf8");
  const output = makeCommentableHtmlString(html, {
    documentFile: "/tmp/basic.html",
    generatorFile: "/tmp/build.js",
    storageKey: "test-key"
  });

  assert.match(output, /html-review-packets:head:start/);
  assert.match(output, /html-review-packets-runtime/);
  assert.match(output, /"documentFile":"\/tmp\/basic.html"/);
  assert.match(output, /HTMLReviewPackets/);
});

test("injection is idempotent unless forced", async () => {
  const html = await readFile(new URL("./fixtures/basic.html", import.meta.url), "utf8");
  const once = makeCommentableHtmlString(html);
  const twice = makeCommentableHtmlString(once);
  assert.equal(twice, once);

  const removed = removeExistingInjection(once);
  assert.equal(removed.includes("html-review-packets-runtime"), false);
});

