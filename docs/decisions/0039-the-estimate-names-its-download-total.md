# 0039 — The estimate names its download total

Date: 2026-08-07 · Status: accepted

## Context

The AI setup modal promised roughly 30 minutes, of which 20 unattended. A real
run took about four hours.

The estimate is `selectedCount * 0.7` minutes — derived entirely from how many
tools are ticked, with no notion of how large they are. That is a reasonable
model for install work and a useless one for this list, which is dominated by
bytes: Xcode and its simulator runtime, Android Studio and its SDK packages,
Docker Desktop and Teams come to roughly 17 GB. The machine in question measured
10.4 Mbps at the start of the run and 52 Mbps later. Seventeen gigabytes is about
45 minutes at the second figure and nearly four hours at the first, and no
per-tool count can tell those apart.

## Decision

Keep the count-based minutes and add one line naming the download total:

> Those minutes assume a fast connection. This selection pulls ~17 GB — on slow
> Wi-Fi it is hours, not minutes.

A `Tool` carries `sizeMb?: number`, set only on the tools big enough to move the
number, and the line sums whatever is actually selected. A speed picker feeding a
real calculation was considered and declined as more machinery than the message
needs: the point is not to predict the minute, it is to stop a reader planning
their morning around a number that assumes an office link.

Summing the selection rather than hardcoding a figure per OS is what keeps it
honest as the list changes — unticking Xcode drops it from ~17 GB to ~5 GB, and
Windows and Linux read ~5 GB because Xcode isn't theirs.

Xcode's `sizeMb` includes the iOS simulator runtime and Android Studio's includes
the SDK packages. Neither has a card of its own — rule 4 pulls both as part of
that card's work — and attributing them to the card that causes them is better
than a total that quietly omits 10 GB.

## Consequences

The sizes are measured, not estimated: `Content-Length` on the real download, or
the dmg/pkg Homebrew leaves in its cache after an install. Every app cask carries
one, which took the macOS total from ~17 GB to ~18 GB and Windows/Linux from
~5 GB to ~6 GB once the dozen 100-300 MB editors and clients stopped counting as
zero.

It still reads a few hundred MB light, and deliberately: the formula-installed
tools (git, watchman, cocoapods, fastlane, fnm) carry no size, because a bottle's
cost is mostly its dependency tree — installing CocoaPods pulled Ruby and Python
with it — and that is not the card's to name. Under-reporting is the right error
direction for a warning.

Two numbers the prompt stated were simply wrong and are fixed with it: Xcode was
described as "~10 GB, the longest step in the run", when the application is 3.5 GB
and the 8.5 GB is the separately-downloaded simulator runtime the plan never
mentioned at all. They are now two lines, and the runtime is named as the longest
step it actually is.

The phase list also lost four minutes of fiction: the sudo phase was budgeted at
~5 min for prompts the agent triggered, and is now ~2 min for one block the user
pastes ([0038](0038-elevated-installs-are-one-block-the-user-runs.md)).
