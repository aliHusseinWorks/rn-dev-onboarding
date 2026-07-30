---
name: fix-bug
description: Reproduce a bug by reading the code, propose the minimal fix, implement the smallest possible diff. Use for any "this is broken / doesn't work / wrong behavior" request.
argument-hint: <bug description>
---

# Fixing a bug in this repo

The bug: $ARGUMENTS

Follow CLAUDE.md's six rules. Process:

**1. Reproduce in the code.** Trace the reported behavior through the actual source — start from `src/App.tsx` and follow the data (`src/lib/tools.ts` → `commands.ts` → components). State precisely which lines produce the wrong behavior and why. If the trace doesn't confirm the report, say so and ask before changing anything.

**2. Propose the minimal fix.** The smallest change, in the fewest files, that corrects the behavior. If a data entry in `tools.ts` is wrong, fix the data — not the UI. No drive-by cleanups, no refactors, no hardening of code the bug didn't touch.

**3. Implement.** Apply exactly that diff, matching the surrounding style (no semicolons, single quotes, token classes, existing error-handling shape). No regression tests unless explicitly asked — this project has no test suite. Verify with `pnpm lint` and `pnpm build`, and confirm the fixed path by reasoning through the code (or `pnpm dev` if runtime confirmation is warranted). Report what was wrong, what changed, and the verification result.
