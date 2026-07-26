# Changelog

Newest first. One line per user-visible change; grouped Added / Changed / Removed / Fixed.

## Unreleased

### Added

- Detect installed: one-paste scan script (PowerShell 5.1 / POSIX sh, all 5 platforms) that reports back through a same-origin relay and ticks the checklist live; transparency modal shows every check with include/exclude toggles, plus a manual paste fallback ([0001](decisions/0001-detect-installed-tools-via-scan-script.md)).
- Detect relay as a Cloudflare Pages Function with single-use, 10-minute pairing codes ([0002](decisions/0002-same-origin-relay-on-cloudflare-pages.md), [0003](decisions/0003-single-use-pairing-codes-with-tombstone.md)).
- `--warning` design token (amber, light + dark variants).
- Living docs system: `docs/decisions/`, this changelog, `docs/ARCHITECTURE.md`, `TODO.md`; also scaffolded by the team setup prompt ([0004](decisions/0004-living-docs-system.md)).
- `architect` and `security-reviewer` agents, wired into the CLAUDE.md workflow gates and the team setup prompt ([0006](decisions/0006-architect-and-security-reviewer-agents.md)).
- herdr card gained a setup modal whose one pasted line writes a double-clickable launcher (Windows `.lnk`, macOS `.command`, Linux `.desktop`) wherever you choose, defaulting to the Desktop, carrying herdr's own icon. The launcher script and icon ship in `public/`, so there's nothing to download ([0010](decisions/0010-hosted-launcher-script-and-image-fields.md)).
- Custom launcher icon by drag-and-drop or file picker, resized and converted to a real `.ico`/`.png` in the browser (Windows/Linux; macOS keeps the Terminal icon). The icon rides inside the pasted line, so it's still one copy-and-paste with nothing to download or save.
- Ponytail card in AI Tools — a Claude Code plugin that holds the agent to the least code that solves the problem; picked over Caveman and Impeccable ([0011](decisions/0011-ponytail-over-caveman-and-impeccable.md)).
- The knowledge graph now ships in the repo — `graph.json`, `manifest.json`, `GRAPH_REPORT.md` and `.graphify_labels.json` are committed (398 kB, 4 of the 72 files graphify generates) so a clone can `graphify query` immediately, with machine paths, caches, per-run snapshots and the HTML viewer still ignored. The hooks in `.claude/settings.json` call `graphify` off PATH and no-op when it isn't installed, instead of hardcoding one machine's path ([0015](decisions/0015-ship-the-knowledge-graph-in-the-repo.md)).
- Graphify card gained the two steps that make the graph actually get used: `graphify claude install` (writes a graphify section into the repo's CLAUDE.md and registers hooks that catch an agent grepping when it could have queried) and `graphify hook install` (rebuilds on commit). Without them the graph is built and then ignored.

### Fixed

- Detect scan reported a freshly installed Claude Code plugin as missing: it searched `~/.claude.json`, which only records a plugin once it has been used, rather than `~/.claude/settings.json`, which records it at install. Superpowers, UI/UX Pro Max and Slack passed only on usage history; installing Ponytail and scanning is what exposed it ([0012](decisions/0012-plugins-detected-via-claude-settings-json.md)).
- The Windows detect scan never reported back: its report step was the script's one multi-line block, and pasting into PowerShell parks an unclosed brace at the `>>` prompt, so the whole `Invoke-RestMethod` sat there unexecuted while every single-line check above it ran. It's one line now, and both scripts end with a newline so the last line actually submits.
- Tool modals listed the prerequisite below the fill-in fields, so you only learned what you needed after filling the form in — it now sits directly under the intro, above the fields.
- herdr launcher dropped its "Start folder" field: `herdr` takes no path argument and restores its own saved workspaces, so the field set a working directory that only ever affected a first-ever launch while reading as though it chose the project.
- herdr launcher didn't check the install folder — a typo silently created a directory tree and hid the launcher in it — and `~`, which the placeholder suggests, was expanded on Unix but not on Windows. It now expands `~` everywhere and refuses with the offending path named.
- The launcher's failure paths called `exit`, which closed the whole terminal — it runs inside the user's session via `&([scriptblock]::Create(…))`, not a child process — so the message vanished with the window. They `return` now.
- A failed icon fetch deleted the installed icon before validating the replacement, leaving a working launcher iconless; the download is checked aside and only swapped in once it passes.
- The herdr launcher aborted before writing anything under PowerShell 7: its icon check read magic bytes with `Get-Content -Encoding Byte`, a 5.1-only switch that throws in 7, and `$ErrorActionPreference = 'Stop'` turned that into a dead stop on the default no-custom-icon path. It reads via `[IO.File]::ReadAllBytes` now, which both editions accept.
- Typed modal values reached the shell unescaped — double-quoted for git identity, the SSH key comment and the Zoho MCP URL (where `"`, `$` and a backtick are all still live), and bare for the fnm/pnpm/yarn version fields. All seven moved to single-quoted literals behind the same `shellQuoted` escape the herdr launcher uses, so a name like O'Brien fills correctly instead of splitting the command.
- Smaller launcher and modal fixes: the icon one-liners deleted the temp icon they wrote; `--dest`/`--icon-file`/`--icon-url` now name the option when handed no value instead of failing on a bare `shift`; the icon drop zone stopped flickering its border when the cursor crossed the preview mid-drag.
- Graphify's prerequisite read "Python 3.10+ and uv", implying two installs; uv downloads its own Python, so both cards now say it brings its own.
- Copy/download tooltips on command blocks were clipped by the modal edge — they now grow leftward from the button.
- `pnpm build` never typechecked the relay: `functions/` was in no tsconfig, so a type error there deployed unnoticed. `tsconfig.node.json` now includes it (verified by injecting an error and watching the build fail). `scripts/` stays out — it runs under `tsx`, and bending a working dev script to `nodenext` resolution rules buys nothing.

### Removed

- `VITE_DETECT_ENDPOINT` override (plus `.env.example`, `vite-env.d.ts`) — nothing consumed it after the same-origin move; the relay endpoint is always the page's own origin.
- Each section's "Copy all" button — unused, and wrong five ways: it dropped secondary commands, silently omitted any card whose action is a download, ignored `inScript`, labelled nothing, and never touched modal steps (which need per-user field values a bulk copy can't supply). The per-card copy button and the AI Setup modal already cover both real jobs. The "setup script" derived surface goes with it, so the ripple checklist in CLAUDE.md and README no longer charges maintenance for it ([0017](decisions/0017-copy-all-removed.md)).
- `Category.inScript` — dead since it was written. Only the per-tool `t.inScript` is ever read, so `mcp`'s `inScript: false` did nothing and read as working. Deleted rather than wired up: MCP servers belong in the AI setup, `claude mcp add` being a command the agent can run ([0016](decisions/0016-category-inscript-deleted-not-wired-up.md)).

