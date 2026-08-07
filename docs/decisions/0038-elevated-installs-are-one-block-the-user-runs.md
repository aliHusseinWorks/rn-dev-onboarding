# 0038 — Elevated installs are one block the user runs

Date: 2026-08-07 · Status: accepted

## Context

The prompt used to tell the agent to group the installs needing a password and
"prime the credential cache with a single `sudo -v`". That cannot work. The
agent's shell has no terminal, so `sudo` does not prompt — it fails:

```
sudo: a terminal is required to read the password; either use the -S option
to read from standard input or configure an askpass helper
```

Rule 6b offered a fallback, sending the command as `! <command>` in the session.
That has no terminal either, so it fails identically. A real run burned both
routes before falling back to "open Terminal.app yourself", which is what the
prompt should have said in the first place.

Nothing in the app recorded *which* installs prompt, so the agent had to work it
out. On macOS it is the casks with a `pkg` payload plus the Homebrew installer
itself; that was discovered mid-run by querying the Homebrew API for artifact
types.

## Decision

A `Tool` carries `elevated?: boolean`, and the AI setup collects every elevated
tool that survives the include filters into one block in STEP 0, worded for the
user to run in a real terminal window while they are still at the keyboard.

The block is emitted in list order, so Homebrew precedes the casks that need it.
Its tools stay in the ground-truth list below, because rule 1 has the agent verify
rather than reinstall.

Rule 6 now says the prompts are unanswerable by anything the agent has, names
`sudo -v` specifically as something that will not help, and tells it to hand over
a command and wait rather than retry. Rule 6b splits the two cases it used to
conflate: a browser-login handshake does work through `!`, anything needing typed
text does not.

**The JDK stays on `--cask zulu@17`.** Moving it to the `openjdk@17` formula was
agreed first, on the grounds that a formula needs no password — then dropped once
the arithmetic was checked. The Homebrew installer needs a password regardless, so
the block exists either way, and sudo caches its timestamp, so a block of five
items costs exactly the same one prompt as a block of four. The swap saved nothing
and cost real things: `openjdk@17` is keg-only, its own caveats want
`sudo ln -sfn …` into `/Library/Java/JavaVirtualMachines` for
`/usr/libexec/java_home` to find it, `JAVA_HOME` would become a hardcoded brew
path instead of `$(/usr/libexec/java_home -v 17)`, and `DETECT_SPECS` would need
the new location or every machine would scan as missing a JDK.

The card is now named "JDK 17" rather than "JDK 17 (Azul Zulu)", which removes a
separate inaccuracy rather than reopening this one: it installs Zulu on macOS,
Microsoft's build on Windows and the distro's OpenJDK on Linux, so naming one
vendor was wrong on two platforms. The reasons above are unaffected — they are
about what `openjdk@17` costs on macOS, not about what the card is called.

## Consequences

The user still has to be present for one password. That is not solvable and is no
longer pretended otherwise: what changed is that it happens once, at a predictable
moment, before they walk away — rather than as an unpredictable stall forty
minutes in, against an empty chair, which is what the old wording produced.

The modal's phase list says "Run one block yourself in a terminal" (PowerShell on
Windows) instead of "stay at the machine for the sudo password prompts", names how
many installs are in it, and disappears entirely when none are left,
and the flag box now leads with what `--dangerously-skip-permissions` does *not*
cover, since a reader's takeaway was that it made the whole machine unattended.

`elevated` is per-platform, taking the same bare-or-map shape as `version`, with
`resolveElevated` beside `resolveVersion`. It was a plain boolean first, and that
was wrong in a way worth recording: the same app can be a privileged `pkg` on
macOS and a user-scope install on Windows, where elevating is not merely
unnecessary but harmful.

The Windows values come from the winget manifests rather than from guessing which
installers look important:

| package | InstallerType | Scope | ElevationRequirement |
| --- | --- | --- | --- |
| `Docker.DockerDesktop` | exe | machine | `elevatesSelf` |
| `Microsoft.OpenJDK.17` | wix | machine | `elevatesSelf` |
| `Microsoft.Teams` | msix | user | — |
| `Zoho.Cliq` | exe | user | — |

So Teams and Zoho Cliq are **not** in the Windows block, and the first draft that
put them there would have made things worse: a user-scope MSIX installed from an
elevated PowerShell registers against the administrator account, not the user's.
Windows ends up with three items, macOS with five.

That exclusion is what makes the Windows block safe to elevate, and it has to be:
Chocolatey — which is what the Homebrew card installs there — writes to
`C:\ProgramData` and fails outright from a normal shell rather than raising a UAC
dialog to accept. So Windows is told to open PowerShell as Administrator after
all. A middle draft forbade that, on the grounds that the JDK command wrote
`JAVA_HOME` at `"User"` scope and would land it in the administrator's profile;
the right fix was moving that write out of the block rather than refusing to
elevate the block, which would have left Chocolatey failing with the remedy
explicitly ruled out.

Linux needs no flags at all. A command that literally begins with `sudo` is
collected on sight, which is what catches `sudo apt-get install -y git` — a card
whose macOS command needs no password, so one boolean could never have described
both.
