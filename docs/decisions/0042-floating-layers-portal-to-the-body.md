# 0042 — Floating layers portal to the body

Date: 2026-08-10 · Status: accepted

## Context

Tooltips inside a tool modal were being cut off. `Tooltip` was CSS-only: an
absolutely positioned panel beside its trigger, shown by `group-hover`. Two
ancestors it could not see decided where it actually landed.

`Modal`'s content box is `overflow-y-auto overflow-x-hidden`, and any overflow
value other than `visible` clips positioned descendants — so a 16rem panel on a
right-hand trigger lost its edge, and a `side="top"` panel on the first step lost
its top. The repo had already conceded this in a comment in `App.tsx`: a step
carrying a tooltip "needs a short note", because a note long enough to push the
icon near an edge got the panel cut rather than repositioned. Callers also passed
`align="end"` in seven places to hand-steer around it.

## Decision

The panel renders into `document.body` through `createPortal`, positioned
`fixed`, measured on hover, and clamped to the viewport on both axes with a flip
to the opposite side when the preferred one has no room. `align` is deleted, and
so is the short-note comment: nothing needs steering now.

**`position: fixed` alone is not enough, which is the part worth recording.**
Fixed escapes overflow clipping, so it fixes the modal — and it silently breaks
everything outside one. `CategorySection`'s sticky header carries
`backdrop-blur`, and `backdrop-filter` establishes a containing block for fixed
descendants, so viewport coordinates resolved against that header instead. The
section tooltips computed a correct `top: 328px` and rendered at `y: 612`, a
constant offset of wherever the blurred ancestor sat. It reads as working until
you measure it, which is how the intermediate version passed a first pass of
tests. Leaving the tree is what removes the whole class of problem: no ancestor
can clip a body child, and none can become its containing block.

Three consequences of leaving the tree, all handled rather than accepted:

- `group-hover` cannot reach a panel that is no longer a descendant, so
  visibility is state, and one CSS selector becomes three handlers that have to
  agree. `onFocus` tests `:focus-visible` rather than showing on any focus, or
  clicking a copy button pins its tooltip open for as long as the button holds
  focus; `onMouseLeave` checks for a focused descendant before closing, or a
  pointer merely crossing a trigger the keyboard opened dismisses it with nothing
  left to bring it back.
- A panel outside the scrolling box no longer scrolls with its trigger, so the
  effect re-places on `scroll` (captured, to catch the modal's own scroller) and
  on `resize`.
- `label` belongs in the effect's dependencies, which is easy to miss because it
  reads as content rather than geometry. It is geometry: the panel's measured
  width feeds the clamp, and `CommandBlock` swaps its tip to `Copied!` and back
  1.6s later while the panel is open. Without the dependency a right-edge copy
  button clamps `left` for the narrow panel and then keeps it as the panel widens
  back — the overflow this decision exists to remove, reappearing after every
  copy.

`z-[60]`, above `Modal`'s `z-50`, since a body child no longer inherits the
stacking context that used to put it above the panel it belonged to.

Rejected: keeping it CSS-only and telling authors to write short notes, which is
the status quo that produced the bug and costs every future card a constraint;
CSS anchor positioning, which is the eventual right answer but not yet safe
across the browsers this page targets; and correcting the containing-block offset
by measuring where `top: 0` lands, which works but leaves the panel inside a
clipping ancestor and needs a second forced layout per hover.

## Consequences

Verified in headless Chromium over CDP rather than by eye — the intermediate
`fixed`-only version looked correct and was off by 284px, so "it renders fine" is
not evidence here. 42 triggers hovered with real mouse input across three
viewports (390×760, 1280×800, 1600×300) in three states each — page, modal, modal
scrolled to the bottom: 40 opened a tooltip, all portalled to the body, all
`fixed`, all fully on screen, none left open after the pointer left. Keyboard: Tab
reveals each tooltip with `:focus-visible` true, and a real mouse click on a copy
button leaves no tooltip open.

Take the numbers, not the method, from that. Four earlier probes reported clean
and had measured nothing: the clipboard was denied so the label never changed, the
chosen trigger was never clamped so it could not overflow, a synthetic `mouseover`
does not drive React's `onMouseEnter` synthesis, and `opacity === '1'` sampled
inside the transition reads as no tooltip open. Three of those printed as zero
clipped, which is indistinguishable from a pass. The only claim here established
by making the code wrong and watching a number move is the `label` dependency.

`createPortal` is the first portal in the repo. `ARCHITECTURE.md`'s table now
points future floating layers at this pattern, because the failure it avoids is
invisible until measured.

Tooltip is now stateful, but its panel stays mounted at `opacity-0` exactly as
before — the portal changes the parent, not the lifetime. Mounting only while open
was tried first and cost two things for nothing: the fade became unreachable —
`useLayoutEffect` sets the position before the browser paints, so the `opacity-0`
frame is never shown — and the label left the DOM between hovers, which matters
for the three triggers whose tooltip is their only descriptive text. Staying
mounted keeps both: the panel sits painted at `opacity-0` between hovers, so the
change to `opacity-100` transitions in each direction as it always did.

Staying mounted has its own cost, though, which the portal creates and the nested
version did not have: `opacity: 0` hides nothing from a screen reader, and the
panel now sits at the end of `<body>` rather than beside the trigger it describes,
so every tooltip string in the app would read as stray text after the footer.
`aria-hidden` while closed settles it. `aria-describedby` was wired neither before
nor after, so that gap is unchanged and still parked in `docs/TODO.md`.
