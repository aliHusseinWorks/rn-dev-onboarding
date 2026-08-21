# 0047 — A saved platform override is scoped to the OS it was made on

Date: 2026-08-21 · Status: accepted

## Context

The herdr card's icon step was copied on a Windows machine and pasted into
PowerShell as `ICO=$(mktemp); printf %s '…' | base64 -d > "$ICO"; curl … | sh`,
which fails four times over and creates nothing. The per-platform map on that
step is correct and has been since [0045](0045-the-macos-launcher-is-an-osacompile-applet.md)
gave it mac keys; what was wrong is which platform the page thought it was on.

`rn-onboard:platform` outranked detection unconditionally. Selecting
macOS once — to read the other half of a change, which is the only reason the
selector gets touched during development — wrote it to `localStorage`, and every
later visit on that same Windows machine kept serving `sh` one-liners. The banner
says `Selected:` rather than `Detected:` in that state and offers the detected
platform as a button, and that was not enough: a command is copied from the step,
not from the header above it.

The failure is worse than a wrong download link. A shell-mismatched one-liner is
several statements, so it half-runs — here PowerShell reported four separate
errors and the last of them was a `Remove-Item -f` interpreted as `-Filter`.

## Decision

An override survives a reload only while it agrees with detection about the OS.
`readSavedPlatform` takes the detected platform and returns `null` when
`PLATFORM_INFO[saved].os !== PLATFORM_INFO[detected].os`.

That keeps the case the selector exists for — `macIsAppleSilicon()` reads the
WebGL renderer and guesses `mac-arm` when it learns nothing, so an Intel Mac
needs a correction that sticks — and drops the case that can only be curiosity or
a mistake. Nobody is reading this page in PowerShell because they want the macOS
commands to keep coming back.

Two alternatives were rejected. Moving the key to `sessionStorage` kills the same
bug but also the Intel-Mac correction, which is the one thing the selector is
for. Leaving detection alone and making the banner louder was rejected on the
same ground the banner already failed on: the reader is looking at the step.

The stale entry is not cleared. `mac-arm` saved from a Mac is right on that Mac,
and this machine simply stops honouring it.

## Consequences

An in-session switch still works and still changes every step, which is what
makes the page useful for writing a card. It cannot leave a dropped icon in the
wrong format either: `iconFormatFor` runs at drop time, but the modal overlays
the platform selector, and reopening the modal resets `fieldValues` — so no
`.ico` can reach the macOS launcher through the UI. A re-encode-on-format-change
guard was written for that and removed as unreachable.

Two things found while confirming this and fixed with it, neither part of the
decision:

- `herdr-launcher.ps1` validated the `.ico` magic number on the `-IconUrl` path
  only. The shell does not validate a shortcut's icon — the wrong container draws
  a blank page with no error — so the check moved below both branches, where
  `-IconFile` gets it too.
- `DETECT_SPECS.herdr.winPaths` looked for `herdr-agent-state.sh`. herdr installs
  the Windows hook as `.ps1`, so the scan reported every correctly configured
  Windows machine as missing the integration [0029](0029-herdr-persistence-needs-the-integration-not-config.md)
  made it check for.

Verified in headless Chrome on Windows through `.claude/skills/browser-check`,
reading what the Copy button actually puts on the clipboard: a saved `mac-arm`
yields the PowerShell launcher and `Detected: Windows (x64)`, a saved `win-arm`
still yields `Selected: Windows (ARM)`, the icon step carries `AAABAA…` on
Windows and `iVBOR…` with macOS selected. Reverting the change turns the two
override checks red and prints the `curl … | sh` line that started this. Both
copied commands were then run for real: each wrote a `herdr.lnk` whose target
resolves and whose content-addressed icon exists, and a `.png` handed to
`-IconFile` is now refused with a message instead of a blank icon.
