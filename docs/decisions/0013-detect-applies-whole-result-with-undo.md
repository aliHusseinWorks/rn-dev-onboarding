# 0013 — The detect scan applies its whole result; Undo replaces the opt-in uncheck

Date: 2026-07-25 · Status: accepted · Amends the apply behavior of 0007

## Context

The scan only ever ticked boxes. Tools it did not find were left exactly as
they were, and a button — "Uncheck these N on the page too" — was the opt-in
to clear them.

The reasoning was false negatives: the scan reads specific PATH entries and
standard install folders, so a real install in a custom location reads as
missing, and Reactotron on Linux is undetectable outright. Auto-clearing would
silently drop a tick the user entered by hand.

That is an argument for making the write reversible, not for charging every
user a click. As built, everyone did manual work to guard against a rare case,
and until they did the checklist was half scan, half stale — worse than either
end. It also survived 0007, which deleted the per-tool include/exclude panel on
the grounds that opting out of a read-only check buys nothing; the button was
the last piece of the same fiddliness.

## Decision

A scan applies its whole result: found tools are ticked, tools it did not find
are cleared, immediately and in one go. The result panel gains a single Undo
that restores the checklist to exactly its pre-scan state.

`DetectModal` snapshots the pre-scan value of every scanned tool (partitioned
into `on`/`off`) before applying, and Undo replays that snapshot through the
same `onApply(ids, value)` the scan uses — so `App` needs no new handler, only
the existing `installed` record passed down, the way `CategorySection` already
receives it.

The platform-mismatch guard is unchanged: a scan that ran on a different
platform still clears nothing, because it says nothing about this checklist.

## Rejected

- Auto-apply with no Undo. Smaller, and the scan is usually right, but a wrong
  clear then costs the user their hand-entered state with no way back.
- Auto-clearing only tools the scan can see "reliably". There is no
  per-tool confidence in `DETECT_SPECS`, and inventing one to protect a handful
  of cases is more machinery than the problem is worth.

## Consequences

The manual paste path applies the same way — pasting an old `RN-ONBOARD/1`
line now clears anything missing from it. Undo covers that too.

Undo restores by writing explicit `false` for tools that were previously
unset rather than deleting the keys — same behavior everywhere it is read,
just a slightly larger `rn-onboard:installed` record.
