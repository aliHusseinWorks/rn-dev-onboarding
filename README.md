# React Native Dev Setup

A single-page, click-driven launcher that takes a fresh Mac/Windows/Linux machine to a full React Native stack. It detects the visitor's OS/architecture and, per tool, either copies the exact install **command**, opens the correct **download**, or shows a **modal** with copyable setup steps. A one-paste **Detect installed** scan ticks off tools already on the machine. Progress is saved in the browser.

Built with Vite + React + TypeScript + Tailwind CSS v4. Checklist state lives in `localStorage`; the only server-side piece is a single Cloudflare Pages Function (the detect-scan relay, see below).

## Develop

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # type-check + production build into dist/
pnpm preview   # serve the production build locally
```

## Add or edit a tool

Everything is data-driven — **no UI code changes needed**. Edit `src/lib/tools.ts`:

```ts
{
  id: 'my-tool',                 // unique
  category: 'essentials',        // one of the CATEGORIES ids
  name: 'My Tool',
  description: 'One line, ~10 words max.',
  icon: 'package',               // a key from src/lib/icons.ts
  order: 8,                      // position within its category
  docsUrl: 'https://example.com',
  note: 'Optional short note shown under the card.',

  // A tool has EITHER per-platform `actions`…
  actions: {
    ...mac(cmd('brew install my-tool')),          // mac-arm + mac-intel
    linux: cmd('sudo apt-get install -y my-tool'),
    ...win(cmd('winget install My.Tool')),        // win-x64 + win-arm
    // A platform with no entry = card greys out ("Not available on your OS").
  },
  secondary: { ...mac(link('https://…', 'Download')) }, // optional 2nd action

  // …OR a `modal` (for Claude Code plugins / prompts, always cross-platform):
  // modal: {
  //   intro: '…',
  //   prereq: '…',
  //   steps: [{ command: '/plugin …', note: 'Run in Claude Code.' }],
  //   prompt: 'full text to copy',   // renders a scrollable copy block
  // },
}
```

Helpers at the top of the file keep entries terse:
- `cmd(value, label?)` — a copy-command action.
- `link(value, label?)` — an open/download action. URLs ending in `.dmg/.exe/.pkg/.zip` auto-label as "Download for <arch>".
- `mac(action)` / `win(action)` — spread the same action across both mac (or both win) architectures.

**Platform ids:** `mac-arm`, `mac-intel`, `win-x64`, `win-arm`, `linux`.

Add a **category** by appending to `CATEGORIES` (id, title, description, `accent` hex, order). The accent colors the category's icons and rail.

## Detect installed tools

The **Detect installed** button generates a readable scan script (PowerShell on Windows, POSIX sh on macOS/Linux). The user pastes it into their terminal once; it checks each selected tool (PATH lookup, install-dir existence, Windows Store package) and reports back — the page polls and ticks the checkboxes live. The modal shows exactly which tools are checked and how, with include/exclude checkboxes.

**Privacy:** the only data that leaves the machine is a one-time pairing code, the platform id (e.g. `mac-arm`), and the ids of tools found. Codes are single-use and expire after 10 minutes; the relay stores results at most that long.

Detection specs live in `src/lib/detect.ts` (`DETECT_SPECS` — separate from `tools.ts` on purpose). Tools without a spec (Claude Code plugins, MCP servers, per-project prompts) are listed in the modal as not scannable.

The relay lives in `functions/report/[code].ts` and deploys **with the site** as a Cloudflare Pages Function — same origin, so the deployed site needs zero configuration. If the relay is unreachable (local `pnpm dev` without wrangler, or before the KV namespace exists) the feature degrades gracefully: the script prints a `RN-ONBOARD/1 …` line the user pastes back manually.

**Local full flow:** `pnpm build && npx wrangler pages dev dist` (serves site + relay on :8788 with a local KV), or run `pnpm dev` alongside it — the Vite dev server proxies `/report` to :8788.

## How versions are handled

Cards install the **latest** version, resolved when the visitor runs the command — nothing is pinned into the site, so it never goes stale. To match a specific project's versions, the site installs version *managers* (fnm for Node, Corepack for pnpm); running `fnm use` / `pnpm install` inside a cloned repo then snaps to that repo's `.nvmrc` / `packageManager` / lockfiles. The one deliberate pin is **JDK 17**, which React Native requires specifically.

## Deploy (Cloudflare Pages — free, fixed named domain)

The site + detect relay deploy together to **Cloudflare Pages**: <https://rn-dev-onboarding.pages.dev>, via Cloudflare's git integration — every push to `main` is built (`pnpm build`) and deployed by Cloudflare, with build logs, deploy history, rollbacks, and per-branch preview URLs. Bindings (the `DETECT_KV` namespace) live in `wrangler.toml`.

Recreating from scratch on a new account: `npx wrangler login`, `npx wrangler kv namespace create DETECT_KV` (paste the id into `wrangler.toml`), then dashboard → Workers & Pages → Create → Pages → Import an existing Git repository (build command `pnpm build`, output `dist`). Emergency manual deploy: `pnpm build && npx wrangler pages deploy dist` — avoid routinely; it ships your working tree, not a commit.

The Vite `base` is `./` (relative), so the static build also works on Netlify/Vercel/GitHub Pages — but the live detect flow needs the Pages Function, so only the plain checklist (with manual result paste) works there.
