import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderReviewCss } from "./review-css.js";
import { renderReviewUi } from "./review-ui.js";

const HEAD_START = "<!-- html-review-packets:head:start -->";
const HEAD_END = "<!-- html-review-packets:head:end -->";
const BODY_START = "<!-- html-review-packets:body:start -->";
const BODY_END = "<!-- html-review-packets:body:end -->";

export async function makeCommentableHtmlFile(options) {
  const input = resolve(options.input);
  const output = resolve(options.output);
  const html = await readFile(input, "utf8");
  const result = makeCommentableHtmlString(html, {
    documentFile: resolve(options.sourcePath || input),
    generatorFile: options.generatorPath ? resolve(options.generatorPath) : "",
    title: options.title || "",
    storageKey: options.storageKey || storageKeyFor(input),
    bridgeUrl: options.bridgeUrl || "http://127.0.0.1:8783/api/review-packet"
  }, {
    force: options.force
  });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, result, "utf8");
  return { input, output };
}

export function makeCommentableHtmlString(html, config = {}, options = {}) {
  if (hasInjection(html) && !options.force) return html;
  const clean = options.force ? removeExistingInjection(html) : html;
  const normalized = {
    version: "0.2.0",
    documentFile: config.documentFile || "",
    generatorFile: config.generatorFile || "",
    title: config.title || "",
    storageKey: config.storageKey || "html-review-packets-comments",
    bridgeUrl: config.bridgeUrl || "http://127.0.0.1:8783/api/review-packet",
    sectionSelector: config.sectionSelector || ""
  };

  const headBlock = [
    HEAD_START,
    `<style id="html-review-packets-css">${renderReviewCss()}</style>`,
    `<script type="application/json" id="html-review-packets-config">${escapeJsonForHtml(normalized)}</script>`,
    HEAD_END
  ].join("\n");

  const bodyBlock = [
    BODY_START,
    `<script id="html-review-packets-runtime">${renderReviewUi().replace(/<\/script/gi, "<\\/script")}</script>`,
    BODY_END
  ].join("\n");

  return injectBeforeClosingTag(injectBeforeClosingTag(clean, "head", headBlock), "body", bodyBlock);
}

export function hasInjection(html) {
  return html.includes(HEAD_START) || html.includes(BODY_START) || html.includes("html-review-packets-runtime");
}

export function removeExistingInjection(html) {
  return html
    .replace(new RegExp(`${escapeRegExp(HEAD_START)}[\\s\\S]*?${escapeRegExp(HEAD_END)}\\n?`, "g"), "")
    .replace(new RegExp(`${escapeRegExp(BODY_START)}[\\s\\S]*?${escapeRegExp(BODY_END)}\\n?`, "g"), "");
}

function injectBeforeClosingTag(html, tagName, block) {
  const pattern = new RegExp(`</${tagName}>`, "i");
  if (pattern.test(html)) return html.replace(pattern, `${block}\n</${tagName}>`);
  return tagName === "head" ? `${block}\n${html}` : `${html}\n${block}`;
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function storageKeyFor(input) {
  return `html-review-packets:${resolve(input)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
