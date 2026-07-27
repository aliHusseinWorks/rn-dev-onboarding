# TODO

Cross-session parking lot. Add deferred ideas and known leftovers with a line
of context; tick (don't delete) when done. Team RN repos use Jira instead —
this file exists only because this repo has no board.

- [x] First commit + push of the detect feature, Cloudflare deploy setup, and
      docs system (`.claude/` committed too — it's the team's shared
      agents/skills wiring).
- [x] Connect the repo to Cloudflare Pages git integration ([0005](decisions/0005-deploy-via-cloudflare-git-integration.md)) —
      live and verified end-to-end at rn-dev-onboarding.pages.dev.
- [x] graphify's scoped rebuild loses nodes and edges: same tree, varying only
      `changed_paths`, `_rebuild_code` gives 424 nodes / 633 edges scoped versus
      429 / 659 full. Not `GRAPHIFY_MAX_WORKERS`, not `PYTHONHASHSEED`. Closed
      unfiled — [0019](decisions/0019-graphify-removed.md) removed
      the hook, so it no longer affects this repo; the numbers above are the repro
      if anyone wants to report it upstream.
- [ ] Category rail rows for sections the search has filtered out stay clickable
      and do nothing (the section is unmounted, so `getElementById` returns null
      and the optional chain swallows it). Dim or disable them if anyone trips
      over it — [0020](decisions/0020-fluid-layout-and-category-rail.md).
- [ ] `emitTool` runs `askTokens` before the slash-command branch `continue`s, so
      a tool whose only steps are slash commands would contribute its field
      labels to STEP 0 while contributing nothing to the ground-truth list — the
      agent would ask for a value it never uses. No tool hits this today (the
      four asks all come from tools with real steps); found in review, left alone
      because the fix costs more than the latent bug.
- [ ] `--bar-h` in `index.css` is the sticky toolbar's height, measured by hand
      at three widths (155px below 25rem, 105px to xl, 63px above). Section
      headers and jump targets pin against it, so anything that changes the
      bar's height — a fourth control, a taller chip — has to be re-measured or
      headers slide under it. The rail's own `top-20` is a separate literal that
      only holds because the bar is 63px at xl.
- [ ] The toolbar controls wrap to two rows below ~414px and the search field
      shrinks to a few characters wide (pre-existing — the row has always been
      `flex-wrap` — but the bar is sticky now, so it costs ~18% of a phone
      viewport permanently). A `min-w` on the search field would push it to its
      own full-width row instead.
- [ ] The statusline's `pr.number` / `pr.url` / `pr.review_state` fields look
      GitHub-only — the docs example is a github.com URL mirroring the `gh` PR
      badge — so a PR-aware profile is probably dead for this team on Bitbucket.
      Left out of [0028](decisions/0028-statusline-card-via-slash-command.md)
      rather than shipped untested; worth 30 seconds to confirm on a branch with
      an open Bitbucket PR, and worth a fourth profile if it does populate.
- [ ] Verify Zoho Cliq's Windows install dir (`detect.ts` guesses
      `$env:LOCALAPPDATA\Programs\zoho-cliq`) on a machine that has it.
- [x] Teams desktop showed no version badge because the `microsoft-teams` cask
      reports the macOS build (26183.1901.4874.5228) and Windows Teams numbers
      diverge from it. `version` takes a per-platform map now, so mac shows the
      cask number and Windows/Linux stay bare
      ([0021](decisions/0021-version-badges-via-homebrew-cask-api.md)).
- [ ] A JDK 17 installed outside the listed paths (Corretto, SDKMAN, jenv, a
      hand-unpacked tarball) scans as missing since
      [0022](decisions/0022-jdk-detected-by-pinned-paths-not-javac.md) dropped the
      version-blind `javac` check. Deliberate — a false red costs one idempotent
      re-install, a false green costs a broken build. Add paths if anyone trips.
- [ ] The JDK card is named "JDK 17 (Azul Zulu)" and badges Azul's patch level
      on every platform, but its Windows command installs Microsoft.OpenJDK.17
      and Linux installs `openjdk-17-jdk`. All three track the same upstream
      17.0.x so the number is right in practice — pre-existing, noticed while
      adding the badges, and a per-platform `version` map would cover it if the
      patch levels ever drift.
