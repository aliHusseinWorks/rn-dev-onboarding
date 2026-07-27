# 0020 — The tools page goes fluid, with a category rail

Date: 2026-07-27 · Status: accepted

## Context

The page was capped at `max-w-6xl` (1152px) and the card grid was hard-wired to
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Past 1152px nothing changed: a
2560px monitor rendered the same three 360px columns as a 13" laptop and spent
the other ~55% of its width on margin, so a 46-tool page scrolled for
thousands of pixels while half the screen sat empty.

Three columns was never a readability constraint. The 65–75ch rule is about
running prose; here the reading unit is a card about 40ch wide, and the column
count costs nothing. The cap was the only thing forcing the scroll.

Measured before and after, same content, Windows platform, 21 tools ticked:

| viewport | before | after |
| --- | --- | --- |
| 1280 | 3 cols | 3 cols |
| 1920 | 3 cols | 5 cols |
| 2560 | 3 cols, ~4750px tall | 7 cols, 3352px tall |

(The "before" height at 2560 is the geometry the app still produces at 1440 —
three 360px columns — since the old layout rendered identically at every width
above the cap.) That is ~29% less scrolling at 2560, and the same at 1280.

## Decision

**Width is fluid, with no cap.** `max-w-6xl` leaves the header, `<main>` and the
footer; padding becomes `px-4 sm:px-6 xl:px-8`. The grid governs density now,
not a container.

**The grid is `grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]`** —
one class replacing three breakpoint variants, and the first arbitrary grid
template in the codebase (bracket syntax has precedent in `min-w-[190px]`,
`max-w-[16rem]`). The `min(100%,…)` guard is what keeps a single column from
overflowing below 288px.

The 18rem floor is not arbitrary: the old layout already shipped 290px cards at
a 640px viewport, so 288px is the narrowest card the app has ever rendered, not
a new low. A 20rem floor was tried first and rejected — with the rail taking
224px it yields **two** 467px columns at 1280, i.e. a regression against the old
three, and it left 1920 at four columns instead of five.

**A `CategoryRail` appears at `xl` and up** (`src/components/CategoryRail.tsx`) —
the first use of `xl:` here, an unused rung of the default scale, so no config
change. It is one row per category — accent dot, title, `n/m` installed count —
with `IntersectionObserver` scroll-spy. It carries no overall total: a
conic-gradient ring was drafted and cut, because it repeated the header's
`ProgressBar` word for word ("0 / 36 tools installed") a few hundred pixels
away. The header keeps that job; the rail answers "which category, how far".
Its counts are whole-category totals and deliberately **not** filtered by the
search query; only the observer effect depends on `query`, because search
unmounts sections and a remounted node is an element the previous observer never
saw. Categories with `checkable: false` show an em dash rather than a count,
which is 0014 rendered rather than contradicted.

**The z ladder is now 10 / 20 / 30 / 40 / 50**: section headers 10, the sticky
toolbar 20, the platform `Select` dropdown 30, tooltips and ScrollTop 40, modals
50. The toolbar has to sit *below* the Select: both are positioned in the root
stacking context and the toolbar comes later in DOM order, so at equal z-index
the bar would paint over an open platform dropdown. Verified by driving the app
over CDP and calling `elementFromPoint` on all five options.

**Below `xl`, `CategoryChips` does the rail's job** — the same categories as a
horizontally scrollable strip of chips in the sticky bar, dot + title + `n/m`,
tap to jump. It carries no scroll-spy on purpose: a highlight that moved while
you scrolled would fight the strip's own horizontal scroll position. Both read
their numbers from one `categoryProgress` helper in `commands.ts`, so the rail
and the strip cannot drift apart.

**Section headers pin at `--bar-h`, a measured variable rather than a literal.**
The bar is not one height: the chip strip only exists below `xl`, and the
controls wrap below 25rem. Measured across 320–2560 it is 155/151px below 25rem,
105px from 25rem to `xl`, and 63px above — so `--bar-h` carries those three
values and both `scroll-mt` and the header's `top` read it. One variable, not
three literals scattered over two files, because a jump target and a pinned
header have to agree with the bar or they hide under it.

