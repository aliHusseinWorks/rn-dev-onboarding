---
name: new-feature
description: Plan a feature around existing code, confirm the plan, then implement via the skills. Use whenever adding a capability, card, section, or modal rather than fixing one.
argument-hint: <feature description>
---

# Adding a feature in this repo

The feature: $ARGUMENTS

Follow CLAUDE.md's six rules throughout. Work in three stages:

**1. Reuse inventory (before writing any code).** Read the relevant parts of `src/` and produce:
- Which EXISTING pieces cover this: components (`CommandBlock`, `Modal`, `Tooltip`, `Select`, `ProgressBar`, `SearchBar`, `CategorySection`, `ToolCard`…), hooks (`useCopy`, `useLocalStorage`, `useLatestVersion`), lib helpers (`commands.ts`, `platform.ts`, `tokens.tsx`), and — first candidate for anything tool/category-shaped — a pure data change in `src/lib/tools.ts`.
- What genuinely must be new, and why nothing existing covers it. Default position: nothing new is needed.
- The exact files to be touched and roughly how many lines each.

**2. Confirm.** Present that plan and wait for approval. If the user has already pre-approved or the plan is a pure `tools.ts` data edit matching the README recipe, proceed.

**3. Implement.** Use the `rn-component` skill for any new component, `rn-screen` for a new section/overlay, `api-integration` for any network call. Keep the diff minimal, match neighboring style exactly, no extras (no tests, no docs, no deps). Finish by running `pnpm lint` and `pnpm build`, then have the `consistency-checker` agent review the diff and fix anything it flags.
