# Project Coeus - Feature Checklist & Technical Breakdown

Use this file to track implementation and prompt Cursor to build individual modules.

> **Stack decision (2026-07):** **Cloudflare Workers AI** for metadata (dev + prod); **Transformers.js** for embeddings; **Octokit** for VPS notes sync.

---

## 🔀 LLM Provider Switching

| Environment | Metadata (title/tags) | Embeddings |
|-------------|----------------------|------------|
| Local dev | Cloudflare Workers AI (default) | Transformers.js `Xenova/all-MiniLM-L6-v2` (384-dim) |
| GitHub Actions | Cloudflare Workers AI (same) | Transformers.js `Xenova/all-MiniLM-L6-v2` (384-dim) |

* **Provider:** Cloudflare Workers AI only (`LLM_PROVIDER=cloudflare` or unset).
* **Free tier:** Cloudflare Workers AI — 10,000 neurons/day (resets 00:00 UTC); sufficient for single-user production metadata-only.
* **Embeddings stay local:** Transformers.js in Node — not Cloudflare embedding models.


## 📋 Feature Checklist

- [x] **Module 1: Telegram Ingestion & GitHub Sync Gatekeeper**
  - [x] 1.1 Telegram Bot — Markdown file upload to `notes/raw-notes/`
  - [x] 1.1a Text capture — timestamp filename + frontmatter (`textHandler.mjs`)
  - [x] 1.1b Telegram user authorization (`TELEGRAM_USER_ID`)
  - [x] 1.2 Notes sync via Octokit when `NODE_ENV=PROD`; retries + failure alerts
- [ ] **Module 2: Nightly Batch Weaver Engine (GitHub Actions Workflow)**
  - [x] 2.1 GitHub Action cron — `0 19 * * *` UTC (03:00 HKT) + `workflow_dispatch` (`distill.yml`)
  - [x] 2.2 Metadata extraction — `llm/noteMeta.mjs` (Cloudflare Workers AI dev + Actions)
  - [x] 2.3 Transformers.js (`Xenova/all-MiniLM-L6-v2`) embeddings — `llm/embeddings.mjs`
  - [x] 2.4 Semantic bi-directional matrix linking (cosine similarity + tag-aware thresholds)
  - [x] 2.5 Batch processor (`weave-batch.mjs`) for `notes/raw-notes/`
  - [ ] 2.6 Supabase version upstream signaler *(v2 — deferred)*
- [ ] **Module 3: Lazy-Loaded Search & Delivery Engine** *(v2 — deferred)*
  - [ ] 3.1 Supabase version validator & cache guard
  - [ ] 3.2 GitHub Raw index downloader (lazy loader)
  - [ ] 3.3 On-demand local matrix query runner (Transformers.js)
  - [ ] 3.4 Telegram interactive UI formatter

---

## 🛠️ Feature Breakdown & Technical Specifications

### Module 1: Telegram Ingestion & GitHub Sync Gatekeeper
*Target Environment: Hetzner VPS (Node.js LTS)*

#### 1.1 Telegram Bot — Markdown File Capture
* **Input:** `.md` document uploads via Telegram Bot.
* **Logic:** Download file from Telegram, optionally encrypt via `CryptoUtil`, preserve original filename (sanitized for Obsidian).
* **Output:** Encrypted or plaintext file at `notes/raw-notes/{original-title}.md`.

#### 1.1a Text Capture (v1)
* **Input:** Plain text messages (≥10 chars).
* **Logic:** Timestamp filename `YYYY-MM-DD-HHmmss.md` (HKT), YAML frontmatter (`captured_at`, `source: telegram-text`), write to `notes/raw-notes/`.
* **Sync:** Same Octokit path as file uploads when `NODE_ENV=PROD`.

#### 1.1b Conversation Chat *(v2 — deferred)*
* **Was:** Gemini chat with per-chat memory; log to `notes/conversation/`.
* **v1:** Removed — capture-only text path above.

