# Field report — real AI-setup run, 2026-08-07

One full `--dangerously-skip-permissions` run of the generated prompt on a fresh
macOS 26.6 / Apple Silicon machine (`mac-arm`), Wi-Fi at ~10 Mbps rising to
~52 Mbps mid-run. Every row below is something the run actually hit, not a
review guess. Nothing here is fixed yet.

Headline: the run worked, but took **~4 hours against a promised ~30 min**, and
needed the user **6 separate times** in a flow designed to need them twice.

## Status — 2026-08-07

Everything below is fixed except where noted. Decisions:
[0036](decisions/0036-mcp-servers-register-at-user-scope.md) (A4),
[0037](decisions/0037-node-needs-a-path-outside-fnms-per-shell-dir.md) (A3, C4),
[0038](decisions/0038-elevated-installs-are-one-block-the-user-runs.md) (A1, A2, B3, B7, D1, D4),
[0039](decisions/0039-the-estimate-names-its-download-total.md) (B1, B2).
A5, A6, B4, B5, B6, C1, C2, C3, C5, C6, C7, D3 landed as prompt and card edits.

Not fixed, and parked in `TODO.md` with reasoning: **C8** (the `devices.xml`
note lives in rule 4a only, not on the GUI-worded card), **D2/D5** (the
hands-on multiplier is still coarse, and Cisco still inflates it), and the
Windows halves of A3 and 2.1 — this run only ever exercised `mac-arm`.

**2.2 was rejected after implementation was agreed**: moving the JDK to the
`openjdk@17` formula saves no password moment, because the Homebrew installer
needs one anyway and sudo caches its timestamp. See 0038.

---

## A. Blockers — these broke the run

| # | What happened | Evidence | What to change | Where |
|---|---|---|---|---|
| A1 | **`sudo` cannot work from Claude Code at all.** Rule 6 tells the agent to prime the cache with `sudo -v`. There is no TTY, so it fails. Rule 6b's fallback — have the user send `! <command>` — has no TTY either, so it fails identically. Dead end reached twice before falling back to "open Terminal.app yourself". | `sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper` — from both the agent shell and `!` | Rule 6 should stop pretending the agent can hold a sudo session. Correct shape: agent *detects* which installs need elevation, groups them, and hands the user **one block to paste into a real terminal** (Terminal.app/iTerm — explicitly not `!`). Rule 6b must exclude password prompts from the `!` trick. | `aiSetup.ts` rule 6 + 6b |
| A2 | **Nothing in the app knows which tools need sudo.** Rule 6 says "run the installs that need a sudo password as one contiguous block" but the agent has to guess which those are. Discovered by querying the Homebrew API for `pkg` artifacts mid-run. | mac casks with `pkg` artifacts: `zulu@17`, `docker-desktop`, `microsoft-teams`, `zoho-cliq`. Everything else is `app` → no sudo. | Add a per-tool `elevated?: boolean` (or derive per-platform). Then the prompt can emit a literal ELEVATED BLOCK, and the modal can *name* the tools in its "stay at the machine" phase instead of hand-waving. | `tools.ts` + `aiSetup.ts` |
| A3 | **fnm's PATH is ephemeral, so every `npx`-based MCP server silently breaks.** `fnm env` prepends `~/.local/state/fnm_multishells/<pid>_<ts>`, which dies with its shell. Claude Code's own environment never sources an interactive `.zshrc`, so it has **no fnm at all** — 3 of 11 MCP cards ENOENT on first use. | `Failed to reconnect to teams: ENOENT` / `XcodeBuildMCP: ENOENT` / `android-dev: ENOENT`. Claude Code's shell snapshot: **0 fnm mentions**. 12 stale multishell dirs on disk. Fixed by symlinking fnm's stable `~/.local/share/fnm/aliases/default/bin/{node,npm,npx}` into `/opt/homebrew/bin`. | Highest-value single fix in this list. The Node card should establish a **stable** node/npx path, not only the shell hook. Affects `xcodebuild-mcp`, `android-dev-mcp`, `teams-mcp` — all three look fine at `claude mcp add` time and fail later. | `tools.ts` node card; note on the 3 MCP cards |
| A4 | **`claude mcp add` has no `--scope`, so servers land in whatever directory the agent happened to be in.** All 7 registered into a scratchpad path and were invisible from the user's project. Had to remove and re-add all of them. | `File modified: /Users/user/.claude.json [project: /private/tmp/.../scratchpad]` | Add `--scope user` to every `claude mcp add` command, or the cards must state where to run them. A user pasting these into a random terminal hits the same trap with no agent to notice. | all 11 `mcp` cards in `tools.ts` |
| A5 | **AVD creation fails: `avdmanager` infers the wrong SDK root.** Rule 4 says install `android-commandlinetools` if `sdkmanager` isn't on PATH, but the Homebrew cask puts it in `/opt/homebrew/share/android-commandlinetools`, so it looks for system images there — not in `$ANDROID_HOME`. | `Error: Package path is not valid. Valid system image paths are: null` — while the image was installed under `~/Library/Android/sdk`. Fixed by `sdkmanager --sdk_root="$ANDROID_HOME" "cmdline-tools;latest"` then using `$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager`. | Rule 4 must specify `--sdk_root="$ANDROID_HOME"` on every `sdkmanager` call **and** that `avdmanager` has to be the copy inside the SDK root. | `aiSetup.ts` rule 4 |
| A6 | **Rule 4 omits two packages the AVD cannot exist without.** It lists only `platforms;android-35` + `platform-tools`. An AVD needs a system image, and booting it needs the `emulator` package — which the `ANDROID_HOME` PATH line already assumes exists. | Had to add `system-images;android-35;google_apis;arm64-v8a` (~1.5 GB) and `emulator` (~400 MB) to get a bootable AVD. | Add both to rule 4 and to the Android Studio card's steps. This is also ~2 GB of unaccounted download (see B1). | `aiSetup.ts` rule 4, `tools.ts` android card |

