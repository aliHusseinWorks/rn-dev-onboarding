# 0014 — Per-project sections carry no checkmarks

Date: 2026-07-25 · Status: accepted

## Context

Every card was checkable and counted toward the progress bar, including the
five that aren't machine state: *Create a React Native app*, *react-native
doctor*, and the three Project Setup prompts. Those are actions you repeat in
every repo, so a permanent tick against them means nothing — and 49 was the
wrong denominator for "tools installed".

The two sections were already out of the AI setup and the detect scan, but by
accident rather than intent: Project Setup via a hardcoded
`category.id === 'project'` string check, React Native Setup only because
nobody had written detect specs for its prompts.

fastlane blocked the obvious category-level fix. It sat in React Native Setup
but is a `brew install` CLI like any other, with a version badge and a detect
spec it deserves to keep.

## Decision

`Category` gains `checkable?: boolean`; `rn` and `project` set it `false`, and
both move to the end of the page (Project Setup 5, React Native Setup 6) so
the checkable sections are unbroken above them.

fastlane moves to System Essentials at order 11, ahead of the SSH key. That
section already holds mac-only, role-specific CLIs — Watchman and
Ruby + CocoaPods — so fastlane needs no new home invented for it.

## Rejected

- **A "CLI tools" section.** The app is organised by role, not by interface,
  and most of it is already CLIs: 10 of 11 System Essentials, all 11 MCP
  cards, Claude Code, herdr, uv. The section would either gut System
  Essentials or hold fastlane alone.
- **A "Build & Release" section** (fastlane, sentry-cli, firebase-tools).
  Coherent, but invented for one card on the assumption fastlane had nowhere
  to go. CocoaPods disproves that.
- **A per-tool flag on the five cards.** Only needed while fastlane was
  stranded in `rn`; moving it makes the category the honest unit and costs two
  flags instead of five.

## Consequences

`checkable` is orthogonal to `inScript`: `mcp` keeps `inScript: false` and
stays checkable, because MCP servers really are configured once per machine.

Four consumers derive from the one flag — the progress denominator and card
checkbox, the section's "Mark all done", `aiSetupGroups`/`generateAiSetup`,
and `detectGroups`. The hardcoded `'project'` string check is gone.

Ticks already stored in `rn-onboard:installed` for the five cards are now
ignored rather than migrated; they cost nothing and would come back if a
section were ever made checkable again.
