# Project Coeus — v1 Build Spec

> **Source:** Grilling session, 2026-07-02  
> **Purpose:** Handoff document for implementation. Read this + `features.md` before building v1.

---

## v1 Definition of Done

**In scope:** Capture → GitHub sync → nightly weave. Structured cards in `notes/persistent/`, wiki links, updated `index.json`.

**Out of scope for v1:**
- Module 3 `/search`
- Supabase (`last_weave_version`)
- Encryption (`ENCRYPTION_ENABLED` off / not set)
- Conversation chat (Gemini multi-turn)
- Voice messages

**Success criteria:** User can send text or `.md` via Telegram → files land in `raw-notes/` → GitHub sync → nightly (or manual) weave → readable cards in Obsidian via private repo.

---

## Locked Decisions

### Ingestion (Module 1)

| Decision | Choice | Details |
|----------|--------|---------|
| Plain text handling | **Capture as raw note** | One `.md` per message. No Gemini chat. |
| Text filename | **Timestamp** | e.g. `2026-07-02-143052.md` (define exact format in code, keep sortable). |
| Text min length | **10 characters** | Shorter messages ignored; optional short bot reply ("too short to save"). |
| Text frontmatter | **Yes** | Add `captured_at`, `source: telegram-text`. Strip before weave LLM if needed. |
| File uploads | **Pass through** | No bot-added frontmatter; preserve Obsidian formatting as-is. |
| Conversation chat | **Remove for v1** | Replace `textHandler.mjs` capture-only. Drop `notes/conversation/` logging. v2 can restore from git history. |
| Auth | **Single owner** | `ctx.from.id === TELEGRAM_USER_ID` or reject. Structure `isAuthorized(id)` for future allowlist (`TELEGRAM_ALLOWED_IDS`). |
| GitHub sync | **After every capture** | Existing `GitHubHelper` + retries; Telegram alert on failure (extend to text capture if not already). |

### Weave (Module 2)

| Decision | Choice | Details |
|----------|--------|---------|
| LLM metadata | **Cloudflare Workers AI** | Dev + Actions via `resolveProvider.mjs`; OpenAI-compatible chat completions. Default model `@cf/meta/llama-3.2-3b-instruct`. |
| Embeddings | **Transformers.js** | `Xenova/all-MiniLM-L6-v2` (384-dim) per `features.md`. |
| Card titles | **Hybrid** | Uploads: filename (strip `.md`) as title. Timestamp captures: LLM-generated title from content. Detect via regex on basename (e.g. `^\d{4}-\d{2}-\d{2}-\d{6}$`). |
| Post-weave raw notes | **Delete on success** | Only after full success: card written, `index.json` updated, git push done. Failed/partial → file stays in `raw-notes/`. |
| Batch failure | **Retry then skip** | 3 attempts with backoff per file; then log/alert, leave file in inbox, continue batch. |
| Cron schedule | **Manual first** | `workflow_dispatch` only until stable. Then enable `0 19 * * *` UTC (= **3:00 AM HKT**). |
| Supabase signal | **Deferred** | Do not add SDK/secrets for v1. |

### Data & Security

| Decision | Choice | Details |
|----------|--------|---------|
| Encryption | **Off for v1** | Plaintext in private GitHub repo. Obsidian must read `persistent/` cards directly. |
| Cutover | **Fresh start** | Wipe prototype `notes/persistent/` and `notes/index.json` before first real v1 run. Existing data is test-only. |

---

## Build Order

1. **Auth middleware** — `telegramBot.mjs`, `isAuthorized()` helper, env `TELEGRAM_USER_ID`
2. **Replace textHandler** — capture-only: timestamp file, frontmatter, min-length guard, ack reply
3. **`weave-batch.mjs`** — list `raw-notes/*.md` (top level only), decrypt passthrough, per-file retry, hybrid title pass-through, delete on success
4. **Weaver fixes** — store `tags` in `index.json`; hybrid title logic; plaintext backlink edits (no encrypt/decrypt round-trip); use filename title when not timestamp pattern
5. **GitHub Actions** — point workflow at `weave-batch.mjs`; `workflow_dispatch`; secrets per `features.md`; no Supabase step
6. **Cutover** — clear test `persistent/` + `index.json`
7. **Manual verification** — full cycle via `workflow_dispatch`
8. **Enable cron** — `0 19 * * *` when stable

---

## Implementation Notes

### Timestamp filename regex (for hybrid titles)

Use for "is this a bot text capture?" — if match → LLM title; else → filename as title.

Suggested pattern: `^\d{4}-\d{2}-\d{2}-\d{6}\.md$` on basename (adjust if code uses different granularity).

### Text capture frontmatter template

```yaml
---
captured_at: <ISO8601>
source: telegram-text
---

<message body>
```

### Cron reference

| Local (HKT) | UTC cron | Notes |
|-------------|----------|-------|
| 03:00 | `0 19 * * *` | **v1 target when stable** |
| 00:00 | `0 16 * * *` | Not chosen |

`features.md` incorrectly labels `0 19 * * *` as midnight HKT — it is 03:00 HKT.

### Weaver / index.json

- Must store `tags` on each index entry (fixes `hasSharedTags` / linking).
- Re-index not needed after fresh start (A); all new entries use 384-dim Transformers vectors.

### Environment variables (v1 minimum)

| Var | Where | Purpose |
|-----|-------|---------|
| `TELEGRAM_BOT_TOKEN` | VPS | Bot |
| `TELEGRAM_USER_ID` | VPS | Auth |
| `NODE_ENV` | VPS | Set `PROD` to push captures to coeus-notes |
| `COEUS_NOTES_TOKEN` | VPS + Actions | Private repo access (Octokit + Actions checkout) |
| `COEUS_USERNAME` | VPS + Actions | GitHub owner |
| `COEUS_NOTES_REPO` | VPS + Actions | Private notes repo name |
| `CLOUDFLARE_ACCOUNT_ID` | VPS + Actions + local dev | Workers AI account |
| `CLOUDFLARE_API_TOKEN` | VPS + Actions + local dev | Workers AI API token (Read + Edit) |
| `CLOUDFLARE_AI_MODEL` | Optional | Default `@cf/meta/llama-3.2-3b-instruct` |
| `LLM_PROVIDER` | Optional | `cloudflare` only (default when unset) |
| `ENCRYPTION_ENABLED` | Unset or `false` | v1 plaintext |

Do **not** add Supabase vars for v1.

---

## v2 Backlog (explicitly deferred)

- **Allowlist auth** — `TELEGRAM_ALLOWED_IDS` comma-separated
- **Conversation chat** — rebuild Gemini multi-turn + `notes/conversation/` from git history
- **Module 3 search** — Supabase version signal, lazy `index.json` load, `/search` command
- **Encryption** — revisit scope (at-rest on VPS vs whole-file) when threat model requires it

---

## Related Docs

- [../README.md](../README.md) — doc index
- [cloudflare-llm-setup.md](../guides/cloudflare-llm-setup.md) — Workers AI setup (dev + prod)
- [features.md](../reference/features.md) — module checklist & stack
- [implementation-plan.md](../archive/implementation-plan.md) — pre-v1 audit (historical)
- [project-overview.md](../architecture/project-overview.md) — architecture narrative

**This file wins** when it conflicts with `implementation-plan.md` on v1 scope decisions.
