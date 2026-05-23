#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { makeCommentableHtmlFile } from "../src/inject.js";
import { packetToMarkdown } from "../src/packet.js";
import { serveBridge } from "../src/server.js";

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { args, opts } = parseArgs(rest);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "make") {
    const input = args[0];
    if (!input) fail("Missing input HTML path.");
    const output = opts.out || defaultOutput(input);
    const result = await makeCommentableHtmlFile({
      input,
      output,
      sourcePath: opts.source || input,
      generatorPath: opts.generator || "",
      title: opts.title || "",
      storageKey: opts["storage-key"] || "",
      bridgeUrl: opts["bridge-url"] || "",
      force: Boolean(opts.force)
    });
    console.log(`Wrote ${result.output}`);
    return;
  }

  if (command === "serve") {
    const root = resolve(opts.root || process.cwd());
    const port = Number(opts.port || 8783);
    const host = opts.host || "127.0.0.1";
    await serveBridge({ root, port, host });
    await new Promise(() => {});
  }

  if (command === "packet-markdown") {
    const packetPath = args[0];
    if (!packetPath) fail("Missing packet JSON path.");
    const packet = JSON.parse(await readFile(packetPath, "utf8"));
    process.stdout.write(packetToMarkdown(packet) + "\n");
    return;
  }

  fail(`Unknown command: ${command}`);
}

function parseArgs(argv) {
  const args = [];
  const opts = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args.push(token);
      continue;
    }
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      opts[raw.slice(0, eq)] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      opts[raw] = true;
      continue;
    }
    opts[raw] = next;
    index += 1;
  }
  return { args, opts };
}

function defaultOutput(input) {
  return input.replace(/\.html?$/i, "") + ".review.html";
}

function fail(message) {
  console.error(message);
  printHelp();
  process.exit(2);
}

function printHelp() {
  console.log(`HTML Review Packets

Usage:
  html-review-packets make <input.html> [--out output.review.html] [--source source.html] [--generator build.js] [--force]
  html-review-packets serve [--root .] [--port 8783] [--host 127.0.0.1]
  html-review-packets packet-markdown <packet.json>

Commands:
  make             Inject the comment UI into a generated HTML artifact.
  serve            Start the local review-packet bridge and static file server.
  packet-markdown  Convert a packet JSON file into an agent-facing Markdown task.
`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});

