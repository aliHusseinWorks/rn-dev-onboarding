# 0046 — Atlassian authenticates with a scoped API token

Date: 2026-08-13 · Status: accepted · Corrects the Atlassian entry in [0021](0021-version-badges-via-homebrew-cask-api.md)

## Context

The Atlassian card pointed at Atlassian's own Rovo MCP server and authenticated
over OAuth 2.1. On the 11th it was corrected twice: the endpoint moved from the
deprecated `/v1/sse` to `/v1/mcp`, and the card stopped naming Bitbucket, because
the consent screen offers Jira, Confluence and Compass and nothing else.

That second correction is the problem this replaces rather than documents. Rovo's
Bitbucket tools authenticate by API token, and an organisation that has not
enabled that route gets no Bitbucket at all — observed directly, on a consent
screen with three checkboxes and no Bitbucket among them. No amount of
re-authenticating changes it, and it is not the reader's to change.

## Decision

The card installs three stdio servers, one per product, each authenticating with
a scoped Atlassian API token held in `~/.claude.json`:
`@aashari/mcp-server-atlassian-{jira,confluence,bitbucket}`.

A token authenticates as the user against the plain REST API, so organisation
gating of Rovo does not apply. It is also the only route left for Bitbucket at
all: app passwords were removed on 28 July 2026, after brownouts through that
month, and the pages older guides link to now 404.

**What this gives up, stated rather than glossed.** Three unofficial packages by a
single maintainer replace one first-party server, and the token they hold has
write scope across Jira, Confluence and Bitbucket. The Bitbucket server exposes
generic REST verbs rather than typed tools, which keeps the tool count small but
means the model composes API calls. Three servers at user scope also load in every
project, which is the cost [0043](0043-mcp-scope-follows-the-servers-subject.md)
exists to notice.

Offering both routes in one modal was considered and rejected as the reader's
call, not ours to hedge: an org that has enabled Rovo's Bitbucket does not need
this card's extra steps, but a reader cannot tell which they are until the consent
screen shows them, and by then they have already run the wrong command.

**The reason the source guide gives is wrong, and worth naming so it is not
re-derived.** It argues tokens are necessary because an OAuth grant does not
survive a restart. That is the wrong mechanism: this machine's Rovo connector
stayed connected across restarts for days, and the one server that did report
"needs authentication" was a different integration that had never been
authenticated at all. But the instinct was not baseless — the same connector later
answered `requires re-authorization (token expired)`, so an OAuth grant does lapse
on its own schedule where a token in `~/.claude.json` does not. The argument for a
token is organisation gating first, then one fewer thing to renew; not that a grant
fails to survive a restart.

## Consequences

The detect needle matches `mcp-server-atlassian` rather than a server key, because
the card installs between one and three servers and any of them should tick it. A
needle on `"jira"` would read red for someone who only wanted Bitbucket. The
package name is in the stored `args` for all three.

**Only the `-e` flags come after the server name.** `-e` takes repeated values, so
`claude mcp add --scope user -e … -e … jira --` reads the name as one more
environment variable and fails with `Invalid environment variable format: jira`.
`--scope user` still precedes the name, as it does on all ten neighbouring cards —
an earlier draft of this file claimed the whole flag block had to move, which is
wrong and was corrected after running both forms against the CLI. A tooltip on the
step carries the narrow rule.

**The card is `inScript: false`.** The three commands are `alt` siblings, and
`aiSetup.ts` drops every `alt` step, so with the card's `actions` gone the generated
machine-setup prompt emitted no command at all for it — three `[HUMAN]` lines, one
of which tells an agent to have the user mint a write-scoped token, with nothing to
run. The likely outcome is the agent asking for the token in chat and composing its
own command, which puts a live credential with write access to three products into
a session transcript. Leaving the card out of that prompt is the honest answer
anyway: minting a scoped token happens in a browser and no prompt can do it, which
is the same reason the four cards in
[0043](0043-mcp-scope-follows-the-servers-subject.md) left it. Step 2 also says out
loud that these are run by hand and the token does not belong in a chat.

**A version badge, against 0021's Atlassian exclusion.** That decision excluded
these cards because "these cards register a hosted URL … it would be a badge about
the wrong artifact". True of the Rovo endpoint, false now: the reader installs an
npm package, so the badge points at a real artifact. It tracks the Bitbucket
package, the same one `docsUrl` does; the three release together.

A hostile field value cannot escape its quoting: the three credential tokens sit
inside single quotes with `shellQuoted`, and `sh` parses a value containing `'`,
`;` and `rm -rf ~` as one argument. Verified by handing the filled command to
`sh -c` with the verb replaced by `printf`.

**`requireFields` is not used, and the reason generalises.** It was tried, on the
email and the token, and it hid every step — including step 1, which is where the
token comes from. The rendered card asked for "the API token from step 1" with step
1 invisible: a value gated behind a step that only that step can tell you how to
get. Any card whose first step produces one of its own field values cannot gate on
that value.

**The three products are three visible commands, not a picker.** A `kind: 'choice'`
field was tried too. It cannot be substituted into a command
([0034](0034-modal-modes-are-a-choice-field.md)), so each product needs its own
gated step anyway — and choice fields render *after* the text inputs, so a picker
that decides whether the site box is needed sits below the site box. Three
commands show the real package names, need no state, and hide nothing. Bitbucket's
simply omits `ATLASSIAN_SITE_NAME` rather than passing an empty one.

All three sit as `alt` siblings under one numbered step rather than taking numbers
2, 3 and 4, which would have read as a sequence when any one of them works alone.
The first attempt left Bitbucket at the numbered level with the other two indented
beneath it — inconsistent rather than grouped, and visibly misaligned. Measured
after the change: all three command blocks share a left edge.

The site box therefore shows for everyone, labelled for the two products that use
it. A Bitbucket-only reader sees one field they can leave alone, which is cheaper
than the machinery that would hide it.

Every `note` is a short label rather than a caveat, because the note is what
renders beside the step number while the command renders in the box below it.
Putting the caveat in the note read as "1 Shown once, so copy it before leaving
the page" with the actual instruction underneath, which only looked wrong once the
page was rendered rather than reasoned about. The caveats moved to tooltips.

Yesterday's endpoint correction is now moot for this card, which no longer talks
to `mcp.atlassian.com` at all. It stays in the changelog as the record of what was
true that day.
