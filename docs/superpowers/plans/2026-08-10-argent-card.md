# Argent Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one card to the rn-dev-onboarding app that installs Argent into a React Native repo and hands over a prompt which writes the repo's device constants and a `verify` skill, so a developer can say "verify this fix on Android" and get a verdict with evidence.

**Architecture:** Data-only. One `Tool` entry in `src/lib/tools.ts` (category `project`, order 4) plus one exported prompt constant in `src/lib/setupPrompt.ts` — the same two-file shape the three existing `project` cards use. No components, no hooks, no dependencies, no `DETECT_SPECS` entry. The prompt is the whole product: it interviews the developer once, writes two constants files and `.claude/skills/verify/SKILL.md` into their RN repo, and is never visited again.

**Tech Stack:** TypeScript, React 19, Vite, Tailwind v4, pnpm. Build `pnpm build` (tsc -b + vite build), lint `pnpm lint` (oxlint).

**Spec:** `docs/superpowers/specs/2026-08-10-argent-card-design.md`. Source material: `docs/argent-guide.md`.

## Global Constraints

- **No tests.** `CLAUDE.md` rule 4: "no new tests or test files (the project has none)". This repo's contract overrides the writing-plans skill's TDD default. Every task's check cycle is instead: `pnpm build` → `pnpm lint` → read the generated output. Do not create a test file.
- **No UI code.** `CLAUDE.md` rule 1: "Most feature work is data-only: add entries to `src/lib/tools.ts` … without touching UI code at all." No file under `src/components/` is modified by any task in this plan.
- **No commits without being asked.** `CLAUDE.md` rule 6: "NEVER COMMIT OR PUSH UNPROMPTED … Asking once does not grant it for later." The commit steps in this plan are written as **`- [ ] Step: Commit (only if the user has asked in this session)`**. If they have not, leave the work uncommitted and say so.
- **Comment style.** `CLAUDE.md` rule 3: comments only for a non-obvious *why*. No section banners, no emoji, no `Note:` prefixes. Match surrounding density.
- **Exact card values**, copied verbatim from the spec:
  - `id: 'argent'` · `category: 'project'` · `order: 3` · `icon: 'gauge'` — and `team-plugin` moves from `order: 3` to `4`. Cards sort on `order` (`commands.ts:14`), not array position, so this is a two-line swap and the card object stays where it is in `TOOLS`.
  - `name: 'Argent — verify on a device'`
  - `description: 'Drive the app, read logs, prove the fix.'`
  - `docsUrl: 'https://argent.swmansion.com'`
  - `version: { npm: '@swmansion/argent' }`
- **Install command:** `npx @swmansion/argent@latest init --local` — `--local` is required (spec: pinned in `devDependencies`, MCP config committed, auditable version).
- **Package identity:** `@swmansion/argent`, by Software Mansion. iOS Simulator and Android Emulator only — **never** claim physical-device support.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/lib/setupPrompt.ts` | Modify — append at end (currently 146 lines, `SETUP_PROMPT` ends at 146) | Adds `ARGENT_SETUP_PROMPT`, the pasteable prompt. Joins `RUN_DOCS_PROMPT`, `PLUGIN_BUILD_PROMPT`, `SETUP_PROMPT`. |
| `src/lib/tools.ts` | Modify — import line 2; new card before the `]` at line 1345 | The card entry. |
| `docs/CHANGELOG.md` | Modify — new `## 2026-08-10` section above `## 2026-08-07` | Docs contract. |
| `docs/decisions/0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md` | Create | The contested choices. |
| `docs/ARCHITECTURE.md` | Modify — the `docs/` block at lines 50-54 | Register `argent-guide.md` and `superpowers/` as doc types. |
| `docs/TODO.md` | Modify — append | Park the two out-of-scope follow-ups (Maestro, end-to-end run on a real RN repo). |

**Not changed, deliberately:**
- `src/lib/detect.ts` — no `DETECT_SPECS` entry. The `project` category is `checkable: false` (`src/lib/tools.ts:147`), so `aiSetup.ts:132` and `aiSetup.ts:185` skip it and the detect scan never asks. Verified: none of `team-setup-prompt`, `run-docs`, `team-plugin` has a spec either.
- `README.md` — **the spec's Ripple section is wrong here.** It says "`README.md` — the card in its list", but README has no card list (`grep -n "Team setup prompt" README.md` → no match); its `## Add or edit a tool` section documents *fields*, and Argent introduces none — `elevated` and `sizeMb` are already documented at `README.md:30-31` and Argent uses neither. No change needed. Record this in the decisions file so the next reader doesn't hunt for the list.
- Any `src/components/` file. `version` already renders independently of `checkable` (`ToolCard.tsx:51` gates only the checkbox; the badge at `ToolCard.tsx:52-61` is outside that gate), so Argent being the first `checkable: false` card with a `version` needs no code change.

