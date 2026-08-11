# Argent card — design

Date: 2026-08-10 · Status: approved, not implemented

## Context

The app has no card for verifying that a fix actually works on a device. The
existing React Native section ends at `react-native doctor` — it proves the
toolchain is installed, not that the app behaves.

Argent (`@swmansion/argent`, Software Mansion) closes that gap: an MCP server
that drives iOS Simulators and Android Emulators, reads device logs and network
traffic at both the JS `fetch` layer and the native layer, and can attach a
debugger. Free, local, no account. iOS Simulator and Android Emulator only — no
physical devices. `docs/argent-guide.md` holds the field notes this design is
derived from.

What the card must deliver is not "install Argent". It is a **verification loop
that costs nothing to invoke**: say what should be true, and get back a verdict
with evidence — for a fix, for a feature that should still work, or for a log
trace of something already reproduced by hand.

## Decisions

Each of these was contested during design; the reasoning is what matters, not
the outcome alone.

**A skill installed once, not a prompt pasted per bug.** The card hands over one
prompt that writes `.claude/skills/verify/SKILL.md` into the RN repo. After that
the card is never visited again — the skill loads on its own when the task
matches. Pasting a template per bug was rejected as friction that recurs forever.

**One skill, not two.** Driving the app and reading logs after a manual repro are
different *workflows*, not different skills: same tools, same constants, same
discipline, differing only in whether the user already reproduced the problem.
That is a branch in the body. Two skills with overlapping descriptions is how the
model picks the wrong one, and the field notes already record it mis-routing to
raw `adb logcat`.

**The skill does not encode fix authority.** How much to fix without asking is
Claude's ordinary judgement plus the permission mode — trivial and unambiguous
gets fixed, complex gets a question. A policy in the skill would re-implement,
worse, a decision the harness already makes.

**`--local`, committed.** `npx @swmansion/argent@latest init --local` puts Argent
in `devDependencies` and commits the MCP config, so a teammate who clones and
runs `npm install` has it. Global mode was rejected on audit grounds, which
initially looked like the opposite conclusion: a pinned dependency is visible and
identical for everyone, whereas global plus `npx @latest` means every developer
silently runs a different build of a proprietary binary with no record of which.
Argent's licence is mixed — Apache 2.0 source, proprietary simulator-server and
native devtools binaries — so the version being auditable matters.

**Constants split across two files, imported.** `CLAUDE.md` gets `@` imports, not
prose: a prose file mention never executes, only the `@` expands.
`docs/dev-setup.md` is committed and holds bundle IDs per scheme.
`docs/dev-setup.local.md` is gitignored and holds device names and the test
account — per-developer values, one of them a credential, neither belonging in
git.

**Project Setup, not MCP Servers.** Every existing `mcp` card is machine-wide
(`claude mcp add --scope user`) and found by the detect scan through a
`~/.claude.json` needle. Argent's config is `.mcp.json` inside the repo, so the
scan cannot see it and the machine-setup prompt runs before any repo exists.
`project` is `checkable: false`, which is exactly right for something that
configures a repo.

**The repo is the source of truth for build facts.** The skill derives build and
run commands from `android/app/build.gradle` and `xcodebuild -list` on every run
rather than trusting a document. `docs/RUNNING.md`, when it exists, is read only
for what the repo cannot state — which flavor is used for local dev, and manual
steps like copying `.env.example`. This removes staleness as a category of
failure instead of managing it: there is no stale-doc detection to get right, no
refresh to remember, and a flavor added five minutes ago is picked up.

## The card

One entry in `src/lib/tools.ts`, no UI code.

```
id:        'argent'
category:  'project'
order:     3   (ahead of Team plugin, which moves to 4)
name:      'Argent — verify on a device'
descr:     'Drive the app, read logs, prove the fix.'
icon:      'gauge'   (unused; 'stethoscope' is taken by react-native doctor)
docsUrl:   https://argent.swmansion.com
version:   { npm: '@swmansion/argent' }
```

`version` departs from its three neighbours, which carry none — they are prompts,
this is a published package, and the badge is the same live-npm lookup every
other package card uses.

`modal.prereq`: repo cloned; the app already builds by hand (Argent will not fix
a broken build config); Xcode for iOS or Android Studio with a created AVD;
Node 18+; Metro is the developer's to run, in its own terminal — Argent never
manages it.

Steps:

| # | Step | Shape |
| --- | --- | --- |
| 1 | `npx @swmansion/argent@latest init --local` | `userRun` — an interactive wizard, so it needs a real terminal, but it is a real command and stays copyable |
| 2 | `git status && git diff` | plain step |
| 3 | Restart Claude Code | `manual` |
| 4 | The setup prompt | `modal.prompt`, `copyLabel: 'Copy prompt'` |

Step 2 is not hygiene theatre. `init` writes skills, rules and agents into the
repo's `.claude/`, and so does this app's own Team setup prompt. Nothing
arbitrates between them. The card's note says: Team setup prompt first, Argent
second, read the diff.

Two tooltips, both from the field notes: telemetry is on by default
(`argent telemetry disable`; usage and diagnostics, not source), and the mixed
licence now entering the repo's dependency tree.

## The setup prompt

`ARGENT_SETUP_PROMPT` in `src/lib/setupPrompt.ts`, beside the existing three.

Derives from the repo: bundle IDs per scheme and which scheme is the local-dev
default, from `ios/*.xcworkspace` schemes and `android/app/build.gradle`. Lists
every bundle when the project is multi-bundle (white-label, tenant-per-app,
staging versus prod) — same codebase, different IDs, and nothing on a simulator
says which one a task means.

