# 0043 — MCP scope follows the server's subject

Date: 2026-08-11 · Status: accepted · Supersedes the every-card half of [0036](0036-mcp-servers-register-at-user-scope.md)

## Context

[0036](0036-mcp-servers-register-at-user-scope.md) put `--scope user` on all
eleven MCP cards. Its core finding stands and is not in question: the flag
defaults to `local`, nothing prompts, and a card pasted into whatever terminal was
open silently registers a server against that directory. That is still the bug to
avoid.

Its second claim is the one that was too broad — *"`project` was never a
candidate"* — argued from what a machine-setup checklist means by installed
rather than from what each server is about. The same decision already concedes the
confined case is "rare, deliberate, and its own decision".

It turns out not to be rare. Four of the eleven servers are about a repo, not
about a machine: XcodeBuildMCP and Android Dev only apply inside a mobile repo,
and Sentry and Firebase point at one specific app's crash data. Registered at user
scope they load in every session in every project — this repo is a web app, and
XcodeBuildMCP and Android Dev were loading 53 tools of iOS and Android tooling
into it that nothing here will ever call. That is the same cost the Zoho card
already ran into from the other direction, where a server exposing 302 actions was
its own problem.

## Decision

Scope follows the server's subject.

**`user`** — the server is about you or your company and applies everywhere:
Context7, Atlassian, Slack, Zoho Cliq, Teams, Postman.

**`project`** — the server is about one repo: XcodeBuildMCP, Android Dev, Sentry,
Firebase. These four now carry `--scope project`, which writes a committed
`.mcp.json`, so a teammate who clones gets them — the same argument
[0041](0041-argent-is-a-repo-scoped-card-not-an-mcp-one.md) makes for Argent's
`--local`.

**`local`** — never on a card. It is the silent default 0036 exists to stop.

Figma stays at `user` despite being project-shaped, because it is scoped to a
design file rather than a repo and there is no reliable mapping between the two.

Two changes follow, and neither is optional — a scope flag alone would have been
worse than the bug 0036 fixed:

**The four leave the machine-setup prompt** (`inScript: false`). The prompt runs
before any repo is cloned, so `--scope project` from the agent's scratch directory
would create a `.mcp.json` in the scratch directory: 0036's failure exactly, in a
different file. Their cards now say to run them inside the repo.

**The four lose their `DETECT_SPECS` entries.** Detection matched a needle in
`~/.claude.json`; a project-scoped server is defined in the repo's `.mcp.json`,
which the scan never sees. Left in place, the needle would have gone from ticking
green wrongly to sitting red permanently — a worse failure, because it is
indistinguishable from not having installed the thing.

## Consequences

Four cards in a `checkable` category can no longer be ticked by the scan, so the
MCP section's count no longer reaches full from a scan alone; those four are
ticked by hand like any per-project step. Accepted: the alternative is a needle
that cannot match.

A project-scoped server prompts each developer for approval on first load.
`enableAllProjectMcpServers`, or naming them in `enabledMcpjsonServers`, settles
it per machine. 0036 counted this against `project` and it is a real cost — it is
simply smaller than loading a mobile toolchain into every unrelated repo.

Anyone who genuinely wants one of the four machine-wide swaps the flag by hand.
That is now the deviation, where before it was the default.

This also frames the overlap with Argent rather than resolving it. Argent covers
what XcodeBuildMCP and Android Dev do on a simulator, and adds what neither can —
network capture at the JS and native layers, the React component tree, profiling —
while both keep things Argent has no answer for: real `xcodebuild` builds, tests
and coverage; Metro's lifecycle; physical devices. Running all three in one repo
means three overlapping tool sets competing to answer the same request, which is
the routing failure `docs/argent-guide.md` already records against raw
`adb logcat`. Scoping these four to the repo at least confines that competition to
the repo where it is deliberate. Which of them survive alongside Argent is not
settled here and wants its own decision, taken after Argent has been run against a
real project rather than before.
