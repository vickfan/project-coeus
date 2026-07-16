# Project Coeus v1 — Implementation Todos

> Derived from [v1-build-spec.md](../spec/v1-build-spec.md). Do not edit the spec file; track progress here.

**Success criteria:** Text or `.md` via Telegram → `raw-notes/` → GitHub sync → nightly (or manual) weave → readable cards in Obsidian via private repo.

---

## Current State (Gap Summary)

| Area | Status | Notes |
|------|--------|-------|
| File upload → `raw-notes/` | Done | `src/handlers/fileHandler.mjs` |
| GitHub sync + retries | Done | `src/githubHelper.mjs` |
| Cloudflare LLM + Transformers embeddings | Done | Cloudflare metadata + Transformers.js embeddings (`src/llm/*`) |
| Weaver linking logic | Done | Tags in `index.json`; hybrid titles; skipGitSync in Actions |
| Text capture | Done | Capture-only `textHandler.mjs` |
| Auth | Done | `src/auth.mjs` + middleware |
| Batch weave | Done | `src/weave-batch.mjs` + workflow wired |

---

## Build Order 1 — Auth Middleware

- [x] **1.1 auth-helper** — Create `src/auth.mjs` with `isAuthorized(id)` reading `TELEGRAM_USER_ID`; comment stub for v2 `TELEGRAM_ALLOWED_IDS` allowlist.
- [x] **1.2 auth-middleware** — Add Telegraf middleware in `src/telegramBot.mjs` — reject unauthorized `ctx.from.id` before handlers.
- [x] **1.3 auth-env** — Add `TELEGRAM_USER_ID` to `docker-compose.yml` and `.env.sample`.

---

## Build Order 2 — Replace `textHandler` (Capture-Only)

- [x] **2.1 text-capture** — Rewrite `src/handlers/textHandler.mjs`:
  - Min 10 characters (optional reply if too short)
  - Timestamp filename: `YYYY-MM-DD-HHmmss.md` (HKT)
  - Frontmatter: `captured_at`, `source: telegram-text`
  - Write to `notes/raw-notes/`
  - Remove Gemini chat and `notes/conversation/` logging
- [x] **2.2 text-sync-alert** — Wire `GitHubHelper.syncToGitHub` + Telegram `onError` alert (mirror `fileHandler`).
- [x] **2.3 entrypoint-cleanup** — Remove `notes/conversation/` from `entrypoint.sh` sparse-checkout and `mkdir`.

---

## Build Order 3 — `weave-batch.mjs`

- [x] **3.1 weave-batch-utils** — Add helpers in `src/weaveBatchUtils.mjs`:
  - `isTimestampCapture(basename)` — regex `^\d{4}-\d{2}-\d{2}-\d{6}\.md$`
  - `stripTelegramFrontmatter(content)` — strip YAML when `source: telegram-text`
  - `titleFromFilename(basename)` — strip `.md`, sanitize like fileHandler
- [x] **3.2 weave-batch-script** — Create `src/weave-batch.mjs`:
  - List top-level `notes/raw-notes/*.md` only (exclude subdirs)
  - `CryptoUtil.decrypt()` passthrough
  - Per-file retry: 3 attempts, backoff 1s / 2s / 4s
  - Timestamp capture → strip frontmatter, LLM title
  - Upload → `titleOverride` from filename, content as-is
  - Call `startWeaving(content, options)`
- [x] **3.3 weave-batch-delete** — Delete raw note from inbox only after successful weave; on failure leave file and continue batch.
- [x] **3.4 Batch exit semantics** — Exit 0 if batch completed (even with skipped files); exit 1 only on catastrophic errors.

---

## Build Order 4 — Weaver Fixes

- [x] **4.1 weaver-refactor** — Refactor `startWeaving(content, options = {})` in `src/Weaver.mjs`:
  - `titleOverride` — filename title for uploads
  - `skipGitSync` — default true when `GITHUB_ACTIONS=true`
  - Store `tags` in each `index.json` entry
- [x] **4.2 weaver-hybrid-title** — LLM title for timestamp captures; `titleOverride` for uploads.
- [x] **4.3 weaver-git-gate** — Skip `GitHubHelper.syncToGitHub` when `skipGitSync` / Actions (workflow owns commit/push).

---

## Build Order 5 — GitHub Actions + Polish

- [x] **5.1 actions-workflow** — Fix `.github/workflows/distill.yml`: run `node src/weave-batch.mjs` instead of missing `distill-script.js`.
- [x] **5.2 actions-env** — Actions env: `LLM_PROVIDER=cloudflare`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`; do not set `ENCRYPTION_ENABLED`.
- [x] **5.3 filehandler-copy** — Update `src/handlers/fileHandler.mjs` replies — remove "encrypted" wording for v1 plaintext.

---

## Build Order 6 — Cutover (Manual)

Before first real v1 weave:

- [ ] **6.1 manual-cutover** — Delete test cards in `notes/persistent/*.md` (keep `.obsidian/` if desired).
- [ ] **6.2** — Reset `notes/index.json` to `[]`.
- [ ] **6.3** — Commit and push to private notes repo.

> Existing index has 384-dim embeddings but no `tags` — `hasSharedTags` always false until fresh start.

---

## Build Order 7 — Manual Verification

- [ ] **7.1** — Set `TELEGRAM_USER_ID`; restart bot → unauthorized users rejected.
- [ ] **7.2** — Send text ≥10 chars → `raw-notes/YYYY-MM-DD-HHmmss.md` with frontmatter; GitHub push.
- [ ] **7.3** — Upload `.md` → `raw-notes/{original-name}.md`; GitHub push.
- [ ] **7.4** — Simulate sync failure → Telegram alert; file remains local.
- [ ] **7.5** — Trigger `workflow_dispatch` → batch processes inbox.
- [ ] **7.6** — Verify: cards in `persistent/`, `index.json` has `tags` + 384-dim vectors, raw inbox cleared.
- [ ] **7.7** — Open cards in Obsidian — plaintext readable.
- [ ] **7.8** — Upload uses filename title; text capture uses LLM title.

---

## Build Order 8 — Enable Cron (After Stable)

- [ ] **8.1 enable-cron** — Uncomment `cron: '0 19 * * *'` in `distill.yml` (03:00 HKT / 19:00 UTC).

> `features.md` incorrectly labels `0 19 * * *` as midnight HKT — v1 spec is authoritative (03:00 HKT).

---

## Optional Tests

- [x] **tests-batch-auth** — Add `test/weaveBatch.mjs` (frontmatter/timestamp helpers) and `test/auth.mjs`.

Existing tests: `test/cryptoUtil.mjs`, `test/embeddings.mjs`, `test/llmProvider.mjs`.

---

## Related Docs

- [../README.md](../README.md) — doc index
- [v1-build-spec.md](../spec/v1-build-spec.md) — locked v1 decisions (wins on conflicts)
- [features.md](../reference/features.md) — module checklist and stack
- [implementation-plan.md](../archive/implementation-plan.md) — pre-v1 audit (historical)
