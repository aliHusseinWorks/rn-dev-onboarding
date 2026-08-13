# 0021 — Version badges for GUI apps come from the Homebrew cask API

Date: 2026-07-27 · Status: accepted · its Atlassian exclusion no longer holds, see [0046](0046-atlassian-authenticates-with-a-scoped-api-token.md)

## Context

Fourteen cards showed no version badge. `VersionSource` only spoke npm, GitHub
releases, PyPI and the Node LTS feed, so anything distributed as a plain
installer — Cursor, Android Studio, Docker Desktop, pgAdmin, Postman, Termius,
Zoho Cliq, Slack, the JDK — had nothing to point at and rendered bare.

Cursor is the case that got looked at. It has an official version endpoint,
`cursor.com/api/download?platform=…&releaseTrack=stable`, which returns
`{"version":"3.13.10", …}` — but it sends no `Access-Control-Allow-Origin`, on
the response or the preflight, so a browser fetch from this page is blocked.
Cursor publishes no GitHub releases either (`getcursor/cursor` redirects and has
none). Same shape for the rest: the vendor either has no JSON at all
(Android Studio, Termius, the Teams and Slack download pages) or has one no
browser is allowed to read.

`formulae.brew.sh/api/cask/<token>.json` answers for all of them, sends
`Access-Control-Allow-Origin: *`, and is a static file — no rate limit to budget
against, unlike GitHub's 60/hr anonymous ceiling that `TTL_MS` already exists to
stay under. These cards already install through that same cask, so the token is
information the file was carrying anyway.

## Decision

Add `{ brew: string }` as a fifth `VersionSource`. Nine cards take it; the three
plugin cards (Superpowers, Ponytail, UI/UX Pro Max) turned out to have GitHub
releases all along and just take `{ github: … }`.

Cask versions carry a revision suffix (`3.13.10,4f02290cc`,
`2026.1.2.11,quail2-patch1`) exactly like release tags carry
`v2.55.0.windows.3`, so the leading-dotted-number trim the GitHub branch already
did is now shared as `dottedPart`. A cask pinned `version :latest` reports the
literal string `latest`, which would render as "vlatest" — that returns null
instead.

Proxying the vendor endpoints through a Pages Function to add the CORS header
was rejected. It would put the relay on the request path of every card on first
paint, to restate a number Homebrew already publishes correctly.

A cask version is the macOS build, so a bare source is only honest for apps that
ship one release everywhere — Cursor, Slack, Postman, Termius, Docker Desktop,
Android Studio and pgAdmin all do. For the two cards where it isn't,
`version` also accepts a per-platform map, resolved by `resolveVersion` next to
`resolveAction` in `commands.ts` (the `VersionSource` and `PlatformId` key sets
are disjoint, so a platform key present tells the two shapes apart):

- **Microsoft Teams** ships a different build per OS — Windows
  `26183.1903.4892.4448` against macOS `26183.1901.4874.5228`. Mac gets the cask
  number; Windows and Linux stay bare. Windows Teams versions are published only
  as folder names under `manifests/m/Microsoft/Teams` in winget-pkgs, a 63 KB
  directory listing needing a numeric-segment max sort, for one badge on an app
  that silently auto-updates and isn't part of the toolchain. Chocolatey's
  version API is `410 Gone` and `api.winget.run` is dead, so that listing is the
  only source, and it isn't worth it.
- **Homebrew / winget** fronts three package managers on one card. mac and Linux
  get `Homebrew/brew`; Windows stays bare because the card's name says winget
  while its button installs Chocolatey, and no single number describes that.
  (`microsoft/winget-cli` does publish releases — v1.29.280 — but it would label
  the wrong one of the two.)

Also deliberately left bare, per the same rule that the badge must not describe
something other than what the card installs:

- **Xcode** — App Store only, no public version API of any kind.
- **Cisco Secure Client** — a real desktop app, but every install path runs
  through an organization's entitlement: web deploy from the company VPN headend
  (what the card's modal describes), `software.cisco.com` with a contract-entitled
  account (403 otherwise), or IT mass-deploy via Jamf/Intune/SCCM. Not on the Mac
  App Store — the "Cisco Secure Client" listing there is the iOS/iPadOS app
  (5.1.16.264), a different artifact, and `itunes.apple.com/lookup` sends no CORS
  header anyway. No cask, no winget package. Even upstream desktop latest would be
  the wrong number here: you get the build your IT pinned on the portal.
- **Homebrew / winget** — one card, two package managers; `Homebrew/brew` has
  releases but a single badge cannot honestly label both.
- **The remote MCP servers** (Context7, Atlassian, Sentry, Figma, Slack,
  Postman, Zoho Cliq) — these cards register a hosted URL. Several have a
  publishable number (`@upstash/context7-mcp` 3.2.5, `@sentry/mcp-server`
  0.37.0, `postman-mcp-server` 1.2.0) but it is the version of a package the
  user never installs, so it would be a badge about the wrong artifact.
- **SSH key, rn-doctor, and the Project Setup cards** — procedures and prompts,
  not releases.
