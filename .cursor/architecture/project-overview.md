# Project Coeus — System Architecture & Overview

> **Scope:** Phases A + B are **v1**. Phase C (search) and Supabase version signal are **v2** — see [spec/v1-build-spec.md](../spec/v1-build-spec.md).

## 1. Project Concept
Project Coeus is a highly decoupled, private, zero-cost, and event-driven Personal Knowledge Management (PKM) backend. It acts as an automated "Brain Weaving Engine" that captures raw notes via a Telegram Bot, processes them using free LLM sanities and local embeddings, and pushes structured, bi-directionally linked Markdown cards back to a private GitHub Repository compatible with Obsidian.

The core philosophy is **Zero-Cost Sovereignty**: Utilizing free tiers (Cloudflare Workers AI, GitHub Actions, Supabase, Hetzner VPS) to achieve an enterprise-grade RAG and knowledge-graph pipeline without running costs or privacy leaks.

## 2. High-Level Architecture
The system is strictly split into two layers to maintain ultra-low runtime footprints and rock-solid reliability:
1. **The Ingestion & Query Layer (Frontend Gatekeeper - Hetzner VPS)**: A lightweight, 24/7 service that captures user input via Telegram and serves instant search results using a local indexed vector file via Lazy Loading.
2. **The Weaving & Compiling Layer (Deep Brain - GitHub Actions)**: A nightly batch cron job that executes all heavy lifting (LLM Metadata extraction, Vector Embedding generation, Cross-Note Cosine Similarity analysis, and Git publishing).

## 3. Data Flow Architecture

### Phase A: Frictionless Capture (Real-time)
1. User sends a Markdown file (`.md`) directly via **Telegram Bot**.
2. **Hetzner VPS** intercepts the upload or text message, writes to `/notes/raw-notes/`, and when `NODE_ENV=PROD` pushes to the private repo via Octokit (skipped in local dev).
3. *Cost/Compute:* Zero LLM computation occurs here. It is a pure network pass-through.

### Phase B: Nightly Deep Weave (Batch @ 03:00 HKT / 19:00 UTC when cron enabled)
1. **GitHub Actions** runs on cron or `workflow_dispatch` (cron commented until stable).
2. It loops through all new files in `/notes/raw-notes/`.
3. For each note, it extracts metadata (title + tags) via **Cloudflare Workers AI** — same provider for local dev and GitHub Actions.
4. It initializes **Transformers.js** (`Xenova/all-MiniLM-L6-v2`) to compute a 384-dimensional vector embedding locally on CPU.
5. It runs a **Matrix Cross-Comparison** using Cosine Similarity against all historical notes to discover hidden semantic clusters, automatically appending double-bracketed `[[Links]]` to form a bi-directional knowledge graph.
6. It updates the central compiled vector index: `/notes/index.json`.
7. It commits and pushes all structural changes back to the main branch.
8. *(v2)* Supabase `last_weave_version` signal for lazy index reload on VPS.

### Phase C: Lazy-Loaded Vector Search (On-Demand Query) — v2
1. User triggers `/search <query>` inside Telegram.
2. **Hetzner VPS** queries **Supabase** for the `last_weave_version`.
3. If the remote version does *not* match Hetzner's local RAM version:
   * Hetzner dynamically `fetch`es the fresh `/notes/index.json` from the GitHub Raw URL (**Lazy Load**).
   * Local RAM version is updated.
4. Hetzner uses **Transformers.js** (`Xenova/all-MiniLM-L6-v2`) locally to embed the search query and ranks notes using Cosine Similarity.
5. Returns a cleanly formatted Markdown response with card titles, match confidence, tags, and cross-references.

---

## Related Docs

- [../README.md](../README.md) — doc index
- [../spec/v1-build-spec.md](../spec/v1-build-spec.md) — locked v1 decisions
- [../reference/features.md](../reference/features.md) — module checklist