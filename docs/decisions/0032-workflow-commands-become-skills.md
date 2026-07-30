# 0032 — `new-feature` and `fix-bug` are skills, not commands

Date: 2026-07-30 · Status: accepted

## Context

Custom commands have been merged into skills. A file at
`.claude/commands/fix-bug.md` and a skill at `.claude/skills/fix-bug/SKILL.md`
both produce `/fix-bug` and behave the same way, so the old files were not
broken — but `commands/` is the legacy shape, and skills add the thing that
matters here: Claude loads a skill on its own when the description matches the
task, where a command only ever fires when someone types it.

That difference is the whole point of this workspace. "Reproduce before you fix,
then take the smallest diff" is worth having when a session starts with "the rail
rows don't do anything" and no slash command. As a command it was opt-in, which
means it was skipped exactly when it was needed.

## Decision

Both move to `.claude/skills/<name>/SKILL.md` with their bodies unchanged.
`argument-hint` and `$ARGUMENTS` work identically in a skill, and the directory
name still supplies the command name, so `/fix-bug <description>` behaves as
before. The descriptions gained a "Use for/whenever …" trigger clause, matching
how the three existing skills are written, because that text is all Claude sees
when deciding whether to load one. `.claude/commands/` is gone.

The team setup prompt no longer generates a `commands/` directory: the two
workflow files are listed among the skills, with the reason stated, so the
scaffold stops teaching a legacy shape to every repo it touches.

## Rejected

**Keeping them as commands and adding skills alongside.** Two files producing one
`/name` is the drift this repo's docs contract exists to prevent.

**`disable-model-invocation: true`.** It would keep them manual-only, which is
the behaviour we just removed on purpose. Reach for it on a skill with side
effects, not on a method.

## Consequences

- **The description is now load-bearing.** It is all Claude sees when deciding
  whether to load a skill, so rewording one moves the trigger — and a description
  drawn too wide loads a method onto a session that wanted a one-line answer.
- **Five skills, one shape.** Anything added to `.claude/skills/` is both a
  `/name` and a candidate for automatic loading; there is no longer a place to
  put something that should only ever fire when typed.