---

## B. Wrong claims — the app states these confidently and they're false

| # | Claim | Reality | Fix |
|---|---|---|---|
| B1 | **"~30 min, walk away for ~20"** — `AiSetupModal.tsx` computes `selectedCount * 0.7` minutes. | Took **~4 hours**, almost entirely download-bound. The estimate has no notion of bytes: ~17 GB total (Xcode 3.5 + iOS runtime 8.5 + Android Studio 1.5 + Android SDK 2 + Docker 1.5). At the 10 Mbps this machine had, that's ~4 h of pure transfer before any install work. | Make the estimate bandwidth-aware, or stop giving a single number. Even a static "≈17 GB to download — ~35 min on fast office Wi-Fi, 3–4 h on 10 Mbps" would be honest where `count × 0.7` cannot be. Only a handful of tools need a size; the rest round to zero. | `AiSetupModal.tsx:61-82` |
| B2 | **"Xcode — ~10 GB, the longest step in the run"** (STEP 0 download line). | Xcode 26.6 is **3.5 GB**. The 8.5 GB is the *iOS simulator runtime*, a separate later download via `xcodebuild -downloadPlatform iOS`. Stated as one 10 GB blob, both numbers mislead — and the runtime download is invisible in the plan. | Split them: Xcode ~3.5 GB in STEP 0, iOS runtime ~8.5 GB as its own line. The runtime is the real longest step. | `aiSetup.ts:180` |
| B3 | **Rule 4: `sudo xcodebuild -runFirstLaunch`.** | Needs **no sudo** — ran clean as the user, and `-checkFirstLaunchStatus` confirms components installed. `xcodebuild -downloadPlatform iOS` also needs no sudo. Meanwhile the step that *does* need sudo isn't mentioned at all: `sudo xcode-select -s /Applications/Xcode.app`, without which the active dir stays on Command Line Tools and iOS builds/XcodeBuildMCP don't work. | Drop `sudo` from `runFirstLaunch`. Add `xcode-select -s` as the real elevated step (or note the `DEVELOPER_DIR=` env workaround, which avoids sudo entirely). | `aiSetup.ts` rule 4, `tools.ts` xcode card |
| B4 | **Xcode card: "Xcode → Settings → Platforms → download iOS"** as a `manual` step. | Fully scriptable — `xcodebuild -downloadPlatform iOS`, no sudo. It's already claimed by rule 4, but the card's own wording is what a non-AI user follows, and it sends them into the GUI for something one command does. | Make the CLI the card's step, GUI the fallback. | `tools.ts:461-465` |
| B5 | **Teams MCP: "Ask Claude to authenticate with Teams."** | Claude can't. The real step is `npx @floriscornel/teams-mcp@latest authenticate` in a **real terminal** (device-code flow), and in a corporate tenant it then hard-stops on admin consent for the Microsoft first-party app **Microsoft Graph Command Line Tools** (`14d82eec-204b-4c2f-b7e8-296a70dab67e`). | Put the real command on the card. Add the admin-consent prereq — this is a "you will be blocked for days" fact, exactly what `prereq` is for. | `tools.ts:1076-1079` |
| B6 | **Zoho Cliq MCP: "Zoho MCP console → Add Tools → Cliq → copy the server URL."** | Following that into the console's **pre-configured** "Cliq Messaging" server produced a server that connected, authenticated, and exposed **0 tools and 0 resources**. Four attempts, incl. remove/re-add and fresh OAuth. Only **Create MCP server** with hand-ticked tools worked (then 93 tools). Also: picking Cliq offers **302 actions** with no guidance. | Card must say *Create MCP server*, not a pre-configured one, and name a minimal tool set (messages / list chats / list channels / channel info / users, + posting if wanted). 302 tools in context is its own problem. | `tools.ts:1054-1062` |
| B7 | **Homebrew card is a bare `curl \| bash`** and the run's own "one paste" framing implies it's unattended. | Homebrew's installer needs sudo and pauses on `Press RETURN to continue`. This is the first card in the list, so it's the first thing to strand a walked-away user. | Note that it needs sudo + a keypress, and that `NONINTERACTIVE=1` suppresses the prompt. It also belongs in the A1/A2 elevated block, first. | `tools.ts:141`, `aiSetup.ts` rule 6 |

