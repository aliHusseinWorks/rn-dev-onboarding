# 0028 — The statusline card ships three `/statusline` lines, not a hosted script

Date: 2026-07-27 · Status: accepted

## Context

Claude Code's statusline is a shell script that receives a JSON blob on stdin
every tick and prints whatever it likes. It's per-developer config with no
install step, so it doesn't look like the other cards — the question was how to
hand it to a team without asking each person to write a script.

Two shapes were weighed.

**A hosted script** — ship the script in `public/` the way the herdr launcher
already is ([0010](0010-hosted-launcher-script-and-image-fields.md)), and have
the card download it and patch `settings.json`. Everyone's bar comes out
byte-identical. Rejected: the statusline is a shell script, so that means *two*
scripts — bash for macOS and Linux, PowerShell for Windows — both of ours to keep
working against a JSON schema we don't control, plus a `settings.json` patcher
per platform. And the consistency it buys is weaker than it first sounds: what
matters for a team is that everyone's bar shows the same *fields*, not the same
spacing and colours.

**A `/statusline` line** — Claude Code has a slash command that takes a natural
language description, generates the script, and updates `settings.json` itself.
One line per profile, no files, no platform branch, and Claude Code owns the
script against its own schema. Chosen.

That also drops straight into the existing data model: a `ModalStep` whose
command begins with `/` is already routed as a Claude-Code input rather than a
shell command (`emitTool` in `aiSetup.ts`), and `slashToCli` correctly declines
to invent a CLI twin, because there isn't one.

## Decision

One card, `statusline`, in **Project Setup** at order 2, with three steps — each
a complete `/statusline` description. Send one as a prompt; send another later to
replace it.

It is not a tool, so it isn't in AI Tools with the CLIs and plugins. Project
Setup is `checkable: false`
([0014](0014-per-project-sections-are-not-checkable.md)), which is the behaviour
this card wants for free: no checkbox, no progress denominator, no detect spec.
A statusline isn't something you complete, and a card nobody can tick shouldn't
make the progress bar report you as unfinished for declining one. The category
description widened from "Scaffold a Claude workspace in a repo" to add "and tune
Claude Code itself", since the original didn't cover this.

An earlier revision put it in AI Tools with `inScript: false` and a detect spec
matching `"statusLine"` in `~/.claude/settings.json`. Both went with the move —
the category already excludes it from the AI setup, and Project Setup isn't
scanned, so the spec was dead code.

1. **The full two-line bar (recommended)** — repo and branch, model display name
   with context window size, effort level, context used, then 5-hour and weekly
   rate limits with time to reset, session cost, lines added and removed, session
   duration. Plus a `fast` flag on line one when `fast_mode` is true: fast mode
   moves Opus 5 from $5/$25 to $10/$50 per MTok, and nothing else on screen says
   so. This is the profile the team already runs; it leads because it's the one
   that's been lived with, not because it's the biggest.
2. **Working** — one line: repo and branch, model, effort, context used, lines
   changed. Not merely "shorter" — `rate_limits` is populated only for Claude.ai
   Pro/Max subscribers, so on API billing the full bar's second line is half
   empty. This is the correct profile for that case, not a downgrade.
3. **Focused** — model, effort, context used. Reads only the piped JSON, so it
   spawns nothing and renders instantly.

Each step carries a **`preview`** — a sample of the bar that command produces,
rendered in monospace beneath it. `ModalStep` gained the optional field for this.
Elsewhere in the app a step's command *is* the thing you're choosing; here the
command is a description and the output is what you're actually picking between,
so three near-identical prose notes gave no basis to choose. The alternative was
stuffing the sample into `note`, which renders as prose — a two-line bar with
aligned separators doesn't survive that.

Three profiles are mutually exclusive and the last one sent wins, so this could
never have gone into the AI setup even if the category were checkable — an agent
running all three on your behalf leaves you with the third.

## Consequences

Two limits found in the field reference that the card has to state rather than
work around, both in `tool.note`:

- **There is no permission-mode field.** The `auto mode on (shift+tab to cycle)`
  line is Claude Code's own footer, which renders *below* the statusline and
  isn't replaced by it. No profile can surface bypass/accept-edits mode, which
  killed a fourth "am I about to do something dangerous" profile that would
  otherwise have been the most useful of the set.
- **`rate_limits` is subscription-gated** and absent until the session's first
  API response, so the full bar is partly blank for the first prompt and
  permanently blank on API billing.

**The generated bar will not match the one on the machine this was written from,
and that was accepted.** That machine's `statusline.ps1` reads `.git/HEAD`
directly (no `git` subprocess, worktree `gitdir:` indirection included), carries
conditional `FAST` / `no-think` / `style:` / `@agent` / `PR#` badges, colour
thresholds on every percentage, and `session --` placeholders when `rate_limits`
is absent. A `/statusline` description reproduces the fields and roughly the
shape; none of the rest, and differently per developer. Hosting that script for
Windows and keeping `/statusline` for macOS and Linux was offered and declined —
one card that behaves the same everywhere beat a better bar for one platform.

Also worth knowing: **there is no git-branch field.** Only `workspace.repo.*`,
`workspace.git_worktree`, and `worktree.branch` (the last only in `--worktree`
sessions). A branch name in an ordinary checkout costs a `git` subprocess per
render, which is why profiles 1 and 2 ask for it to be cached per session and
profile 3 omits branch entirely to stay subprocess-free.
