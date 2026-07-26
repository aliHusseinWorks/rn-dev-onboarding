# 0018 — The AI setup skips tools already ticked off

Date: 2026-07-26 · Status: accepted

## Context

The AI setup prompt listed every eligible tool for the platform regardless of
the page's own checklist. A dev who had already installed half of Essentials —
by hand, or by running a detect scan that ticked them — still got all of them in
the prompt. The agent's rule 1 (check before installing, skip if healthy) made
that safe but not free: it spent turns re-verifying things the user had already
declared done, and the prompt read as though nothing had been set up.

Two forks to settle.

**Where does the exclusion live?** There was already a `USER-EXCLUDED TOOLS`
paragraph, so folding installed tools into it would have been a one-line change.
Rejected: that paragraph tells the agent "the user deliberately opted out — do
NOT install, configure, or recommend them, and don't count them as missing in
checklists or doctor fixes." None of that is true of a ticked-off tool, and the
last clause is actively harmful — if a later tool depends on Git and Git turns
out to be absent, "don't count it as missing" is exactly the wrong instruction.
The two states need different words because they want different behaviour.

**Can you re-include one from inside the modal?** No. The checkbox is disabled.

## Decision

`generateAiSetup` takes a third `installed` set and emits a separate
`ALREADY INSTALLED` paragraph: don't install or configure these, and if
something below genuinely depends on one and it's missing or broken, tell the
user and ask rather than quietly installing what they said they had.

Installed is checked before excluded, so an id in both lands in one list only.

In the modal, an installed tool renders as a ✓ with its name struck through
instead of a checkbox — a disabled *unchecked* box reads as "deselected", which
is the wrong story. Section "select all" only touches selectable tools, so it
cannot pull an installed one back in. The way back in is unticking the card on
the page.

That keeps one source of truth. A second control in the modal that could
contradict the checklist is how you end up with two answers to "is Git
installed" and no way to tell which the prompt used.

Claude Code gets the same treatment even though `eligibleTools` excludes it from
the list: it is a checkable, detectable card, so a dev who ran a detect scan has
it ticked, and step 1 telling them to install it is the exact complaint this
decision answers. Ticked, step 1 disappears, the intro says "One paste" instead
of "Two", and step 2 drops its fresh-PATH warning — that only matters right after
an install.

## Consequences

Ticking off everything is now a reachable state with nothing to generate, so the
empty case splits in two: "every tool is already ticked off — nothing left to
install" (informational) versus the existing "select at least one tool"
(destructive styling, because you did that to yourself).

With all 38–43 eligible tools ticked, the prompt drops from ~13–15 kB to ~4 kB —
rules and the installed list, no install sections at all. In that state the modal
also drops its intro and both paste steps: there is nothing to paste, so the
ticked list is the whole content, and telling someone to start Claude Code for a
prompt that doesn't exist is worse than saying nothing.
