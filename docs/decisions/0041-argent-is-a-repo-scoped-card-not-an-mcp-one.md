# 0041 — Argent is a repo-scoped card, not an MCP one

Date: 2026-08-10 · Status: accepted

## Context

The React Native section ends at `react-native doctor`, which proves the
toolchain is installed and says nothing about whether the app behaves. Argent
(`@swmansion/argent`) closes that gap: an MCP server driving iOS Simulators and
Android Emulators, reading device logs and network traffic at both the JS `fetch`
layer and the native layer. `docs/argent-guide.md` holds the field notes this
card derives from.

An MCP server is on the card, so `mcp` looked like the obvious category. It is
the wrong one, and five other choices followed from getting that first one
right.

## Decision

**Project Setup, not MCP Servers.** Every `mcp` card is machine-wide — `claude
mcp add --scope user` ([0036](0036-mcp-servers-register-at-user-scope.md)) — and
the scan finds it through a `~/.claude.json` needle. Argent's config is
`.mcp.json` *inside the repo*, so that needle cannot see it, and the machine
setup prompt runs before any repo exists to install into. `project` is
`checkable: false`, which is what a card configuring a repo needs.

**`--local`, not global.** The audit argument first pointed the other way: a
committed dependency looks like more exposure than a per-user install. It
reverses on version identity. Global mode plus `npx @swmansion/argent@latest`
means every developer silently runs a *different* build, with nothing recording
which — and the licence is mixed, Apache 2.0 source with proprietary
simulator-server and native devtools binaries, so which version is in the tree is
exactly the thing an audit asks. `--local` pins it in `devDependencies` and
commits the MCP config, so a teammate who clones and installs gets the same one.

**One skill, not two.** Driving the app and reading logs after a hand-made repro
are different *workflows*, not different skills: same tools, same constants, same
discipline, differing only in whether the user already reproduced the problem.
That is a branch in the body. Two skills with overlapping descriptions is how the
model picks the wrong one, and `docs/argent-guide.md` already records it
mis-routing to raw `adb logcat` — which works, but loses JS-layer detail and
network payloads.

**Constants in two files, imported with `@`.** `docs/dev-setup.md` is committed
and holds repo facts (schemes, flavors, bundle IDs). `docs/dev-setup.local.md` is
gitignored and holds the simulator name, the AVD name and a test account —
per-developer values, one of them a credential. Both arrive through `@` imports,
because `CLAUDE.md` is static text injected at launch: a prose mention like "see
docs/dev-setup.md" never executes, and only the `@` expands.

**The repo is the source of truth for build facts.** The skill derives build and
run commands from `android/app/build.gradle` and `xcodebuild -list` on every run.
`docs/RUNNING.md` is read only for what those two cannot state — which flavor is
used for local dev, and manual steps like copying `.env.example` — and every
build fact in it is advisory, the repo winning any disagreement. This removes
staleness as a category instead of managing it: nothing to detect, nothing to
refresh, and a flavor added five minutes ago is picked up.

Rejected on that last point, both designed before being cut: a docs-contract
clause obliging whoever changes a flavor to update `docs/RUNNING.md` (uncommon
enough that the obligation would be forgotten precisely when it mattered), and a
hook firing on build-config edits (machinery in the user's repo for a problem the
rule above already removes). Also rejected: pasting a verification template per
bug, which is friction that recurs forever, where a skill installed once loads
itself whenever the task matches.

## Consequences

**No `DETECT_SPECS` entry, deliberately.** The category is `checkable: false`, so
`aiSetup.ts` skips it at both loop sites and the scan never asks. Verified across
all five platform ids: the generated setup prompt and the generated scan script
mention neither `argent` nor `swmansion`, and `downloadMb`/`elevatedCount` are
unchanged. Recorded because the docs contract otherwise reads a missing spec as
an oversight.

**No `README.md` change.** Its "Add or edit a tool" section documents *fields*,
and this card introduces none — `elevated` and `sizeMb` are already documented
and Argent uses neither, carrying no download of its own worth naming. The design
spec's ripple list claimed README holds a card list; it does not, and the next
reader should not go looking.

Argent is the first card in a `checkable: false` category to carry a `version`
badge. No component change was needed: `ToolCard` gates only the checkbox on
`category.checkable`, and the badge sits outside that gate.

The card is the third writer into a repo's `.claude/` after the Team setup prompt
and the team plugin, and nothing arbitrates between them — hence the card's note
ordering Team setup first, and a step that is just `git status && git diff`.

The skill deliberately encodes **no** policy on how much to fix without asking.
That is ordinary judgement plus the session's permission mode; a rule here would
re-implement, worse, a decision the harness already makes.

Physical devices stay out because Argent does not support them. Maestro stays out
as a CI regression artifact rather than a debugger, parked in `docs/TODO.md`.
