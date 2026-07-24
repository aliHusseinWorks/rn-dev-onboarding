# Architecture

The current-state map: structure, stack, and which pattern to use for what.
`CLAUDE.md` holds the rules and points here; `docs/decisions/` holds the why.
Update this file whenever structure or stack actually changes.

## What this is

A single-page web app (NOT a React Native app — it *onboards* RN developers):
Vite + React 19 + TypeScript + Tailwind CSS v4, deployed on Cloudflare Pages
with one Pages Function as its only backend.

## Topology

```
Browser (SPA, dist/)  ──GET/poll──►  functions/report/[code].ts  ──►  KV (DETECT_KV)
        ▲                                    ▲
        │ copy/paste                         │ POST result
        └────────────►  user's terminal (generated scan script)
```

Same origin end to end: <https://rn-dev-onboarding.pages.dev>. Local dev:
`pnpm dev` proxies `/report` to `wrangler pages dev` on :8788.

## Folder map

```
functions/
  report/[code].ts    the detect relay — the only server-side code
src/
  main.tsx            entry — StrictMode + createRoot
  App.tsx             the entire page: header, sections, modals, footer
  index.css           Tailwind import, ALL design tokens, custom keyframes/utilities
  components/         one PascalCase component per file, named export
  lib/                camelCase modules:
    tools.ts            THE data table: categories + tools (most features are data-only edits here)
    detect.ts           DETECT_SPECS (how each tool is detected) + eligibility + parsing
    detectScript.ts     scan-script generators (PowerShell 5.1 / POSIX sh) + session codes
    commands.ts         pure helpers over tools.ts (resolve actions, setup script)
    platform.ts         OS/arch detection (UA + WebGL + UA-CH quirks)
    aiSetup.ts          "Full AI setup" prompt builder
    setupPrompt.ts      team prompts (workspace setup, plugin fill, run-docs)
    tokens.tsx          {token} fill/render helpers
    useCopy.ts, useLocalStorage.ts, useDetectSession.ts   hooks (tuple returns like React's)
    versions.ts         latest-release badges (bare fetch)
wrangler.toml         Pages project + KV binding
docs/, CHANGELOG.md, TODO.md   living docs (see CLAUDE.md contract)
```

## When you need X, use Y

| Need | Use | Never |
| --- | --- | --- |
| Add/edit a tool or category | data entry in `src/lib/tools.ts` (README "Add or edit a tool") | new UI code for it |
| State | `useState` + `src/lib/useLocalStorage.ts` (`rn-onboard:` key prefix) | Redux/Zustand/context libs |
| Styling | semantic token classes from `index.css` (`bg-surface`, `text-fg-muted`, `text-warning`, …) | hardcoded hex (sole exception: data-driven `category.accent` inline style) |
| Navigation/routing | none — conditionally-rendered modals in `App.tsx` (`{open && <SomeModal …/>}`) | routers |
| Network calls | bare `fetch`, silent fallback (`catch { return null }`) like `versions.ts` | axios/fetch wrappers |
| Icons | `lucide-react`, numeric `size` prop 12–22 | other icon sets |
| Copy-to-clipboard, command display | `CommandBlock` + `useCopy` | rebuilding either |
| Overlays | `Modal` component | new modal implementations |
| Server-side anything | a Pages Function under `functions/` bound in `wrangler.toml` | separate services |

## Code conventions

- Components: function declarations, named exports (`export function ToolCard(…)`); no default exports, no `React.FC`. Props: local `interface Props`, destructured in the signature; `import type` for types.
- Module-level pure functions are `function` declarations; in-component helpers are `const` arrows.
- Async: fire-and-forget marked `void`; failures degrade silently to fallbacks. No error toasts or boundaries.
- Style: no semicolons, single quotes, trailing commas, 2-space indent; no formatter — match by hand.
- Accessibility is habitual: `aria-*` on icon buttons, `role="dialog"`/`aria-modal`, global `focus-visible`, `prefers-reduced-motion`.
- Comments only for non-obvious whys (platform quirks, workarounds, data-shape rules) — match existing density.
