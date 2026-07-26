# 0009 — A tool change must ripple to everything that consumes it

Date: 2026-07-24 · Status: accepted · the "setup script" surface it names was removed by [0017](0017-copy-all-removed.md)

## Context

Tools in `src/lib/tools.ts` feed several derived surfaces: the detect scan
(`DETECT_SPECS`), the AI-setup prompt, the setup script, and version badges.
Most derive automatically, but detect specs and per-tool details (needles,
notes, prereqs, manual flags) are maintained by hand — adding or editing a
tool without touching them leaves silent gaps (e.g. a new tool listed as
"unscannable" forever).

## Decision

Codified as a standing rule, not tribal knowledge: CLAUDE.md's docs contract
gains an "update after" clause for tool changes, README's "Add or edit a
tool" section gains a ripple checklist (detect spec → derived surfaces →
changelog), and the team setup prompt states the general form ("any change to
one surface must ripple to everything that consumes it in the same session").

## Consequences

Sessions that touch tools.ts are expected to touch detect.ts (or knowingly
accept unscannable) and leave a changelog line — reviewers can flag misses
against a written rule.
