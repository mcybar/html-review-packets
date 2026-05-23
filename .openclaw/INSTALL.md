# Installing HTML Review Packets for OpenClaw

```bash
git clone https://github.com/mcybar/html-review-packets.git ~/.openclaw/html-review-packets
bash ~/.openclaw/html-review-packets/scripts/install-platform.sh openclaw
```

Restart OpenClaw so the `html-review-packets` skill is discovered.

## Verify

```bash
cd ~/.openclaw/html-review-packets/plugins/html-review-packets
npm run verify
```

