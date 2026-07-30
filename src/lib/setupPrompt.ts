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

// Prompt for the "Fill the team plugin" card: paste into Claude Code inside a
// plugin folder scaffolded by `claude plugin init --with skills agents hooks`.
export const PLUGIN_FILL_PROMPT = `You are filling a freshly scaffolded Claude Code plugin (created with \`claude plugin init {name} --with skills agents hooks\`) with our React Native team's shared tooling. Everything you write MUST be generic — true for any React Native app this team builds. Never reference a specific repo's files, paths, theme names, or components.

FIRST, ask me two short questions and wait for answers:
1. Which styling approach does the team standardize on (StyleSheet.create / styled-components / NativeWind / no standard)?
2. Any team-specific rules to encode (or "none")?

THEN fill the scaffolded stubs — nothing beyond them:
- agents/code-reviewer.md — read-only agent that reviews diffs for React Native pitfalls (missing list keys, inline functions re-created every render, unhandled promise rejections, missing safe-area handling, hardcoded colors/spacing instead of the host app's theme, Platform-specific gotchas), security issues (secrets in code, unvalidated input at trust boundaries), and violations of the team rules from my answers.
- agents/consistency-checker.md — read-only agent that compares new/changed code against neighboring files in the host repo and flags style drift, AI-style narration comments, logic duplicated from existing files, and unrequested extras.
- skills/rn-component/SKILL.md — how this team writes components: reuse before create, match the neighboring code exactly, consume the host app's existing theme tokens (instruct Claude to locate them, never hardcode values), and the styling approach from my answer.
- skills/rn-screen/SKILL.md — creating and registering a screen by first studying how existing screens in the host repo are registered (navigation typing, safe-area, params) and imitating that exactly.
- skills/api-integration/SKILL.md — adding API calls only through the host repo's existing client and error-handling pattern; never a new fetch wrapper.
- hooks/hooks.json — a PreToolUse Bash hook that blocks package-manager commands that don't match the HOST repo, deriving the right one at runtime from package.json's packageManager field (fallback: whichever lockfile exists — pnpm-lock.yaml / yarn.lock / package-lock.json). Never hardcode a manager: this plugin travels to repos that may differ from the team default. Plus a PostToolUse Edit|Write hook that runs the host repo's formatter only if one is configured.
- .claude-plugin/plugin.json — fill in a one-line description.

The golden rule for every file: this plugin travels to many repos it has never seen, so write instructions that tell Claude to STUDY the host repo's existing patterns first and imitate them — encode behavior, not specifics. Keep each file short and imperative. Do not touch anything outside this plugin folder.`

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
│   └── guard.mjs           (only if a hook below actually has something to run)
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
Any hook that needs the tool input parses the hook JSON on stdin, so write it as one Node script under .claude/hooks/ that switches on \`hook_event_name\` — not a shell script. RN teams run mixed macOS and Windows machines and \`jq\` is a given on neither. A PreToolUse hook denies with \`hookSpecificOutput.permissionDecision\`; \`"ask"\` rather than \`"deny"\` where a human might legitimately approve the thing.

PHASE 3 — REPORT
Print a tree of what was created (and anything you skipped, because it already existed or because this repo gave it nothing to do), plus a one-line summary per rule, hook, skill and agent — for each hook, state that you ran it and what it did. Do not modify a single line of application code during this setup.`
