# 0034 — Modal modes are a choice field, and the team plugin ships only hooks

Date: 2026-08-01 · Status: accepted

## Context

The "Team plugin" card put two audiences in one numbered list: steps 1–2 for
every developer, steps 3–5 for the one person who authors the plugin. Reading it
meant working out which half applied to you before you could start. It also
taught a shape that stops at one plugin — a marketplace whose only entry shares
its name — where a company wants one repo holding a baseline plugin everyone
installs plus a plugin per stack.

Two questions had to be answered before the card could be rewritten.

**How to show two audiences in one card.** A tab component is the obvious
reading of "two tabs", but the modal already filters steps by field state
(`whenFieldSet`/`whenFieldUnset`), and a mode is just another field the steps
answer to.

**What a company plugin may contain without colliding with the per-repo setup.**
The "Team setup prompt" card already writes `.claude/rules/code-style.md` into a
repo, and that file already says "never narrate history in a comment". A plugin
saying the same thing means both are loaded, both compete for attention, and the
duplicate is paid for on every message.

The tempting fix — have the plugin skip whatever the repo covers — fails the
case that matters. The setup prompt has to stay complete on its own, because
most repos will never have the plugin, so nothing can be removed from it.

## Decision

**Modes are a `kind: 'choice'` `ModalField`**, rendered by a new
`SegmentedControl`, with `whenFieldIs` on each step naming the mode (and,
where relevant, the protocol) it belongs to. No tab concept exists. The
Create/Install split and the HTTPS/SSH split are the same mechanism used twice,
and the build prompt is an ordinary step with `multiline`/`download` rather than
`modal.prompt`, so mode filtering reaches it with no extra code.

`SegmentedControl` is native radios styled as a segment rather than buttons with
`aria-pressed`: arrow-key navigation, tab order and the announced group name all
come from the browser, so there is no keyboard handling to get wrong.

`requireFields` withholds every step, and the mode picker with them, until the
company slug is filled. A command built around an unfilled token looks runnable
and isn't; prose carrying the same token reads as broken while numbering itself
from 1 as though the steps above it didn't exist; and choosing a path is
pointless while everything behind it is withheld. Text fields therefore render
above choice fields — a field the modal is gated on has to be answerable before
anything it gates appears. The modal's intro carries the explanation in the
meantime.

**The baseline plugin ships hooks and nothing else.** No skills, no agents, and
above all no text loaded on every message. A plugin and a repo's `.claude/` then
produce different kinds of thing and cannot say the same thing twice — there is
no marker file, no version check, and nothing that rots as either side changes.

The comment rule still travels with the plugin. Plugins cannot ship rule files,
so it arrives as a `PreToolUse` hook on code edits that exits 0 with
`hookSpecificOutput.additionalContext` — injecting the rule at the moment an
edit happens rather than holding it in front of every message. Before speaking
it greps the host repo's `CLAUDE.md` and `.claude/rules/` for the rule's own
keywords and stays quiet if the repo already covers it, and it speaks once per
session rather than once per file.

## Consequences

The keyword check is a grep, not comprehension. It can miss a rule the repo
phrased unusually, or match one only superficially similar. It leans toward
speaking, so the failure is a duplicated paragraph on one edit rather than a
rule that never fires — the cheaper direction, and the reason the whole scheme
is worth its five lines.

Naming follows the ecosystem rather than an invention: the marketplace is
`{company}-claude`, the baseline plugin is bare `{company}`, and stack plugins
suffix it (`{company}-rn-mobile`). Nothing in the official catalog names a
baseline plugin "core"; the pattern everywhere is flagship = bare name, variants
= suffix, as in `superpowers` / `superpowers-chrome`. The marketplace keeps its
`-claude` suffix because a user can register only one marketplace per name and a
second with the same name silently replaces the first.

`claude plugin init` is not part of the flow. It scaffolds a single plugin at
`~/.claude/skills/<name>/`, which is both the wrong shape for a marketplace repo
and the wrong place, so the prompt writes the files directly.

Plugin folders live inside the marketplace repo and are referenced by relative
path. That is what lets a private marketplace work without a second repository
anyone needs access to, and it is also the shape an organisation-wide rollout
requires on Team and Enterprise plans.

The `team-setup-prompt` card is unchanged.
