# 0030 — Conventions live in `.claude/rules/`, and the rules that matter get a hook

Date: 2026-07-30 · Status: accepted

## Context

The workspace had skills, agents and commands but nothing under
`.claude/rules/` and no hooks, in this repo or in the team setup prompt the
scaffold card hands out. Two gaps followed from that.

The conventions were prose in `docs/ARCHITECTURE.md` under "Code conventions",
read only when a session chose to open the file. Claude Code loads
`.claude/rules/*.md` by itself, and a rule with a `paths:` glob loads exactly
when a matching file is touched — the same content, delivered without depending
on someone deciding to look it up.

And everything in the workspace was context. Context is advisory: a session can
talk itself out of a CLAUDE.md rule, and some of these rules had already been
broken — a decision file was deleted rather than superseded, which is why the
contract now says so explicitly. Hooks and `permissions.deny` run regardless of
what the model decides.

## Decision

`.claude/rules/code-style.md` and `.claude/rules/security.md`, both path-scoped.
The code-style file is the single source for TypeScript, naming, imports,
structure and comments; ARCHITECTURE.md's "Code conventions" section is now a
pointer to it, and CLAUDE.md doesn't restate it either. Its comment section
absorbed the sharper rule from the team's shared style guide: never narrate
history in a comment, because the commit message and the changelog stay attached
to the change while a comment about a fixed bug is a lie by the next refactor.

`.claude/settings.json` denies history rewrites (`--force`, `--amend`, `rebase`,
`reset --hard`) and non-pnpm installs, under both `Bash(...)` and
`PowerShell(...)` since the team is mixed-OS, plus edits to `pnpm-lock.yaml` and
`dist/`. One `.claude/hooks/guard.mjs` covers the two things worth enforcing
mechanically: a PreToolUse hook that asks before editing an existing
`docs/decisions/` file, and a Stop hook that blocks finishing when source was
edited today and `CHANGELOG.md` has no line under today's heading.

The setup prompt behind the scaffold card generates the same shapes, derived from
the host repo rather than copied: the three rule files (testing.md only if the
repo has a test suite), the deny list, a formatter hook, and the Stop docs check.

## Rejected

**An auto-format PostToolUse hook in this repo.** There is no formatter here by
choice, and `pnpm lint` cannot fail: oxlint's default severity is `warning`, so
it exits 0 even on findings. Gating on `--deny-warnings` instead would fire on
the repo's own idiom — `Select.tsx` uses ternaries as statements, which
`no-unused-expressions` flags. So the options were a hook that can never fire or
one that cries wolf on correct code. The setup prompt keeps the formatter hook
for RN repos, which do configure one, with the instruction to skip it when the
host repo has nothing that can actually fail.

**A hook checking the `tools.ts` → `DETECT_SPECS` ripple.** A missing spec
silently lists a tool as unscannable, which is the right shape for a hook, but
finding it means regex-parsing two TypeScript tables from a script that then
drifts from their shape. The docs contract and `consistency-checker` cover it at
a lower cost.

**`Edit(/docs/decisions/**)` as a deny rule.** It reads as the obvious way to
protect them, but `Edit(...)` rules cover `Write`, so it would also block
creating the next numbered decision — the exact thing the contract requires
every session to be able to do. Hence the hook, which can look at whether the
file already exists, and which asks rather than denies so a legitimate flip to
`status: rejected` still gets through with a keystroke.

**A testing rule for this repo.** There is no test suite and CLAUDE.md rule 4
forbids adding one, so the file would say only "we have no tests".

## Consequences

- **A command rule only wildcards with a space before the star.** `Bash(git
  rebase *)` prefix-matches; `Bash(git rebase*)` is an exact match on a command
  ending in an asterisk, so it can never fire. The npm rule is `Bash(npm *)` for
  the same reason — one prefix rather than a list of subcommands, which leaves no
  gap at `npm i`. `npx` is unaffected.
- **A flag that can move down the line is out of reach.** `git push origin
  --force` matches no prefix rule; catching every form needs the command body,
  which is a hook. Parked in `TODO.md`.
- **The PreToolUse `ask` only asks where something can ask.** In an unattended
  mode it resolves without a human, so the decision-file guard is a checkpoint
  for interactive sessions and a no-op for the rest.
- **The Stop hook passes for the rest of the day** once any line sits under
  today's heading; per-change gaps need the transcript, not mtimes. Parked in
  `TODO.md`.
