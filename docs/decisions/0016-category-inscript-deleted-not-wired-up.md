# 0016 — `Category.inScript` is deleted, not wired up

Date: 2026-07-26 · Status: accepted · Amends the `inScript` note in 0014

## Context

0014 said `checkable` is orthogonal to `inScript` and that `mcp` keeps
`inScript: false`. It does not, in any sense that matters: `Category.inScript`
was never read. `aiSetup.ts:94` reads the per-tool `t.inScript`, and nothing
anywhere reads the category field. MCP servers have always reached the AI setup
and the section's Copy all, and the flag sat in the type reading as though it
prevented that.

Two ways out: honour the flag, or delete it.

## Decision

Delete it. MCP servers *belong* in the AI setup — `claude mcp add --transport
http … ` is a command the agent can run as well as any `brew install`, and the
generated prompt has been shipping them since 0007 with nobody objecting. The
flag encoded an intention that turned out to be wrong, so honouring it would
have been a regression dressed as a bugfix.

The per-tool `t.inScript` stays and keeps its two users (`rn-init`, `rn-doctor`)
— that one is read and does work.

## Consequences

The `mcp` category loses `inScript: false`; behaviour is unchanged, because the
flag never did anything. The AI setup still emits four groups per platform.

The wider lesson is the one worth keeping: a config flag with no reader is worse
than no flag, because the next person reasons from the type instead of the call
graph. Grep for a reader before believing a field.
