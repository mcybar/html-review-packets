import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync, rmSync, symlinkSync, mkdirSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(pluginRoot, "../..");
const skillDir = join(pluginRoot, "skills", "html-review-packets");
const scratchHome = mkdtempSync(join(tmpdir(), "hrp-install-"));

try {
  assertFile(join(skillDir, "SKILL.md"));
  assertFile(join(pluginRoot, ".codex-plugin", "plugin.json"));
  assertFile(join(pluginRoot, ".claude-plugin", "plugin.json"));
  assertFile(join(repoRoot, ".agents", "plugins", "marketplace.json"));
  assertFile(join(repoRoot, ".claude-plugin", "marketplace.json"));

  const codexManifest = JSON.parse(readFileSync(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(codexManifest.name, "html-review-packets");
  assert.equal(codexManifest.skills, "./skills/");

  const claudeManifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(claudeManifest.name, "html-review-packets");
  assert.equal(claudeManifest.skills, "./skills/");

  simulateSkillInstall(join(scratchHome, ".openclaw", "skills", "html-review-packets"));
  simulateSkillInstall(join(scratchHome, ".codex", "skills", "html-review-packets"));
  simulateSkillInstall(join(scratchHome, ".agents", "skills", "html-review-packets"));

  console.log("Install layout verified for OpenClaw, Codex, and Claude Code manifests.");
} finally {
  rmSync(scratchHome, { recursive: true, force: true });
}

function assertFile(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
}

function simulateSkillInstall(target) {
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(skillDir, target, "dir");
  assert.equal(lstatSync(target).isSymbolicLink(), true);
  assertFile(join(target, "SKILL.md"));
}

