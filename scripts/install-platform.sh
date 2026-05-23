#!/usr/bin/env bash
set -euo pipefail

platform="${1:-all}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill_src="$repo_root/plugins/html-review-packets/skills/html-review-packets"

install_openclaw() {
  mkdir -p "$HOME/.openclaw/skills"
  ln -sfn "$skill_src" "$HOME/.openclaw/skills/html-review-packets"
  echo "Installed OpenClaw skill: $HOME/.openclaw/skills/html-review-packets"
}

install_codex() {
  mkdir -p "$HOME/.codex/skills" "$HOME/.agents/skills"
  ln -sfn "$skill_src" "$HOME/.codex/skills/html-review-packets"
  ln -sfn "$skill_src" "$HOME/.agents/skills/html-review-packets"
  echo "Installed Codex skill: $HOME/.codex/skills/html-review-packets"
  echo "Installed shared agent skill: $HOME/.agents/skills/html-review-packets"
}

install_claude() {
  echo "Claude Code native install is via plugin marketplace:"
  echo "  /plugin marketplace add mcybar/html-review-packets"
  echo "  /plugin install html-review-packets"
  echo
  echo "For local development, add this repo as a local marketplace if your Claude Code build supports local marketplace sources:"
  echo "  $repo_root"
}

case "$platform" in
  openclaw)
    install_openclaw
    ;;
  codex)
    install_codex
    ;;
  claude|claude-code)
    install_claude
    ;;
  all)
    install_openclaw
    install_codex
    install_claude
    ;;
  *)
    echo "Usage: $0 [openclaw|codex|claude|all]" >&2
    exit 2
    ;;
esac

