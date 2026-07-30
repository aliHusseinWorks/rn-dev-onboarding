# 0027 — No code index: neither LSP nor RAG

Date: 2026-07-27 · Status: accepted · Closes the open question in [0019](0019-graphify-removed.md)

## Context

0019 removed Graphify and left one line open: "a replacement will be chosen
separately," with footprint as the criterion.

A replacement was chosen. On 2026-07-27 Serena — a language server exposed over
MCP — was added: a card in `tools.ts`, a `DETECT_SPECS` entry, the uv card
restored to carry it, a CHANGELOG entry, and a decision file numbered 0027. All
of it was reverted later the same session, before any commit. `git log -S serena`
returns nothing; the only surviving trace is a session transcript. The next
session had no record, re-derived the question from scratch, and re-proposed
evaluating a replacement — the exact failure 0019 guarded against when it marked
0015 superseded instead of deleting it. That original 0027 could not be recovered
verbatim; this file reclaims the number and records the conclusion.

Two tool categories were conflated throughout, and separating them settles most
of the argument.

**LSP** (Serena) runs a real language server. It parses the code, so "who calls
this" returns every call site — across 200k lines in under 200ms — and the answer
is exact by construction.

**RAG** (Graphify) embeds chunks and retrieves by similarity. It answers
approximately, and its failure is silent: it always returns something plausible,
never "I missed eight callers." On dynamic dispatch, reflection, DI containers or
string-keyed registries the literal name never appears and the caller is simply
absent from the result. Precision also degrades as the corpus grows, so the tool
gets less trustworthy exactly where it is most needed.

That distinction reframes 0019. Graphify did not fail because this repo is small.
RAG over source is unsound at any size; 4,000 lines just made it obvious in three
commits instead of six months.

Against that, this repo measures: 4,962 lines of source, a full `grep` across
`src/` in 30ms, and `docs/ARCHITECTURE.md` — 77 lines, hand-written, committed,
carrying a folder map and a "when you need X, use Y" table. It is already the
index, it costs about a thousand tokens, and it cannot go stale by mtime.

Serena's cost is also not the one it appears to be. The first parse is seconds
(up to about a minute on a large monorepo) and `serena project index` pre-warms
it once. The recurring cost is tool descriptions, which every MCP server injects
into **every request** for the life of the conversation — not once per session.
On a codebase this size that tax exceeds anything symbol-level retrieval saves.
Running it at user scope, as was tried, charges it to every project on the
machine including this one.

## Decision

No code index of either kind. `grep`, `docs/ARCHITECTURE.md`, and targeted reads
are the navigation layer.

The uv card goes, again. It returned earlier the same day described on its own
terms rather than as Graphify's prerequisite, but the honest position is that a
Python tool manager has no consumer in a React Native onboarding app once the
Python-based CLI it was carrying is not adopted. Its `feather` icon goes with it,
as Graphify's `workflow` icon did in 0019.

The threshold for revisiting, so this is not re-argued from zero a fourth time:

- **Under ~50k lines** — nothing. grep and the architecture doc.
- **Over ~50k lines** — LSP, via `claude mcp add --scope project`, which writes a
  committed `.mcp.json` at the repo root so the whole team gets it from a clone.
  `--context claude-code` (not the deprecated `ide-assistant`) drops the tools
  Claude Code already provides, which is what keeps the per-request tax down.
  `.serena/cache/` is gitignored; the index stays out of git.
- **Never** — RAG or embeddings over `src/`. Pointed at `docs/` it is defensible,
  since prose is what similarity search is for.

A committed `.mcp.json` ships configuration, not binaries: a teammate still needs
uv on PATH, and Claude Code prompts them to approve the server on first use.

## Consequences

The `ai` category loses order 3 again. Harmless, as in 0019 — cards sort by
`order` and renumbering would touch lines for no behavioural gain.

CLAUDE.md's docs contract gains one line: a decision file is never deleted, not
even when the change it records is reverted — its status flips to `rejected` or
`superseded` and the reasoning stays. Deleting this file when Serena came out is
what cost a session; without that rule, 0027 is as deletable as the first one was.
