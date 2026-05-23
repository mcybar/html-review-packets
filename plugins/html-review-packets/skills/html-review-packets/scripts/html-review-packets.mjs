#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = realpathSync(fileURLToPath(import.meta.url));
const repoRoot = resolve(dirname(scriptPath), "../../..");
const binPath = resolve(repoRoot, "bin/html-review-packets.js");
const result = spawnSync(process.execPath, [binPath, ...process.argv.slice(2)], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);

