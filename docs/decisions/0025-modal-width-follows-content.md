# 0025 — Modal width follows content; grids inside modals use container queries

Date: 2026-07-27 · Status: accepted

## Context

Every modal shared one shell at `max-w-2xl` — 672px, 632px of content after
`px-5` — which on a 2560px screen left the AI setup modal a narrow strip in a sea
of backdrop while scrolling for pages. The obvious fix, one bigger number on the
shared shell, is the one version that makes things worse, because the three
content shapes in these modals want three different widths:

| Content | At 632px | Wants |
| --- | --- | --- |
| Intro prose, `text-sm` | ~90ch | 60–75ch |
| Prompt / scan script, `text-[13px]` mono | ~78ch | ~110ch, their longest lines |
| Tool grid, `text-xs`, 3 columns | 594px used | 796px for 4 columns |

The prose was already ~20% past the readability band at the old width, so
widening the shell alone would have taken the intro to ~140ch. Meanwhile the code
blocks were wrapping a document meant to be read as lines, and the grid's longest
label ("Atlassian (Bitbucket + Jira)") sat flush against its column edge.

Separately, the tool grid was responsive to the wrong element. `sm:grid-cols-2
lg:grid-cols-3` are *viewport* breakpoints, so on a wide screen the grid went to
three columns because the window was wide, while the panel containing it was
672px. The columns were cramped by a measurement that had nothing to do with the
space they were in.

## Decision

Width is per-modal, and prose caps itself independently of the shell.

`Modal` takes a `wide` prop: `max-w-5xl` (1024px) for the two modals holding a
code block or a grid, `max-w-2xl` unchanged for the ~15 per-tool modals, which are
prose plus a field or two and would look abandoned at 1024px. 5xl is where 110
monospace columns fit (984px of content gives ~123); 6xl and 7xl, which the
`container-width` guideline suggests for page containers, buy nothing for content
that doesn't exist.

Prose blocks inside the wide modals take `max-w-lg` (32rem) — ~73ch at `text-sm`,
inside the 65–75ch band, and it fixes the pre-existing 90ch as a side effect. The
shell grows; the reading measure shrinks. Tool-name lists in the detect result
panel are deliberately left uncapped: they are data, not prose, and 30 names read
better on fewer lines.

The grid moves to container queries — `@container` on the modal's content box,
then `@md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4`. Tailwind v4 has these
natively, so no plugin. At 984px of content the grid resolves to four columns of
~231px against a 190px longest label.

## Consequences

`@container` sets `container-type: inline-size`, which applies layout, style and
inline-size containment — and layout containment makes the element a containing
block for absolutely positioned descendants. The tooltips on command-block
buttons are unaffected: each is `absolute` inside its own `relative` wrapper, so
its nearest positioned ancestor never changes. No paint containment is implied, so
the tooltip clipping fixed earlier does not come back, and widening the panel
gives the `align="end"` tooltips more room besides.

Width was the fix for the scroll length too, not just the empty space: four grid
columns instead of three and unwrapped code lines take a large bite out of the
vertical scroll that made this modal tiring.

The ch figures above are computed from standard advance widths (0.5em
proportional, 0.6em monospace) rather than measured in a browser. They are sized
with slack — 41px spare per grid column, 13 monospace columns spare in the code
block — so a small error doesn't change the column count.

`App.tsx`'s modal-fields grid still uses `sm:grid-cols-2`. It has the same
viewport-vs-container mismatch in principle, but it sits in a modal that stays
672px where the rendered result is identical, so it was left alone rather than
widen this change's blast radius.
