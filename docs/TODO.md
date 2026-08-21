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
- [x] `manual` meant two things — the prompt read it as "the agent cannot run
      this", `App.tsx:459` as "this is not a command", so the one `manual` step
      holding a real shell line rendered as uncopyable prose. Split rather than
      overloaded: `ModalStep.userRun` marks a command only the user can run. The
      prompt treats it exactly like `manual` ([HUMAN], counted in `handsOn`);
      the modal renders it through `CommandBlock`, so it stays copyable. No
      renderer change was needed — `userRun` simply isn't `manual`.
- [x] The SSH key card's note named `~/.ssh` on every platform; it now names
      `%USERPROFILE%\.ssh` for Windows too. `note` is a plain string with no
      per-platform form, so both paths are stated rather than branched. The
      generated-prompt leak sweep that found it is worth repeating whenever a
      rule gains a per-OS branch: grep the prompt for `zsh`, `Terminal.app`,
      `/Applications/`, `env:` and `PowerShell` on the platform that shouldn't
      have them.
- [x] `elevated` on Windows is no longer a guess. The winget manifests answer it
      directly: `Docker.DockerDesktop` and `Microsoft.OpenJDK.17` are
      `Scope: machine` with `ElevationRequirement: elevatesSelf`, while
      `Microsoft.Teams` (user MSIX) and `Zoho.Cliq` (`Scope: user`) need no
      elevation at all — and the first draft that elevated them would have
      registered a user MSIX against the administrator account. `elevated` is
      per-platform now
      ([0038](decisions/0038-elevated-installs-are-one-block-the-user-runs.md)).
      Still unobserved: whether a real UAC run behaves as the manifests imply.
- [x] The Node card covers Windows too — fnm keeps a stable
      `%APPDATA%\fnm\aliases\default` it repoints on `fnm default`, so the card
      appends that to the user PATH (no `bin` subdirectory there: `node.exe` sits
      at the root of a Windows install)
      ([0037](decisions/0037-node-needs-a-path-outside-fnms-per-shell-dir.md)).
      Shipped on documented mechanism rather than a first-hand repro, because a
      spare PATH entry is harmless and the alternative is three MCP cards
      silently broken on every Windows machine.
- [x] `sizeMb` is measured on every app cask now — `Content-Length` on the real
      download, or the dmg/pkg in Homebrew's cache — taking macOS from ~17 to
      ~18 GB and Windows/Linux from ~5 to ~6 GB. Formula tools still carry none
      on purpose: a bottle's cost is its dependency tree, not the card's to name
      ([0039](decisions/0039-the-estimate-names-its-download-total.md)).
- [x] The `devices.xml` caveat now rides on the Android Studio card's AVD step
      as a `tooltip`, which is what tooltips are for — the caveat a reader needs
      only once, kept out of the step's own line. It stays scoped to the CLI
      path, since the card's wording is the Studio GUI.
- [x] Category rail rows for filtered-out sections are `disabled` and dimmed
      instead of silently doing nothing. The predicate is the same one
      `CategorySection` returns null on — `toolsInCategory(...).some(matchesQuery)`
      — so a row is dead exactly when its target isn't on the page.
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
- [x] The search field carries `min-w-56`, so the `flex-wrap` toolbar drops it
      onto its own full-width row instead of squeezing it to a few characters on
      a narrow phone.
- [ ] The statusline's `pr.number` / `pr.url` / `pr.review_state` fields look
      GitHub-only — the docs example is a github.com URL mirroring the `gh` PR
      badge — so a PR-aware profile is probably dead for this team on Bitbucket.
      Left out of [0028](decisions/0028-statusline-card-via-slash-command.md)
      rather than shipped untested; worth 30 seconds to confirm on a branch with
      an open Bitbucket PR, and worth a fourth profile if it does populate.
