# 0033 — The detect session lives in App, and pairing codes don't expire

Date: 2026-07-30 · Status: accepted · Amends the session half of [0007](0007-simple-detect-modal-and-config-detection.md) and [0013](0013-detect-applies-whole-result-with-undo.md)

## Context

`useDetectSession` was called from `DetectModal`, so the modal *was* the session:
closing it aborted the poll loop, and reopening minted a fresh code — leaving a
script already copied to the clipboard pointing at a code nobody listens for. The
modal's own promise, "this page ticks off what it finds by itself, no refresh
needed", held only while it stayed open.

Three things were tangled together in that component: the session (code and poll
loop), the result and the pre-scan snapshot Undo replays, and the panel that
renders them. Only the last one belongs to a modal.

A second finding reframed the expiry question: **there is no relay-side session to
expire.** KV holds nothing until the script POSTs, and the 10-minute TTL from
[0003](0003-single-use-pairing-codes-with-tombstone.md) starts at that POST. The
page's own `SESSION_TTL_MS` was an unexamined mirror of that number, and it
produced the one genuine failure mode: the page stops polling at minute 10, the
user runs the script at minute 15, the relay stores a report nobody reads, and it
dies ten minutes later with nothing on screen to explain any of it.

## Decision

Session and result move to `App`. `useDetectSession(enabled)` takes the flag so
nothing polls until the modal has been opened once — minting a code is free,
polling isn't, and a visitor who never scans shouldn't touch the relay.
`planApply(report, platform, installed)` in `detect.ts` holds the pure part
(whitelist against scannable ids, the mismatch guard, `notFound`, the
before-snapshot); `App` owns `applied`, Undo and Scan again; `DetectModal` renders
them from props and keeps only its manual-paste input state.

Moving `applied` is not tidiness. With the session outliving the modal but the
snapshot dying with it, reopening re-runs the apply effect — its `lastAppliedCode`
ref is fresh on remount — and snapshots the *post*-scan state as the one to
restore, so Undo becomes a no-op that eats hand-entered ticks.

**Codes no longer expire.** The `'expired'` status, the TTL check, the "New code"
button and the "expires in 10 min" copy are gone: a code is good for as long as
the tab is open. In their place `pollDelay(elapsed)` backs the interval off — 2s
for the first two minutes, then 10s, then 60s past ten — so a tab left open all
day costs a few hundred relay reads rather than ~1,800 an hour. The existing
unreachable backoff still takes precedence over it.

**A report arriving while the modal is closed reopens it** on the result panel
that already exists, unless the AI setup or a tool modal has the screen. That
collision is the realistic case rather than an exotic one — scan, then browse the
AI setup while it runs — and it resolves in our favour: the ticks land behind it
and `AiSetupModal` recomputes from `installed`, so its list and its prompt shrink
live while the user watches.

## Rejected

- **A toast for the arrival.** `.claude/rules/code-style.md` rules them out and
  the repo has no toast system; adding one for a single event is a new pattern for
  everyone to maintain. The modal reopening is the stronger signal anyway.
- **Status on the sticky "Detect installed" button** (waiting / ticked N /
  expired). It survives the modal being closed, which is the whole problem here —
  but with expiry deleted there are only two states left to report, and one of
  them is a panel that now opens itself.
- **Keeping ten minutes and surfacing expiry outside the modal.** Bounds polling,
  at the cost of keeping the one state where the user must do something because
  the page stopped listening.
- **Starting the ten-minute clock at copy instead of modal open.** An honest fix
  for a real bug — the countdown currently burns while you read the intro —
  superseded by having no clock at all.
- **Persisting the session to `localStorage`.** It would survive a reload too, but
  `.claude/rules/security.md` scopes the `rn-onboard:` prefix to tool ids, the
  platform choice and the version cache, and a reload already resets the session
  today. Not a regression, so not this change's problem.

## Consequences

- **A reload still orphans a copied script.** The code lives in React state, so
  refreshing mints a new one and the old script's report lands under a code
  nobody polls. Unchanged by this work, and now the only way to lose a session.
- **A late scan can take up to a minute to appear**, once the poll has reached its
  60s tier. The normal case — running the script within a couple of minutes — is
  unaffected and still lands in one tick.
- **`Applied` and the apply logic live in `detect.ts`**, so the manual-paste path
  and the relay path cannot drift apart.
- Verified end to end against `wrangler pages dev dist` in headless Chrome: no
  relay traffic before the first open, polling continuing with the modal closed, a
  report POSTed from outside the browser reopening the modal with "Marked 2 tools
  as installed", ticks landing in `rn-onboard:installed`, a tool the scan missed
  cleared, Undo restoring, and a reopen showing the same code and the same panel.
