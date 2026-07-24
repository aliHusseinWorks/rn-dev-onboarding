# 0008 — All project docs live under docs/ (README stays at root)

Date: 2026-07-24 · Status: accepted · Amends the file layout of 0004

## Context

CHANGELOG.md and TODO.md sat at the repo root while ARCHITECTURE.md and
decisions/ lived in docs/ — two homes for one docs system.

## Decision

Everything documentation moves under `docs/`: ARCHITECTURE.md, CHANGELOG.md,
TODO.md, decisions/. Exceptions that must stay at root: README.md (the repo's
front page) and CLAUDE.md (Claude Code loads it from the root). The team
setup prompt scaffolds the same layout.

## Rejected

- Root-level CHANGELOG.md (the common open-source convention) — consistency
  of one docs home beats the convention for an internal tool.

## Consequences

Relative links inside the moved files point at `decisions/…` now. CLAUDE.md's
contract and the agents reference the new paths.
