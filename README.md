# HTML Review Packets

Turn generated HTML artifacts into reviewable documents with inline comments, a small Notion-style comment bubble, and a submit flow that writes machine-readable review packets for an agent to apply later.

This repo is packaged as:

- a Claude Code plugin marketplace repo
- a Codex plugin marketplace repo
- an OpenClaw/Codex skill bundle
- a dependency-free Node CLI for deterministic HTML injection and packet capture

## Quick Start

```bash
git clone https://github.com/mcybar/html-review-packets.git
cd html-review-packets/plugins/html-review-packets
npm test

node bin/html-review-packets.js make tests/fixtures/basic.html --out /tmp/basic.review.html
node bin/html-review-packets.js serve --root /tmp --port 8783
```

Open `http://127.0.0.1:8783/basic.review.html`, select text, right-click, add a comment, then press `Submit packet`. The review panel shows agent progress after submission and refreshes from the local bridge while the packet is being applied.

## Install

OpenClaw:

```bash
bash scripts/install-platform.sh openclaw
```

Codex:

```bash
bash scripts/install-platform.sh codex
codex plugin marketplace add "$(pwd)"
codex plugin add html-review-packets@html-review-packets
```

Claude Code:

```text
/plugin marketplace add mcybar/html-review-packets
/plugin install html-review-packets
```

Before this is published, local Claude Code users can point marketplace installation at this repo path if their Claude Code build supports local marketplace sources.

## Success Criteria

A successful install from scratch means a user can:

1. Install the skill/plugin in OpenClaw, Codex, or Claude Code.
2. Ask the agent to make an HTML report reviewable.
3. Get back a new `.review.html` file with inline comment controls.
4. Select text, right-click, type a comment, and press Enter to save it.
5. Click `Submit packet` and produce a JSON packet under `.html-review-packets/packets/`.
6. See progress in the HTML as the agent checkpoints, applies edits, regenerates the HTML, and verifies the result.
7. Give that packet back to the agent and have it checkpoint the original files, apply the requested amendment, and report what changed.

Run the deterministic test task:

```bash
cd plugins/html-review-packets
npm run verify
```

That covers CLI injection, packet validation, bridge persistence, and a scratch install simulation for OpenClaw, Codex, and Claude Code layout.
