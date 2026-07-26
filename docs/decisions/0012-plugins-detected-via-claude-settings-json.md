# 0012 — Plugins are detected in ~/.claude/settings.json

Date: 2026-07-25 · Status: accepted · Amends the plugin half of 0007

## Context

0007 gave MCP servers and Claude Code plugins a single check kind: a
fixed-string search of `~/.claude.json`. That is right for MCP servers and
wrong for plugins.

Installing a plugin writes `~/.claude/settings.json` (`enabledPlugins`, keyed
`name@marketplace`) and `~/.claude/plugins/installed_plugins.json`. It does
not write `~/.claude.json` — that file only gains a `pluginUsage` entry once
the plugin has been through a session start.

So the scan found plugins the user had already *used*, not plugins they had
*installed*. Superpowers and UI/UX Pro Max passed only because they had usage
history; a plugin installed minutes earlier reported as missing, on a machine
where it was installed and enabled.

## Decision

Split the check kind in two. `claudeConfig` keeps `~/.claude.json` and now
means MCP servers only; a new `claudePlugin` reads `~/.claude/settings.json`.
`superpowers`, `ui-ux-pro-max`, `slack-mcp` and `ponytail` move across with
their needles unchanged — the file was the bug, and a `name@` prefix still
matches a plugin installed from a forked marketplace.

`enabledPlugins` was chosen over `installed_plugins.json` because it is the
documented settings file and it reflects the user's own scope choice. The
needle stays a bare key rather than `"key": true`, so a disabled plugin still
reads as installed — a false positive on a rare, deliberate state, preferred
over a false negative on the common one.

## Consequences

Both script generators gain a helper (`has_plugin` / `Test-Plugin`) that reads
the second file; the sh and PowerShell one-line constraints are unchanged.

Only user-scope installs are seen. A project-scope plugin lands in that repo's
`.claude/settings.json`, which a machine scan has no business reading.
