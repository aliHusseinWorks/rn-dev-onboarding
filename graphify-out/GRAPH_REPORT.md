# Graph Report - rn-dev-onboarding  (2026-07-26)

## Corpus Check
- 72 files · ~33,376 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 415 nodes · 651 edges · 49 communities (45 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b63ae9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell & Core UI
- App TypeScript Config
- Tool Catalog Data
- Node Build Config
- Tool Cards & Setup Scripts
- Dev Dependencies
- Package Manifest
- AI Setup Modal
- CI & Deployment
- Lint Configuration
- Copy & Tooltip Primitives
- Entry Page & Persistence
- Favicon Branding
- Root TS Project Refs
- Version Pinning Rationale
- detectScript.ts
- CLAUDE.md
- Architecture
- ProgressBar.tsx
- SearchBar.tsx
- ThemeToggle.tsx
- TODO.md
- GitHub Pages Deployment
- Creating a component in this repo
- 0003 — Pairing codes are single-use both ways, via a tombstone
- 0005 — Deploys run on Cloudflare's git integration, not local CLI or CI
- 0006 — Standard agent roster gains architect and security-reviewer
- 0007 — Simple detect modal; MCP servers and plugins detected via ~/.claude.json
- 0009 — A tool change must ripple to everything that consumes it
- iconImage.ts
- 0011 — Ponytail is the one agent-discipline plugin we ship
- settings.json
- Adding an API call in this repo
- Adding a "screen" in this repo
- herdr-launcher.sh
- 0015 — The knowledge graph ships in the repo
- 0010 — The herdr launcher is a hosted script run in one paste, and modal fields gain an image kind
- 0013 — The detect scan applies its whole result; Undo replaces the opt-in uncheck
- 0014 — Per-project sections carry no checkmarks
- 0012 — Plugins are detected in ~/.claude/settings.json
- 0016 — `Category.inScript` is deleted, not wired up

## God Nodes (most connected - your core abstractions)
1. `PlatformId` - 21 edges
2. `compilerOptions` - 18 edges
3. `react` - 16 edges
4. `App()` - 15 edges
5. `compilerOptions` - 15 edges
6. `isAvailable()` - 11 edges
7. `PLATFORM_INFO` - 11 edges
8. `ToolCard()` - 8 edges
9. `emitTool()` - 8 edges
10. `toolsInCategory()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Pre-Paint Theme Script` --semantically_similar_to--> `localStorage State Persistence`  [INFERRED] [semantically similar]
  index.html → README.md
- `RN Dev Setup Launcher` --conceptually_related_to--> `index.html Entry Page`  [INFERRED]
  README.md → index.html
- `Props` --references--> `PlatformId`  [EXTRACTED]
  src/components/DetectModal.tsx → src/lib/platform.ts
- `Props` --references--> `PlatformId`  [EXTRACTED]
  src/components/PlatformBanner.tsx → src/lib/platform.ts
- `App()` --calls--> `isAvailable()`  [EXTRACTED]
  src/App.tsx → src/lib/commands.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Data-Driven Tool Authoring Pattern** — readme_data_driven_tool_catalog, readme_action_helpers, readme_platform_ids, src_lib_tools, src_lib_icons [EXTRACTED 1.00]

## Communities (49 total, 4 thin omitted)

### Community 0 - "App Shell & Core UI"
Cohesion: 0.50
Nodes (3): 2026-07-24, Added, Changelog

### Community 1 - "App TypeScript Config"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 2 - "Tool Catalog Data"
Cohesion: 0.36
Nodes (5): KVNamespace, onRequest(), PagesContext, readCapped(), respond()

### Community 3 - "Node Build Config"
Cohesion: 0.10
Nodes (20): functions/**/*.ts, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+12 more)

### Community 4 - "Tool Cards & Setup Scripts"
Cohesion: 0.09
Nodes (39): Action Helpers (cmd/link/mac/win), Platform IDs (mac-arm, mac-intel, win-x64, win-arm, linux), AiSetupModal(), Props, CategorySection(), Props, CommandBlock(), Props (+31 more)

### Community 5 - "Dev Dependencies"
Cohesion: 0.06
Nodes (35): lucide-react, oxlint, dependencies, lucide-react, react, react-dom, devDependencies, oxlint (+27 more)

### Community 6 - "Package Manifest"
Cohesion: 0.33
Nodes (5): 0001 — Detect installed tools via a pasted scan script + relay, Consequences, Context, Decision, Rejected

### Community 7 - "AI Setup Modal"
Cohesion: 0.40
Nodes (5): Added, Changed, Fixed, Removed, Unreleased

### Community 8 - "CI & Deployment"
Cohesion: 0.25
Nodes (5): Weekly Link Check Workflow, failures, urls, warnings, wingetIds

### Community 9 - "Lint Configuration"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 10 - "Copy & Tooltip Primitives"
Cohesion: 0.08
Nodes (36): react, App(), readSavedPlatform(), Modal(), Props, PlatformBanner(), Props, ProgressBar() (+28 more)

### Community 11 - "Entry Page & Persistence"
Cohesion: 0.39
Nodes (7): fetchLatest(), inFlight, keyOf(), readCache(), useLatestVersion(), VersionSource, writeCache()

### Community 12 - "Favicon Branding"
Cohesion: 1.00
Nodes (3): RN Dev Onboarding Launchpad Branding, Favicon (Terminal Prompt Icon), Terminal Prompt Motif (chevron + cursor line)

### Community 16 - "detectScript.ts"
Cohesion: 0.15
Nodes (25): Applied, DetectModal(), Props, checksFor(), describeCheck(), describeChecks(), DETECT_SPECS, DetectCheck (+17 more)