- [ ] Remote Control's docs say a network outage longer than ~10 minutes times
      the session out and exits the process. That paragraph is written for server
      mode; unverified for the interactive `--remote-control` session the AI setup
      box now offers ([0031](decisions/0031-remote-control-is-an-optional-line-in-the-ai-setup.md)),
      where a process exit would abandon a half-finished install. Worth one
      deliberate test — pull the network for 12 minutes mid-run — rather than a
      redesign, since a 10-minute outage fails the installs anyway.
- [ ] Verify Zoho Cliq's Windows install dir (`detect.ts` guesses
      `$env:LOCALAPPDATA\Programs\zoho-cliq`) on a machine that has it.
- [x] herdr's detect spec is the integration's hook file
      (`~/.claude/hooks/herdr-agent-state.sh`) rather than `bins: ['herdr']`.
      Checks are any-of, so keeping the binary alongside it would still have
      ticked a machine that restores bare shells; erring red follows
      [0022](decisions/0022-jdk-detected-by-pinned-paths-not-javac.md) — a false
      red costs one idempotent re-run of a step the card already lists.
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
- [x] The JDK card is named "JDK 17", not "JDK 17 (Azul Zulu)": it installs Zulu
      on macOS, Microsoft's build on Windows and the distro's OpenJDK on Linux, so
      one vendor name was wrong on two platforms. The badge is now a per-platform
      map carrying only the macOS source, since that is the only one with a number
      worth trusting ([0021](decisions/0021-version-badges-via-homebrew-cask-api.md)).
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
- [x] `detectScript.ts` escapes spec values before they land in a single-quoted
      literal — `'\''` for sh, `''` for PowerShell, the same two idioms
      `tokens.tsx` applies to modal commands (not imported from there, which
      carries JSX). Still true that no value contains a `'` today; the quoting no
      longer depends on that holding.
- [ ] Detect's Undo ([0013](decisions/0013-detect-applies-whole-result-with-undo.md))
      survives closing the modal now that the snapshot lives in `App`
      ([0033](decisions/0033-detect-session-lives-in-app-and-codes-dont-expire.md)),
      but a reload still loses it — along with the pairing session, which orphans
      a script already copied. Both would want `localStorage`, which
      `.claude/rules/security.md` currently scopes to tool ids, the platform
      choice and the version cache; widening it is the decision to make first.
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
- [x] herdr launcher — macOS gets an icon. It is an `osacompile` applet with its
      `applet.icns` replaced, not the `.command` this item assumed: a hand-rolled
      bundle whose `CFBundleExecutable` is a shell script is refused by Launch
      Services with `-10669`, and replacing the icns alone leaves the applet icon
      showing because `osacompile` also ships an `Assets.car` and a
      `CFBundleIconName` outranking `CFBundleIconFile`. The custom-icon field now
      appears on macOS, where the icon-carrying step previously had no mac keys
      ([0045](decisions/0045-the-macos-launcher-is-an-osacompile-applet.md)).
- [ ] The macOS launcher hardcodes `Terminal.app`. There is no reliable way to ask
      macOS which terminal a user prefers, so anyone living in iTerm gets Terminal
      for this one launcher
      ([0045](decisions/0045-the-macos-launcher-is-an-osacompile-applet.md)).
- [ ] The macOS launcher is ad-hoc signed, not notarised. Built locally by a script
      the reader ran, so it carries no quarantine attribute and Gatekeeper stays
      quiet — but copying one machine's `herdr.app` to another would be challenged,
      which is not a route the card offers
      ([0045](decisions/0045-the-macos-launcher-is-an-osacompile-applet.md)).