---

### Task 1: `ARGENT_SETUP_PROMPT`

**Files:**
- Modify: `src/lib/setupPrompt.ts` — append after line 146 (the end of `SETUP_PROMPT`)

**Interfaces:**
- Consumes: nothing.
- Produces: `export const ARGENT_SETUP_PROMPT: string` — imported by Task 2.

**Escaping rules for this file** (it is one big template literal per prompt):
- Backticks inside the prompt body must be written `` \` ``. The existing prompts do this throughout — see `setupPrompt.ts:140`, `` run the repo's OWN formatter ``.
- `${` must be written `\${`. This prompt contains none; keep it that way.
- Plain apostrophes need no escape inside a template literal. **Do not** use a single-quoted string for this — an unescaped apostrophe in one broke the build in a previous session.

- [ ] **Step 1: Append the constant**

Add to the end of `src/lib/setupPrompt.ts`:

```ts
// Prompt for the "Argent — verify on a device" card: paste into Claude Code
// inside an RN repo where `argent init --local` has already run. It writes the
// two constants files and the verify skill; the card is not revisited after.
export const ARGENT_SETUP_PROMPT = `Argent is installed in this React Native repo. Set up the constants it needs and the verify skill that drives it. Derive everything you can from the repo itself and ask me only what the repo cannot tell you.

PHASE 1 — READ THE REPO
Find every build target and its bundle identifier.
- iOS: \`xcodebuild -list -workspace ios/*.xcworkspace\` for the schemes (\`-project ios/*.xcodeproj\` if there is no workspace), then PRODUCT_BUNDLE_IDENTIFIER per configuration from \`xcodebuild -showBuildSettings\` or the pbxproj.
- Android: applicationId plus every productFlavor's applicationId/applicationIdSuffix from android/app/build.gradle (or build.gradle.kts).
Several schemes or flavors means this is a multi-bundle repo — white-label, tenant-per-app, staging versus prod. List every one of them. Same codebase, different IDs, and nothing on a simulator says which one a task means.
Skip the iOS half if there is no ios/ directory, and the Android half if there is no android/.

PHASE 2 — ASK ME, ONCE
Put all of these in a single message and wait for my answer. Do not ask them one at a time.
1. Which scheme or flavor do you use for local development? Show me the list you found and let me pick.
2. Which iOS simulator should be the default? Run \`xcrun simctl list devices available\` and show me what this machine has.
3. Which Android AVD should be the default? Run \`emulator -list-avds\` and show me what exists. Copy the name exactly — an AVD name is whatever I typed when I created it, and a wrong one wastes a turn.
4. A test account that skips onboarding, as email and password — or "none".
Drop question 2 if there is no ios/, and question 3 if there is no android/.

PHASE 3 — WRITE FOUR THINGS
docs/dev-setup.md — committed. The schemes/flavors and bundle IDs you found, one line each, with the local-dev default marked. Repo facts only: nothing per-developer, nothing secret.
docs/dev-setup.local.md — never committed. The simulator name, the AVD name, and the test account. Add \`docs/dev-setup.local.md\` to .gitignore if it is not already covered.
CLAUDE.md — append these two lines. Do not remove, reorder or rewrite anything already in the file:
Bundle IDs and build targets: @docs/dev-setup.md
Local devices and test account: @docs/dev-setup.local.md
The \`@\` is what expands the file at launch. A prose mention like "see docs/dev-setup.md" does nothing, because CLAUDE.md is static text injected at startup and an instruction to read a file never executes. If there is no CLAUDE.md, create one holding just those two lines under a \`## Dev setup\` heading. Tell me to check \`/memory\` afterwards to confirm both expanded.
.claude/skills/verify/SKILL.md — the skill in PHASE 4.

PHASE 4 — THE VERIFY SKILL
Write .claude/skills/verify/SKILL.md with this frontmatter:
name: verify
description: Use when verifying a bug is fixed, checking a feature still works, or reading device and network logs after reproducing something by hand — drives the app through Argent on an iOS Simulator or Android Emulator and reports a verdict with evidence.
Then a body that encodes exactly these rules. Keep every one; they are the observed failure modes, not preferences. Write them in this repo's own voice, and substitute this repo's real paths where a rule names a file.

- Never run without a pass condition. The dominant failure is declaring victory: given a vague goal it fixes something, sees a plausible screen and reports success. If I did not state a pass condition, derive one and state it back before touching anything.
- Reconcile reference data against reality before acting on it. Resolve targets to udids first. If nothing is booted, boot the device named in docs/dev-setup.local.md for that platform. If that name does not exist on this machine, list what does and stop — never substitute a device I did not choose.
- Derive the build command from android/app/build.gradle and \`xcodebuild -list\` every time, never from memory. Read docs/RUNNING.md, if it exists, only for what those two cannot state: which flavor is used for local dev, and manual steps such as copying .env.example. Treat every build fact in it as advisory; the repo wins any disagreement.
- One device to a verdict at a time, never interleaved. Every Argent interaction tool takes a udid and dispatches on its shape — a UUID is an iOS simulator, anything else an Android adb serial — so several devices in one run are mechanically fine. The failure is attention, not capability: asked for two platforms at once it verifies one properly and hand-waves the other. Report a separate verdict with its own evidence per device, and where evidence was not gathered say so rather than reporting a pass. Prefer one device while iterating on a diagnosis, several only for a final confirmation.
- Attach to the running app. Rebuild only when code changed — iOS builds are slow enough that the difference dominates the loop.
- Name Argent explicitly when reaching for logs, or the model shells out to raw \`adb logcat\`, which works but loses JS-layer detail and network payloads.
- If I already reproduced it by hand, do not drive. Read the last few minutes of device log and network traffic and report what failed. Ask soon after the repro: OS log buffers roll over regardless of tooling.
- Add testIDs when an element cannot be found reliably. Naming is \`screen-element\`, stable and semantic — never index-based, never derived from visible text. One screen at a time as it is debugged, not a backfill. On Android testID lands on the view tag and some third-party components swallow it, so add accessibilityLabel as a fallback when something is findable on iOS but not Android.
- One target per run. Long autonomous loops drift as build-test-fix-rebuild burns context.

The skill states no policy on how much to fix without asking. That is ordinary judgement plus the session's permission mode, and a rule here would only re-implement it worse.

PHASE 5 — REPORT
Print what you created or appended to, and what you skipped because it already existed. Then show me the one-line command I would use next, using this repo's real local-dev flavor and the device I picked. Do not modify any application code during this setup.`
```

- [ ] **Step 2: Verify it compiles and the escaping is right**

Run: `pnpm build`
Expected: PASS. A stray unescaped backtick surfaces here as a cascade of syntax errors in `setupPrompt.ts`.

Run: `pnpm lint`
Expected: PASS, no new findings.

- [ ] **Step 3: Read the prompt back as a string, not as source**

Run:
```bash
node --input-type=module -e "
const s = await import('./src/lib/setupPrompt.ts').catch(() => null);
" 2>/dev/null || node -e "
const fs=require('fs');
const src=fs.readFileSync('src/lib/setupPrompt.ts','utf8');
const m=src.match(/ARGENT_SETUP_PROMPT = \`([\s\S]*?)\`\n/);
if(!m){console.error('NOT FOUND');process.exit(1)}
const body=m[1].replace(/\\\\\`/g,'\`');
console.log(body);
console.log('---');
console.log('backticks in output:', (body.match(/\`/g)||[]).length);
console.log('literal-backslash-backtick left:', (body.match(/\\\\\`/g)||[]).length);
"
```
Expected: the full prompt prints as prose; every `` \` `` has become a real backtick; `literal-backslash-backtick left: 0`. Read the output top to bottom and confirm all five PHASE headings are present and no `\`` sequences remain visible.

- [ ] **Step 4: Commit (only if the user has asked in this session)**

```bash
git add src/lib/setupPrompt.ts
git commit -m "feat: add the Argent setup prompt"
```

---

### Task 2: The card

**Files:**
- Modify: `src/lib/tools.ts:2` (the import), and insert a new object before the closing `]` at `src/lib/tools.ts:1345`

**Interfaces:**
- Consumes: `ARGENT_SETUP_PROMPT` from Task 1.
- Produces: a `Tool` with `id: 'argent'`, discoverable by `toolsInCategory('project')`.

- [ ] **Step 1: Extend the import**

`src/lib/tools.ts:2` currently reads:

```ts
import { PLUGIN_BUILD_PROMPT, RUN_DOCS_PROMPT, SETUP_PROMPT } from './setupPrompt'
```

Change to (alphabetical, matching the existing order):

```ts
import { ARGENT_SETUP_PROMPT, PLUGIN_BUILD_PROMPT, RUN_DOCS_PROMPT, SETUP_PROMPT } from './setupPrompt'
```

- [ ] **Step 2: Insert the card**

Insert immediately after the `team-plugin` card's closing `},` (`src/lib/tools.ts:1344`) and before the array's `]` (line 1345):

```ts
  {
    id: 'argent',
    category: 'project',
    name: 'Argent — verify on a device',
    description: 'Drive the app, read logs, prove the fix.',
    icon: 'gauge',
    order: 4,
    docsUrl: 'https://argent.swmansion.com',
    version: { npm: '@swmansion/argent' },
    note: 'Run the Team setup prompt first, then this — both write into .claude/, and nothing arbitrates between them.',
    modal: {
      intro:
        'Argent drives iOS Simulators and Android Emulators, reads device logs and network traffic at both the JS fetch layer and the native layer, and can attach a debugger. Free and local, no account. Simulators and emulators only — no physical devices. Steps 1 and 2 run in your terminal at the repo root; step 4 is one prompt that sets the repo up once, after which you just ask Claude to verify something.',
      prereq:
        'Repo cloned, and the app already builds by hand — Argent will not fix a broken build config. Xcode for iOS, or Android Studio with an AVD you have created. Node 18+. Metro stays yours to run, in its own terminal.',
      steps: [
        {
          command: 'npx @swmansion/argent@latest init --local',
          note: 'In your terminal, at the repo root. An interactive wizard, so it needs a real terminal.',
          userRun: true,
          tooltip:
            '--local puts Argent in devDependencies and commits the MCP config, so a teammate who clones and installs gets it — and the version is pinned, which global mode plus npx @latest never is.',
        },
        {
          command: 'git status && git diff',
          note: 'init writes .mcp.json, .argent/, and skills, rules and agents into .claude/. Read the diff and revert anything you did not want.',
        },
        {
          command: 'Restart Claude Code, then ask it "what can Argent do?" to confirm the server loaded.',
          manual: true,
        },
        {
          command: 'argent telemetry disable',
          note: 'Optional. Telemetry is on by default — usage and diagnostics, not your source.',
          alt: true,
        },
        {
          command: ARGENT_SETUP_PROMPT,
          note: 'Paste into Claude Code inside the repo. It reads your build targets, asks four questions once, then writes the constants and the verify skill.',
          label: 'Copy prompt',
          multiline: true,
          download: true,
          filename: 'argent-setup-prompt.md',
          tooltip:
            'Mixed licence: the source is Apache 2.0, but the simulator-server and native devtools binaries are Software Mansion proprietary, licensed for use within the project. Matters only if legal audits your dependencies.',
        },
      ],
    },
  },
```

- [ ] **Step 3: Build and lint**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Verify the card is data-correct without a browser**

Run:
```bash
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/lib/tools.ts','utf8');
for (const s of [\"id: 'argent'\", \"category: 'project'\", \"order: 4\", \"icon: 'gauge'\", \"npm: '@swmansion/argent'\", 'init --local'])
  console.log((t.includes(s)?'ok  ':'MISS')+' '+s);
console.log((t.match(/icon: 'gauge'/g)||[]).length===1 ? 'ok   gauge used once' : 'MISS gauge collision');
console.log(!/DETECT_SPECS[\s\S]*argent/.test(fs.readFileSync('src/lib/detect.ts','utf8')) ? 'ok   no detect spec' : 'MISS unexpected detect spec');
"
```
Expected: every line `ok`.

- [ ] **Step 5: Verify the card stays out of the AI setup on all five platforms**

Run:
```bash
rm -rf /tmp/argent-check && mkdir -p /tmp/argent-check
npx tsc src/lib/aiSetup.ts --outDir /tmp/argent-check --module commonjs --moduleResolution node --skipLibCheck --target es2020 2>&1 | tail -3
node -e "
const { generateAiSetup } = require('/tmp/argent-check/lib/aiSetup.js');
for (const p of ['mac-arm','mac-intel','win-x64','win-arm','linux-x64']) {
  const out = generateAiSetup(p);
  console.log(p, /argent/i.test(out) ? 'FAIL — argent leaked into the prompt' : 'ok');
}
"
```
Expected: `ok` for all five. `project` is `checkable: false`, so `aiSetup.ts:132` and `:185` skip the whole category.

If `npx tsc` on a single file cannot resolve the imports, fall back to reading `aiSetup.ts:132` and `:185` and confirming both `continue` on `category.checkable === false`, then state in the handoff that this check was reasoned rather than executed.

- [ ] **Step 6: Render it**

Run: `pnpm dev`, open http://localhost:5173, scroll to **Project Setup**.
Confirm by eye:
- The card reads "Argent — verify on a device" with a `v…` badge next to the name (live npm lookup; a network-blocked machine shows no badge, which is fine).
- **No checkbox** in the top-right — `project` is `checkable: false`.
- The category header still reads `—` rather than a `done/total` count.
- **View setup** opens a modal with 5 steps: step 1 copyable and flagged as yours to run, step 2 copyable, step 3 as prose, the telemetry line bulleted rather than numbered, and the prompt with a **Copy prompt** button and a download.
- Type "argent" in the search box — the card survives and the Project Setup chip stays enabled.

- [ ] **Step 7: Commit (only if the user has asked in this session)**

```bash
git add src/lib/tools.ts
git commit -m "feat: add the Argent card to Project Setup"
```

---

### Task 3: Docs ripple

**Files:**
- Create: `docs/decisions/0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md`
- Modify: `docs/CHANGELOG.md` — insert a `## 2026-08-10` section above `## 2026-08-07` (line 7)
- Modify: `docs/ARCHITECTURE.md:50-54` — the `docs/` block
- Modify: `docs/TODO.md` — append two parked items

**Interfaces:** none — documentation only.

- [ ] **Step 1: Write the decisions file**

Create `docs/decisions/0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md`. Match the format of `docs/decisions/0040-the-unix-scan-script-is-piped-to-sh.md` exactly — read it first for the heading and status conventions. Content must record all five contested choices with their reasoning:

1. **Project Setup, not MCP Servers.** Every existing `mcp` card is machine-wide (`claude mcp add --scope user`, [0036](0036-mcp-servers-register-at-user-scope.md)) and found by the scan through a `~/.claude.json` needle. Argent's config is `.mcp.json` inside the repo, so the scan cannot see it and the machine-setup prompt runs before any repo exists. `project` is `checkable: false`, which is what something configuring a repo needs.
2. **`--local`, not global.** Global mode plus `npx @latest` means every developer silently runs a different build of a partly-proprietary binary with no record of which. A pinned `devDependency` is visible and identical for everyone. The audit argument initially pointed the other way — a committed dependency looked like more exposure, not less — until the version-identity point flipped it.
3. **One skill, not two.** Driving the app and reading logs after a manual repro are different workflows, not different skills: same tools, same constants, same discipline, differing only in whether the user already reproduced the problem. That is a branch in the body. Two skills with overlapping descriptions is how the model picks the wrong one, and `docs/argent-guide.md:135` already records it mis-routing to raw `adb logcat`.
4. **Constants split across two files, imported with `@`.** `docs/dev-setup.md` is committed and holds repo facts; `docs/dev-setup.local.md` is gitignored and holds device names and a test account — per-developer, one of them a credential. Both arrive via `@` imports because a prose file mention never executes.
5. **The repo is the source of truth for build facts, so no staleness machinery.** The skill derives build commands from `android/app/build.gradle` and `xcodebuild -list` on every run. This removes staleness as a category rather than managing it: no stale-doc detection to get right, no refresh to remember, and a flavor added five minutes ago is picked up. A docs-contract clause obliging whoever changes a flavor to update `docs/RUNNING.md`, and a hook on build-config edits, were both designed and cut as unnecessary once this rule existed.

Also record the two ripple facts a future reader will otherwise re-derive:
- **No `DETECT_SPECS` entry, deliberately** — the category is `checkable: false`, so the card is outside the scan, the progress count and the AI-setup prompt by design.
- **No `README.md` change** — its `## Add or edit a tool` section documents fields, and Argent introduces none. The spec's Ripple section wrongly said README carries a card list; it does not.

- [ ] **Step 2: Write the CHANGELOG line**

Insert above `## 2026-08-07` (`docs/CHANGELOG.md:7`). Match the existing density — those entries are long paragraphs that explain the *why*, not one-liners:

```markdown
## 2026-08-10

### Added

- An **Argent** card in Project Setup: `npx @swmansion/argent@latest init --local`, read the diff, restart, then one prompt that sets the repo up for good. Argent drives iOS Simulators and Android Emulators, reads device logs and network traffic at both the JS `fetch` layer and the native layer, and can attach a debugger — the gap after `react-native doctor`, which proves the toolchain is installed and nothing about whether the app behaves. What the card delivers is not "install Argent" but a verification loop that costs nothing to invoke: the prompt writes `docs/dev-setup.md` (committed build targets), `docs/dev-setup.local.md` (gitignored devices and test account), the two `CLAUDE.md` `@` imports that actually expand them, and `.claude/skills/verify/SKILL.md` — after which the card is never opened again, because the skill loads itself when a task matches. `--local` over global mode on audit grounds that first looked like the opposite conclusion: a pinned `devDependency` is one version everyone can see, where global plus `npx @latest` is a different build of a partly-proprietary binary per machine with no record of which. It sits in Project Setup rather than MCP Servers because its config is `.mcp.json` inside the repo, invisible to a scan that looks for `~/.claude.json` needles and irrelevant to a machine-setup prompt that runs before any repo exists — and so it carries no `DETECT_SPECS` entry, which is the category being `checkable: false` working as intended rather than an omission. The skill encodes only observed failure modes, chief among them that Argent declares victory early: given a vague goal it fixes something, sees a plausible screen and reports success, so a pass condition is stated before anything is touched. It derives build commands from `android/app/build.gradle` and `xcodebuild -list` on every run instead of trusting a document, which removes staleness as a category rather than managing it ([0041](decisions/0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md)).
```

- [ ] **Step 3: Register the two doc types in ARCHITECTURE**

`docs/ARCHITECTURE.md:50-54` currently enumerates the docs tree and names `SETUP-RUN-FINDINGS.md` as a one-off record. Two committed doc types are absent from a block that enumerates the rest. Extend it — matching the existing indentation and terse phrasing — so it also names:
- `argent-guide.md` — field notes on Argent, the source material the Argent card's prompt and skill derive from.
- `superpowers/specs/` and `superpowers/plans/` — design specs and implementation plans from the brainstorming/writing-plans workflow.

Keep the diff to the `docs/` block. Do not restructure the file.

- [ ] **Step 4: Park the follow-ups in TODO**

Append to `docs/TODO.md`, matching its existing item format (read the file first):
- **End-to-end Argent run on a real bare-RN repo** — the card's steps have never been executed against an actual RN project. Blocked on having one to hand. What to check is Task 4 Step 3 of `docs/superpowers/plans/2026-08-10-argent-card.md`.
- **Maestro card, later** — emitting a YAML flow on a pass so a fixed bug stays fixed in CI. Out of scope here on purpose: `docs/argent-guide.md:182` places it as a CI regression artifact, not a debugger. Only worth a card once someone wants PR-time regression checks.

- [ ] **Step 5: Verify the contract is satisfied**

Run:
```bash
grep -c "## 2026-08-10" docs/CHANGELOG.md
ls docs/decisions/0041-*.md
grep -c "argent-guide" docs/ARCHITECTURE.md
grep -c "superpowers" docs/ARCHITECTURE.md
grep -ci "argent" docs/TODO.md
```
Expected: `1`, the file listed, `≥1`, `≥1`, `≥1`.

- [ ] **Step 6: Commit (only if the user has asked in this session)**

```bash
git add docs/
git commit -m "docs: record the Argent card decisions and ripple"
```

---

### Task 4: Review gates and the end-to-end check

**Files:** none created or modified unless a reviewer finds something.

**Interfaces:** none.

`CLAUDE.md` "Workflow gates": substantive features end with `code-reviewer` + `consistency-checker`. `security-reviewer` is **not** required — its trigger is "the relay, generated scripts, storage, or external input", and this change touches none: no `DETECT_SPECS` entry means no generated-script change, and the prompt is copied by a human, never executed by this app. Run it anyway if `git diff` turns out to touch `detect.ts` or `detectScript.ts`, which would mean the plan was departed from.

- [ ] **Step 1: Run the two required reviewers**

Dispatch the `code-reviewer` and `consistency-checker` agents from `.claude/agents/` over the diff. Give each the spec path (`docs/superpowers/specs/2026-08-10-argent-card-design.md`) so it can check intent, not just style.

Fix what they find before finishing. In previous rounds on this repo each review found real regressions in the prior round's fixes, so do not treat a clean first pass as expected — if a reviewer returns nothing, say so plainly rather than implying it was verified more deeply than it was.

- [ ] **Step 2: Final build and lint**

Run: `pnpm build && pnpm lint`
Expected: both PASS.

- [ ] **Step 3: The end-to-end check — the only one that matters**

This needs a real bare-RN CLI repo and a machine with Xcode and/or Android Studio. **It cannot be faked**, and every check above is static. If no such repo is available, stop here, say explicitly that the card is unverified end to end, and confirm Task 3 Step 4 parked it in `docs/TODO.md`.

With a repo available:
1. Run the four card steps against it.
2. Confirm `docs/dev-setup.md`, `docs/dev-setup.local.md` and `.claude/skills/verify/SKILL.md` were written, and that `docs/dev-setup.local.md` is gitignored (`git check-ignore -v docs/dev-setup.local.md` exits 0).
3. Confirm `CLAUDE.md` carries both `@` import lines and that `/memory` shows them **expanded** — a prose mention would have looked identical in the file and done nothing.
4. With **no emulator booted**, say "verify <something> on Android". Confirm it boots the AVD named in `docs/dev-setup.local.md`, derives the build command from `android/app/build.gradle`, and returns a verdict with evidence.
5. Then set the AVD name in `docs/dev-setup.local.md` to something that does not exist and repeat. Confirm it **lists the real AVDs and stops** rather than substituting one. This is the check the "reconcile reference data against reality" rule exists for; a pass here without it proves nothing.

- [ ] **Step 4: Report**

State what was verified by execution versus by reading, name step 3 explicitly if it was not run, and do not describe the card as working end to end unless step 3 passed.

---

## Self-Review

**Spec coverage** — every section of `docs/superpowers/specs/2026-08-10-argent-card-design.md` maps to a task:

| Spec section | Task |
| --- | --- |
| The card (id/category/order/icon/docsUrl/version, prereq, 4 steps, 2 tooltips) | Task 2 Step 2 |
| The setup prompt (derives bundle IDs, asks 4 things once, writes 5 artifacts) | Task 1 Step 1 |
| The skill (9 encoded failure modes, no fix policy) | Task 1 Step 1, PHASE 4 |
| Decisions (6 contested choices) | Task 3 Step 1 |
| Ripple — CHANGELOG | Task 3 Step 2 |
| Ripple — no `DETECT_SPECS`, recorded as deliberate | File Structure table + Task 3 Step 1 |
| Ripple — README | File Structure table: **spec is wrong, no change needed**, recorded in the decisions file |
| Ripple — ARCHITECTURE registers `argent-guide.md` + `superpowers/` | Task 3 Step 3 |
| Ripple — a numbered decisions file | Task 3 Step 1 |
| Out of scope (5 items) | Not implemented; Maestro parked in Task 3 Step 4 |
| Verification points 1-4 (build, render, no AI-setup leak, no scan entry) | Task 2 Steps 3-6, Task 4 Step 2 |
| Verification points 5-6 (end to end, wrong AVD name) | Task 4 Step 3 |

**One deviation from the spec, deliberate:** the card has **5** steps, not 4. `argent telemetry disable` is `alt: true` (bulleted, does not advance the count), so it reads as an aside rather than a required step — the spec called for telemetry as a *tooltip*, but a tooltip cannot be copied and this is a real command. The licence caveat stays a tooltip as specified. Net effect on the spec's four numbered steps: unchanged.

**Placeholder scan:** no TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries its literal content; the prompt and skill bodies are written out in full rather than described.

**Type consistency:** `ARGENT_SETUP_PROMPT` is the identical identifier in Task 1 (export), Task 2 Step 1 (import) and Task 2 Step 2 (use). Card fields are checked against the `Tool`/`ModalStep` interfaces at `src/lib/tools.ts:11-131`: `userRun`, `alt`, `label`, `multiline`, `download`, `filename`, `tooltip`, `manual`, `note` all exist; `version` accepts `{ npm: string }` per `src/lib/versions.ts:7`. `sizeMb` and `elevated` are correctly absent — neither applies.
