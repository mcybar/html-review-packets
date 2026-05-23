---
name: html-review-packets
description: "Make generated HTML artifacts reviewable with inline comments, collect review packets, and apply submitted feedback with versioned edits. Use when the user asks to generate commentable/reviewable HTML, gather comments on an HTML report, submit packet feedback, or amend an HTML artifact from a review packet."
---

# HTML Review Packets

Use this skill to turn an HTML artifact into a reviewer-commentable document and to apply submitted packet feedback back into the source.

## Tools

Run the bundled CLI through the skill wrapper:

```bash
node <SKILL_DIR>/scripts/html-review-packets.mjs make report.html --out report.review.html --source report.html --generator scripts/build-report.js
node <SKILL_DIR>/scripts/html-review-packets.mjs serve --root "$(pwd)" --port 8783
node <SKILL_DIR>/scripts/html-review-packets.mjs packet-markdown .html-review-packets/packets/<packet>.json
```

`<SKILL_DIR>` is the directory containing this `SKILL.md`.

## Make HTML Reviewable

1. Identify the generated HTML file and, if present, its generator/source file.
2. Create a reviewable copy, preserving the original:
   ```bash
   node <SKILL_DIR>/scripts/html-review-packets.mjs make input.html --out input.review.html --source input.html
   ```
3. If the user needs direct `Submit packet`, start the bridge:
   ```bash
   node <SKILL_DIR>/scripts/html-review-packets.mjs serve --root <directory-containing-html> --port 8783
   ```
4. Tell the user to open the `.review.html` through `http://127.0.0.1:8783/<file>` when the bridge is running. `file://` still works, but submit falls back to copy/download if the bridge is unavailable.

The review UI supports: select text, right-click, add comment or suggested replacement, Enter to save, review queue, submit packet, copy packet, and JSON download.

## Apply A Review Packet

When the user provides an `html_review_packet.v1` JSON packet:

1. Parse and inspect all comments together. Do not blindly apply one comment at a time if comments conflict.
2. Find the source HTML and generator from `packet.document.file` and `packet.document.generator`.
3. Checkpoint before editing:
   - If inside a git repo, inspect status and keep edits scoped.
   - If not in git, copy touched files into `.html-review-packets/versions/<timestamp>/`.
4. Apply only the requested section amendments unless the packet clearly asks for broader cleanup.
5. If a generator exists, edit the generator/source of truth and regenerate the HTML. Otherwise edit the HTML directly.
6. Re-run `make` on the resulting HTML so the next review round keeps the comment UI.
7. Report changed files and verification.

## Successful Test Task

A platform install is successful when the agent can complete this task from scratch:

> Create a tiny HTML report, make it reviewable, start the bridge, submit a packet with one comment asking to rewrite a sentence, then apply the packet with a version checkpoint and produce an updated reviewable HTML file.

Deterministic local verification:

```bash
cd <REPO_ROOT>/plugins/html-review-packets
npm run verify
```

