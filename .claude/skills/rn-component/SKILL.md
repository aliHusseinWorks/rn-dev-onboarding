---
name: rn-component
description: Create a UI component in src/components that is indistinguishable from the existing hand-written ones. Use whenever adding a new component or substantially extending one.
---

# Creating a component in this repo

This is a Vite + React 19 web app, not a React Native project (see CLAUDE.md). Components are plain DOM + Tailwind.

## Before writing anything

1. Confirm a component for this doesn't already exist. `src/components/` is small — read the list. `CommandBlock` (copyable command), `Modal` (dialog shell), `Tooltip` (hover/focus label), `Select`, `ProgressBar`, `SearchBar` cover most primitives. Compose them; do not rebuild them.
2. Check whether the need is actually data: most card/section content comes from `src/lib/tools.ts` and requires no component work.

## Reference files — imitate these exactly

- `src/components/Tooltip.tsx` — smallest complete example: local `interface Props`, defaulted optional props, one why-comment.
- `src/components/CommandBlock.tsx` — a component with variants (`subtle`, `multiline`) handled by early return and small class-string consts.
- `src/components/ToolCard.tsx` — the largest: derived consts at the top, conditional blocks in JSX, token classes throughout, `aria-*` on interactive icons.

## The pattern

- One component per file, `PascalCase.tsx`, in `src/components/`. Named export, function declaration: `export function Thing({ … }: Props)`.
- Props: local `interface Props { … }` above the component, destructured in the signature, defaults in the destructure (`side = 'top'`). `import type` for type-only imports.
- Styling: Tailwind classes only, using the semantic tokens from `src/index.css` — `bg-surface`, `bg-bg`, `bg-muted`, `border-border`/`border-border-strong`, `text-fg`/`text-fg-muted`/`text-fg-subtle`, `bg-accent`/`text-accent-contrast`/`hover:bg-accent-strong`. Rounded corners are `rounded-lg`/`rounded-xl`; interactive elements get `transition-colors` and `cursor-pointer`. No hex values, no new CSS unless it genuinely belongs in `index.css` (animations, scrollbars) — and then follow the commented style there.
- Icons: `lucide-react` with numeric `size` (13–22 matches existing usage).
- Interactivity: `aria-label` on icon-only buttons, `aria-pressed`/`aria-expanded` where state toggles. Event cleanup in `useEffect` return, as in `Modal.tsx` and `ScrollTop.tsx`.
- Local handlers are `const` arrows; keep derived values as plain consts above the JSX (`const expanded = …`), not memoized unless the existing file being touched already memoizes.
- Comments: almost none. Only a short one when a choice would puzzle a reader (see the `align` comment in `Tooltip.tsx`). Never narrate the JSX.
- Format: no semicolons, single quotes, trailing commas, 2-space indent.

Wire the component into its parent the way `App.tsx` does — direct import from `./components/X`, conditional render with `&&` for overlays.
