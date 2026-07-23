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

FIRST, ask me three short questions and wait for answers:
1. Which package manager should the hook enforce (npm / yarn / pnpm)?
2. Which styling approach does the team standardize on (StyleSheet.create / styled-components / NativeWind / no standard)?
3. Any team-specific rules to encode (or "none")?

THEN fill the scaffolded stubs — nothing beyond them:
- agents/code-reviewer.md — read-only agent that reviews diffs for React Native pitfalls (missing list keys, inline functions re-created every render, unhandled promise rejections, missing safe-area handling, hardcoded colors/spacing instead of the host app's theme, Platform-specific gotchas), security issues (secrets in code, unvalidated input at trust boundaries), and violations of the team rules from my answers.
- agents/consistency-checker.md — read-only agent that compares new/changed code against neighboring files in the host repo and flags style drift, AI-style narration comments, logic duplicated from existing files, and unrequested extras.
- skills/rn-component/SKILL.md — how this team writes components: reuse before create, match the neighboring code exactly, consume the host app's existing theme tokens (instruct Claude to locate them, never hardcode values), and the styling approach from my answer.
- skills/rn-screen/SKILL.md — creating and registering a screen by first studying how existing screens in the host repo are registered (navigation typing, safe-area, params) and imitating that exactly.
- skills/api-integration/SKILL.md — adding API calls only through the host repo's existing client and error-handling pattern; never a new fetch wrapper.
- hooks/hooks.json — a PreToolUse Bash hook that blocks the wrong package managers (per my answer), and a PostToolUse Edit|Write hook that runs the host repo's formatter only if one is configured.
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
├── skills/
│   ├── rn-component/SKILL.md
│   ├── rn-screen/SKILL.md
│   └── api-integration/SKILL.md
├── agents/
│   ├── code-reviewer.md
│   └── consistency-checker.md
└── commands/
    ├── new-feature.md
    └── fix-bug.md

IMPORTANT: Before creating any file, check whether it (or an equivalent) already exists. Never recreate, overwrite, or "improve" anything that already exists — not existing CLAUDE.md content, not existing components, utilities, hooks, themes, configs, or scripts. If CLAUDE.md exists, only append a clearly separated section; if a convention is already documented, don't restate it.

CLAUDE.md must encode these non-negotiable rules for every future session, stated explicitly:
1. REUSE BEFORE CREATE — before writing any component, hook, utility, style, or service, search the codebase for an existing one and use it. Never rebuild something that exists, and never duplicate logic "cleaner" in a new file.
2. MATCH THE EXISTING STYLE EXACTLY — same naming, same file organization, same component patterns, same styling approach, and always the existing theme/design tokens. Never introduce a new styling method, new color values, new spacing constants, or a new architectural pattern. New UI must look like it was built by the same person who built the rest of the app.
3. NO AI-STYLE COMMENTS — no comments that narrate the obvious ("// Set loading to true", "// Return the component", "// Handle the response"), no section-banner comments, no emoji, no "Note:" explainers. Comments are allowed only where a hand-written codebase would genuinely have one: a non-obvious workaround, a platform quirk, a business rule that isn't self-evident. Match the comment density of the existing code — if the codebase is nearly comment-free, new code should be too.
4. NO UNSOLICITED EXTRAS — no new tests, no test files, no README additions, no refactors of untouched code, no dependency additions, no config changes, unless explicitly asked. Do exactly the task, nothing around it.
5. MINIMAL DIFFS — touch the fewest files and lines needed. Never reformat or reorganize code you didn't need to change.

Also document in CLAUDE.md (derived from Phase 1, only if not already documented): package manager, run commands for iOS and Android, lint command, folder map, navigation and state libraries, and the theme file locations that all new UI must consume.

Skills (each SKILL.md: YAML frontmatter with name + description, then instructions grounded in the project's real patterns, citing actual example files from this repo as the reference to imitate):
- rn-component: creating a component that is indistinguishable from existing ones — reference 2-3 real components in this repo as the template.
- rn-screen: creating and registering a screen exactly the way existing screens are registered, using the same navigation typing and safe-area handling already present.
- api-integration: adding an API call through the existing client and error-handling pattern only — never a new fetch wrapper.

Agents (markdown with YAML frontmatter: name, description, tools, model — both read-only):
- code-reviewer: reviews diffs for React Native pitfalls, security issues, and violations of the five CLAUDE.md rules above.
- consistency-checker: compares new/changed code against neighboring existing files and flags anything that would reveal it wasn't hand-written by the team — style drift, off-theme values, AI-style comments, duplicated existing logic, or unrequested additions.

Commands:
- new-feature: plan which EXISTING screens/components/services can be reused, list what genuinely must be new, get confirmation, then implement via the skills.
- fix-bug: reproduce by reading the relevant code, propose the minimal fix, implement it with the smallest possible diff. No regression tests unless asked.

settings.json: minimal. If the project has a formatter configured, hook it to run on edited files; otherwise add nothing.

PHASE 3 — REPORT
Print a tree of what was created (and anything you skipped because it already existed), plus a one-line usage summary per skill, agent, and command. Do not modify a single line of application code during this setup.`