### Changed

- The AI setup no longer asks the agent to install what you've already ticked off. Tools checked on the page show a ✓ with their name struck through instead of a checkbox, and the prompt lists them under `ALREADY INSTALLED` — don't install, and if something depends on one and it's actually missing, tell the user rather than quietly installing it. Kept separate from `USER-EXCLUDED`, whose "don't count them as missing" instruction would be wrong here. Untick the card on the page to bring a tool back; there's deliberately no second control in the modal. Claude Code counts too — tick it off and step 1 disappears, leaving one paste instead of two ([0018](decisions/0018-ai-setup-skips-installed-tools.md)).
- React Native Setup and Project Setup no longer carry checkmarks — they're actions you repeat in every repo, not machine state, so a permanent tick against them meant nothing. Both moved to the end of the page and dropped out of the progress count, which now reads 44 tools rather than 49 ([0014](decisions/0014-per-project-sections-are-not-checkable.md)).
- fastlane moved from React Native Setup to System Essentials — it's a `brew install` CLI like Watchman and CocoaPods, not a per-project step, and it keeps its checkmark, version badge and detect check where it now sits.
- Detect scan now applies its whole result at once — it ticks what it found and clears what it didn't, instead of ticking only and leaving an "Uncheck these N on the page too" button to finish the job. A single Undo in the result panel puts the checklist back exactly as it was, which is what protects a tick the scan can't see ([0013](decisions/0013-detect-applies-whole-result-with-undo.md)).
- Detect scan now also finds MCP servers and Claude Code plugins (via `~/.claude.json`) — only per-project steps remain unscannable; the modal was simplified to a one-line coverage summary instead of the per-tool checkbox panel ([0007](decisions/0007-simple-detect-modal-and-config-detection.md)).
- All project docs consolidated under `docs/` (changelog, todo moved; README/CLAUDE.md stay at root) ([0008](decisions/0008-all-docs-live-in-docs-folder.md)); tool changes now carry a written ripple rule in CLAUDE.md and README ([0009](decisions/0009-tool-changes-ripple-everywhere.md)).
- Multiline command/prompt blocks gained a download button (scan script saves as `scan.ps1`/`scan.sh`, prompts as `<card-id>-prompt.md`); manual do-it-yourself steps in tool modals render as instructions instead of copyable command boxes.
- Deploys moved from GitHub Pages to Cloudflare Pages (<https://rn-dev-onboarding.pages.dev>); site + relay ship together on push to `main` via Cloudflare's git integration — no CI workflow, no local CLI deploys ([0005](decisions/0005-deploy-via-cloudflare-git-integration.md)). The old `github.io` deployment is disabled.
- Team plugin prompt: the package-manager hook now derives the right manager from the host repo (`packageManager` field / lockfile) instead of enforcing one team-wide answer.
- Team setup prompt: scaffolds the docs system and may propose up to two repo-specific skills/agents (confirmation-gated) after studying the codebase.

## 2026-07-24

### Added

- Per-section select-all + empty-selection guard in AI setup (`088ef5d`).
- Initial launchpad: platform detection, tool cards, AI setup, setup-script generator (`3982e57`).
