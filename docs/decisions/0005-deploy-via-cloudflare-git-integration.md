# 0005 — Deploys run on Cloudflare's git integration, not local CLI or CI

Date: 2026-07-24 · Status: accepted · Amends the deploy mechanics of 0002

## Context

Bootstrap deploys ran `wrangler pages deploy` from a dev machine's working
tree (`--commit-dirty=true`) — fine for getting live, wrong as a routine:
deploys weren't tied to commits or reproducible. A GitHub Action running
wrangler was drafted as the pipeline, but it needs API-token secrets and
keeps a second deploy path alive.

## Decision

Connect the repo to Cloudflare Pages' built-in git integration: every push
to `main` is cloned, built (`pnpm build`), and deployed by Cloudflare, with
build logs, deploy history, one-click rollback, and per-branch preview URLs.
Bindings still come from `wrangler.toml`. The GitHub Action was deleted; the
CLI-created direct-upload project is deleted and recreated as a git-connected
project (Cloudflare cannot convert between the two), keeping the same name
and URL.

## Rejected

- **Local CLI deploys as routine** — not commit-tied, not reproducible.
- **GitHub Action + wrangler** — legitimate, but requires managing
  `CLOUDFLARE_*` secrets and duplicates what the platform does natively.

## Consequences

Laptops never deploy. Manual `wrangler pages deploy` remains possible for
emergencies but should not be used casually — it would ship uncommitted code.
