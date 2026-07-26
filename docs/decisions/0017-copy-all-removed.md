# 0017 — "Copy all" is removed, not repaired

Date: 2026-07-26 · Status: accepted · Supersedes the "setup script" surface in 0009

## Context

Every section header carried a "Copy all" button: `copyAllForCategory` joined
each card's primary command for the current OS. Nobody used it, and it was
wrong in five ways at once.

It read only `resolveAction`, so a card's `secondary` command was dropped. It
filtered to `type === 'command'`, so any card whose action is a download or a
link vanished with no trace in the output. It ignored `t.inScript`, so `rn-init`
and `rn-doctor` were included where the AI setup deliberately excludes them. It
emitted bare commands with no `# Tool name` above them, so fifteen lines of
shell arrived with nothing saying what any of them did or which card to go back
to. And it never touched modal steps, so every tool whose real setup lives in a
modal contributed nothing.

That last gap is not an unfinished feature, it is a category error. Modal steps
carry `{token}` fields needing per-user values (git identity, work email,
install path), `manual: true` prose that is not a command at all, and
`docsOnly` reference commands meant for later. A bulk copy has nothing to fill
those with and no basis for choosing among them.

0009 named "the setup script" as a derived surface that must be kept in sync on
every tool change. This was that surface — so the ripple checklist in CLAUDE.md
and README has been charging a maintenance tax on a broken, unused feature.

## Decision

Delete it: `copyAllForCategory`, the section button, and the three docs
references to a "setup script".

The two real jobs already have better homes. "Give me this one command" is the
per-card copy button, which is labelled by the card it sits on. "Set up my whole
machine" is the AI Setup modal, which groups by section, names every tool,
carries prereqs, honours `inScript`, and lets you exclude tools before
generating.

Repairing it was rejected because the honest repair — commented, ordered,
`inScript`-aware, generated from the same source as the AI setup — is a
downloadable setup script, i.e. a new feature. Building one for a button nobody
pressed is the wrong order of operations. If a dev ever asks for an agent-free
path through a whole section, that is the shape to build, and the per-card
buttons in section order cover it until then.

## Consequences

`CategorySection` loses `useCopy` and two icon imports; "Mark all done" is now
the only header action. Bundle drops ~0.6 kB.

The trailing-newline fix this same release added to `copyAllForCategory` goes
with it. That fix was real — the last of fifteen commands sat at the prompt
unexecuted — which is itself evidence for deletion: the bug had been shipping
long enough to be found by a generator audit rather than by a user.
