---
name: browser-check
description: Drive a real browser to confirm a UI change, read console and network errors, or screenshot a page — over the Chrome DevTools Protocol, with no dependency to install. Use for "check it in the browser", "does that render", "any console errors", "test the modal".
argument-hint: <what to confirm in the browser>
---

# Checking this app in a real browser

To confirm: $ARGUMENTS

`pnpm build` and `pnpm lint` prove the code compiles. They say nothing about
whether a modal opens, a tooltip escapes its container, or a copy button yields
the right command. This drives the page instead.

No dependency: Chromium exposes the DevTools Protocol on a WebSocket, and Node
has `fetch` and `WebSocket` built in. `cdp.mjs` beside this file wraps it.

## 1. Start a browser with the port open

```
pnpm dev    # separate terminal, or nohup … & disown

"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/cdp-profile \
  --no-first-run --no-default-browser-check --headless=new
```

Drop `--headless=new` to watch it work — worth it when the user asked to see it.
`--user-data-dir` is not optional: Chromium refuses the debugging port on a
default profile, which also means this can never touch real logged-in sessions.
Any Chromium works (Chrome, Brave, Edge). Confirm with
`curl -s localhost:9333/json/version`.

## 2. Write the check

Copy `example.mjs`, change the selectors, run `node <file>`. Exit code is 0 or 1.

```js
import { connect } from './cdp.mjs'
const page = await connect({ port: 9333 })
const problems = page.watch()          // collects console errors + HTTP 4xx/5xx
await page.go('http://localhost:5173/')
await page.click('text=View setup')
await page.until(`document.querySelector('[role="dialog"]')`, { label: 'modal opens' })
page.check('modal opened', true)
page.report()
```

| Call | Does |
|---|---|
| `go(url)` | navigate, wait for `readyState === 'complete'` |
| `click`, `hover`, `type(t, text)` | real input events, after checking the target is visible and not covered |
| `until(expr, {ms})` | poll until the expression is truthy; throws on timeout. An expression that *throws* counts as "not yet", so `until(\`document.querySelector('#x').value === 'a'\`)` is safe before `#x` exists |
| `ev(expr)` | evaluate in the page, throws if the page throws |
| `at(target)` | `{x, y, hit, onScreen}` without acting |
| `watch()` | live array of console errors, exceptions, failed requests, HTTP ≥ 400 |
| `shot(path)` | PNG |
| `check(name, ok, detail)` / `report()` | PASS/FAIL lines, then exit 0 or 1 |

Targets take three forms: a CSS selector, `text=Some label`, or
`js:<expression returning an element>`. Cards here carry no ids, so scoping goes
through the heading:

```js
`js:(() => {
  const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.trim().startsWith('Zoho MCP'))
  return [...h.closest('div[class*="rounded-xl"]').querySelectorAll('button')].find((b) => /view setup/i.test(b.textContent))
})()`
```

## 3. Prove the check can fail

**A check that cannot fail is worse than no check** — it reports green and you
believe it. Before trusting a passing run, break the thing on purpose and watch
the number move: delete `shellQuoted` from a card and confirm the quoting check
goes red, then put it back. A check whose assertion is `x.length > 0 || true` is
the failure mode to look for in your own code.

The same trap exists one level up, so `report()` closes it: a run where no
`check()` ever executed — an early `return`, a `try` that swallowed the middle of
the script — prints `NO CHECKS RAN` and exits 1 rather than `0/0 passed`.

## Pitfalls this repo has actually hit

- **`scroll-behavior: smooth`** is set in `src/index.css`, so every
  `scrollIntoView` animates and a rect read in the same evaluation is the
  pre-scroll one — the click then lands on empty page. `behavior: 'instant'` does
  **not** reliably override it: measured on this app, an element sat at `top:295`
  before the scroll, `247` immediately after, and `236` six hundred milliseconds
  later. No fixed sleep fixes that class, so `cdp.mjs` watches the rect across
  animation frames until it repeats (`stable()`), which is Playwright's "stable"
  check and the reason `click`/`hover` are reliable here.
- **Pin the viewport.** A headless window defaults to about 756×419, where this
  layout is at its narrow breakpoint — so a headless run and a visible run check
  different UI. `connect()` forces 1280×900; pass `width`/`height` to change it.
- **React ignores synthetic `mouseover`.** `onMouseEnter` never fires from it;
  pointer events do. Prefer `hover()`, which also arrives from off to the side,
  because a single move onto a target can be the pointer's first event there and
  miss `pointerover` entirely. One tooltip check flaked exactly this way.
- **Setting `input.value` from a script skips React's `onChange`.** Either go
  through `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`
  and dispatch `input`, or just use `type()`, which sends real keystrokes.
- **Never sample a transition once.** Reading opacity mid-fade reports a visible
  element as hidden. Use `until`, not `sleep`.
- **Reading the clipboard needs permission**:
  `send('Browser.grantPermissions', { origin: 'http://localhost:5173', permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })`.
- **`backdrop-filter` makes an element a containing block for `position: fixed`
  descendants**, which is why `Tooltip` portals to `<body>`. Assert
  `tooltip.parentElement.tagName === 'BODY'` and that its box is inside the
  viewport, not merely that it exists.

## When to stop and install Playwright instead

This is deliberately not a test framework. Reach for Playwright when you need
Firefox or WebKit (CDP is Chromium-only), a suite that reruns in CI, or its
actionability checks — before a click it waits for visible, stable across two
animation frames, receives-events, and enabled, where `cdp.mjs` checks two of
those. For confirming one change on Chromium and throwing the script away, this
is enough and costs no dependency.
