# Cloudflare Workers AI — LLM Setup

> Metadata (title + tags) for weave uses **Cloudflare Workers AI** in both local dev and GitHub Actions.  
> Replaces Gemini (region-restricted) and GitHub Models (retired Jul 2026).

Embeddings are **unchanged** — still `Transformers.js` / `Xenova/all-MiniLM-L6-v2` in Node.

---

## 1. Create Cloudflare credentials

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers AI** → **Use REST API**
3. Copy **Account ID**
4. **Create API Token** with **Workers AI Read** + **Workers AI Edit**
5. Save token securely (shown once)

---

## 2. Local dev (`.env`)

```bash
LLM_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.2-3b-instruct

# Optional: skip pushing to coeus-notes while testing
# NODE_ENV=development
```

Run weave locally:

```bash
node src/weave-batch.mjs
```

`LLM_PROVIDER` defaults to `cloudflare` if unset.

---

## 3. Docker / VPS (Telegram bot)

Add to `.env` (see `docker-compose.yml`):

```bash
LLM_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.2-3b-instruct
NODE_ENV=PROD   # only when ready to sync captures to coeus-notes
```

Rebuild: `docker compose build && docker compose up -d`

---

## 4. GitHub Actions (production weave)

Add repository **secrets**:

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | From Workers AI dashboard |
| `CLOUDFLARE_API_TOKEN` | Workers AI token |
| `COEUS_NOTES_TOKEN` | Private notes repo (existing) |

Workflow [`.github/workflows/distill.yml`](../.github/workflows/distill.yml) sets:

```yaml
LLM_PROVIDER: cloudflare
CLOUDFLARE_AI_MODEL: '@cf/meta/llama-3.2-3b-instruct'
```

No other LLM provider secrets are required.

---

## 5. Model choice

| Model | Use case |
|-------|----------|
| `@cf/meta/llama-3.2-3b-instruct` | **Default** — cheap neurons, fine for title/tags JSON |
| `@cf/openai/gpt-oss-20b` | Higher quality, more neurons per call |
| `@cf/ibm-granite/granite-4.0-h-micro` | Lowest neuron cost |

Browse: [Workers AI models](https://developers.cloudflare.com/workers-ai/models/)

Avoid deprecated models (e.g. `@cf/meta/llama-3.1-8b-instruct`).

---

## 6. Free tier (single user)

- **10,000 neurons/day** — resets 00:00 UTC
- Weave = 1 small LLM call per note (metadata only)
- Typical solo use: hundreds–low thousands of neurons/day
- Optional: **Workers Paid** for overflow (~$0.011 / 1k neurons) if you exceed cap

Monitor usage: Cloudflare dashboard → Workers AI.

---

## 7. Troubleshooting

| Error | Fix |
|-------|-----|
| `CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required` | Set both in `.env` or Actions secrets |
| `403` / auth errors | Token needs Workers AI Read + Edit |
| `429` / rate limit | Wait for UTC reset or upgrade Workers Paid |
| Invalid JSON from model | Retry weave-batch; try `@cf/openai/gpt-oss-20b` |
| `Unsupported LLM_PROVIDER=...` | Only `cloudflare` is supported (or leave unset) |

---

## Related

- [../README.md](../README.md) — doc index
- [features.md](../reference/features.md) — module checklist
- [v1-build-spec.md](../spec/v1-build-spec.md) — locked v1 decisions
- [Cloudflare OpenAI-compatible API](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/)