- [x] Report upstream to graphify: on Windows it writes `graphify-out/.graphify_root`
      and `.graphify_python` with a UTF-8 BOM. The post-commit hook strips
      whitespace but not the BOM, so the root path becomes
      `﻿E:\...\graphify-out` and every background rebuild dies with
      WinError 123 — silently, into `~/.cache/graphify-rebuild.log`. Stripped both
      here and the rebuild works, but a reinstall will reintroduce it.
      Re-checked 2026-07-26: does not reproduce on the graphifyy installed now —
      every `.graphify_root`/`.graphify_python` write passes `encoding="utf-8"`
      (`cli.py:3317`, `cli.py:3451`, `watch.py:1172`, `watch.py:1305`) and neither
      file carries a BOM after several `graphify update` runs. Closed unfiled — no
      repro means no useful report; reopen with a version if it comes back.
- [x] Plugin detection read `~/.claude.json`, which only records a plugin once
      it has been used, so a fresh install scanned as missing
      ([0012](decisions/0012-plugins-detected-via-claude-settings-json.md)).
- [x] `Category.inScript` is dead — only the per-tool `t.inScript` is ever read
      (`aiSetup.ts:94`), so `mcp`'s `inScript: false` does nothing and MCP
      servers still reach the AI setup and the section's Copy all. Deleted the
      field rather than wiring it up: MCP servers belong in the AI setup, since
      `claude mcp add` is a command the agent can run. Found reviewing
      [0014](decisions/0014-per-project-sections-are-not-checkable.md), predates it.
- [ ] Windows and Linux get no download overlap in the AI setup's STEP 0
      ([0023](decisions/0023-ai-setup-front-loads-asks-not-subagents.md)):
      `winget download` writes an installer `winget install` never reads, so
      there is nothing to prefetch into, and Android Studio has no Linux
      secondary command at all. Only macOS overlaps (App Store Xcode +
      `brew fetch`). Fixable only by having the agent run the downloaded
      installer directly, which means the ground-truth command and the command
      actually run stop matching — not worth it for one 1.2 GB download.
- [ ] `detectScript.ts` drops `DETECT_SPECS` values straight into single-quoted
      sh and PowerShell literals with no escaping. Safe today — every value is
      hand-written and quote-free — but one containing `'` would break out of
      both generators. Worth a guard, or a check over `DETECT_SPECS`, before a
      value ever comes from anywhere but this repo.
- [ ] Detect's Undo ([0013](decisions/0013-detect-applies-whole-result-with-undo.md))
      lives in component state, so closing the modal or reloading loses it and a
      wrong clear becomes permanent. Fine while a scan is something you watch
      land, but if anyone hits that, the snapshot belongs in localStorage next
      to `rn-onboard:installed`.
- [x] Click-through of the live detect flow in a real browser. Headless Chrome
      over CDP against `wrangler pages dev dist`: opened the modal, POSTed a
      report under the rendered code, watched the poll tick the checklist with
      no refresh, confirmed hand-ticked tools the scan missed were cleared, then
      clicked Undo and diffed `rn-onboard:installed` back to its pre-scan state.
      Caught a stale "Result received" chip surviving Undo. This was the gap
      that hid the `>>`-prompt bug — scripts were only ever run as files.
- [x] herdr launcher — custom icon by drag-and-drop ([0010](decisions/0010-hosted-launcher-script-and-image-fields.md)).
      Landed as a generic `kind: 'image'` modal field rather than per-tool UI, so
      the "no per-tool UI" convention held.
- [ ] herdr launcher — icon on macOS is still unimplemented. The `.command` keeps
      the generic Terminal icon; stamping one needs `osascript`/JXA + `sips` (or
      an `.app` bundle) and can't be tested from Windows. The icon field
      self-hides there, so nothing misleads the user in the meantime.
- [x] herdr launcher — the whole icon path is verified end to end. `iconImage.ts`
      ran in headless Chrome on a real photo: 4-frame `.ico` (16/32/48/64, PNG
      payloads, dimensions matching their directory entries), Windows loads every
      frame, a non-image returns null. Both installers then produced a shortcut
      whose icon Explorer draws — Windows shortcut on the OneDrive-redirected
      Desktop, Linux `.desktop` with the icon byte-identical to the download.
