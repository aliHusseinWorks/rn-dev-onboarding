# Argent — Reference Notes

Agentic toolkit by Software Mansion that lets Claude Code drive, debug, and profile your React Native app. Notes for a **bare RN CLI** project (no Expo).

---

## What it is

An MCP server + skills that give the agent direct access to iOS Simulators, Android emulators, and physical Android devices. The point is a closed loop: the agent that writes the code also runs it, drives the UI, reads the logs, and verifies the fix — in one session.

**What it can do:**

- Build and launch the app, boot simulators, open deep links
- Drive the UI — taps, swipes, pinches, rotations, keyboard, hardware buttons
- Read console logs and crash reports
- Capture network requests and HTTP payloads at **both** the JS `fetch` layer and the native layer
- Attach the debugger, evaluate JS in the running app
- Inspect the React component tree and native view hierarchy
- Record and replay flows
- Profile — Hermes, React DevTools, Instruments, Perfetto

**Platforms:** iOS Simulator, Android Emulator, and physical Android devices over adb. **No physical iOS devices.**

**Cost:** Free. No account, no API key. Runs locally over MCP stdio.

---

## Install

Run in your **terminal**, at the project root — not inside Claude Code:

```bash
npx @swmansion/argent@latest init
# pnpm projects:
pnpm dlx @swmansion/argent@latest init
```

This is an installer wizard: it installs the package, detects your agent, and writes the MCP config. Then **restart Claude Code**.

Confirm it's wired up by asking: *"What can Argent do?"*

### Global vs local mode

- **Default (global)** — installs for you only
- **`init --local`** — adds it to `devDependencies` and commits the MCP config, so teammates just run `npm install`. Better for teams.

### What it writes to your repo

`.mcp.json`, `.argent/install.json`, and skills/rules/agents files. Run `git status && git diff` right after `init` to see exactly what changed and revert anything you don't want.

### Requirements

- macOS + Xcode (iOS) / Android Studio + a created AVD (Android)
- Node 18+
- Your app must already build by hand — Argent won't fix a broken build config

### Housekeeping

- Telemetry is on by default (usage + diagnostics, not your code): `argent telemetry disable`
- Mixed license — source is Apache 2.0, but the simulator-server and native devtools binaries are Software Mansion's proprietary property, licensed for use within the project. Only matters if legal audits your dependencies.

---

## Setup

Put the constants a bare RN project can't advertise into `CLAUDE.md`:

```markdown
## Build
iOS: ios/YourApp.xcworkspace, scheme YourApp
Android: cd android && ./gradlew assembleDebug
Bundle ID: com.yourco.app

## Devices
iOS: iPhone 16 Pro
Android: Pixel_8_API_35

## Test account
test@x.com / password123 (skips onboarding)

## Notes
API base: dev.api.yourco.com
SSL pinning disabled in debug
```

Get the real device names once:

```bash
xcrun simctl list devices available
emulator -list-avds
```

Copy the AVD name exactly — it's whatever you typed when you created it.

### Keep it in CLAUDE.md

~20 lines of constants that every session needs belongs inline. It loads at session start, always, which is the point. Only move things out when they're long and situational (a full profiling playbook, release steps) — then use `.claude/skills/<name>/SKILL.md`, which loads only when the task matches.

If you do split it out, use the import syntax:

```markdown
Build commands, devices, and test account: @docs/dev-setup.md
```

A prose mention like "see docs/dev-setup.md" does **nothing** — CLAUDE.md is static text injected at launch, so an instruction to "read this file" never executes. The `@` is what expands it. Verify with `/memory`.

Note: imports don't save context. Imported files load at launch either way.

---

## Daily use