The strip's scrollbar is hidden (`[scrollbar-width:none]`): while it was
visible, the bar measured 115px when the chips overflowed and 105px when they
did not, which is a height that cannot be pinned against.

**Tools the current OS cannot run stop being cards.** `CategorySection`
partitions after the query filter and renders the unavailable ones as one
`col-span-full` dashed strip of pills at the end of the section. Only three
sections ever have any, and only off macOS. `ToolCard`'s unavailable branch is
**deleted** rather than left as a fallback — `CategorySection` is its only
caller, so it was unreachable, and unreachable code that looks live is worse
than no code.

**Colour carries rank in the toolbar, and green means one thing.** Green was
doing two unrelated jobs — "this installs a tool / this is installed" and "the
agent does everything". They split: `--ai` (indigo, the first non-category hue
added since `--warning`) is Full AI setup and nothing else, with a light
travelling around its edge — masked to a 1.5px ring rather than a real border,
which would make it 3px taller than the buttons beside it. Detect installed is
accent-tinted with an accent border, highlighted without shouting; its text
stays `text-fg` because accent-on-tint measures 2.7:1 in light mode and fails.
Collapse all stays plain. `View setup` is always the quiet outlined button — it
used to render solid accent whenever a card had no install command, so the
emptiest cards shouted loudest.

**Progress follows the reader down.** One `IntersectionObserver` on the header's
progress box drives both takeovers: at `xl` the same `ProgressBar` unrolls into
the rail (max-height + fade + slide), and below `xl` the sticky bar's bottom
edge becomes a 2px accent line filling to the percentage. Exactly one indicator
exists at any width, and only once the header's own bar has left the screen —
showing both at the top was the duplication that got the rail's original
progress ring cut. On mobile the line beat a compact pill in the chip strip:
an invisible pill still occupies layout (a hole at the top of the strip) and
rides away the moment the chips are swiped sideways, while the line costs no
height and cannot be scrolled off.

**`--shadow` is the first new token since `--warning`**, following the same
two-layer pattern (a value in `:root`, another in `:root.light`) and exposed as
`shadow-lift` through `@theme inline` so it flips with the theme. Stock Tailwind
`shadow-*` is a fixed value that is invisible on this dark ground.

**`.card-in` changes fill mode from `both` to `backwards`.** This is load-bearing
and easy to undo by accident: with `both`, the animation's retained final
`transform: none` outranks the new `hover:-translate-y-0.5`, and the hover lift
silently never fires. There is a regression check for it in the verification
notes below.

**The `/` shortcut lives in `SearchBar`**, which owns its own window listener the
way `ScrollTop` does. It stands down when the event came from a field
(`closest('input, textarea, select, [contenteditable]')`) and when
`document.body.style.overflow === 'hidden'` — `Modal.tsx` is the only writer of
that in `src/`, so it is a reliable "a dialog is open" signal and avoids
threading modal state through three components.

## Rejected

- **Full-width table or list rows.** Commands and multi-line notes do not fit one
  row, so it becomes expandable rows — more clicks than cards, for less.
- **Masonry columns.** Sections are ordered ("Install these first, in order");
  masonry reorders visually and breaks that promise.
- **A density toggle.** A preference to maintain, a second answer to keep in
  sync, and 0007/0018 both argue against a second control that can contradict
  the first.
- **Keeping a cap, just a wider one.** Any fixed number is wrong at some width;
  the card floor already bounds density from below.
- **A bulk-copy button in the new toolbar.** 0017 deleted that deliberately; the
  `n/m installed` indicator is text, not a control.

## Consequences

Between 640px and ~651px the grid drops to one column where the old layout gave
two — the 2-column threshold moved by about 11px. One 577px card at that width
is a fair trade for the class of change; noted rather than tuned.

`ToolCard` no longer accepts unavailable tools. Anything that renders it in
future must filter first, or the "not available" affordance is simply gone.

Scroll-spy needs real frames: headless Chrome with `--virtual-time-budget`
composites none, so `IntersectionObserver` never fires and `scroll-behavior:
smooth` never advances. Both looked like layout bugs until the same checks were
re-run over CDP against a normally-rendering browser, where they pass. Anyone
verifying this page in headless has to drive it that way or force
`scroll-behavior: auto`.
