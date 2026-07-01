# Project Coeus - System Architecture & Overview

## 1. Project Concept
Project Coeus is a highly decoupled, private, zero-cost, and event-driven Personal Knowledge Management (PKM) backend. It acts as an automated "Brain Weaving Engine" that captures raw notes via a Telegram Bot, processes them using free LLM sanities and local embeddings, and pushes structured, bi-directionally linked Markdown cards back to a private GitHub Repository compatible with Obsidian.

The core philosophy is **Zero-Cost Sovereignty**: Utilizing free tiers of specialized platforms (GitHub Actions, Supabase, GitHub Models, Hetzner VPS) to achieve an enterprise-grade RAG and knowledge-graph pipeline without running costs or privacy leaks.

## 2. High-Level Architecture
The system is strictly split into two layers to maintain ultra-low runtime footprints and rock-solid reliability:
1. **The Ingestion & Query Layer (Frontend Gatekeeper - Hetzner VPS)**: A lightweight, 24/7 service that captures user input via Telegram and serves instant search results using a local indexed vector file via Lazy Loading.
2. **The Weaving & Compiling Layer (Deep Brain - GitHub Actions)**: A nightly batch cron job that executes all heavy lifting (LLM Metadata extraction, Vector Embedding generation, Cross-Note Cosine Similarity analysis, and Git publishing).

## 3. Data Flow Architecture

### Phase A: Frictionless Capture (Real-time)
1. User sends a Markdown file (`.md`) directly via **Telegram Bot**.
2. **Hetzner VPS** intercepts the document upload, preserves the original filename as the note title, and instantly uses the GitHub API to push it into the `/notes/raw-notes/` directory of your private repo.
3. *Cost/Compute:* Zero LLM computation occurs here. It is a pure network pass-through.

### Phase B: Nightly Deep Weave (Batch Processing @ 00:00 UTC)
1. **GitHub Actions** wakes up automatically via a cron scheduler.
2. It loops through all new files in `/notes/raw-notes/`.
3. For each note, it extracts metadata via **GitHub Models (`openai/gpt-4o-mini`)** in production, or **Gemini** when running locally.
4. It initializes **Transformers.js** (`Xenova/all-MiniLM-L6-v2`) to compute a 384-dimensional vector embedding locally on CPU.
5. It runs a **Matrix Cross-Comparison** using Cosine Similarity against all historical notes to discover hidden semantic clusters, automatically appending double-bracketed `[[Links]]` to form a bi-directional knowledge graph.
6. It updates the central compiled vector index: `/notes/index.json`.
7. It updates a singular tracking flag (`last_weave_version = Timestamp`) in **Supabase**.
8. It commits and pushes all structural changes back to the main branch.

### Phase C: Lazy-Loaded Vector Search (On-Demand Query)
1. User triggers `/search <query>` inside Telegram.
2. **Hetzner VPS** queries **Supabase** for the `last_weave_version`.
3. If the remote version does *not* match Hetzner's local RAM version:
   * Hetzner dynamically `fetch`es the fresh `/notes/index.json` from the GitHub Raw URL (**Lazy Load**).
   * Local RAM version is updated.
4. Hetzner uses **Transformers.js** (`Xenova/all-MiniLM-L6-v2`) locally to embed the search query and ranks notes using Cosine Similarity.
5. Returns a cleanly formatted Markdown response with card titles, match confidence, tags, and cross-references.