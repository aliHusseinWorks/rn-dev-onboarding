# 0015 — The knowledge graph ships in the repo

Date: 2026-07-26 · Status: superseded by [0019](0019-graphify-removed.md) — do not act on this

## Context

graphify is built for team use: `graphify claude install` writes rules into
`CLAUDE.md` and hooks into `.claude/settings.json`, both tracked. But
`graphify-out` had been in `.gitignore` since 22e8563, predating graphify in
this repo, so the graph itself was per-machine. That combination is the worst
of both: every clone carries rules telling the agent to run `graphify query`
against a graph that isn't there.

Two things also shipped wrong. `graphify claude install` wrote the hook command
as an absolute path (`C:/Users/<name>/.local/bin/graphify.EXE`), which resolves
on exactly one machine, and the rules referenced `graphify-out/wiki/index.md`,
which this project never generates.

## Decision

Commit the graph. `.gitignore` keeps `graphify-out/*` ignored and re-includes
the four files a clone actually needs: `graph.json`, `manifest.json`,
`GRAPH_REPORT.md`, and `.graphify_labels.json` — the human-readable community
names, which a rebuild would otherwise reinvent per developer. 398 kB, 4 of the
72 files graphify generates.

Everything else stays out, and each is excluded for a reason:
`.graphify_python` and `.graphify_root` hold absolute machine paths; `cache/`
is content-hashed AST and embedding cache; the dated folders are per-run
snapshots of the same four files; `cost.json` is spend telemetry; `graph.html`
is a 324 kB viewer nothing reads programmatically.

Hooks stay in the tracked `.claude/settings.json`, but call `graphify` off PATH
and guard on it existing, with a `commandWindows` variant — the shape ponytail's
own hooks use. A clone without graphify installed gets a silent no-op instead of
a failed hook on every `Bash`/`Grep`/`Read`/`Glob`.

CLAUDE.md names graphify a prerequisite next to pnpm, and the dead `wiki/` rule
is gone.

## Consequences

`graph.json` is 11,845 lines and moves whenever code does, so it is in most
commits. That is the intended shape: graphify's README says the directory "is
meant to be committed to git so everyone on the team starts with a map", and
`graphify hook install` installs both the rebuild-on-commit hook and a git
merge driver that union-merges two `graph.json` files. Parallel edits resolve
themselves; no `.gitattributes` of ours is needed.

Every dev therefore runs `graphify hook install` — step 5 on the Graphify card.
Git hooks live in `.git/hooks` and are never committed, so it cannot be done
for them. Skipping it is what causes conflicts, not committing the graph.

A clone without graphify installed degrades quietly: `graphify query` is
command-not-found and the agent falls back to reading source, and the
`PreToolUse` hooks are guarded to no-op.
