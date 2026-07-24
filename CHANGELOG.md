# Changelog

Newest first. One line per user-visible change; grouped Added / Changed / Removed / Fixed.

## Unreleased

### Added

- Detect installed: one-paste scan script (PowerShell 5.1 / POSIX sh, all 5 platforms) that reports back through a same-origin relay and ticks the checklist live; transparency modal shows every check with include/exclude toggles, plus a manual paste fallback ([0001](docs/decisions/0001-detect-installed-tools-via-scan-script.md)).
- Detect relay as a Cloudflare Pages Function with single-use, 10-minute pairing codes ([0002](docs/decisions/0002-same-origin-relay-on-cloudflare-pages.md), [0003](docs/decisions/0003-single-use-pairing-codes-with-tombstone.md)).
- `--warning` design token (amber, light + dark variants).
- Living docs system: `docs/decisions/`, this changelog, `docs/ARCHITECTURE.md`, `TODO.md`; also scaffolded by the team setup prompt ([0004](docs/decisions/0004-living-docs-system.md)).
- `architect` and `security-reviewer` agents, wired into the CLAUDE.md workflow gates and the team setup prompt ([0006](docs/decisions/0006-architect-and-security-reviewer-agents.md)).

### Removed

- `VITE_DETECT_ENDPOINT` override (plus `.env.example`, `vite-env.d.ts`) — nothing consumed it after the same-origin move; the relay endpoint is always the page's own origin.

### Changed

- Deploys moved from GitHub Pages to Cloudflare Pages (<https://rn-dev-onboarding.pages.dev>); site + relay ship together on push to `main` via Cloudflare's git integration — no CI workflow, no local CLI deploys ([0005](docs/decisions/0005-deploy-via-cloudflare-git-integration.md)). The old `github.io` deployment is disabled.
- Team plugin prompt: the package-manager hook now derives the right manager from the host repo (`packageManager` field / lockfile) instead of enforcing one team-wide answer.
- Team setup prompt: scaffolds the docs system and may propose up to two repo-specific skills/agents (confirmation-gated) after studying the codebase.

## 2026-07-24

### Added

- Per-section select-all + empty-selection guard in AI setup (`088ef5d`).
- Initial launchpad: platform detection, tool cards, AI setup, setup-script generator (`3982e57`).
