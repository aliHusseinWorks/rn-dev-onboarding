# 0031 — Remote Control is an optional extra line in the AI setup, not a step

Date: 2026-07-30 · Status: accepted

## Context

The AI setup is built to be walked away from: STEP 0 collects every personal
value in one message so nothing stalls mid-run
([0023](0023-ai-setup-front-loads-asks-not-subagents.md)). What that shape
cannot cover is the *unplanned* stall — an install failing in a way the agent
needs an answer for, or the end block arriving while nobody is at the desk.
Neither announces itself, so the price of an unattended run is guessing when to
check back.

Claude Code's Remote Control covers exactly that gap. `--remote-control` on the
launch line bridges the local session to claude.ai/code and the mobile app, and
the phone can be notified when the session needs a decision.

One fact shaped everything below: **the flag alone does not send anything.** The
notification is a separate opt-in — `/config` → "Push when actions required"
(permission prompts and questions) or "Push when Claude decides" — with the
Claude app signed in on the same account. Usefully, pushes are held back while
the terminal has focus, which is precisely the walk-away case and nothing else.

Four placements were weighed.

**Steps on the Claude Code card** — data-only, in `tools.ts`, the way the
statusline card ships `/statusline` lines
([0028](0028-statusline-card-via-slash-command.md)). Cheapest by far and needs
no component change. Rejected: the card is about installing and signing in, and
the only reason to bother with Remote Control here is the walk-away run — a pitch
that exists solely in the AI setup modal.

**A third numbered step** — most discoverable. Rejected: it turns the modal's
"Two pastes" into three and reads as required work in a list of required work.

**A sentence in the `--dangerously-skip-permissions` box** — smallest diff.
Rejected: that box is already a dense paragraph, and a flag plus a `/config`
toggle plus a phone app will not compress into a clause.

**Its own box directly under it** — chosen first, on the grounds that the box
already there says what unattended really means and where you still have to be
present. Reversed once it was on screen; see the Decision.

Either way the preconditions stay out of the copy, because **this fails soft**:
with an ineligible account
`claude --remote-control` still starts the session and shows its own Remote
Control failure notice. The setup run is unaffected; only the pings are lost.
Listing Pro/Max, claude.ai login rather than an API key, not Bedrock/Vertex/a
gateway, the Team-plan Owner toggle and workspace trust would trade a wall of
text, in front of someone about to install forty tools, for a failure Claude Code
reports itself.

## Decision

A checkbox under step 2's command — "Ping my phone if it needs me" — that appends
`--remote-control` to the command in the block above it, next to an info icon whose
tooltip carries the rest: what the flag opens, and the `/config` toggle that makes
it notify you. One module const, `LAUNCH`, builds both forms of the command, so the
ticked one cannot drift from the plain one.

The first attempt was the callout box above: two sentences and a second
`CommandBlock`. It was rejected on sight for height — two stacked paragraph boxes
and two command blocks made a wall out of the top of the modal, ahead of the tool
list the modal exists for. The toggle costs one line instead of five and sits on
the command it modifies, so ticking it visibly rewrites the line you are about to
copy, which no amount of prose about a flag achieves.

The same treatment then paid for itself on the box that was already there. The
`--dangerously-skip-permissions` explainer went from five lines to two, with the
alternative — approve each step yourself, which means not walking away — moved
into an info tooltip. The warning itself stays on the page: hiding "it runs the
whole list without checking with you" behind a hover would be a regression, and a
hover tooltip does not exist on touch. Its old closing clause, "which is what the
second line above is for", went with the trim; it was already wrong whenever
Claude Code is ticked off on the page and the launch command is line 1.

Deliberately not done: no conditional "you'll be pinged" variant of the phase
list (it would have to track the toggle to earn one line of copy), and the prompt
is untouched — STEP 0 batching stays the design, Remote Control is the net under
it, and the agent cannot send `/config` itself anyway.

## Consequences

- **On Team and Enterprise plans Remote Control is off** until an Owner enables
  the toggle in claude.ai's Claude Code admin settings. For a team-facing page
  this box can be dead copy for everyone until someone flips it, which is worth
  confirming before pointing the team at it.
- **A network outage longer than ~10 minutes exits the process**, per the docs.
  That paragraph is written for server mode and is unverified for an interactive
  `--remote-control` session, where a process exit would abandon a half-finished
  install. Parked in `TODO.md`; a 10-minute outage fails the installs either way.
- **Remote Control wants a project directory** — the startup trust dialog never
  saves trust for a home directory, and machine setup is plausibly started from
  `~`, so the trust prompt can reappear. Left out of the copy with the rest of
  the preconditions.
- **While connected, the transcript is stored on Anthropic servers** to keep
  devices in sync. That is true of any session under the data-usage policy, but
  this box invites it onto the one run whose first act is collecting personal
  values (work email, Git identity) by design.
