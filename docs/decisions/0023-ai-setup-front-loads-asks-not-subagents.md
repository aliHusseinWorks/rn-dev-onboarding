# 0023 — The AI setup front-loads its questions; it does not fan out to subagents

Date: 2026-07-27 · Status: accepted

## Context

The AI setup prompt was correct but unsupervisable: it stopped for a personal
value (`<ask the user for: Work email>`) somewhere in Essentials, again for an
`[HUMAN]` GUI step in Apps, again for a browser sign-in in MCP servers. Every
stop was in the middle of a run the user had no reason to watch, so the practical
experience was babysitting a terminal for half an hour to type five short answers
and click four dialogs.

The first instinct was to make it *faster* by telling the agent to split the
install list across subagents. Rejected, for reasons that are structural rather
than a matter of tuning:

- **Subagents have no channel to the user.** A subagent that reaches an
  `<ask the user for: ...>` placeholder or an `[HUMAN]` step either invents a
  value or dies. Those steps are a third of the list.
- **Installers serialise below us anyway.** Windows MSI takes a global
  `_MSIExecute` mutex, so a second concurrent winget/MSI install fails outright;
  Homebrew contends on the shared prefix at link time. Parallel agents buy
  parallel failures, not parallel installs.
- **The list is a dependency chain.** fnm → node → pnpm; JDK → Android Studio →
  `ANDROID_HOME` → adb → AVD. The prompt's first line already says the order
  matters.
- **Each subagent is its own shell.** The Windows PATH rule exists because a
  freshly installed tool isn't on PATH in-session; N agents that cannot see each
  other's environment writes turn that into concurrent machine-level PATH
  mutation, which is a way to truncate someone's PATH.
- **The bottleneck is bytes and attention, not CPU.** The long poles are Xcode
  (~10 GB) and Android Studio (~1.2 GB) over one connection, plus the human.
  Neither responds to more agents.

## Decision

Reshape the single-agent run instead: **all questions up front, all clicks at the
end, nothing in the middle.**

- A `STEP 0` block. `askTokens` now records the label of every placeholder it
  actually substitutes, so the prompt can list every question in one batch ahead
  of the install list rather than scattering them through it.
- `STEP 0` also starts the long downloads. On macOS that is a real overlap —
  Xcode from the App Store plus `brew fetch --cask android-studio`, which the
  later `brew install --cask` reads from the cache. On Windows and Linux there is
  no prefetch worth having: `winget download` writes an installer file that
  `winget install` never consults, so Windows gets the front-loaded questions and
  a browser download the user starts by hand, and nothing more. Said plainly here
  because it looks like an oversight otherwise.
- Rule 3 inverts. `[HUMAN]` steps are collected and presented as one block at the
  end instead of halting the run at each one — with an explicit exception for the
  ones a later `RUN` depends on (Xcode must exist before `xcode-select`, the
  Android SDK before `adb` verifies). Rule 9 sequences the finish so the deferred
  block runs *before* the rule 8 toolchain verification, which would otherwise
  check for an SDK nobody had installed yet.
- Rule 6 stops pretending elevation can be automated. UAC and `sudo` are the OS
  asking, not the agent, and no permission mode absorbs them. So the
  elevation-needing installs run as one contiguous burst immediately after
  `STEP 0`, while the user is still at the machine having just answered the
  questions. On Unix that burst opens with a single `sudo -v` to prime the
  credential cache, because the timestamp expires in minutes and a scattered
  `sudo` later in the run hangs on an absent user.
- Rule 4 gains the Xcode counterpart to the Android CLI escape hatch:
  `sudo xcodebuild -runFirstLaunch` for the required-components dialog and
  `xcodebuild -downloadPlatform iOS` for the simulator runtime. Xcode bundles the
  current iOS SDK and one current iOS simulator runtime, but Xcode 26 still
  raises "Install iOS Simulator Runtimes" often enough that the GUI step in
  `tools.ts` earns its place — this just lets the agent clear it without the user.

The modal's start command carries `--dangerously-skip-permissions`, since the
whole shape is pointless if Claude Code asks before each of ~60 commands. It is
labelled honestly rather than slipped in: what it does, that dropping it gives
you per-step approval, and that the OS prompts survive it either way.

## Amendment, same day — the end block was full of avoidable work

Walking through the rendered prompt exposed that the end block was twelve items,
not the four the reshape assumed, and that a third of it did not belong there:

