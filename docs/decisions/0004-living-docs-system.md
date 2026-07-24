# 0004 — Living docs: decisions, changelog, architecture, todo

Date: 2026-07-24 · Status: accepted

## Context

Decisions and context were living only in AI chat sessions and dying with
them. Future sessions (and other devs) need to know what was decided and why,
what changed, and what's unfinished — without archaeology through git log.

## Decision

Four repo docs with a read-before / update-after contract enforced through
CLAUDE.md (which every AI session auto-loads):

- `docs/decisions/` — one numbered file per decision; never edited, only
  superseded by a newer file.
- `CHANGELOG.md` — one line per shipped change, newest first.
- `docs/ARCHITECTURE.md` — the current structure/stack map; CLAUDE.md stays
  rules + pointers and defers detail here.
- `TODO.md` — cross-session parking for deferred ideas and known leftovers.
  **This repo only**: team RN repos track work in Jira, so the team setup
  prompt scaffolds the other three but not TODO.

The team setup prompt (`src/lib/setupPrompt.ts`) scaffolds the same system
into every repo it onboards.

## Rejected

- **ROADMAP.md** — overlaps TODO, no quarter-ahead planning exists to record;
  a stale doc lies confidently.
- **Cataloging agents/skills in CLAUDE.md** — their own descriptions already
  auto-trigger them; CLAUDE.md only encodes workflow gates and sequences.

## Consequences

Docs are updated per event (shipped → changelog, chose → decision, deferred →
todo), not per commit. A CLAUDE.md rule binds AI sessions only; if human
drift appears, add a hook or CI check later.