Asks the user for only what the repo cannot know, in one batch: simulator and
AVD names, and a test account that skips onboarding. It supplies the two commands
that produce the names — `xcrun simctl list devices available` and
`emulator -list-avds` — because an AVD name is whatever the developer typed when
creating it.

Writes:

- `docs/dev-setup.md` — committed. Bundle IDs, schemes, default.
- `docs/dev-setup.local.md` — gitignored. Devices, test account.
- `.gitignore` — the local file's entry.
- `CLAUDE.md` — the two `@` import lines, appended, never replacing existing
  content.
- `.claude/skills/verify/SKILL.md` — the skill below.

It does not derive build commands. The skill reads them from the repo at use
time.

## The skill

`.claude/skills/verify/SKILL.md`, one file. Its description triggers on
verifying, checking something still works, and reading logs after a repro, so it
loads without being named.

It encodes only observed failure modes:

**Never run without a pass condition.** Argent's dominant failure is declaring
victory: given a vague goal it fixes something, sees a plausible screen and
reports success. If the user did not state a condition, derive one and state it
before acting.

**Reconcile reference data against reality before acting on it.** Resolve targets
to udids first. If nothing is booted, boot the device named in the constants for
that platform; if that name does not exist on this machine, list what does and
stop rather than substituting. Derive the build command from
`android/app/build.gradle` and `xcodebuild -list` — never from memory. Read
`docs/RUNNING.md`, if it exists, only for what those two cannot state: which
flavor is used for local dev, and manual steps such as copying `.env.example`.
Treat every build fact in it as advisory; the repo wins any disagreement.

**One device to a verdict at a time, never interleaved.** Every Argent
interaction tool takes a `udid` and auto-dispatches by its shape — a UUID is an
iOS simulator, anything else an Android adb serial — so multiple devices in one
run are mechanically fine. The failure is attention, not capability: asked for
two platforms at once it verifies one properly and hand-waves the other. So
report a separate verdict with its own evidence per device, and where evidence
was not gathered, say so rather than reporting a pass. Recommend a single device
while iterating on a diagnosis, multiple for a final confirmation.

**Attach to the running app.** Rebuild only when code changed. iOS builds are
slow enough that the difference dominates the loop.

**Name Argent explicitly** when reaching for logs, or the model shells out to raw
`adb logcat` — which works but loses JS-layer detail and network payloads.

**If the user already reproduced it by hand, do not drive.** Read the last few
minutes of device log and network traffic and report. Ask soon after the repro:
OS log buffers roll over regardless of tooling.

**testIDs** when an element cannot be found reliably: `screen-element` naming,
stable and semantic, never index-based or derived from visible text. One screen
at a time, as it is debugged — not a backfill. On Android `testID` lands on the
view tag and some third-party components swallow it, so add `accessibilityLabel`
as a fallback when a component is findable on iOS but not Android.

**One target per run.** Long autonomous loops drift as build-test-fix-rebuild
burns context.

## Ripple

Required by the docs contract in `CLAUDE.md`:

- `docs/CHANGELOG.md` — one line under today's heading.
- **No `DETECT_SPECS` entry.** The `project` category is `checkable: false`, so
  the card is out of the detect scan, the progress count and the machine-setup
  prompt by design. Recorded here so the omission is deliberate rather than
  forgotten.
- `README.md` — the card in its list; `elevated` and `sizeMb` do not apply.
- `docs/ARCHITECTURE.md` — register `docs/argent-guide.md` as this card's source
  material, and `docs/superpowers/specs/` as the location for design specs. Both
  are currently unregistered doc types in a contract that enumerates the rest.
- `docs/decisions/` — a numbered file recording the four contested choices:
  `--local` over global, split constants files, one skill not two, and Project
  Setup over MCP Servers.

## Out of scope

- **Editing `SETUP_PROMPT` or the run-docs card.** A docs-contract clause making
  whoever changes a flavor update `docs/RUNNING.md` was designed and then cut as
  uncommon. The skill deriving build facts from the repo makes it unnecessary.
- **Maestro.** Emitting a YAML flow on a pass so a fixed bug stays fixed in CI is
  a real want, and the field notes place it explicitly later: a CI regression
  artifact, not a debugger.
- **A hook on build-config edits.** Would catch a flavor change at the moment it
  happens, but writes machinery into the user's repo to solve a problem the
  repo-as-source-of-truth rule already removes.
- **Physical devices.** Argent does not support them.
- **A testID sweep.** The notes argue against backfilling; the skill adds them
  per screen as it debugs.

## Verification

The card is data, so most of this is reading the generated output rather than
running it.

1. `pnpm build` and `pnpm lint` clean.
2. The card renders in Project Setup with no checkbox and no progress
   contribution, and does not appear in the generated machine-setup prompt for
   any of the five platforms.
3. `hasModalContent` is true for it on every platform — the steps carry no
   per-platform variants, so no platform sees an empty modal.
4. The detect scan does not list it, and `pnpm build && npx wrangler pages dev
   dist` still ticks correctly with no `DETECT_SPECS` entry added.
5. End to end on a real RN repo, which is the only check that matters: run the
   four steps against a bare RN CLI project, confirm the two constants files and
   the skill are written, `CLAUDE.md` carries both `@` imports and `/memory`
   shows them expanded, then with no emulator booted say "verify <something> on
   Android" and confirm it boots the named AVD, derives the build command from
   gradle, and returns a verdict with evidence.
6. Point 5 with a deliberately wrong AVD name in the constants, confirming it
   stops and lists the real ones instead of substituting.