### Community 17 - "CLAUDE.md"
Cohesion: 0.29
Nodes (5): Docs contract — read before / update after, graphify, Non-negotiable rules, Project facts, What this project actually is

### Community 18 - "Architecture"
Cohesion: 0.29
Nodes (6): Architecture, Code conventions, Folder map, Topology, What this is, When you need X, use Y

### Community 19 - "ProgressBar.tsx"
Cohesion: 0.33
Nodes (5): 0002 — Site + relay deploy together on Cloudflare Pages (same origin), Consequences, Context, Decision, Rejected

### Community 20 - "SearchBar.tsx"
Cohesion: 0.33
Nodes (5): 0004 — Living docs: decisions, changelog, architecture, todo, Consequences, Context, Decision, Rejected

### Community 21 - "ThemeToggle.tsx"
Cohesion: 0.33
Nodes (5): 0008 — All project docs live under docs/ (README stays at root), Consequences, Context, Decision, Rejected

### Community 22 - "TODO.md"
Cohesion: 0.25
Nodes (6): 0005 — Deploys run on Cloudflare's git integration, not local CLI or CI, Consequences, Context, Decision, Rejected, TODO

### Community 25 - "Creating a component in this repo"
Cohesion: 0.40
Nodes (4): Before writing anything, Creating a component in this repo, Reference files — imitate these exactly, The pattern

### Community 26 - "0003 — Pairing codes are single-use both ways, via a tombstone"
Cohesion: 0.40
Nodes (4): 0003 — Pairing codes are single-use both ways, via a tombstone, Consequences, Context, Decision

### Community 27 - "0005 — Deploys run on Cloudflare's git integration, not local CLI or CI"
Cohesion: 0.50
Nodes (5): index.html Entry Page, Pre-Paint Theme Script, Data-Driven Tool Catalog, localStorage State Persistence, RN Dev Setup Launcher

### Community 28 - "0006 — Standard agent roster gains architect and security-reviewer"
Cohesion: 0.40
Nodes (4): 0006 — Standard agent roster gains architect and security-reviewer, Consequences, Context, Decision

### Community 29 - "0007 — Simple detect modal; MCP servers and plugins detected via ~/.claude.json"
Cohesion: 0.33
Nodes (5): 0007 — Simple detect modal; MCP servers and plugins detected via ~/.claude.json, Consequences, Context, Decision, Rejected

### Community 30 - "0009 — A tool change must ripple to everything that consumes it"
Cohesion: 0.40
Nodes (4): 0009 — A tool change must ripple to everything that consumes it, Consequences, Context, Decision

### Community 31 - "iconImage.ts"
Cohesion: 0.33
Nodes (9): ImageDropField(), Props, fileToIconBase64(), ICO_SIZES, IconFormat, loadImage(), packIco(), squarePng() (+1 more)

### Community 32 - "0011 — Ponytail is the one agent-discipline plugin we ship"
Cohesion: 0.40
Nodes (4): 0011 — Ponytail is the one agent-discipline plugin we ship, Consequences, Context, Decision

### Community 33 - "settings.json"
Cohesion: 0.50
Nodes (3): hooks, PreToolUse, $schema

### Community 34 - "Adding an API call in this repo"
Cohesion: 0.50
Nodes (3): Adding an API call in this repo, Hard rules, The pattern, from `versions.ts`

### Community 35 - "Adding a "screen" in this repo"
Cohesion: 0.50
Nodes (3): Adding a "screen" in this repo, The modal pattern (most common), The section pattern

### Community 43 - "0015 — The knowledge graph ships in the repo"
Cohesion: 0.40
Nodes (4): 0015 — The knowledge graph ships in the repo, Consequences, Context, Decision

### Community 44 - "0010 — The herdr launcher is a hosted script run in one paste, and modal fields gain an image kind"
Cohesion: 0.33
Nodes (5): 0010 — The herdr launcher is a hosted script run in one paste, and modal fields gain an image kind, Consequences, Context, Decision, Rejected

### Community 45 - "0013 — The detect scan applies its whole result; Undo replaces the opt-in uncheck"
Cohesion: 0.33
Nodes (5): 0013 — The detect scan applies its whole result; Undo replaces the opt-in uncheck, Consequences, Context, Decision, Rejected

### Community 46 - "0014 — Per-project sections carry no checkmarks"
Cohesion: 0.33
Nodes (5): 0014 — Per-project sections carry no checkmarks, Consequences, Context, Decision, Rejected

### Community 47 - "0012 — Plugins are detected in ~/.claude/settings.json"
Cohesion: 0.40
Nodes (4): 0012 — Plugins are detected in ~/.claude/settings.json, Consequences, Context, Decision

### Community 48 - "0016 — `Category.inScript` is deleted, not wired up"
Cohesion: 0.40
Nodes (4): 0016 — `Category.inScript` is deleted, not wired up, Consequences, Context, Decision

## Knowledge Gaps
- **175 isolated node(s):** `$schema`, `PreToolUse`, `$schema`, `typescript`, `oxc` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Copy & Tooltip Primitives` to `Tool Cards & Setup Scripts`, `Lint Configuration`, `Entry Page & Persistence`, `detectScript.ts`, `iconImage.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `plugins` connect `Lint Configuration` to `Copy & Tooltip Primitives`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `PlatformId` connect `Tool Cards & Setup Scripts` to `detectScript.ts`, `Copy & Tooltip Primitives`, `iconImage.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `$schema`, `PreToolUse`, `$schema` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Node Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Tool Cards & Setup Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09084556254367575 - nodes in this community are weakly interconnected._