1. Start Metro: `npx react-native start` (its own terminal — Argent doesn't manage it)
2. Boot a sim, or let Argent do it
3. Describe the task **with an explicit pass condition**
4. Read the screenshot/log evidence yourself
5. `/clear`, next task

**One session per task**, not per phase. Don't split coding and verification — verification is only useful when it knows what just changed.

### Full loop example

> "Orders list goes empty after pull-to-refresh. Reproduce it on the iOS sim, find the cause, fix it, then rebuild and verify. Pass condition: list shows 3 items, no error toast."

### Logs-only workflow

You don't have to let it drive. Reproduce the bug by hand, then:

> "Use Argent to read the console logs and network requests from the last minute. What failed?"

Two notes:
- Ask soon after reproducing — OS log buffers (logcat, simulator logs) roll over regardless of tooling
- Tell it what you did. "Tapped refresh twice, second went blank" beats dumping the whole log

It usually reaches for Argent on its own, but will sometimes shell out to raw `adb logcat` instead — works, but shallower. Name Argent explicitly if you want network payloads and JS-layer detail.

### It's not always-on

MCP is request/response. Argent does nothing unless Claude calls a tool. Your simulator is still just your simulator — run the app and tap around and it's completely uninvolved. To actually disable: `/mcp` toggles servers, or `argent uninstall`.

---

## testIDs

A prop that renders to a native accessibility identifier, so the agent queries elements directly instead of guessing from screenshots.

```jsx
<TextInput testID="login-email" ... />
<Pressable testID="login-submit">...</Pressable>
<FlatList testID="orders-list" ... />
{/* list rows: */}
testID={`order-row-${order.id}`}
```

**This is the single biggest quality lever.** Without them, Argent falls back to the accessibility tree and screenshots — it still works, just flakier and more likely to falsely report success.

- Add to inputs, buttons, toggles, and containers you'll assert on (`error-banner`, `empty-state`)
- Naming: `screen-element`. Stable and semantic — never index-based, never derived from visible text
- **One screen at a time, as you debug it.** Don't backfill the whole app

Delegate it:

> "Add testIDs to interactive elements and assertable containers in src/screens/Orders. Naming: screen-element. Don't change styling."

**Android gotcha:** on iOS `testID` maps cleanly to `accessibilityIdentifier`; on Android it lands on the view `tag` and some third-party components swallow it. If it's findable on iOS but not Android, add `accessibilityLabel` as a fallback.

---

## Known rough edges

- **It declares victory early.** Given a vague goal it'll fix *something*, see a plausible screen, and report success. Always state the pass condition.
- **Long autonomous runs drift.** Build → test → fix → rebuild burns context, and iOS builds are slow. One bug per session beats "fix these five overnight."
- **Cross-platform isn't free.** Ask for iOS and Android in one breath and it'll verify one properly and hand-wave the other. Sequential passes.
- **Native network traffic.** Argent reads the native layer, but bare RN apps carry more native SDKs (analytics, auth, payments) doing their own HTTP. If SSL pinning is on in a native module, disable it in the debug variant or put mitmproxy in front — otherwise the agent sees encrypted noise.
- **Bad device name** → the call fails, it lists what you have, wastes a turn. Installing a runtime is Xcode → Settings → Components, not something Claude can do.
- **Most RN + AI writeups assume Expo** and push `expo-mcp`. Not applicable to you.

---

## Tools I ruled out

**Maestro** — YAML E2E flows, has its own MCP server (`claude mcp add maestro -- maestro mcp`). Only does UI; can't see logs or network. It's a CI regression artifact, not a debugger. Add it later, if and when you want a fixed bug to stay fixed on every PR. Not needed for local work.

**Appium** — WebDriver-based, cross-platform, mature. But it's a test *executor*, not a diagnostic tool, and it's slow: it goes through XCUITest, which context-switches between runner and app on every interaction. Argent talks to the simulator directly. Appium is the right answer only for physical iOS devices, cloud device farms, an existing suite with QA owning it, or non-RN native apps in the same pipeline.

**Detox** — only if you already have a suite. For new work, Maestro YAML is less painful.

**Android Dev MCP** (`android-dev-mcp-server`) — the one I actually had installed, and dropped. It overlaps Argent on everything you reach for (boot, install, launch, tap, screenshot, UI dump, logcat) while being an `adb` wrapper: a fresh `adb` process per action (~100–200ms) and a `uiautomator` dump per screen read (1–5s), which is why tapping through a login flow felt slow. It has no network capture and no JS layer. Its only unique pieces are Metro's lifecycle — which I run myself in its own terminal anyway — plus ANR traces and `bugreport`, both one `adb` command away. Physical Android was the argument I thought kept it; Argent does that too. Worth re-adding only if you want Metro driven from the agent.

---

## Bundle IDs and attaching to a running app

Bundle ID = the app's unique identifier (`com.yourco.app`; package name on Android). Argent launches apps by it.

**Can it auto-detect?** Partly. It can list apps installed on a booted simulator, but it can't know *which* one you mean when the project has several — and it can't know the ID at all before the app is built and installed.

Multi-bundle setups (white-label, tenant-per-app, staging vs prod) are where this breaks. Same codebase, different schemes, different IDs, nothing on the simulator indicating which one this task is about. So list them:

```markdown
## Bundles
Default: com.yourco.app.staging (scheme: YourApp-Staging)
Tenant A: com.tenanta.app (scheme: TenantA)
Prod: com.yourco.app (scheme: YourApp)
```

Then override per task: *"run tenant A."*

The **scheme/variant** matters more than the ID — that's what decides which build command runs.

### These are defaults, not instructions

`CLAUDE.md` is reference material. Listing a device and bundle does **not** mean every session boots a fresh simulator and rebuilds.

If a sim is already booted with the app installed, Argent attaches to it. Be explicit when you want that guaranteed:

> "Use the app already running. Don't rebuild."

That's the faster loop — build once by hand, then let Claude drive and read logs against it, skipping the slow iOS build. The constants only come into play when there's ambiguity: nothing running, several sims up, or a rebuild is needed after a code change.

---

## Links

- https://argent.swmansion.com
- https://github.com/software-mansion/argent
- https://www.npmjs.com/package/@swmansion/argent
