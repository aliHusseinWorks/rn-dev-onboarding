// Prompt for the "Run-the-app docs" card: paste into Claude Code inside a
// cloned RN repo; it studies the repo and writes docs/RUNNING.md.
export const RUN_DOCS_PROMPT = `Study this React Native repository and write docs/RUNNING.md — the single doc a new developer follows to go from a fresh clone to the app running on a device. Derive everything from the repo itself (package.json scripts/packageManager/engines, .nvmrc, .ruby-version, Gemfile, ios/, android/, .env.example, existing README); do not guess and do not include steps this repo doesn't need. If docs/RUNNING.md already exists, update only what's wrong or missing.

Cover, in order, with exact copy-pasteable commands:
1. Prerequisites — the tools and versions THIS repo needs (Node version from .nvmrc/engines, package manager from packageManager, Ruby/CocoaPods only if ios/Podfile exists, JDK version from android/ gradle config).
2. First-time setup — switch Node (fnm use), corepack enable if pinned, install JS deps with the repo's own package manager, iOS pods (bundle exec pod install if a Gemfile exists, else pod install), and any env files (.env.example → .env, listing which values a dev must fill and where to get them).
3. Run on emulator/simulator — start Metro, run Android on an AVD, run iOS on the Simulator (note iOS requires macOS).
4. Run on a physical device — Android: enable USB debugging, verify with adb devices; iOS: signing team in Xcode, trusting the developer profile on the device.
5. Troubleshooting — only failures this repo can actually hit (wrong Node version, missing ANDROID_HOME, stale pods, Metro cache), each with its one-line fix.

Keep it command-first and short — a checklist, not an essay. Do not modify any app code or config.`

// Prompt for the "Team plugin" card, Create mode: paste into Claude Code inside
// an empty repo that becomes the company's plugin marketplace.
export const PLUGIN_BUILD_PROMPT = `You are turning this empty repository into {company}'s Claude Code plugin marketplace. The company slug is "{company}", so this repo is {company}-claude, the baseline plugin is named {company}, and stack plugins added later are {company}-rn-mobile, {company}-web, and so on.

FIRST, ask me one question and wait for the answer:
Any company-specific rules to encode beyond the defaults below (or "none")?

THEN create exactly this, and nothing else:

.claude-plugin/marketplace.json — name "{company}-claude", an owner object, and a plugins array whose one entry is { "name": "{company}", "source": "./{company}", "description": … }. A relative source keeps the plugin inside this repo, which is what lets a private marketplace work without a second repo anyone needs access to.
{company}/.claude-plugin/plugin.json — name "{company}", version "0.1.0", a one-line description, and "hooks": "./hooks/hooks.json".
{company}/hooks/hooks.json — wires the guards below.
{company}/hooks/guard.mjs — ONE Node script that reads the hook JSON on stdin and switches on hook_event_name and the tool input. Node, not shell: this travels to Windows and macOS machines and jq is a given on neither.
README.md — what this repo is, how a developer installs it, and how to add a stack plugin.

NO skills and NO agents in the baseline. Everything universal is a hook; anything that needs a skill is stack-specific and belongs in a stack plugin, written when someone has real pain to encode rather than now.

THE FIVE GUARDS
1. Git sign-off — git commit and git push each ask for explicit approval, as two separate gates. Use permissionDecision "ask", not "deny": approval is exactly the thing that should be possible.
2. Destructive git — deny git push --force, git push -f, git reset --hard, git commit --amend, and git rebase outright.
3. Secret files — deny reading or editing .env and its variants, *.pem, id_rsa, and credentials.json. Never .env.example.
4. Package manager — read the host repo's package.json packageManager field, else whichever lockfile exists (pnpm-lock.yaml / yarn.lock / package-lock.json), and deny the other managers whole. Never hardcode one: this plugin lands in repos that disagree with each other.
5. Code style — inject the comment rules when a code file is about to be edited: comments only where a reader who knows the codebase would still be surprised; never narrate history, a fixed bug, or what the code used to do; no section banners, no emoji.

HOW EVERY GUARD MUST BEHAVE
- Narrow it with the "if" field so the script never runs when it cannot apply: "if": "Bash(git push *)", "if": "Edit(*.ts)". A command rule only wildcards with a space before the star — Bash(git rebase *) prefix-matches, Bash(git rebase*) matches a command literally ending in an asterisk and so never fires. A flag that can appear later in the line (git push origin --force) is out of reach of a prefix rule; take the common form and let the script's own parsing catch the rest.
- Check the working directory before acting. This plugin is installed per machine and fires in every repo its owner opens, including repos it was never written for. A guard that cannot tell whether it applies must do nothing.
- Guard 5 injects, never blocks: exit 0 with hookSpecificOutput.additionalContext and no permissionDecision, so the edit proceeds and Claude simply reads the rule. Before injecting, grep the host repo's CLAUDE.md and .claude/rules/ for the rule's own keywords and stay silent if the repo already says it — a repo that ran its own setup must not hear the same rule twice. When the check is ambiguous, speak: a duplicated paragraph costs less than a missing rule.
- Guard 5 speaks once per session, not once per file. Key a marker file in the OS temp directory to the session id from the hook input, or a thirty-file refactor pays for the same paragraph thirty times.
- Blocking guards exit 2 with the reason on stderr, or return permissionDecision with permissionDecisionReason. Say what to do instead, not just no.

NOTHING SENSITIVE GOES IN THIS REPO. It is cloned in plaintext onto every developer's machine and auto-updates from git. Private here means the company's conventions aren't public — it is not a safe place for a token, an internal hostname, or a customer name.

BEFORE YOU FINISH
- Run each guard once and show me what happened: a denied command, an allowed one, and guard 5 both speaking and staying quiet. A hook nobody has fired is a hook that does not work.
- Print the tree you created and one line per guard.
- Print the exact steps to add a stack plugin: create {company}-rn-mobile/ with its own .claude-plugin/plugin.json, add one entry to the plugins array, commit. Say that a stack plugin is where skills belong, and that its hooks answer to the same working-directory rule.

Do not create files outside this repository, and do not add a CLAUDE.md for the plugin — a plugin's own CLAUDE.md is never shipped to the people who install it.`

