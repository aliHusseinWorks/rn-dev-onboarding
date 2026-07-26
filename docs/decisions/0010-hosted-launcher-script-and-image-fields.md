# 0010 — The herdr launcher is a hosted script run in one paste, and modal fields gain an image kind

Date: 2026-07-25 · Status: accepted

## Context

The launcher was a one-liner setting the shortcut's `IconLocation` to
`herdr.exe`, which can never show herdr's icon — the binary embeds no icon
resource. A shortcut stores its icon as a *path*, so the image must exist on
disk first. Two other gaps were open: the destination was hardcoded to the
Desktop, and TODO 5 asked for a dropped custom icon, which needs UI beyond a
text box.

An embedded-base64 installer the user downloads and runs solved the icon but
cost a download, a `cd`, and a command — friction the rest of the app doesn't
have.

## Decision

The logic lives in `public/herdr-launcher.ps1` / `.sh` and takes the form
values as arguments, so the common case is one paste with nothing to download —
the same idiom as herdr's own `irm … | iex` install and the detect scan. The
icon ships alongside as `public/herdr.ico` / `herdr.png` for the script to
fetch. One `.sh` serves both Unix platforms, branching on `uname -s`.

Windows stays PowerShell. A `.cmd` would be double-clickable, but it costs a
nested quoting layer where a `"` ends cmd's quoting and the rest runs as live
commands — written, exploited, removed.

A dropped icon can't be hosted, so its bytes ride inside the pasted line and
are written to a temp file before the launcher gets the path. Two earlier
shapes failed and are worth not repeating: a multi-line here-string silently
does nothing when pasted, and downloading the icon to a fixed path breaks the
moment a browser saves it elsewhere. Dropped icons are capped at 16/32/48/64 px
(48 is the default desktop size), keeping a photo's line near 15k characters
instead of 32k; the hosted default icon has no such limit.

`ModalField` gains `kind: 'image'`, and `ModalStep` gains `whenFieldSet` /
`whenFieldUnset` plus `ToolModal.prompt`'s existing `multiline` / `download` /
`filename`. The drop-zone is a generic data-declared field kind rendered by
`App.tsx`, not a per-tool fork. New modules: `src/lib/iconImage.ts` and
`src/components/ImageDropField.tsx`.

## Rejected

- **A compiled `.exe` installer** — a build toolchain and CI in a Vite web app, and unsigned binaries hit SmartScreen's full-page block.
- **Right-click → "Run with PowerShell"** — `.ps1` has no shell association on stock Windows 11, and `RemoteSigned` blocks downloaded scripts; hence `-ExecutionPolicy Bypass` in the pasted command.
- **Baking the icon into the bundle as base64** — 34 kB every visitor pays for, versus a static asset with one source of truth.
- **A `ModalStep` builder-function escape hatch** — the static-string-plus-`{token}` model carries base64 fine.

## Consequences

There is no project-folder field. `herdr` takes no path argument; it restores
workspaces with their own `cwd` from `%APPDATA%\herdr\session.json`. A "Start
folder" field shipped briefly, set `WorkingDirectory`, and only ever affected a
first-ever launch while reading as though it chose the project.

The PowerShell launcher runs inside the user's own session — `&
([scriptblock]::Create(…))` is not a child process — so it must never call
`exit`, which would close the window before the error could be read. Every
failure path uses `return`. `&` still gives a child scope, so variables and
`$ErrorActionPreference` don't leak. The `curl | sh` side is a child shell and
has no such hazard.

A fetched asset is checked, not trusted: a missing file answers with the SPA's
HTML, so the script verifies the `.ico`/PNG signature, downloads aside, and
only replaces a working icon once the check passes. The page passes `-IconUrl`
so the icon comes from whichever origin served it. The install folder is
refused rather than invented, and `~` is expanded on all three platforms.

If a path ever goes back into a generated launcher: values need escaping once
per layer they cross, which is more than once. The macOS `.command` embedded
the start folder and got it wrong twice by hand before a quoted heredoc fixed
it — then the field was dropped anyway.

macOS still has no icon (TODO 6); stamping a `.command` needs an `.app` bundle
or `osascript`/`sips`, unverifiable from Windows, so the icon field self-hides
there. This extends 0009's data-table model with one field kind.
