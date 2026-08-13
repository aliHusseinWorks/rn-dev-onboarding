# 0045 — The macOS launcher is an osacompile applet

Date: 2026-08-13 · Status: accepted · Supersedes the macOS-icon half of [0010](0010-hosted-launcher-script-and-image-fields.md)

## Context

The herdr card hands out one launcher per platform. Windows gets a `.lnk`
carrying its own icon; Linux gets a `.desktop` naming an icon path. macOS got a
`.command`, which keeps the generic Terminal icon.
[0010](0010-hosted-launcher-script-and-image-fields.md) is what this overturns: it
recorded that stamping a `.command` needs an `.app` bundle or `osascript`/`sips`,
that this was unverifiable from Windows, and so left the icon field self-hiding on
macOS.

It can be tested from macOS, which is where this was written, so it is now
implemented rather than reasoned about.

## Decision

macOS gets an `.app` bundle built by `osacompile`, with its icon replaced.

**A hand-rolled bundle does not work.**
The obvious construction — a directory with `Contents/Info.plist`,
`Contents/MacOS/herdr` as a shell script, and `Contents/Resources/herdr.icns` —
is rejected by Launch Services with `-10669`. It is not the location, the
quarantine attribute, a missing `CFBundleVersion`, or the missing signature: each
was ruled out separately, and the same script ran fine when executed directly
while `open` launched Calculator from the same shell. What the bundle lacks is a
Mach-O executable; `CFBundleExecutable` pointing at a shell script is not enough.
`osacompile` supplies Apple's own `applet` binary, already signed, and needs
nothing installed.

**Replacing `applet.icns` is not enough either.** `osacompile` also ships an
`Assets.car` holding the same applet icon and a `CFBundleIconName` pointing at
it. That key outranks `CFBundleIconFile`, so the catalogue wins and the file is
never read — which is why the first build showed the white AppleScript scroll
despite a correct 138 KB icns sitting in `Resources`. Both the key and the
catalogue are removed. Verified the applet still launches without its asset
catalogue, and that the signature survives being re-applied.

**`sips -s format icns` cannot be used on its own.** It fails on any source that
is not square, and on square ones whose side is not a standard icon size — a
37×37 PNG is rejected. Since the card's icon field accepts any dropped image and
`--icon-file` accepts any path, the source is normalised first: `sips -p` pads to
square, which preserves alpha and so matches the letterboxing the page's own
resize already does, then one `sips -z` per size feeds `iconutil`. All three of
`sips`, `iconutil` and `osacompile` are base macOS with no package receipt, so
this adds no dependency on Xcode or its command-line tools.

Two details are deliberate parity with the Windows script rather than
convenience. The run script embeds herdr's **absolute path**, because Terminal
executes it with `/bin/sh`, which never sources the profile that puts
`~/.local/bin` on PATH — the `.lnk` pins its `TargetPath` for the same reason. And
`CFBundleVersion` carries the icon's checksum, because an icon is cached against
the bundle and a rebuild at the same path would otherwise keep showing the
previous image; the Windows script names its `.ico` after its own bytes to solve
exactly that.

Launching goes through `do shell script "open -a Terminal …"` rather than telling
Terminal to run a script, because scripting another application puts an
Automation permission prompt in front of the first launch.

## Consequences

The card's custom-icon field now appears on macOS. It had been self-hiding, which
was correct while there was nothing to feed: the icon-carrying step's `command`
map listed `linux` and the two Windows ids and no mac keys, so the `{iconData}`
token appeared in nothing macOS could run and the field filtered itself out.

Verified rather than eyeballed, since the icon Finder draws cannot be seen from a
shell: `NSWorkspace.icon(forFile:)` resolves three distinct icons for the same
bundle shape — the untouched applet, herdr's icon, and a deliberately red test
icon whose resolved centre pixel reads R=202 G=59 B=51. The pipeline therefore
carries the supplied image through to what the system draws, and the first build's
failure was visible in that measurement too.

`Terminal.app` is hardcoded. There is no reliable way to ask macOS for a default
terminal, so a reader who lives in iTerm gets Terminal for this launcher; the
Linux `.desktop` has the same shape of limitation in reverse, deferring to
whatever the desktop environment considers its terminal.

The launcher is ad-hoc signed, not notarised. It is built locally by a script the
reader ran, so it carries no quarantine attribute and Gatekeeper does not
challenge it — but it would be challenged if anyone ever copied one machine's
`herdr.app` to another, which is not a supported route.