- **Docker Desktop, Reactotron on Windows, and Zoho Cliq desktop were
  download-only links** in `tools.ts`, so `emitTool` emitted them as
  `[HUMAN] Download and install from …`. All three have had one-line installs the
  whole time — `Docker.DockerDesktop`, `InfiniteRed.Reactotron`, `Zoho.Cliq` on
  winget; `docker-desktop`, `zoho-cliq` casks on macOS. Adding them as
  `secondary` commands is data-only: the existing link-primary-plus-command
  pattern (VS Code, Android Studio) already makes `emitTool` emit `RUN:` with the
  URL demoted to a GUI fallback, and the cards pick up a copy button for free.
  Windows drops 12 → 9 hands-on steps, macOS 13 → 11.
- **Rule 4 said the Android SDK and AVD steps "may be done via CLI … if you
  prefer".** Optional, so a cautious agent hands the user a GUI walkthrough for
  work it can do itself. It is now a mandate with the GUI wording as a stated
  fallback, extended with the licence-acceptance step, a pointer to the
  standalone command-line tools when `sdkmanager` is absent (Android Studio does
  not necessarily ship it before its first-run wizard), and the Xcode equivalent
  on macOS. Rule 3 cross-references it, because those lines still carry a
  `[HUMAN]` prefix — they are `manual: true` in `tools.ts`, which is correct for
  the card a human reads and wrong only in the prompt, and teaching the emitter
  that difference costs a new per-step field for two steps.

### Rejected: input fields for the five values in the AI setup modal

The obvious next step was to give the modal a text box per placeholder — name,
work email, VPN portal URL, Zoho MCP URL — and substitute the filled values into
the copied prompt, so STEP 0 has nothing left to ask. Every piece for it already
exists (`ModalField`, `fillTokens`, `shellSingleQuote`, `renderTokens`), and it
would have replaced `aiSetup.ts`'s bespoke `askTokens` with the shared helper the
per-tool modals use.

Rejected, because it does not reduce the work. The same five values get typed
either way; only the box changes. Against that:

- **It opens an injection surface that does not exist today.** No
  user-controlled text currently reaches any command in the generated prompt —
  the placeholders are inert prose. Filled values would sit inside
  `git config --global user.name '…'` in a prompt pasted into a shell running
  with `--dangerously-skip-permissions`. Solvable with the existing escape, but
  the surface would be permanent and every future tokenised field inherits it.
- **The prompt stops being shareable.** It is currently generic per platform, so
  one copy serves a whole team; carrying a name and a VPN portal URL makes it
  personal, and a colleague reusing it inherits that identity. This is a team
  onboarding tool.
- **Personal values would reach disk.** The prompt block offers a download
  (`ai-setup-prompt.md`), so values that today exist only inside a Claude
  conversation would also land in a file and shell history.
- **It would not fix the Zoho ordering problem, only move it** — the field can't
  be filled before the console step that produces the value.

Kept instead, at no cost: STEP 0 now tells the agent that when the user doesn't
have a value to hand, the step producing it is already in the list below, and to
point them at it — or to ask that one question at its own step in the end block
if it truly can't be obtained earlier. No new data, and it covers every future
field rather than the two known cases.

### A pinned version means that version, and the agent resolves it silently

Rule 1's "if present and healthy, report it and skip" was version-blind, so a
machine with JDK 20 would have had the JDK skipped — `java -version` succeeds,
"healthy" reads as satisfied, and React Native's hard requirement on 17 goes
uninstalled until Gradle fails on it. The `Context:` line the card contributes
("needs JDK 17 specifically, not the newest Java") was the only counterweight,
and it arrives after the rule that overrules it. Rule 8's `java -version` was
equally blind, so the final verification would not have caught the miss either.

This is [0022](0022-jdk-detected-by-pinned-paths-not-javac.md) all over again in
the other derived surface: the detect scan's version-blind `javac` check was
fixed two days earlier, and the AI-setup prompt — generated from the same
`tools.ts` — kept it. Precisely the ripple the CLAUDE.md tool-change checklist
names.

Rule 1b now states that where a tool names a version, "already installed" means
that version, and the agent installs the pinned one regardless of what else is
present. Rule 8 checks `JAVA_HOME` resolves to the pinned JDK rather than to any
JDK.

Two options were weighed for the conflict itself:

- **Warn and skip** — tell the user they have a newer JDK and hand them the
  steps. Rejected: it returns an unfinished machine from a run whose entire
  purpose is that you can walk away from it, and it ignores that the user
  selected the JDK card. Coexisting JDKs are safe, so there is nothing to protect
  them from.
