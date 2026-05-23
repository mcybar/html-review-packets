# Installing HTML Review Packets for Codex

## Marketplace install

```bash
git clone https://github.com/mcybar/html-review-packets.git ~/.codex/html-review-packets
codex plugin marketplace add ~/.codex/html-review-packets
codex plugin add html-review-packets@html-review-packets
```

## Skill-only install

```bash
git clone https://github.com/mcybar/html-review-packets.git ~/.codex/html-review-packets
bash ~/.codex/html-review-packets/scripts/install-platform.sh codex
```

Restart Codex after a skill-only install.

## Verify

```bash
cd ~/.codex/html-review-packets/plugins/html-review-packets
npm run verify
```

