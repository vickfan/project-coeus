# Project Coeus

Telegram capture → private notes repo → nightly weave → Obsidian cards.

## Docs

Start at [.cursor/README.md](.cursor/README.md).

- [VPS deployment checklist](.cursor/guides/vps-deployment.md)
- [Cloudflare LLM setup](.cursor/guides/cloudflare-llm-setup.md) — metadata provider (dev + prod)
- [v1 build spec](.cursor/spec/v1-build-spec.md)
- [Features checklist](.cursor/reference/features.md)
- [v1 todos](.cursor/tracking/v1-todos.md)

## Local bot (Docker)

```bash
cp .env.sample .env
# Set TELEGRAM_*, COEUS_*, CLOUDFLARE_* — see .cursor/guides/cloudflare-llm-setup.md

docker compose build
docker compose up -d
```

## Local weave test

```bash
node src/weave-batch.mjs
```

## Stack (v1)

| Layer | Tech |
|-------|------|
| Capture | Telegraf → `notes/raw-notes/` |
| Notes sync (prod) | Octokit when `NODE_ENV=PROD` |
| Metadata LLM | Cloudflare Workers AI |
| Embeddings | Transformers.js (local Node) |
| Nightly weave | GitHub Actions → `weave-batch.mjs` |
