# 0026 — The category rail highlights what you clicked, not only what scrolled past

Date: 2026-07-27 · Status: accepted · Refines the rail in [0020](0020-fluid-layout-and-category-rail.md)

## Context

Clicking the rail's last row scrolled to the bottom of the page and highlighted
**MCP Servers** instead. Two independent defects produced that.

The click was never recorded. `onClick` called `scrollIntoView()` and nothing
else, so `active` was written only by the IntersectionObserver — the highlight
always meant "where the spy thinks you are", never "what you asked for".

And the sections at the end of the page can never win the spy's band.
`rootMargin: '-80px 0px -65% 0px'` leaves a strip from 80px down to 35% of the
viewport height. At full scroll the last two section headings sit at roughly 401px
and 605px in a 966px viewport, below the band's ~338px edge, and no further
scrolling can lift them into it because the document has ended. Only MCP Servers
ever intersects the band, so it stays lit while the reader looks at React Native
Setup. That half of the bug needs no clicking to reproduce — scroll to the bottom
by hand and the rail is simply wrong.

`scroll-behavior: smooth` (`index.css:82`) rules out the obvious one-line fix:
setting `active` in the click handler alone, because the observer fires several
times during the animation and overwrites it before the scroll lands.

## Decision

A click pins its row. `resolve()` returns early while a pin is held, so nothing
the observer sees during the smooth scroll can displace it, and the pin is
released by `wheel`, `touchmove`, `keydown` or `pointerdown` — input a
programmatic scroll never produces, which is what makes those usable as "the
reader is steering now". `scrollend` would have been the tidier signal but Safari
only got it recently, and it is the wrong signal anyway: the highlight has to
outlive the scroll landing, not end with it.

Releasing on settle was rejected for that reason. So was a timer: clicking the
*second*-to-last row is the case that proves the point, since no scroll position
can ever express it, and a pin that expires would jump the highlight off it.

Alongside the pin, when the page is within 2px of its end the last rendered
section is named directly. That fixes the scroll-to-the-bottom-by-hand half,
which pinning does not touch. A sentinel element observed at the end of the
document would have matched the file's observer-only style, but it needs a dummy
node in `App.tsx` to answer a question scroll position answers in one line.

The candidate list is now filtered to sections that are actually in the DOM, so
search-filtered sections can't be named.

## Consequences

The chips strip below `xl` gained the same marking on tap, which 0020 left out.
Its reasoning stands and is unchanged: no scroll-spy there, because a highlight
tracking the scroll would have to drag the horizontally-scrolling strip along to
keep itself visible, out from under the thumb panning it. A tap-set mark moves
only on tap, so it never fights that. What was missing was acknowledgement of the
jump, not a spy.

The rail now carries a `scroll` listener where the file previously used observers
only. It is passive and does one layout read, and the question — how close is the
page to its end — is not one `IntersectionObserver` answers without inventing an
element to observe.

One hole is known and left: dragging the scrollbar fires none of the release
events, so a pin set by a click survives a scrollbar drag and the highlight goes
stale until the next wheel, key or tap. `pointerdown` covers the common browsers
where a scrollbar press reaches the document, and the state self-corrects on the
reader's next input, so it is not worth a `scrollend` polyfill.

Rail rows for search-filtered sections are still clickable and still do nothing —
the separate item already parked in `TODO.md`.
