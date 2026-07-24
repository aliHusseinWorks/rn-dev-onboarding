# 0001 — Detect installed tools via a pasted scan script + relay

Date: 2026-07-24 · Status: accepted

## Context

Users wanted the checklist to know what's already installed. Browsers sandbox
that away — a web page cannot enumerate programs, read PATH, or touch the
filesystem.

## Decision

Generate a readable, per-OS scan script the user pastes into their terminal
once. It checks each tool locally, POSTs `{v, platform, found}` under a
one-time pairing code to a tiny relay, and the page polls that code and ticks
the checkboxes live. The script also prints a `RN-ONBOARD/1 …` line for manual
paste-back, so the feature works with no relay at all.

## Rejected

- **Browser tricks** (protocol handlers like `vscode://`) — can't be probed
  silently, cover almost no tools.
- **Resident companion agent** — native binaries for 3 OSes, a trust ask on
  day zero, overkill for a checklist.
- **Ephemeral localhost bridge** — needs a local HTTP server on a machine that
  by definition has nothing installed yet; browser local-network rules are a
  moving target.

## Consequences

Detection specs live in `src/lib/detect.ts` (`DETECT_SPECS`), deliberately
separate from `tools.ts` so the tool table stays a pure "what to install"
config. Plugins, MCP servers, and per-project prompts are undetectable and
are listed as such in the modal.