---

## C. Robustness — the run survived these but only because a human was watching

| # | What happened | What to change |
|---|---|---|
| C1 | **Downloads fail routinely and the prompt has no retry policy.** `fnm install` failed twice (`failed to unpack .../bin/node`), herdr timed out (`curl (28)`), Cursor and android-commandlinetools died (`curl (56) Recv failure: Connection reset by peer`), Android Studio died at 904 MB (`curl (18) transfer closed`). Every one succeeded on retry. | Add an explicit rule: network failures are expected, retry a failed download N times before calling it failed. This one line would have removed most of the run's manual intervention. |
| C2 | **STEP 0's parallel-download advice caused the failures in C1.** Starting Xcode *and* `brew fetch android-studio` together on a 10 Mbps link starved both; large transfers hit server idle timeouts and reset at 0 bytes while small ones (<200 MB) sailed through. Serialising fixed it. | Qualify the advice: overlap is a win on a fast link and actively harmful on a slow one. At minimum tell the agent resets under concurrency mean *back off and serialise*, not *the tool is broken*. |
| C3 | **The `brew fetch` prefetch was wasted.** Homebrew auto-updated mid-run (`9e0022780b` → `6.0.15`), bumped the `android-studio` cask version, and invalidated the cached dmg — which then re-downloaded from scratch. | Set `HOMEBREW_NO_AUTO_UPDATE=1` for the run, or `brew update` once at the top before any fetch. Otherwise STEP 0's only macOS overlap is a coin flip. |
| C4 | **The Node card's `&&` chain loses the shell hook on any failure.** `brew install fnm && fnm install --lts && … && echo 'eval …' >> ~/.zshrc` — the fnm install failed, so the append never ran, leaving `node` working in the agent's shell but **absent from every new terminal**. Silent until much later. | Either split the chain so the profile edit is unconditional, or have rule 2 note that a retried step must re-run the rest of its chain. Related to A3. |
| C5 | **Rule 1's idempotency check can't see GUI apps.** "version command or `command -v`" finds nothing for an `.app`. Zoho Cliq was already installed outside Homebrew (v1.8.4) and `brew list --cask` didn't know. | Rule 1 should say to check `/Applications/<Name>.app` for GUI tools. `DETECT_SPECS` in `detect.ts` **already holds these install dirs** — the prompt could carry them instead of inventing a second source of truth. |
| C6 | **Rule 8's verification gives false negatives if run wrong.** Verifying in `zsh -l -c` reported node/npm/pnpm/yarn/JAVA_HOME/ANDROID_HOME all missing, because `.zshrc` is only sourced for **interactive** shells. Everything was actually fine. | Rule 8 should specify verifying in a new **interactive** shell (`zsh -i -l -c`). As written it invites the agent to "fix" a working machine. |
| C7 | **Plugin marketplace shorthand resolves to SSH.** `claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` failed twice (`git@github.com: Permission denied (publickey)`) while the other two cloned over HTTPS. Explicit HTTPS URL worked. | Use the full `https://github.com/…​.git` form in the three plugin cards, or note the fallback. A fresh machine has no GitHub key — the SSH card in this app is for **Bitbucket**. |
| C8 | **`avdmanager` errors on a missing `devices.xml`** in the system image. Non-fatal, but it prints two `Error:` lines on every invocation, incl. successful AVD creation — which reads as failure. Silenced with a schema-valid empty device list (`devices-10.xsd` declares `device` as `minOccurs="0"`). | Worth a one-line note on the Android card so the next person doesn't chase it. |
| C9 | **`timeout` doesn't exist on macOS.** Minor, but cost a wasted step probing Xcode commands. | Bundle into a short "macOS shell gotchas" line alongside C6 if one gets added. |

