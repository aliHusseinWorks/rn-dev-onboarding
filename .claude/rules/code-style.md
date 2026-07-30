---
paths:
  - "src/**/*.{ts,tsx,css}"
  - "functions/**/*.ts"
---

# Code style

What the code in this repo actually looks like. `docs/ARCHITECTURE.md` says
which pattern to use for what; this says how to write it.

## TypeScript

- `interface` for object shapes, `type` for unions and derived types — `DetectSpec` vs `OsId`.
- No `any`; there isn't one in the repo. Take `unknown` and narrow with a type guard, the way `platform.ts` does for UA-CH.
- No `enum`. A union, or an `as const` array with the type derived from it (`PLATFORMS` → `PlatformId`).
- Explicit return types only where inference would be wide or wrong (`keyOf` in `versions.ts`). Components and handlers stay inferred.
- `verbatimModuleSyntax` is on, so type-only imports need the `type` keyword: inline (`{ PLATFORM_INFO, type PlatformId }`) when a module gives you both, a standalone `import type` line when it gives only types.

## Naming

- Files: `PascalCase.tsx` for components, one per file; `camelCase.ts` for `lib/` modules; `use*.ts` for hooks.
- Module-level constants are `UPPER_SNAKE_CASE` (`TTL_MS`, `DETECT_SPECS`, `RESULT_PREFIX`), everything else `camelCase`, types `PascalCase`.
- A component's props interface is always the local name `Props`. Exported data shapes get real names (`Tool`, `DetectGroup`).

## Imports

- Relative paths only. There is no `@/` alias, and adding one is a stack change.
- Order: `react`, then external packages, then project modules alphabetized by path, then `./` siblings last. `App.tsx` is the reference.
- Named exports everywhere. The only default export in the repo is `vite.config.ts`, where Vite requires it.

## Structure

- Components are function declarations with props destructured in the signature. No `React.FC`.
- Module-level pure functions are `function` declarations; helpers inside a component are `const` arrows.
- Async is fire-and-forget marked `void` with a `.then()` callback, and failures degrade silently to a fallback (`catch { return null }`) — no toasts, no error boundaries. Nested ternaries are normal here.
- No semicolons, single quotes, trailing commas, 2-space indent. There is no formatter — match it by hand.
- Styling is semantic token classes from `index.css` (`bg-surface`, `text-fg-muted`, …). Never a raw hex; the one exception is the data-driven `category.accent` inline style.
- Accessibility is habitual, not a pass at the end: `aria-*` on icon buttons, `role="dialog"`/`aria-modal` on overlays, `focus-visible` styles, `prefers-reduced-motion` honoured.

## Comments

Default to no comment. Reach for a better name or a smaller function first — a
comment explaining a confusing line is usually a confusing line that should be
rewritten.

Write one only where a reader who knows this codebase would still be surprised,
and where it says something the code cannot: a constraint from outside the file
(a registry's CORS behaviour, a UA-CH quirk, Tailwind only emitting classes it
can see as literals), or why a slower or uglier approach is deliberate.

Never narrate history — not what the code used to do, what bug this fixed, what
a review caught, or what happened "previously". That belongs in the commit
message and `docs/CHANGELOG.md`, both of which stay attached to the change. A
comment describing a bug that no longer exists is noise on day one and a lie by
the next refactor: `git log -S` answers "why was this changed", comments answer
"what must stay true".

No section banners, no emoji, no "Note:" explainers.
