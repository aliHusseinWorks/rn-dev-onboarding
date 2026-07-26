# 0011 — Ponytail is the one agent-discipline plugin we ship

Date: 2026-07-25 · Status: accepted

## Context

Three candidate Claude Code skills came up for the AI Tools section, all
pitched as making the agent cheaper or better:

- **Caveman** — compresses the agent's prose (drops articles, pleasantries).
  Generated code is byte-identical; only the chat wrapper shrinks.
- **Impeccable** — a design language plus ~58 deterministic anti-pattern
  detectors, driven by live iteration against a rendered page.
- **Ponytail** — constrains what the agent writes: no speculative
  abstractions, no scaffolding "for later", standard library before a new
  dependency.

A skill-discovery / skill-authoring card (`skill-creator` and its several
near-clones) was raised in the same conversation.

## Decision

Ship **Ponytail** as `ai` order 6. Reject the other three.

- **Caveman** saves output tokens on text the reader discards; Ponytail saves
  code the team has to maintain. Only the second compounds. Caveman would also
  work against this repo's docs contract, which ends every task in prose
  (changelog, decisions, TODO).
- **Impeccable** is browser/CSS-shaped — live DOM iteration and CSS detectors.
  The team ships React Native, where none of that carries over. UI/UX Pro Max
  already holds the design slot and treats RN as a first-class stack.
- **A skill-finder/creator card** would duplicate the existing Team plugin
  card, which already covers authoring shared skills, and would point this
  catalog at a rival catalog.

## Consequences

The `ai` section's order gap at 6 is now filled: Superpowers 4, Graphify 5,
Ponytail 6, UI/UX Pro Max 7.

Ponytail overlaps CLAUDE.md rules 1, 4 and 5 (reuse before create, no
unsolicited extras, minimal diffs) — in this repo it mostly restates rules the
agent is already held to. It earns the slot for the team's RN repos, which
carry no such rules.

Unlike every other card, Ponytail installs two Node lifecycle hooks that run
on Claude Code events, from a single-maintainer repo rather than the
established marketplaces the other plugin cards point at. The card's `note`
says what they are and tells the reader to skim them before approving, since
a dev on day one is primed to click through setup prompts.
