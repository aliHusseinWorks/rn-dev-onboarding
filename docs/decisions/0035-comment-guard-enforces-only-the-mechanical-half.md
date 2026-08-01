# 0035 — The comment guard enforces only the mechanical half

Date: 2026-08-01 · Status: accepted

## Context

`.claude/rules/code-style.md` forbids AI-shaped comments, and it is path-scoped,
so Claude Code loads it the moment a matching file is touched. It was loaded
during the session that produced [0034](0034-modal-modes-are-a-choice-field.md)
and comments went in anyway — several restating rationale already written in the
decision file, which is duplication by definition and rots the moment either
copy changes.

That failure is worth being precise about, because it decides what a hook can
do. Those comments had no emoji, no banner, no `Note:` prefix. They were
well-formed English that simply said nothing the code and the decision file
didn't already say. No regular expression sees that. A hook cannot enforce the
part of the rule that actually failed.

What a hook can catch is the part the rule names outright.

## Decision

`guard.mjs` gains a Stop check for three tells in comment lines the working tree
added: an emoji, a run of five or more `=`/`-`/`~`/`_`, and a `Note:` prefix.
Anything it flags exits 2 with the file and the line.

Two details the first run forced:

**Anchor the `Note:` pattern.** Unanchored it matched "…needs a short note:"
inside an ordinary sentence — a false positive on a legitimate comment, on the
very first invocation. The tells describe how a comment *opens*, so the marker
is stripped and each pattern tested against what remains.

**Read untracked files whole.** `git diff HEAD` cannot see a file that isn't
tracked yet, which is precisely where a new component's comments live. The check
also walks everything `git ls-files --others --exclude-standard` reports.

The judgement half stays in the rule file, and the script says so where a reader
will find it.

## Consequences

This guard would not have caught the comments that prompted it. That is stated
plainly rather than glossed, because a check that looks like it covers a rule it
only partly covers is worse than no check — it invites trusting a clean exit.

Fixing this surfaced a bug that made the whole Stop guard inert: the script
imported `fs.globSync`, which arrived in Node 22, while the machine it runs on
has Node 20. An unresolved import throws before any statement executes, so the
process exited 1, which Claude Code treats as a hook error and lets the session
end. The changelog check had therefore never once run here. File lists now come
from `git ls-files`, which has no version floor.

The `PreToolUse` branch that asked before an existing decision file was edited
came out at the same time, taking the last `PreToolUse` entry in
`settings.json` with it. It fired on every revision of a decision written in the
same session as the work it records — the normal case, not the violation
[0030](0030-conventions-as-rules-and-hooks.md) meant to catch. The rule itself
survives in `CLAUDE.md`, unenforced.

The lesson generalises past this repo and is now in the team setup prompt: write
hooks against the oldest Node a teammate might have, and run each one — including
a deliberately failing case — before calling it done. A hook that has only been
observed to load has not been tested.
