# 0036 — MCP servers register at user scope

Date: 2026-08-07 · Status: accepted · its every-card claim is narrowed by [0043](0043-mcp-scope-follows-the-servers-subject.md)

## Context

A real run of the AI setup registered all seven MCP servers from a scratch
directory, because that is where the agent's shell happened to be. Every one
landed scoped to that directory and was invisible from the repo the user
actually works in; they had to be removed and re-added.

`claude mcp add` never asks. Its scope is a flag defaulting to `local`, and the
same is true of `add-json` and `add-from-claude-desktop` — there is no
interactive add path in the CLI at all:

```
-s, --scope <scope>   Configuration scope (local, user, or project)
                      (default: "local")
```

The only feedback is the word "local" inside the success line, so a reader
copying a card into whatever terminal is open has no signal that anything went
wrong. It is the worst shape a card can have: the command succeeds, the tool
reports itself installed, and it does not work where the user needs it.

This also made the detect scan lie. `DETECT_SPECS` finds MCP servers with a
`claudeConfig` needle in `~/.claude.json`, and a directory-scoped server writes
into that same file — so the card ticked green for a server that would not load
in the user's project.

## Decision

Every `claude mcp add` on every card carries `--scope user`.

`project` was never a candidate: it writes a committed `.mcp.json` and each
server then waits on per-project approval, which is not what a machine-setup
checklist means by installed. `user` is the only scope where adding a server once
makes it available everywhere, which is the promise the card is making.

## Consequences

Anyone who genuinely wants a server confined to one repo now has to drop the
flag by hand. That is the right way round — the confined case is rare, deliberate,
and its own decision, whereas the machine-wide case is what every card here
implies.

The detect scan needs no change: the needle matches either way, and now it agrees
with what the card installed.