- **Resolve, ask nothing, record the one consequential change.** Chosen. The
  install is inert — parallel JDKs live in separate directories. Repointing
  `JAVA_HOME` is not inert: it is machine-wide, and whether it matters depends on
  projects this app cannot see. So the old and new values go into the closing
  summary that rule 9 already prints. That is a row in a report, not an
  interruption; the run stays unattended end to end. Omitting it would trade zero
  cost for someone eventually losing an afternoon to a compiler that changed
  under them.

Worth noting Gradle reads `JAVA_HOME` rather than PATH, so a newer Java sitting
earlier on PATH is cosmetic — `java -version` will disagree with what actually
builds. Android Studio is the third opinion: it uses its own Gradle JDK setting
and ignores `JAVA_HOME` entirely, which is left alone here because it is per-IDE
configuration rather than machine setup.

### The modal states the shape of the run, counted not written

Reshaping the run is worth nothing if the user can't see it before committing, so
the modal opens with the total, how much of it is walk-away, and a four-line
timeline. Every number is derived from the same traversal that builds the prompt —
`generateAiSetup` returns `asks` and `handsOn` alongside it — so the promise
cannot drift from the payload as tools are ticked on and off.

Two judgement calls:

- **Questions count distinct labels, not placeholders.** Git wants `git-email`
  and the SSH key wants `email`; both are "Work email" and the user answers once.
  Four questions, not five.
- **`handsOn` excludes the steps rule 4 reassigns.** A raw `[HUMAN]` count would
  read 9 on Windows and 11 on macOS, but the Android SDK, the AVD and Xcode's
  platform download are the agent's work now. `AGENT_HANDLES_GUI` holds the two
  tool ids, which keeps the count honest at 7 and 8. Xcode's *App Store install*
  still counts — the agent can automate the platform step, not the purchase.

Durations scale off those counts with coarse coefficients rounded to five
minutes. A per-tool duration field in `tools.ts` would be more precise for about
a week; nobody would keep 46 estimates current, and a stale precise number is
worse than an honest rough one.

This also surfaced a bug in the STEP 0 written earlier the same day: on Windows
it told the user to download Android Studio in the browser, when `winget install
Google.AndroidStudio` — its `secondary` command all along — installs it anyway.
The manual download now only appears on Linux, which genuinely has no install
command for it.

The lesson generalises: a tool with no install command is not proof that none
exists, and `[HUMAN]` in the generated prompt is only as accurate as the weakest
`actions` entry behind it. Cisco Secure Client is the one genuinely
uncommandable install left, because the installer comes from a company portal.

## Consequences

The run becomes: answer ~5 questions, stay for the elevated burst, leave for
roughly fifteen minutes, come back for one GUI block. Previously there was no
stretch long enough to leave.

Deferral is a rule the agent applies, not a static reordering of the emitted
list. The alternative — sorting `[HUMAN]` lines to the bottom in `emitTool` —
reads as the smaller change but silently breaks intra-tool ordering, since a
tool's GUI install and its follow-up `RUN` steps are one sequence. The agent has
the whole list in front of it and can tell which deferrals are safe; the
generator cannot.

Where two tools want the same value under different token keys — Git's
`git-email` and the SSH key's `email`, both labelled "Work email" with the same
placeholder — `STEP 0` prints one line naming both consumers,
`Work email (Git, SSH key for Bitbucket)`, and both tokens fill from that one
answer. Merging is safe because the SSH value is only the `-C` comment on the
key: Bitbucket authenticates on the key itself and never reads the comment, so
even a mismatch would be cosmetic. Grouping by label is also what keeps the
modal's stated question count and the prompt's actual list from disagreeing —
they are now the same map.

Rule 6b (non-interactive shell, `! <command>`) folds into the new end block for
free: those are `[HUMAN]` steps by its own wording, so they defer with the rest.

## Amendment — the flag disclosure travels with the prompt

The `--dangerously-skip-permissions` note above lived only in the modal. But the
prompt is downloadable as `ai-setup-prompt.md` and the whole point of keeping it
generic per platform is that one copy serves a team — so the reader who most
needs the warning is the one who never sees the modal. Rule 4 sharpens this: it
now has the agent accept licence agreements on the user's behalf
(`sdkmanager --licenses`, and `sudo xcodebuild -runFirstLaunch` on macOS) with no
`[HUMAN]` pause, which was previously a dialog a person clicked through — and
that click *was* the consent.

The prompt now opens with one paragraph stating that it assumes the flag, that
nothing pauses for approval, and which licence acceptances the agent will make.
It also tells the agent to speak up if it was started without the flag, so a
user who dropped it isn't left waiting on a run that expects them to walk away.
