# 0037 — Node needs a path outside fnm's per-shell directory

Date: 2026-08-07 · Status: accepted

## Context

Three MCP cards register a server as `npx -y <package>`: XcodeBuildMCP,
Android Dev MCP and Teams. On a machine set up entirely by this app, all three
connected when added and then failed with `ENOENT: Executable not found in
$PATH: "npx"`.

The cause is how fnm publishes Node. `fnm env` prepends a directory named for the
shell that created it — `~/.local/state/fnm_multishells/<pid>_<timestamp>` — and
that directory goes away with the shell. The machine had twelve stale ones. Since
the hook only runs from `~/.zshrc`, and `~/.zshrc` is only sourced by
*interactive* shells, nothing that Claude Code spawns ever sees Node at all: its
captured environment contained no reference to fnm whatsoever.

This is the same class of failure as [0036](0036-mcp-servers-register-at-user-scope.md)
— the card reports success and the tool is broken later, somewhere the card
cannot see.

Adding the stable directory to `~/.zshrc` was tried first and is not a fix: it
addresses interactive shells, which were never the ones failing.

## Decision

The Node card symlinks `node`, `npm` and `npx` into `~/.local/bin`, pointing at
fnm's `aliases/default` rather than a version directory.

`~/.local/bin` over the alternatives because it is already first on PATH on a
machine this app set up, already present in Claude Code's own environment,
already where `claude` and `herdr` live, and writable without a password.
`/opt/homebrew/bin` was the other candidate and was rejected: it collides the day
anyone runs `brew install node`.

Targeting the `default` alias rather than `.../node-versions/v24.19.0/...` means
`fnm default` moves the symlinks with it, so they cannot pin a machine to
whatever version was current the day it was set up.

fnm's own per-shell directory still comes first on an interactive PATH, so
`fnm use` and `--use-on-cd` keep switching versions per repo. That was verified
both ways: an interactive shell resolves `node` through `fnm_multishells`, a
shell with no profile resolves it through `~/.local/bin`.

## Consequences

The card also has to guarantee `~/.local/bin` is on PATH, because a reader
working down the cards by hand reaches Node before Claude Code, and it is the
Claude Code installer that usually puts it there. Both profile lines go in under
one guard.

The same card stopped chaining with `&&`. The old chain ended in the profile
edit, so a failed download — which happened twice on a thin connection — left
`node` working in that one terminal and nowhere else, silently. Separated by `;`,
a retry of the install no longer costs the shell hook.

Windows has the same problem and the same shape of fix. fnm keeps a stable
`%APPDATA%\fnm\aliases\default` that it repoints when the default version
changes, so the card appends that to the user PATH rather than symlinking:
`node.exe` sits at the root of a Windows Node install, so the alias directory
itself is what goes on PATH, and there is no `bin` subdirectory to point at.

The Windows failure was not reproduced first-hand — only the Unix one was — but
the mechanism is documented and identical, and the remedy is additive: a PATH
entry that is wrong costs nothing, whereas leaving it out leaves three MCP cards
silently broken on every Windows machine. That asymmetry is why this shipped on
reasoning where [0038](0038-elevated-installs-are-one-block-the-user-runs.md)
would not.
