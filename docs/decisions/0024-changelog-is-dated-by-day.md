# 0024 — The changelog is dated by day

Date: 2026-07-27 · Status: accepted · Supersedes the changelog half of [0004](0004-living-docs-system.md)

## Context

Four days in, 41 of the changelog's 43 entries sat in one undated section, while a
`## 2026-07-24` section with commit SHAs sat unused at the bottom — two
conventions in one file. With no date anchors nothing enforced the "newest first"
the header claimed, so each session appended wherever it landed. By the end that
one section held Added, Changed, Fixed, Removed and then a *second* Changed,
because the first had scrolled too far from the top for the next writer to find
it.

Keep-a-Changelog's release sections don't fit this project either way: site and
relay deploy to Cloudflare Pages on every push to `main`
([0005](0005-deploy-via-cloudflare-git-integration.md)), so a change is live
minutes after it is written and there is no release event to file it against.

## Decision

Date sections by day, newest first, `### Added / Changed / Removed / Fixed` in
that order inside each. Write the line under today's date as part of the change,
creating the heading if today has none.

Filing once, when the entry is written, leaves no second step to forget — which is
what went wrong before. A "file it, then move it when it ships" rule was in force
for four days and moved nothing.

The 41 piled entries were re-dated rather than left in a labelled block: at four
days and ten commits, `git log -S` on distinctive strings could place each one
against the commit that shipped it, and that mapping only gets harder from here.
Dates mean the day the change reached `main`, which is also the day it deployed.
Where a decision file predates its code by a day (0008, 0010, 0011, 0012 among
them), the changelog follows the commit and the decision keeps its own date.

## Consequences

Work built today and pushed tomorrow is filed under today. For a repo that pushes
same-day that is noise, and the alternative is the graduation step that already
failed.

The team setup prompt in `src/lib/setupPrompt.ts` was handing other repos the same
convention it gave this one, so it scaffolds dated sections now too. Nothing has
been generated from that prompt yet — this is preventive, not a migration.