---

## D. Flow / copy — smaller, but they shape expectations

| # | Observation | Suggestion |
|---|---|---|
| D1 | The modal's phase list puts *"~5 min — stay at the machine for the sudo password prompts"* as phase 2, implying the agent triggers sudo while you watch. Given A1 it can't: the real shape is **the agent hands you a paste block for a separate terminal**. | Re-word the phase to match what actually happens, and name the tools (A2). |
| D2 | `handsOn × 2 min` under-counts badly. The end block was OAuth flows across 4 services, a browser key paste, a Zoho console rebuild, and two IT requests. | Either widen the multiplier or stop implying the tail is short. |
| D3 | Rule 9 has no notion of a human step **blocked on a third party**. Teams needed Entra admin consent, Cisco needed a portal URL from IT, Zoho needed an admin — the prompt kept presenting all three as actionable. | Add: if a human step is blocked on someone else, mark it blocked, state who's needed, and don't re-present it. |
| D4 | `--dangerously-skip-permissions` is described as "what makes it unattended". True for Claude's own prompts, and the copy does say the OS still asks — but the user's takeaway was still "this is auto mode". | The flag's limit deserves to be the *first* thing said about it, not the caveat after. It governs Claude's approvals and nothing else. |
| D5 | Cisco VPN contributes 2 `handsOn` steps that are undoable without a portal URL most users won't have to hand. | Consider a "blocked without a value from IT" marker so it doesn't inflate the estimate. |

---

## Suggested order

1. **A3** — silently breaks 3 MCP cards, and the failure surfaces long after the card is ticked.
2. **A4** — silently misplaces all 11 MCP registrations.
3. **A1 + A2 + B7 + D1** — one coherent rework of how elevation is handled end to end.
4. **B1 + B2** — the estimate is the app's headline promise and it's off by ~8×.
5. **A5 + A6 + B3 + B4** — Android/Xcode correctness; all four are wrong-command bugs.
6. **C1 + C2 + C3** — retry/serialise/no-auto-update; cheap text, large effect on a slow link.
7. Everything else as convenient.

## Open questions for you

- Per-tool download sizes: worth adding a `sizeMb?` to the handful of large tools, or keep the estimate coarse and just say "download-dominated"?
- `--scope user` on every `claude mcp add`: correct default, or does anyone want project-scoped servers?
- Should the prompt carry `DETECT_SPECS` install dirs for idempotency (C5), or stay independent of `detect.ts`?
- The elevated block (A2) needs the agent to hand over a terminal paste. Does that belong in STEP 0's "stay at the machine" phase, or as its own numbered step in the generated prompt?
