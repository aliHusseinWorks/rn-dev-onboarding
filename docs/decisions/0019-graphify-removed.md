# 0019 — graphify is removed entirely

Date: 2026-07-26 · Status: accepted · Supersedes 0015

## Context

0015 committed four of graphify's outputs so a clone could query the graph
immediately, and had every dev run `graphify hook install` to keep it current.
Living with that for three commits surfaced five problems, in rising order of how
much they mattered.

**The tree was dirty after every push.** The rebuild hook is `post-commit`, so it
structurally cannot put its output into the commit that triggered it. Every code
commit left four files modified, needing a follow-up "refresh the graph" commit
that itself triggered nothing. Permanent ritual, not a transient.

**`manifest.json` was machine state.** It holds a per-file `mtime` map, so the
first `graphify update` on any machine dirties it regardless of code. Verified on
a scratch clone of `main`: `graph.json` was left untouched ("no code-graph
topology changes detected") and `manifest.json` still came out modified. 0015
excluded `.graphify_root` and `.graphify_python` for exactly this reason and
didn't notice manifest was the same kind of file.

**The diffs were unreviewable.** `graph.json` is 388 kB / 11,845 lines. Commit
`3cc64dd` contained no code change — it was a graph refresh — and moved 5,113
insertions against 6,236 deletions. A 40-line component fix would arrive as an
11,000-line pull request.

**The hook's rebuild was lossy.** It calls
`_rebuild_code(root, changed_paths=changed)`. A clean A/B on one tree varying only
that argument: scoped gives 424 nodes / 633 edges, full gives 429 / 659. So the
automation kept the graph approximately current and the committed copy was the
approximate one. Not `GRAPHIFY_MAX_WORKERS`, not `PYTHONHASHSEED` — both pinned
to the hook's values still produce the full result.

**And the one that settles it: this codebase is 32 files and 4,049 lines, and a
full-repo grep takes 30 milliseconds.** The graph was an order of magnitude larger
than the code it described. The entire repo fits in roughly 50k tokens — an agent
can read all of it and still have most of a context window free. A knowledge graph
answers a question this repo does not have.

Intermediate positions were considered and rejected in turn: committing fewer
files still leaves whichever file remains as the one that dirties the tree; a
committed `pre-commit` hook fixes ordering and lossiness but keeps ~11,000 lines
of churn per commit; gating the rebuild on "major changes" keeps the lossiness and
adds a silent staleness window in exchange for a definition of "major" to
maintain.

## Decision

Remove graphify from the project completely.

- The **Graphify card** goes from `src/lib/tools.ts`, along with its `DETECT_SPECS`
  entry and its `workflow` icon.
- The **uv card** goes with it. uv is a Python tool manager in a React Native
  onboarding app; it existed solely as graphify's prerequisite, and its own
  description said so. With graphify gone it has no consumer.
- The `## graphify` block and the prerequisite bullet leave `CLAUDE.md`; the
  folder-map entry leaves `ARCHITECTURE.md`; the ignore rule leaves `.gitignore`.
- The two `PreToolUse` hooks leave `.claude/settings.json`. They ran
  `graphify hook-guard` on every `Bash`/`Grep`/`Read`/`Glob` and injected a
  "MANDATORY: you MUST run graphify query" reminder into each one.
- `.gitattributes` goes; its only line was a union-merge driver for `graph.json`.
- Locally: the `post-commit` and `post-checkout` hooks, the `merge.graphify` git
  config section, and the 2.1 MB `graphify-out/` directory.

A replacement will be chosen separately. If one is adopted, the criterion learned
here is **footprint**: prefer a tool configured at user scope (`claude mcp add
--scope user`) that keeps its index outside the repo, over one that writes tracked
files into it. graphify's `claude install` and `hook install` wrote four tracked
files between them, which is why removing it touched this many.

## Consequences

The `ai` category keeps five cards and has order gaps at 3 and 5. Harmless —
cards sort by `order`, and renumbering would touch lines for no behavioural gain.

Tool count drops 49 → 47, of which 42 are checkable, so the progress bar reads 42.

0015 is marked superseded in its own header rather than left at `Status: accepted`.
CLAUDE.md tells agents to check `docs/decisions/` before contradicting a past
choice, and an agent that read 0015 alone would have re-committed the graph. That
status line is the only edit made to it; the reasoning is untouched.
