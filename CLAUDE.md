# CLAUDE.md

## What this project actually is

Despite the repo name, this is **not a React Native mobile app**. It is a single-page **web app** (Vite + React 19 + TypeScript + Tailwind CSS v4) that onboards React Native developers: it detects the visitor's OS/architecture and hands out install commands, downloads, and setup modals. The only backend is one Cloudflare Pages Function (`functions/report/[code].ts`), the relay for the detect-scan feature. Never add React Native, Expo, react-navigation, or mobile tooling to this repo, and never scaffold iOS/Android targets — they don't exist here.

## Non-negotiable rules

1. **REUSE BEFORE CREATE** — before writing any component, hook, utility, style, or service, search `src/` for an existing one and use it. Never rebuild something that exists, and never duplicate existing logic "cleaner" in a new file. Most feature work is data-only: add entries to `src/lib/tools.ts` (see README "Add or edit a tool") without touching UI code at all.
2. **MATCH THE EXISTING STYLE EXACTLY** — same naming, same file organization, same component patterns, same Tailwind-with-semantic-tokens styling. Never introduce a new styling method, new color values, new spacing constants, or a new architectural pattern. New UI must look like it was built by the same person who built the rest of the app.
3. **NO AI-STYLE COMMENTS** — no comments that narrate the obvious, no section banners, no emoji, no "Note:" explainers. Comments exist here only to explain a non-obvious *why*. Match the existing density and tone.
4. **NO UNSOLICITED EXTRAS** — no new tests or test files (the project has none), no refactors of untouched code, no dependency additions, no config changes, unless explicitly asked. Do exactly the task, nothing around it. (The docs contract below is not an extra — it is part of every task.)
5. **MINIMAL DIFFS** — touch the fewest files and lines needed. Never reformat or reorganize code you didn't need to change.
6. **NEVER COMMIT OR PUSH UNPROMPTED** — no git commit, push, branch creation, or PR unless the user explicitly asks in that session. Asking once does not grant it for later. Never use `--force` or rewrite history.

## Docs contract — read before / update after

**Read before:**
- Any task: check `TODO.md` for parked items touching your area.
- Writing code, adding a module, or choosing a library/pattern: read `docs/ARCHITECTURE.md` (structure, stack, "when you need X use Y" table, code conventions).
- Revisiting or contradicting a past choice: check `docs/decisions/` first.

**Update after (same session, before finishing):**
- Shipped a feature/fix → one line in `CHANGELOG.md` under Unreleased.
- Made a decision with the user (chose between approaches, rejected an option) → new numbered file in `docs/decisions/`; never edit old ones, supersede them.
- Deferred an idea or left a known gap → add it to `TODO.md`; tick items you completed.
- Changed structure or stack → update `docs/ARCHITECTURE.md`.

**Workflow gates** (agents in `.claude/agents/`): substantive features start with the `architect` agent (design fit before code) and end with `code-reviewer` + `consistency-checker`; any change touching the relay, generated scripts, storage, or external input also runs `security-reviewer`. Fix what they find before the session ends.

## Project facts

- **Package manager:** pnpm (`pnpm-lock.yaml`).
- **Run:** `pnpm dev` (http://localhost:5173) · `pnpm build` (tsc -b + vite build) · `pnpm preview`. Full detect flow locally: `pnpm build && npx wrangler pages dev dist` (:8788; `pnpm dev` proxies `/report` there).
- **Lint:** `pnpm lint` (oxlint). No formatter — match the existing style by hand.
- **Deploy:** Cloudflare Pages (<https://rn-dev-onboarding.pages.dev>) — site + `functions/` deploy together on push to `main` via Cloudflare's git integration; never deploy from the working tree (see `docs/decisions/0005`). Bindings (KV) live in `wrangler.toml`.

Everything structural — folder map, data flow, conventions, which pattern to use for what — lives in `docs/ARCHITECTURE.md`.