- [ ] Reported once, unreproduced: after `herdr upgrade`, the Windows launcher
      does not start herdr, and running `herdr` from a shell then opens it with
      every pane a bare shell. The launcher half is not ruled in — the `.lnk` it
      writes was parsed and stores `%LOCALAPPDATA%/Programs/Herdr/bin/herdr.exe`
      unresolved, and that `bin` is a junction the upgrade repoints, so the
      target survives a version bump. What is ruled in is the second half: the
      integration hook is versioned and a stale one stops reporting silently,
      which is why the card's step now says to re-run it and names `herdr
      integration status`. Catching it properly needs the state captured across
      an upgrade — `integration status` and the `.lnk` target before and after —
      rather than reasoning after the fact.
- [ ] The Linux `.desktop` still writes `Exec=herdr` bare while macOS and Windows
      both pin herdr's absolute path, for the reason
      [0037](decisions/0037-node-needs-a-path-outside-fnms-per-shell-dir.md) found.
      A desktop entry is usually started with the session PATH, so the bare name
      probably resolves — probably, on a platform none of this was tested on, which
      is why it was left alone rather than changed to match.
- [ ] The Stop hook in `.claude/hooks/guard.mjs` only asks whether *anything* is
      logged under today's heading, so once one line exists every later session
      that day passes for free. Catching per-change gaps means knowing which
      files this session touched, which is the transcript rather than mtimes —
      more machinery than the gap is worth, but that's the ceiling
      ([0030](decisions/0030-conventions-as-rules-and-hooks.md)).
- [ ] A `permissions.deny` command rule is a prefix, so a flag that can also sit
      later in the line escapes it — `Bash(git push --force *)` catches
      `git push --force origin main` but not `git push origin --force`. Closing
      that means a PreToolUse hook reading the command body, which is the same
      `guard.mjs` with a `Bash` matcher; worth it only if a session is ever
      observed getting through ([0030](decisions/0030-conventions-as-rules-and-hooks.md)).
- [x] herdr launcher — the whole icon path is verified end to end. `iconImage.ts`
      ran in headless Chrome on a real photo: 4-frame `.ico` (16/32/48/64, PNG
      payloads, dimensions matching their directory entries), Windows loads every
      frame, a non-image returns null. Both installers then produced a shortcut
      whose icon Explorer draws — Windows shortcut on the OneDrive-redirected
      Desktop, Linux `.desktop` with the icon byte-identical to the download.
- [ ] The Argent card has never been run against a real bare-RN repo. Everything
      verified so far is static: the data invariants, and that it stays out of the
      AI-setup prompt and the scan script on all five platforms. What matters is
      untested — that the prompt writes the two constants files and the skill,
      that `/memory` shows both `@` imports expanded, that with no emulator booted
      it boots the AVD named in `docs/dev-setup.local.md` and derives the build
      command from gradle, and that a deliberately wrong AVD name makes it list
      the real ones and stop rather than substitute one. Blocked on having an RN
      repo to hand; the steps are in
      `superpowers/plans/2026-08-10-argent-card.md` Task 4.
- [ ] `CLAUDE.md` claims editing an existing `docs/decisions/` file through `Edit`
      asks first, and `.claude/settings.json` now carries
      `"ask": ["Edit(/docs/decisions/**)"]` to back it. Unverified: whether an
      `ask` rule actually prompts under `permissions.defaultMode: "auto"` was never
      tested, because the session that added it started before this repo existed,
      so its project settings were never loaded — `npm --version` ran despite an
      explicit deny. Settle it from a session started inside the repo: confirm the
      file loads at all (`npm --version` must be denied), then edit a decision
      file. If it does not prompt, delete the claim rather than keep the rule.
- [ ] `Tooltip`'s panel carries `role="tooltip"` but nothing links it to its
      trigger, so a screen reader never announces it. Pre-existing, and mostly
      harmless because the label usually duplicates the trigger's `aria-label` —
      except for the three header buttons in `App.tsx`, where the tooltip is the
      only descriptive text there is. One `useId` plus `aria-describedby` closes
      it; left alone here because it was outside the blast radius of
      [0042](decisions/0042-floating-layers-portal-to-the-body.md).
- [ ] Maestro, later — emitting a YAML flow on a pass so a fixed bug stays fixed
      on every PR. Deliberately out of the Argent card: `argent-guide.md` places
      it as a CI regression artifact, not a debugger, and it sees neither logs nor
      network. Worth a card only once someone wants PR-time regression checks
      ([0041](decisions/0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md)).