// The team's Claude workspace setup prompt, embedded verbatim for the
// "Team setup prompt" card. Edit here to update what the card copies.
export const SETUP_PROMPT = `You are setting up the Claude Code workspace for an existing React Native mobile project. This codebase may have been written entirely by hand with no AI involvement. Your single most important job is to make every future AI contribution indistinguishable from the existing hand-written code. The app must never read like a mix of manual coding and AI coding.

PHASE 1 — STUDY THE CODEBASE FIRST (do this before creating anything)
Read the project thoroughly: package.json, the folder structure, navigation setup, state management, styling approach, theme files, API layer, and a representative sample of screens and components. From this, extract the project's actual conventions:
- Naming (files, components, hooks, functions, variables)
- Folder organization and where each kind of file lives
- Styling pattern (StyleSheet.create, styled-components, Tailwind/NativeWind, inline — whatever it actually uses) and the theme/design tokens (colors, spacing, typography)
- Component patterns (function declarations vs arrow functions, default vs named exports, prop typing style)
- Error handling and async patterns actually used
- Commenting style: measure the real comment density and tone of the existing code
Do not guess or assume. Everything in the workspace config must be derived from what the code actually does.

PHASE 2 — CREATE THE WORKSPACE
Create this structure:
.claude/
├── settings.json
├── rules/
│   ├── code-style.md
│   ├── security.md
│   └── testing.md          (only if the repo has a test suite)
├── hooks/
│   └── guard.mjs           (every hook in settings.json runs this one script)
├── skills/
│   ├── rn-component/SKILL.md
│   ├── rn-screen/SKILL.md
│   ├── api-integration/SKILL.md
│   ├── new-feature/SKILL.md
│   └── fix-bug/SKILL.md
└── agents/
    ├── architect.md
    ├── code-reviewer.md
    ├── consistency-checker.md
    └── security-reviewer.md
docs/
├── ARCHITECTURE.md
├── CHANGELOG.md
└── decisions/
    └── 0001-claude-workspace-setup.md

After Phase 1 you may additionally propose up to TWO repo-specific skills or agents, ONLY if something you found clearly demands them (a Detox/e2e suite, custom native modules, a design-system package). Present the proposal with one line of justification each and wait for my confirmation before creating them. The default is none — never invent tooling the repo's reality doesn't call for.

IMPORTANT: Before creating any file, check whether it (or an equivalent) already exists. Never recreate, overwrite, or "improve" anything that already exists — not existing CLAUDE.md content, not existing components, utilities, hooks, themes, configs, or scripts. If CLAUDE.md exists, only append a clearly separated section; if a convention is already documented, don't restate it.

CLAUDE.md must encode these non-negotiable rules for every future session, stated explicitly:
1. REUSE BEFORE CREATE — before writing any component, hook, utility, style, or service, search the codebase for an existing one and use it. Never rebuild something that exists, and never duplicate logic "cleaner" in a new file.
2. MATCH THE EXISTING STYLE EXACTLY — same naming, same file organization, same component patterns, same styling approach, and always the existing theme/design tokens. Never introduce a new styling method, new color values, new spacing constants, or a new architectural pattern. New UI must look like it was built by the same person who built the rest of the app.
3. NO AI-STYLE COMMENTS — no comments that narrate the obvious ("// Set loading to true", "// Return the component", "// Handle the response"), no section-banner comments, no emoji, no "Note:" explainers. Comments are allowed only where a hand-written codebase would genuinely have one: a non-obvious workaround, a platform quirk, a business rule that isn't self-evident. Match the comment density of the existing code — if the codebase is nearly comment-free, new code should be too. Never narrate history: not what the code used to do, what bug a change fixed, what a review caught, or what happened "previously". That belongs in the commit message and the changelog, which stay attached to the change, whereas a comment describing a bug that no longer exists is a lie by the next refactor. Same rule in tests — a test name states the behaviour, a docblock re-telling the bug it came from adds nothing.
4. NO UNSOLICITED EXTRAS — no new tests, no test files, no README additions, no refactors of untouched code, no dependency additions, no config changes, unless explicitly asked. Do exactly the task, nothing around it.
5. MINIMAL DIFFS — touch the fewest files and lines needed. Never reformat or reorganize code you didn't need to change.
6. NEVER COMMIT OR PUSH UNPROMPTED — no git commit, push, branch creation, or PR unless the user explicitly asks in that session. Asking once does not grant it for later. Never use --force or rewrite history.

CLAUDE.md must also encode the docs contract, stated as rules:
- Read before: check docs/ARCHITECTURE.md before writing code, adding a module, or choosing a library/pattern; check docs/decisions/ before revisiting a past choice. (Work items live in Jira, not in a repo file.)
- Update after, in the same session: shipped a feature/fix → one line in docs/CHANGELOG.md under today's date; made a decision with the user → new numbered file in docs/decisions/ (never edit old ones, supersede them); changed structure or stack → update docs/ARCHITECTURE.md. Any change to one surface must ripple to everything that consumes it (configs, generated prompts, docs) in the same session.
- Workflow gates: substantive features start with the architect agent (design before code) and end with code-reviewer + consistency-checker; changes touching auth, storage, networking, deep links, or WebViews also run security-reviewer.

Keep CLAUDE.md itself short: the six rules, the docs contract, quick facts (package manager, run commands for iOS and Android, lint command), and one line pointing at \`.claude/rules/\` for the concrete conventions — only if not already documented. Each fact lives in exactly one place: the conventions go in the rule file and are not restated in CLAUDE.md or ARCHITECTURE.md, or the two copies drift and a future session follows the stale one. Everything structural goes in docs/ARCHITECTURE.md, which you write from Phase 1: folder map, navigation and state libraries, theme file locations all new UI must consume, data flow, and a "when you need X, use Y, never Z" table of the repo's actual patterns. Seed docs/CHANGELOG.md with a header stating its convention — newest first, one section per day (## YYYY-MM-DD), Added/Changed/Removed/Fixed in that order inside each — and today's date as the first section; a repo that tags releases can use version headings instead. Write docs/decisions/0001 recording this workspace setup itself (what was created and why). All project docs live under docs/ (README stays at the root). If any of these docs already exist, extend rather than recreate them.

Rules (\`.claude/rules/*.md\` — Claude Code loads these on its own, so this is where the conventions live rather than in a prose doc nobody opens. Give each file YAML frontmatter with a \`paths:\` list of globs, so it loads only when Claude touches matching files:
---
paths:
  - "src/**/*.{ts,tsx}"
---
Write nothing in these files that isn't already true of this codebase. A rule file that reproduces an idealized style guide instead of THIS repo makes every future contribution inconsistent, which is the exact failure this setup exists to prevent):
- code-style.md, scoped to the app's source globs — the conventions you measured in Phase 1, stated concretely enough to verify: interface vs type, how strict the TS config actually is, naming for files/components/hooks/constants, import order and whether a path alias exists, function declarations vs arrows, named vs default exports, the real async and error-handling patterns, indentation and quote/semicolon style, and the comment rules from rule 3 in full. Cite real files from this repo as the reference to imitate. Do NOT import rules the code visibly doesn't follow — no max-function-length or early-return rule if the codebase ignores it, no \`async/await\` mandate where it uses \`.then()\`, no \`@/\` alias unless one is configured.
- security.md, scoped to the trust boundaries you actually found (API client and auth/token handling, secure storage, deep links, WebViews, native bridge, anything that reaches the network) — the invariants that must stay true there, phrased as what must not regress in the code that exists, not a generic OWASP checklist.
- testing.md, scoped to the test globs — ONLY if this repo has a test suite. Encode the runner, where tests live, the patterns to imitate, and rule 4 (no new tests unless asked). If there is no test suite, skip this file entirely rather than inventing a testing policy the team never agreed to.

Skills (\`.claude/skills/<name>/SKILL.md\`, which is what gives you \`/<name>\`. Custom commands were merged into skills, so do NOT create a \`.claude/commands/\` directory — the same file as a skill also loads automatically when Claude judges it relevant, where a command only ever fires when someone types it. Each SKILL.md: YAML frontmatter with name + description, then instructions grounded in the project's real patterns, citing actual example files from this repo as the reference to imitate. Put the trigger in the description — "Use whenever …" — since that text is all Claude sees when deciding whether to load it. The two workflow skills take an argument, so give them an \`argument-hint\` and use \`$ARGUMENTS\` in the body):
- rn-component: creating a component that is indistinguishable from existing ones — reference 2-3 real components in this repo as the template.
- rn-screen: creating and registering a screen exactly the way existing screens are registered, using the same navigation typing and safe-area handling already present.
- api-integration: adding an API call through the existing client and error-handling pattern only — never a new fetch wrapper.
- new-feature: plan which EXISTING screens/components/services can be reused, list what genuinely must be new, get confirmation, then implement via the skills above.
- fix-bug: reproduce by reading the relevant code, propose the minimal fix, implement it with the smallest possible diff. No regression tests unless asked.

Agents (markdown with YAML frontmatter: name, description, tools, model — all read-only):
- architect: consulted BEFORE substantive work — evaluates a proposed feature against docs/ARCHITECTURE.md, docs/decisions/, and the actual code; answers where it should live, what existing screens/components/services to reuse, what is genuinely new, and what tempting approach would violate the structure. Proportional output: small request, short design.
- code-reviewer: reviews diffs for React Native pitfalls, security issues, and violations of the six CLAUDE.md rules above.
- consistency-checker: compares new/changed code against neighboring existing files and flags anything that would reveal it wasn't hand-written by the team — style drift, off-theme values, AI-style comments, duplicated existing logic, or unrequested additions.
- security-reviewer: reviews diffs at the app's actual trust boundaries, derived from Phase 1 (API clients and auth/token handling, secure storage — Keychain/EncryptedSharedPreferences vs AsyncStorage, deep links and WebViews, secrets in the bundle, PII in logs/crash reporting). Findings ordered by severity with file:line and the minimal fix; no theoretical padding.

settings.json: permissions and hooks, nothing else. Rules are context and Claude can talk itself out of them; hooks and deny rules run whatever Claude decides, so they are the enforcement layer for the few things that must not depend on good behaviour. Add only ones that can actually fire in THIS repo, and run each one once before you finish to prove it does.
- \`permissions.deny\`: hand-edits to the lockfile; generated and vendored native output (ios/Pods, android/build, .xcworkspace/xcuserdata, build/ artifacts); \`Edit\` on \`.env\` and its variants, plus \`Read\` on the ones holding real secrets (never .env.example); and the history rewrites rule 6 forbids outright — \`git push --force *\`, \`git push -f *\`, \`git commit --amend *\`, \`git rebase *\`, \`git reset --hard *\`. A command rule only wildcards with a space before the star: \`Bash(git rebase *)\` prefix-matches, while \`Bash(git rebase*)\` is an exact match on a command ending in an asterisk and so never fires. A flag that can also appear later in the line (\`git push origin --force\`) is out of reach of a prefix rule — take the common form and don't chase the rest. Paths use gitignore-style patterns anchored at the project (\`Edit(/ios/Pods/**)\`), and an \`Edit(...)\` rule already covers Write. Repeat the command rules under both \`Bash(...)\` and \`PowerShell(...)\` if the team is mixed-OS.
- Wrong package manager: derive the right one from package.json \`packageManager\`, else from whichever lockfile exists, and deny the others whole (\`Bash(npm *)\`, \`Bash(yarn *)\`, …) rather than listing install subcommands, which leaves \`npm i\` open. Deny rules cover this — no hook script needed.
- PostToolUse on \`Edit|Write\`: run the repo's OWN formatter on the edited file, if one is configured (prettier, biome, eslint --fix — whatever package.json actually has). Skip this hook if the repo has no formatter, or if its linter only ever emits warnings and therefore always exits 0: a hook that cannot fail is worse than no hook, and never add a formatter to give the hook something to do.
- Stop: check that source edited today has its docs/CHANGELOG.md line, and exit 2 with the reason if not. That is the part of the docs contract a session skips first when it ends abruptly.
- Stop: reject the comment tells rule 3 names outright — an emoji, a section banner, a \`Note:\` prefix — in comment lines this work added. Read them from \`git diff HEAD\` AND from the files \`git ls-files --others --exclude-standard\` reports, because a newly created file appears in no diff and would otherwise be the one place the check can't see. Strip the comment marker and anchor the \`Note:\` pattern to the start of what's left, or an ordinary sentence containing "note:" trips it. Enforce only this mechanical half and say so in the script: whether a well-formed comment actually says something the code doesn't is judgement no regex has, and the rule file is what carries it.
Any hook that needs the tool input parses the hook JSON on stdin, so write it as one Node script under .claude/hooks/ that switches on \`hook_event_name\` — not a shell script. RN teams run mixed macOS and Windows machines and \`jq\` is a given on neither. Stay inside what the oldest Node a teammate might have on PATH provides: \`fs.globSync\` arrived in Node 22, and an import that doesn't resolve throws before any of the script runs, so the hook exits 1 and Claude Code lets the session end — the whole guard silently absent on anyone's older Node. Ask git for file lists instead. Run each hook once on this repo before you finish, including a deliberately failing case, or you have only proved that it loads. A PreToolUse hook denies with \`hookSpecificOutput.permissionDecision\`; \`"ask"\` rather than \`"deny"\` where a human might legitimately approve the thing.

PHASE 3 — REPORT
Print a tree of what was created (and anything you skipped, because it already existed or because this repo gave it nothing to do), plus a one-line summary per rule, hook, skill and agent — for each hook, state that you ran it and what it did. Do not modify a single line of application code during this setup.`

