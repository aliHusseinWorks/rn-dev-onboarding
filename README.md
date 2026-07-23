# React Native Dev Setup

A single-page, click-driven launcher that takes a fresh Mac/Windows/Linux machine to a full React Native stack. It detects the visitor's OS/architecture and, per tool, either copies the exact install **command**, opens the correct **download**, or shows a **modal** with copyable setup steps. Progress is saved in the browser.

Built with Vite + React + TypeScript + Tailwind CSS v4. No backend — all state is in `localStorage`.

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

## How versions are handled

Cards install the **latest** version, resolved when the visitor runs the command — nothing is pinned into the site, so it never goes stale. To match a specific project's versions, the site installs version *managers* (fnm for Node, Corepack for pnpm); running `fnm use` / `pnpm install` inside a cloned repo then snaps to that repo's `.nvmrc` / `packageManager` / lockfiles. The one deliberate pin is **JDK 17**, which React Native requires specifically.

## Deploy (free, no custom domain)

Deploys are set up for **GitHub Pages** via `.github/workflows/deploy.yml`:

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` builds and publishes to `https://<username>.github.io/<repo>/`.

The Vite `base` is `./` (relative), so the same build also works as-is on Netlify or Vercel (drag-and-drop the `dist/` folder, or point either at the repo).
