# 0007 — Simple detect modal; MCP servers and plugins detected via ~/.claude.json

Date: 2026-07-24 · Status: accepted · Amends the modal design of 0001

## Context

The detect modal listed every scannable tool with include/exclude checkboxes
and a per-check "how" label — overwhelming for the actual audience (a new dev
who just wants their checklist filled). It also claimed 17 tools were
undetectable, which turned out wrong: MCP servers and Claude Code plugins are
registered in `~/.claude.json`, which the scan script can read.

## Decision

- The modal shows a one-line coverage summary (what's scanned, what isn't)
  instead of the tool checklist; per-tool selection is gone — the scan always
  covers everything scannable. The generated script, with one comment per
  check, remains the transparency artifact for anyone who wants detail.
- New check kind: a fixed-string search in `~/.claude.json` (server keys like
  `"context7"`, plugin ids like `superpowers@`). Only per-project steps
  (rn-init, doctor, team prompts) remain unscannable.

## Rejected

- Keeping the checkbox panel behind a "details" toggle — the selection
  feature had no real use case; opting out of a read-only check buys nothing.

## Consequences

DetectSpec gains `claudeConfig`; `generateDetectScript` loses its `excluded`
parameter. Needles are exact registered names, so renamed servers/plugins
need their spec updated.
