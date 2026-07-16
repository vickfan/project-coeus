# Design: Respect Obsidian tags on weave

> Approved 2026-07-16. Primary input: Obsidian-exported markdown.

## Decision

**Approach:** Parse existing tags in `weaveBatchUtils`, merge in `Weaver` (same pattern as `titleOverride`).

**Sources (both):**
1. YAML frontmatter `tags` (inline array or list)
2. Body `#hashtags`

**Merge policy:**
- `final = unique(existing + llm)` case-insensitive
- Never drop existing tags
- Append LLM tags only until total length reaches 5
- If existing already ≥ 5, keep all existing; add no LLM tags

## Out of scope

- Stripping or rewriting embedded Obsidian frontmatter inside card body
- Prompt-only “please keep tags” (deterministic merge only)
