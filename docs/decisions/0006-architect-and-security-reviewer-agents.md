# 0006 — Standard agent roster gains architect and security-reviewer

Date: 2026-07-24 · Status: accepted

## Context

The roster had only after-the-fact reviewers (code-reviewer,
consistency-checker). Nothing checked a feature's design against
docs/ARCHITECTURE.md before code existed, and security review was a
side-note inside general code review despite this app having real trust
boundaries (a public relay, scripts users paste into terminals).

## Decision

Two more read-only agents, here and in the team setup prompt:

- **architect** — consulted before substantive work; grounds itself in
  ARCHITECTURE.md, decisions/, and the code, then returns the smallest
  fitting design: what to reuse, what's genuinely new, what would violate
  the structure. Proportional output — small request, short answer.
- **security-reviewer** — dedicated diff review at the app's actual trust
  boundaries (relay validation, script interpolation, public bundle,
  browser surface here; auth/storage/deep links/WebViews in RN repos).

CLAUDE.md workflow gates updated: architect before, reviewers after,
security-reviewer whenever a change touches a trust boundary.

## Consequences

Four agents is the standing roster; more only when a repo's reality demands
it (the setup prompt's confirmation-gated additions clause).
