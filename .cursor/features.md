# Project Coeus - Feature Checklist & Technical Breakdown

Use this file to track implementation and prompt Cursor to build individual modules.

> **Stack decision (2026-07):** Dual LLM for metadata (Gemini local / GitHub Models in Actions); **Transformers.js** for embeddings everywhere; Git CLI for VPS sync.

---

## 🔀 LLM Provider Switching

| Environment | Metadata (title/tags) | Embeddings |
|-------------|----------------------|------------|
| Local dev | Gemini `gemini-2.5-flash` | Transformers.js `Xenova/all-MiniLM-L6-v2` (384-dim) |
| GitHub Actions | GitHub Models `openai/gpt-4o-mini` | Transformers.js `Xenova/all-MiniLM-L6-v2` (384-dim) |

* **Hot-reload API key:** `GEMINI_API_KEY` is re-read from `.env` on every Gemini call (metadata/chat only).
* **Re-index required:** Existing `notes/index.json` entries use old Gemini vectors (3072-dim). Re-run weave on all notes after this change.


## 📋 Feature Checklist

- [ ] **Module 1: Telegram Ingestion & GitHub Sync Gatekeeper**
  - [x] 1.1 Telegram Bot — Markdown file upload to `notes/raw-notes/`
  - [ ] 1.1b Telegram user authorization (`TELEGRAM_USER_ID`)
  - [x] 1.2 Git sync via Git CLI (`GitHubHelper`) with retries
  - [ ] 1.3 GitHub sync failure alerts (file capture ✅, conversation capture pending)
- [ ] **Module 2: Nightly Batch Weaver Engine (GitHub Actions Workflow)**
  - [ ] 2.1 GitHub Action Cron Setup (`weave.yml` / `distill.yml`)
  - [x] 2.2 Metadata extraction — `llm/noteMeta.mjs` (Gemini local / GitHub Models in Actions)
  - [x] 2.3 Transformers.js (`Xenova/all-MiniLM-L6-v2`) embeddings — `llm/embeddings.mjs`
  - [x] 2.4 Semantic bi-directional matrix linking (cosine similarity + tag-aware thresholds)
  - [ ] 2.5 Batch processor (`weave-batch.mjs`) for `notes/raw-notes/`
  - [ ] 2.6 Supabase version upstream signaler
- [ ] **Module 3: Lazy-Loaded Search & Delivery Engine**
  - [ ] 3.1 Supabase version validator & cache guard
  - [ ] 3.2 GitHub Raw index downloader (lazy loader)
  - [ ] 3.3 On-demand local matrix query runner (Gemini embeddings)
  - [ ] 3.4 Telegram interactive UI formatter

---

## 🛠️ Feature Breakdown & Technical Specifications

### Module 1: Telegram Ingestion & GitHub Sync Gatekeeper
*Target Environment: Hetzner VPS (Node.js LTS)*

#### 1.1 Telegram Bot — Markdown File Capture
* **Input:** `.md` document uploads via Telegram Bot.
* **Logic:** Download file from Telegram, optionally encrypt via `CryptoUtil`, preserve original filename (sanitized for Obsidian).
* **Output:** Encrypted or plaintext file at `notes/raw-notes/{original-title}.md`.

#### 1.1b Conversation Chat (side-channel)
* **Input:** Plain text messages.
* **Logic:** Gemini chat with per-chat memory; log to `notes/conversation/YYYY-MM-DD.md` as JSON.
* **Note:** Separate from raw-note capture; may feed a future distill pipeline.

#### 1.2 Git Sync Publisher
* **Mechanism:** Git CLI (`git add` / `commit` / `push`) via `GitHubHelper`, configured by `entrypoint.sh` sparse-checkout on the VPS.
* **Retries:** 3 attempts with exponential backoff (1s, 2s, 4s).
* **Error Handling:** Alert user via Telegram on sync failure after file capture.

### Module 2: Nightly Batch Weaver Engine (GitHub Actions Workflow)
*Target Environment: GitHub Runner (Ubuntu)*

#### 2.1 GitHub Action Cron Setup
* **Schedule:** `cron: '0 0 * * *'` (00:00 UTC) or `0 19 * * *` (00:00 HKT). Include `workflow_dispatch`.
* **Secrets:** `COEUS_NOTES_TOKEN`, `GITHUB_TOKEN` (auto in Actions), `GEMINI_API_KEY` (local metadata/chat only), Supabase keys (when 2.6 is built).

#### 2.2 Metadata Extraction (`src/llm/noteMeta.mjs`)
* **Local:** `@google/genai` + `gemini-2.5-flash` with JSON schema.
* **Production (Actions):** GitHub Models REST API — `openai/gpt-4o-mini` via `GITHUB_TOKEN`.
* **Switch:** `LLM_PROVIDER=gemini|github`; auto `github` when `GITHUB_ACTIONS=true`.

#### 2.3 Embedding Engine (`src/llm/embeddings.mjs`)
* **Library:** `@xenova/transformers`
* **Model:** `Xenova/all-MiniLM-L6-v2` (384 dimensions, ~90MB ONNX)
* **Execution:** Mean-pooled, L2-normalized feature extraction on raw note content; store vector in `notes/index.json`.
* **Override:** `EMBEDDING_MODEL` env var for alternate Hugging Face ONNX models.

#### 2.4 Semantic Bi-directional Matrix Linking
* **Logic:** Cosine similarity against all records in `index.json`, with dynamic thresholds based on shared tags (0.45 with shared tags, 0.75 without).
* **Weaving:** Top 5 matches get `[[Wiki-links]]` appended to new and historical cards in `notes/persistent/`.

#### 2.5 Batch Processor
* **Script:** `src/weave-batch.mjs` (to be created)
* **Flow:** List `notes/raw-notes/*.md` → decrypt → `startWeaving()` → archive/delete processed files.

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
* **Flag:** `ENCRYPTION_ENABLED` — when off, encrypt/decrypt are passthrough.
* **Algorithm:** AES-256-CBC, format `iv:hex_ciphertext`.
