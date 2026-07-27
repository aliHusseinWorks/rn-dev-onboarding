# 0029 — herdr session persistence is an integration step, not a config write

Date: 2026-07-27 · Status: accepted

## Context

The herdr card told the reader that "herdr reopens the workspaces it saved
itself, so the launcher only has to start it". Diagnosed on a machine where it
plainly wasn't happening: after a reboot all three tabs returned with their
custom names and their working directories, and all three were bare shells. Every
conversation had to be found again through `/resume`.

The claim is half right, and the half it gets wrong is the half people care
about. herdr persists a workspace to `session.json`, but a pane's entry there is
just its `cwd` — no command, no agent, nothing to relaunch. Its own docs draw the
line: native agent resume "applies only to panes with valid native session
references from official integrations. Other panes restore as standard shells."

Three ways to close it were weighed.

**Write `session.resume_agents_on_restore = true` into `config.toml`** — done
first, on the real machine, and it is a no-op: the key already defaults to `true`.
It also would have been the only step on any card needing a per-OS config path
(`~/.config/herdr/config.toml` on macOS and Linux, `%APPDATA%\herdr\config.toml`
on Windows), so the wrong fix was also the most expensive one to ship. Rejected.

**Write the config from `herdr-launcher.ps1`/`.sh`** — rejected on the launcher's
stated contract, "Creates one shortcut to herdr carrying its own icon. Nothing
else is touched." A script that also edits a config file somewhere else is a
different script, and [0010](0010-hosted-launcher-script-and-image-fields.md)
kept it deliberately narrow.

**`herdr integration install claude`** — the actual mechanism. It installs the
SessionStart hook that reports each pane's Claude session id back to herdr, which
is what puts an `agent_session` alongside the `cwd` in `session.json` and what
restore replays. Chosen.

## Decision

One step, first in the herdr card, `command` as a bare string so it applies to
all five platforms — the herdr CLI is identical everywhere, which is why this is
the rare cross-platform step with no variant at all.

It is **not** `docsOnly`, unlike every other step on that card. The launcher steps
are an optional desktop convenience; this one is machine setup that has to happen
once, so it belongs in the generated AI setup prompt rather than in prose the
reader may skip. `prereq` gained Claude Code, since the integration writes into
`~/.claude/settings.json` and silently has nothing to install into without it.

The intro's "workspaces" became "tabs and folders" and now names what the
integration adds, so the sentence stops overpromising on its own.

**It goes first even though the card's two fields feed the launcher step below
it**, which looks wrong in the modal — fields render above every step, so
`Install to` and `Custom icon` sit over a step that ignores them. Moving the
integration last would have fixed the adjacency and buried the only step that
isn't optional, and the only one the AI setup runs. The precedent settles it:
`fnm` already shows a `Node version` field above five steps whose first two
ignore it. So the fix is the intro, which now names both jobs in the order the
steps appear instead of describing only the launcher. It deliberately says
nothing about which step the fields feed: they are labelled `Install to` and
`Custom icon`, and the launcher's own note already opens with "Both fields are
optional".

Splitting the integration onto its own card was considered and dropped: it is
herdr configuration, it needs herdr installed, and a card that installs nothing
would need `checkable: false` and a detect spec exception to avoid reporting
everyone as unfinished.

## Consequences

Verified end to end on Windows rather than reasoned about: with the integration
active, a pane's ref reaches `session.json`, and after a full OS restart the pane
came back inside its conversation with a new `terminal_id` against the same
session id. Note this contradicts herdr's own "Session state" page, which says
native resume survives a server restart and not a machine reboot — on
0.7.5-preview it survives both. The card describes the observed behaviour.

**One conversation per pane, which the step's note has to say** because nothing
enforces it. Resuming the same session in two panes makes them compete for one
ref: only one survives to disk, so after a restart that conversation reappears in
whichever pane won and the other is a bare shell — it reads exactly like a chat
moving between tabs. Two Claude processes appending to one transcript is the
worse half of the same mistake. `--fork-session` is the way to put a second pane
on an existing conversation.

The detect scan still only answers whether herdr is on `PATH`
(`herdr: { bins: ['herdr'] }`). A machine with herdr installed and the
integration missing — the exact state that produced this — ticks the card as
done. Parked in `docs/TODO.md`; a spec matching `HERDR_INTEGRATION_ID` in
`~/.claude/hooks/` would catch it, at the cost of a per-tool needle for
something that isn't a tool.
