# 0044 — Android Dev MCP is removed; Argent supersedes it

Date: 2026-08-11 · Status: accepted · Supersedes the Android Dev half of [0043](0043-mcp-scope-follows-the-servers-subject.md)

## Context

The Android Dev MCP card and the Argent card ([0041](0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md))
overlap on nearly everything a developer reaches for: booting an emulator,
installing and launching the app, tapping and swiping, screenshots, dumping the UI
hierarchy, reading logs. Two servers answering the same request is the routing
failure `docs/argent-guide.md` already records against raw `adb logcat`, where the
model takes the shallower path because its description matched first.

A real session drove the question. Tapping through a login flow with Android Dev
was slow enough to notice, and the mechanism explains it rather than the machine
does: it is an `adb` wrapper, so every action pays a fresh `adb` process (~100-200ms)
and every screen read pays a `uiautomator` dump (1-5s), with `adb shell input`
landing a tap in ~100-300ms. Reported latency between two taps in adb-based MCP
servers is 2-4s, before the model thinks. Argent's own claim is the opposite
shape — it talks to the device directly and takes multi-step interaction sequences
in one call rather than one call per tap.

## Decision

The Android Dev MCP card is removed. Argent covers what it did, faster, and the
site should not offer a slower path a developer will pick and then blame React
Native for.

**A correction that removed the last argument for keeping it.** This repo had
recorded that Argent supports no physical devices. That is wrong for Android: the
README lists "Emulators (AVDs) and physical devices over adb", and only physical
*iOS* devices are unsupported. Physical Android was the one capability Android Dev
uniquely had, and it never had it uniquely.

The claim sits in three places. `docs/argent-guide.md` is a field-notes document,
so it is corrected in place. [0041](0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md)
and [0043](0043-mcp-scope-follows-the-servers-subject.md) are decisions, so they
are not: each takes a clause on its status line pointing here, and its reasoning
stays as written. [0019](0019-graphify-removed.md) settled that shape — a
superseded decision is marked in its own header, and that line is the only edit it
takes. Rewriting 0041's Consequences to state a reason it never held was tried
first and reverted: it would have left the file reading as though its author had
known all along.

What is genuinely lost is small and none of it is verification: Metro's lifecycle
(`metro_start`/`stop`), which this workflow deliberately leaves to the developer in
their own terminal, plus ANR traces and `bugreport`. `adb` covers the last two from
a shell without any server; Metro was never adb's to start.

**XcodeBuildMCP is not touched and stays in MCP Servers.** It was briefly proposed
that it move beside Argent, on the grounds that
[0043](0043-mcp-scope-follows-the-servers-subject.md) had already made it
project-scoped and `inScript: false` — the profile of a Project Setup card. That
conflates how a thing is deployed with what it is. It is an MCP server, so it
belongs in the MCP Servers section, exactly as Sentry and Firebase do after the
same scope change. Merging it into the Argent card was rejected for two further
reasons: it is macOS-only where Argent is not, so half the card would be dead for
a Windows or Linux reader, and a card badges one package.

Nor does Argent depend on it. Argent builds and launches iOS itself; XcodeBuildMCP
is for XCTest and coverage, a different job — and for a bare React Native project
largely a hypothetical one, since the tests are Jest and the XCTest target is
usually the empty default template.

## Consequences

Tool count drops 48 to 47, of which 41 are checkable, and the MCP section lists 10
cards. `DETECT_SPECS` needed no change: the entry went with the scope change in
0043. The `mcp` category now runs 1, 2, 3, 5-11 with a gap at 4, which is what the
`ai` category already looks like after its own deletions — renumbering would churn
every card below for nothing.

The verify skill gains the routing this overlap made necessary, worded to name no
product. It says Argent builds, launches, drives and reads logs, that another
server's build, screenshot or UI-dump tools and raw `adb logcat` all lose the
JS-layer detail and network payloads Argent exists for, and that unit tests are the
one job outside its scope — pointing at the repo's own test command rather than at
Xcode's. Naming a macOS-only server in a file committed to a repo with Windows
developers on it would leave a dangling reference for half the team, the same bug
`docs/TODO.md` records against the SSH key card's `note`, generalised there into a
sweep worth repeating whenever a rule gains a per-OS branch.

The skill also now separates a JS change from a native one: Metro serves the
former, so no build is needed at all, which is the largest time saving available on
iOS and the one an agent misses by default, because the constants name a scheme
and a device.

Anyone who wants Android Dev back adds it by hand; it is one `claude mcp add`. The
card is gone, not the server.
