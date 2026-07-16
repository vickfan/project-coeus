# Project Coeus — Documentation Index

Start here. Docs are grouped by purpose; **[spec/v1-build-spec.md](spec/v1-build-spec.md)** wins on v1 scope conflicts.

---

## Quick start

| I want to… | Read |
|------------|------|
| Understand the system | [architecture/project-overview.md](architecture/project-overview.md) |
| See what's built vs planned | [reference/features.md](reference/features.md) |
| Set up Cloudflare LLM (dev + prod) | [guides/cloudflare-llm-setup.md](guides/cloudflare-llm-setup.md) |
| Deploy Telegram bot on VPS | [guides/vps-deployment.md](guides/vps-deployment.md) |
| Ship / verify v1 | [tracking/v1-todos.md](tracking/v1-todos.md) |
| Look up locked v1 decisions | [spec/v1-build-spec.md](spec/v1-build-spec.md) |
| Obsidian tags on weave | [spec/obsidian-tags-on-weave.md](spec/obsidian-tags-on-weave.md) |

---

## Folder layout

```
.cursor/
├── README.md                 ← you are here
├── architecture/             How the system fits together
│   └── project-overview.md
├── spec/                     Source-of-truth requirements
│   └── v1-build-spec.md
├── reference/                Module specs & stack reference
│   └── features.md
├── guides/                   Step-by-step operational guides
│   ├── cloudflare-llm-setup.md
│   └── vps-deployment.md
├── tracking/                 Checklists & progress
│   └── v1-todos.md
└── archive/                  Historical / superseded
    └── implementation-plan.md
```

---

## Reading order (new contributor)

1. [architecture/project-overview.md](architecture/project-overview.md) — phases A/B/C, VPS vs Actions
2. [spec/v1-build-spec.md](spec/v1-build-spec.md) — v1 scope, locked decisions, env vars
3. [reference/features.md](reference/features.md) — module checklist + file-level specs
4. [guides/cloudflare-llm-setup.md](guides/cloudflare-llm-setup.md) — credentials & `.env`
5. [tracking/v1-todos.md](tracking/v1-todos.md) — what's done, manual verify steps

---

## Document roles (avoid duplication)

| Doc | Role | Update when… |
|-----|------|--------------|
| **project-overview** | Narrative architecture & data flow | Stack or phase boundaries change |
| **v1-build-spec** | Locked product decisions | Scope changes (grilling / ADR) |
| **features** | Module checklist + technical detail | A module ships or spec drifts |
| **cloudflare-llm-setup** | How to configure Workers AI | Provider/env/workflow changes |
| **v1-todos** | Implementation & verify checklist | Tasks complete or new work added |
| **implementation-plan** | *(archive)* Pre-v1 audit snapshot | Do not update — historical only |

---

## Current stack (v1)

| Layer | Technology |
|-------|------------|
| Capture | Telegram → `notes/raw-notes/` |
| Notes sync (prod) | Octokit when `NODE_ENV=PROD` |
| Metadata LLM | Cloudflare Workers AI (dev + Actions) |
| Embeddings | Transformers.js in Node (384-dim) |
| Weave cron | GitHub Actions → `weave-batch.mjs` |
| Search (Module 3) | **v2** — not in v1 |

---

## v1 status snapshot

**Done:** auth, capture-only text, Octokit sync, weave-batch, Weaver fixes, Cloudflare LLM wired.

**Remaining (manual):** cutover, end-to-end verify, enable cron in `distill.yml`.

See [tracking/v1-todos.md](tracking/v1-todos.md) for checkboxes.