#### 1.2 Notes Sync Publisher
* **Mechanism:** Octokit Contents API via `GitHubHelper` — upserts `raw-notes/` files to private repo.
* **When:** After every capture when `NODE_ENV=PROD`; skipped in local dev.
* **Retries:** 3 attempts with exponential backoff (1s, 2s, 4s).
* **Error Handling:** Alert user via Telegram on sync failure after local save.

### Module 2: Nightly Batch Weaver Engine (GitHub Actions Workflow)
*Target Environment: GitHub Runner (Ubuntu)*

#### 2.1 GitHub Action Cron Setup
* **Schedule:** `0 19 * * *` UTC (= 03:00 HKT) when stable; include `workflow_dispatch`.
* **Secrets:** `COEUS_NOTES_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.

#### 2.2 Metadata Extraction (`src/llm/noteMeta.mjs`)
* **Default (dev + prod):** Cloudflare Workers AI — OpenAI-compatible `/ai/v1/chat/completions`.
* **Model:** `CLOUDFLARE_AI_MODEL` (default `@cf/meta/llama-3.2-3b-instruct`).
* **Provider:** Cloudflare only; defaults to `cloudflare` when `LLM_PROVIDER` unset.
* **Setup:** Cloudflare Dashboard → Workers AI → Use REST API → create token (Workers AI Read + Edit) + copy Account ID.

#### 2.3 Embedding Engine (`src/llm/embeddings.mjs`)
* **Library:** `@xenova/transformers`
* **Model:** `Xenova/all-MiniLM-L6-v2` (384 dimensions, ~90MB ONNX)
* **Execution:** Mean-pooled, L2-normalized feature extraction on raw note content; store vector in `notes/index.json`.
* **Override:** `EMBEDDING_MODEL` env var for alternate Hugging Face ONNX models.

#### 2.4 Semantic Bi-directional Matrix Linking
* **Logic:** Cosine similarity against all records in `index.json`, with dynamic thresholds based on shared tags (0.45 with shared tags, 0.75 without).
* **Weaving:** Top 5 matches get `[[Wiki-links]]` appended to new and historical cards in `notes/persistent/`.

#### 2.5 Batch Processor
* **Script:** `src/weave-batch.mjs`
* **Flow:** List `notes/raw-notes/*.md` → decrypt passthrough → `startWeaving()` → delete processed files on success.

#### 2.6 Supabase Version Upstream Signaler
* **SDK:** `@supabase/supabase-js`
* **Table:** `system_status` row `id: 1`
* **Operation:** Update `last_weave_version` with `Date.now().toString()` after each weave run.

### Module 3: Lazy-Loaded Search & Delivery Engine
*Target Environment: Hetzner VPS (Node.js LTS)*

#### 3.1 Supabase Version Validator & Cache Guard
* **Trigger:** `/search <query>`
* **Logic:** Compare Supabase `last_weave_version` against in-memory `localVersion`.

#### 3.2 GitHub Raw Index Downloader
* **Target:** `https://raw.githubusercontent.com/<User>/<Repo>/main/notes/index.json`
* **Auth:** `COEUS_NOTES_TOKEN` for private repo access.

#### 3.3 On-demand Query Runner
* **Embedding:** Transformers.js `Xenova/all-MiniLM-L6-v2` (must match weave model).
* **Ranking:** Cosine similarity, top 5 where score > 0.40.

#### 3.4 Telegram Result Formatter
* **Format:** Card titles, match confidence %, tags, wiki-link cross-references.

---

## Shared Infrastructure

### Encryption (`cryptoUtil.mjs`)
* **Flag:** Only `ENCRYPTION_ENABLED=true` enables encryption; any other value = plaintext passthrough.
* **Algorithm:** AES-256-CBC, format `iv:hex_ciphertext`.

---

## Related Docs

- [../README.md](../README.md) — doc index
- [../guides/cloudflare-llm-setup.md](../guides/cloudflare-llm-setup.md) — Workers AI credentials & env (dev + prod)
- [../spec/v1-build-spec.md](../spec/v1-build-spec.md) — locked v1 decisions
