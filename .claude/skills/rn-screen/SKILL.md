---
name: rn-screen
description: Add a new top-level view (page section or modal overlay) and register it in App.tsx exactly the way existing ones are registered. Use for any "new screen/page/dialog" request.
---

# Adding a "screen" in this repo

There is no navigation library and no screen registry — this is a single-page web app (see CLAUDE.md). What the rest of the world calls a screen is, here, one of two things, both composed directly in `src/App.tsx`:

1. **A page section** — rendered in flow inside `<main>`. Reference: `src/components/CategorySection.tsx` and how `App.tsx` maps `sortedCategories` into it.
2. **A modal overlay** — conditionally rendered at the bottom of `App.tsx`'s JSX. Reference: `src/components/AiSetupModal.tsx` and its wiring: `{aiSetupOpen && <AiSetupModal platform={platform} onClose={() => setAiSetupOpen(false)} />}`.

Do not add react-router, a routes file, URL state, or any navigation abstraction. Do not add safe-area or RN navigation typing — those concepts don't exist in this codebase.

## The modal pattern (most common)

- Build the new view as a component that renders inside the existing `Modal` shell (`src/components/Modal.tsx`) — never a second dialog implementation. `Modal` already owns Escape handling, backdrop click, scroll lock, and `role="dialog"`.
- The overlay component takes `onClose: () => void` plus whatever data it needs (see `AiSetupModal`'s `Props`).
- Visibility state lives in `App.tsx` as a plain `useState<boolean>` (or an id string like `modalToolId` when the overlay is parameterized). Open it from a header button styled like the existing ones, wrapped in `Tooltip`.

## The section pattern

- A `<section>` component receiving its data and callbacks as props, rendered inside `<main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">`. Follow `CategorySection.tsx`: header row with accent rail, fold state via `aria-expanded`, grid of cards below.
- Persistent per-view state (fold, progress, choices) goes through `useLocalStorage` with an `rn-onboard:`-prefixed key, matching `App.tsx`.

Everything else — file placement, export style, tokens, comments — follows the rn-component skill.