// Prompt for the "Argent — verify on a device" card: paste into Claude Code
// inside an RN repo where `argent init --local` has already run. It writes the
// constants and the verify skill, after which the card is not opened again.
export const ARGENT_SETUP_PROMPT = `Argent is installed in this React Native repo. Set up the constants it needs and the verify skill that drives it. Derive everything you can from the repo itself and ask me only what the repo cannot tell you.

PHASE 1 — READ THE REPO
Find every build target and its bundle identifier.
- iOS: \`xcodebuild -list -workspace ios/*.xcworkspace\` for the schemes (\`-project ios/*.xcodeproj\` if there is no workspace), then PRODUCT_BUNDLE_IDENTIFIER per configuration from \`xcodebuild -showBuildSettings\` or the pbxproj.
- Android: applicationId plus every productFlavor's applicationId or applicationIdSuffix from android/app/build.gradle (or build.gradle.kts).
Several schemes or flavors means this is a multi-bundle repo — white-label, tenant-per-app, staging versus prod. List every one of them. Same codebase, different IDs, and nothing on a simulator says which one a task means.
Skip the iOS half if there is no ios/ directory, and the Android half if there is no android/.

PHASE 2 — ASK ME, ONCE
Put all of these in a single message and wait for my answer. Do not ask them one at a time.
1. Which scheme or flavor do you use for local development? Show me the list you found and let me pick.
2. Which iOS simulator should be the default? Run \`xcrun simctl list devices available\` and show me what this machine has.
3. Which Android AVD should be the default? Run \`emulator -list-avds\` and show me what exists. Copy the name exactly — an AVD name is whatever I typed when I created it, and a wrong one wastes a turn.
4. A test account that skips onboarding, as email and password — or "none".
Drop question 2 if there is no ios/, and question 3 if there is no android/.

PHASE 3 — WRITE
docs/dev-setup.md — committed. The schemes/flavors and bundle IDs you found, one line each, with the local-dev default marked. Repo facts only: nothing per-developer, nothing secret.
docs/dev-setup.local.md — never committed, because it holds the test account. Ignore it BEFORE it exists: append \`docs/dev-setup.local.md\` to .gitignore, run \`git check-ignore -v docs/dev-setup.local.md\`, and only write the file once that prints a match. Do not judge by eye whether an existing rule already covers it — \`*.local\`, \`*.local.*\` and \`docs/*.local\` all look like they do and none of them match this name. Written first and ignored second, a failed or interrupted run leaves a plaintext password in the working tree for the next \`git add -A\` to sweep up. Then write it: the simulator name, the AVD name, and the test account.
CLAUDE.md — append these two lines, and do not remove, reorder or rewrite anything already in the file:
Bundle IDs and build targets: @docs/dev-setup.md
Local devices and test account: @docs/dev-setup.local.md
The \`@\` is what expands the file at launch. A prose mention like "see docs/dev-setup.md" does nothing, because CLAUDE.md is static text injected at startup and an instruction to read a file never executes. If there is no CLAUDE.md, create one holding just those two lines under a \`## Dev setup\` heading. Tell me to check \`/memory\` afterwards to confirm both expanded.
.claude/skills/verify/SKILL.md — the skill in PHASE 4.

PHASE 4 — THE VERIFY SKILL
Write .claude/skills/verify/SKILL.md opening with YAML frontmatter between --- fences, holding exactly these two keys:
name: verify
description: Use when verifying a bug is fixed, checking a feature still works, or reading device and network logs after reproducing something by hand — drives the app through Argent on an iOS Simulator or Android Emulator and reports a verdict with evidence.
Then a body encoding exactly these rules. Keep every one; they are observed failure modes, not preferences. Write them in this repo's voice and substitute this repo's real paths wherever a rule names a file.
- Never run without a pass condition. The dominant failure is declaring victory: given a vague goal it fixes something, sees a plausible screen and reports success. If I did not state a pass condition, derive one and state it back before touching anything.
- Reconcile reference data against reality before acting on it. Resolve targets to udids first. If nothing is booted, boot the device named in docs/dev-setup.local.md for that platform. If that name does not exist on this machine, list what does and stop — never substitute a device I did not choose.
- Derive the build command from android/app/build.gradle and \`xcodebuild -list\` every time, never from memory. Read docs/RUNNING.md, if it exists, only for what those two cannot state: which flavor is used for local dev, and manual steps such as copying .env.example. Treat every build fact in it as advisory; the repo wins any disagreement.
- One device to a verdict at a time, never interleaved. Every Argent interaction tool takes a udid and dispatches on its shape — a UUID is an iOS simulator, anything else an Android adb serial — so several devices in one run are mechanically fine. The failure is attention, not capability: asked for two platforms at once it verifies one properly and hand-waves the other. Report a separate verdict with its own evidence per device, and where evidence was not gathered say so rather than reporting a pass. Prefer one device while iterating on a diagnosis, several only for a final confirmation.
- Attach to the running app and rebuild only when native code changed, because on iOS a build costs minutes where a reload costs seconds. A JS or TS change needs no build if what is installed is the debug build Metro is serving — check that it is before treating a reload as enough, since against a release install the bundle is embedded, the reload is a no-op, and the verdict would describe the old code. Say which you did.
- Argent builds, launches, drives and reads logs. Prefer its tools for anything on a device: another server's build, screenshot or UI-dump tools and raw \`adb logcat\` all work, but lose the JS-layer detail and network payloads Argent is here for. Others offering the same verbs may be registered in this repo or on this machine. Unit tests are the one job outside Argent's scope — use this repo's own test command.
- If I already reproduced it by hand, do not drive. Read the last few minutes of device log and network traffic and report what failed. Ask soon after the repro: OS log buffers roll over regardless of tooling.
- Add testIDs when an element cannot be found reliably. Naming is \`screen-element\`, stable and semantic — never index-based, never derived from visible text. One screen at a time as it is debugged, not a backfill. On Android testID lands on the view tag and some third-party components swallow it, so add accessibilityLabel as a fallback when something is findable on iOS but not Android.
- One target per run. Long autonomous loops drift as build-test-fix-rebuild burns context.
The skill states no policy on how much to fix without asking. That is ordinary judgement plus the session's permission mode, and a rule here would only re-implement it worse.

PHASE 5 — REPORT
Print what you created or appended to, and what you skipped because it already existed. Then show me the one-line request I would make next, using this repo's real local-dev flavor and the device I picked. Do not modify any application code during this setup.`
