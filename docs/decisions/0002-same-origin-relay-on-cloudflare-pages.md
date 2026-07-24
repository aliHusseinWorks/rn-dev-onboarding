# 0002 — Site + relay deploy together on Cloudflare Pages (same origin)

Date: 2026-07-24 · Status: accepted

## Context

The relay (0001) needs public hosting, and the user wanted the full live flow
working on deploy with a free, fixed, human-named domain. The first draft was
a standalone Cloudflare Worker plus GitHub Pages for the site — two deploys,
CORS, and two settings to wire (`ALLOWED_ORIGIN`, `VITE_DETECT_ENDPOINT`).

## Decision

Host everything on Cloudflare Pages: static site from `dist/`, relay as a
Pages Function (`functions/report/[code].ts`), storage in a KV namespace bound
via `wrangler.toml`. Same origin means the page defaults to
`location.origin` — no CORS, no env config, works the moment it deploys.
Production: <https://rn-dev-onboarding.pages.dev>. Local dev proxies `/report`
to `wrangler pages dev` (vite.config.ts).

## Rejected

- **Vercel** — needs a marketplace Redis add-on for the pairing storage;
  Cloudflare has KV built into the free tier.
- **GitHub Pages + separate Worker** — two deploys, CORS, per-environment
  wiring; also GH Pages can never run the relay. The GH Pages deployment was
  removed entirely to avoid a stale second URL.

## Consequences

`.github/workflows/deploy.yml` deploys via wrangler on push to `main` (needs
`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets). The KV
namespace id in `wrangler.toml` is public by design — it's an identifier, not
a credential.
