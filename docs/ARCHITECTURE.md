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
    detect.ts           DETECT_SPECS (how each tool is detected) + eligibility + parsing + what a result does to the checklist
    detectScript.ts     scan-script generators (PowerShell 5.1 / POSIX sh) + session codes
    commands.ts         pure helpers over tools.ts (resolve actions, availability)
    platform.ts         OS/arch detection (UA + WebGL + UA-CH quirks)
    aiSetup.ts          "Full AI setup" prompt builder
    setupPrompt.ts      team prompts (workspace setup, plugin fill, run-docs)
    tokens.tsx          {token} fill/render helpers
    iconImage.ts        canvas resize + PNG-in-ICO packing for dropped icons
    useCopy.ts, useLocalStorage.ts, useDetectSession.ts   hooks (tuple returns like React's)
    versions.ts         latest-release badges (bare fetch)
public/               served at the site root: favicon, plus the herdr launcher
                      scripts and icon the pasted one-liner fetches
wrangler.toml         Pages project + KV binding
docs/                 ALL project docs: ARCHITECTURE.md, CHANGELOG.md, TODO.md,
                      decisions/ (see CLAUDE.md contract; README stays at root)
.claude/              the team's committed Claude Code wiring:
  rules/                code-style.md, security.md — path-scoped, auto-loaded
  hooks/guard.mjs       the two rules context can't guarantee (see settings.json)
  settings.json         permissions.deny + hook registration
  skills/              rn-component, rn-screen, api-integration, new-feature, fix-bug
  agents/              architect, code-reviewer, consistency-checker, security-reviewer
```

## When you need X, use Y

| Need | Use | Never |
| --- | --- | --- |
| Add/edit a tool or category | data entry in `src/lib/tools.ts` (README "Add or edit a tool") | new UI code for it |
| State | `useState` + `src/lib/useLocalStorage.ts` (`rn-onboard:` key prefix) | Redux/Zustand/context libs |
| Styling | semantic token classes from `index.css` (`bg-surface`, `text-fg-muted`, `text-warning`, …) | hardcoded hex (sole exception: data-driven `category.accent` inline style) |
| Navigation/routing | none — conditionally-rendered modals in `App.tsx` (`{open && <SomeModal …/>}`) | routers |
| Responsive layout inside a modal or card | container queries — `@container` is on `Modal`'s content box, so use `@md:`/`@2xl:`/`@4xl:` variants ([0025](decisions/0025-modal-width-follows-content.md)) | `sm:`/`lg:` viewport breakpoints — they size off the window, not the panel |
| Network calls | bare `fetch`, silent fallback (`catch { return null }`) like `versions.ts` | axios/fetch wrappers |
| Icons | `lucide-react`, numeric `size` prop 12–22 | other icon sets |
| Copy-to-clipboard, command display | `CommandBlock` + `useCopy` | rebuilding either |
| An image/file input in a tool modal | a `kind: 'image'` `ModalField` (renders `ImageDropField`) | a modal branched on `tool.id` |
| One modal that serves two audiences, or a command with two forms | a `kind: 'choice'` `ModalField` (renders `SegmentedControl`) plus `whenFieldIs` on the steps it gates ([0034](decisions/0034-modal-modes-are-a-choice-field.md)) | a tab component, or a second card saying the same thing twice |
| A caveat only some readers need | `tooltip` on the step, behind an info icon | a longer `note`, or prose above the steps |
| Overlays | `Modal` component | new modal implementations |
| Server-side anything | a Pages Function under `functions/` bound in `wrangler.toml` | separate services |

## Code conventions

`.claude/rules/code-style.md` — TypeScript, naming, imports, structure and
comments. It lives there rather than here because Claude Code loads
`.claude/rules/*.md` on its own when a matching file is touched, and one copy
can't drift from another ([0030](decisions/0030-conventions-as-rules-and-hooks.md)).
`.claude/rules/security.md` does the same for the three trust boundaries.
