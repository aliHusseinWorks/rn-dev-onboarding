# 0022 — JDK 17 is detected by version-pinned paths, and the scan stays version-blind everywhere else

Date: 2026-07-27 · Status: accepted

## Context

The question was whether the detect scan should report installed versions
alongside the latest ones from 0021, and flag conflicts — the case raised was a
dev with JDK 21 where React Native wants 17.

Looking at it turned up a live bug rather than a missing feature. The `jdk` spec
carried `bins: ['javac']` beside three version-pinned paths, and `checksFor`
combines checks as any-of — `-or` in the PowerShell script, `||` in the POSIX one
(`detectScript.ts:137`, `:89`). The paths were pinned to 17; `javac` says nothing
about which Java it is. So a machine with only JDK 21 ticked the JDK card green,
and the dev was told they were set up right before their first Gradle build
failed on the exact mismatch the card's own note warns about ("React Native needs
JDK 17 specifically, not the newest Java").

A false green is the worst failure this page has. Everything else it does is
either correct or visibly missing; this one hands out unearned confidence.

## Decision

Drop `bins: ['javac']`. Only version-pinned paths can answer "is 17 here", so
detection rests on them alone, widened to the distributions people actually have
(Zulu, Temurin, Microsoft on macOS and Windows; the Debian/Fedora layouts plus
arm64 on Linux). Windows entries glob because `Test-Path` globs natively; macOS
and Linux stay literal because zsh aborts on an unmatched glob before the test
runs.

**The general installed-vs-latest layer is rejected.** The scan today only tests
existence — `Get-Command`, `Test-Path`, `Get-AppxPackage`, a fixed-string grep of
a config file — and never executes the tools it looks for. Capturing versions
would mean running ~37 binaries with a bespoke output parser each, twice (one per
shell), where `git version 2.55.0`, `v22.1.0` and `openjdk version "17.0.20"` on
*stderr* all need different handling. The GUI apps are found by folder presence
and carry no version at all without per-app plist/registry/exe reads. It would
also change the relay payload from an `ID_RE`-validated `string[]` into a new
shape needing new validation, and it would widen the sentence the modal's
credibility rests on — "the only data that leaves your machine: a one-time code,
your platform id, and the ids of tools found". All of that to report that git is
2.51 rather than 2.55, which breaks nothing.

Running `/usr/libexec/java_home -v 17` on macOS was also rejected. It is the
canonical way to ask that question and would catch every distribution including
SDKMAN-managed ones, but it needs a new `DetectCheck` kind wired through the type,
`describeCheck`, and both script generators — for one OS of one tool, with no
Windows or Linux equivalent.

There is no `requires:` field either. JDK is the only tool whose version
mismatch breaks a build silently: Node's card already pins LTS, and the
Xcode/CocoaPods floors are advisory prose on cards that are correct either way.
One spec was wrong; that is the whole scope.

## Consequences

The trade is a false green for a possible false red. A JDK 17 living somewhere
unlisted — Corretto, SDKMAN, jenv, a hand-unpacked tarball — now reads as
missing. That is the safe direction: the remedy is re-running the card's install
command, which is idempotent, versus silently broken Gradle builds.

`javac` was the only `bins` entry that described a family rather than a specific
tool, so nothing else in `DETECT_SPECS` needs the same audit. Verified on the
three generated scripts: every remaining JDK check is pinned to 17, none is a bin
check, and no glob appears off Windows. The Windows expression was run against
PowerShell 5.1 on a box with `jdk-17.0.19.10-hotspot` (matches) and confirmed that
a `jdk-21…` folder does not match `jdk-17*`.
