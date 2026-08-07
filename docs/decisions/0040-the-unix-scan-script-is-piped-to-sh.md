# 0040 — The unix scan script is piped to sh

Date: 2026-08-07 · Status: accepted

## Context

[0001](0001-detect-installed-tools-via-scan-script.md) settled that detection
works by handing the user a script to paste; this is about what "paste" turned
out to mean on macOS.

The macOS/Linux scan script failed on paste while the PowerShell one was fine.
The reported symptom was one line:

```
zsh: event not found: /bin/sh
```

The real count was 34. It is a `/bin/sh` script, but it is pasted into an
*interactive* shell, and macOS ships zsh, where two things the script relies on
are not inert:

- `!` is history expansion, so `#!/bin/sh` alone fails with the error above.
- `#` is not a comment unless `interactive_comments` is set, and it is not set by
  default — so all 33 comment lines produce `zsh: command not found: #`.

The checks still ran, which is why it looked like one cosmetic complaint rather
than a broken paste: the result line appeared underneath 34 errors. Fixing only
the shebang would have left 33.

## Decision

The unix script is emitted wrapped in a quoted heredoc and piped to `sh`:

```sh
sh <<'RN_SCAN'
#!/bin/sh
…
RN_SCAN
```

A quoted delimiter makes the whole body literal to the outer shell, so nothing
inside needs escaping for zsh's benefit and the per-check comments — which the
script exists to be read for, per its own header — survive intact. The same text
still works as a downloaded file via `sh scan.sh`.

Rejected: dropping the shebang (fixes 1 of 34); stripping the comments (they are
the transparency artifact); telling the reader to `setopt interactive_comments`
first (a second instruction to get the first one to work).

**PowerShell stays unwrapped.** The bug does not exist there — `#` is a comment
and `!` is not history expansion — and every alternative is worse: `-EncodedCommand`
is a base64 blob, which defeats a script whose header tells you to read each check,
and piping is actively wrong because the script ends on `Read-Host` and would eat
its own body from stdin.

## Consequences

Every interpolated value now passes through `flatten` before quoting. Single
quotes contain `'`, `$` and backticks but not a line break, and the heredoc is
what made a break dangerous: a value carrying a line equal to `RN_SCAN` closes
the heredoc early and hands the remainder to the user's *interactive* shell
rather than the child `sh` — arbitrary execution at their privilege, after a
plausible-looking scan has already printed. Not reachable with repo-authored
values, but "no value contains a newline" was an unenforced invariant, and
`security-reviewer` demonstrated it with a working proof of concept. `flatten`
also covers the two comment lines, which are interpolated outside any quoting in
both generators, where a newline escapes `#` on either shell.

Two behaviour changes worth knowing. The body now runs in a child `sh` seeing
only exported environment, so `command -v` no longer finds interactive shell
functions or aliases; PATH is exported, so path-based detection is unaffected,
and a tool provided purely as a function reads as missing — the safe direction.
And the "pure POSIX sh" claim in the generator's own header is now true, where
before the script was in fact being interpreted by zsh.

The heredoc also makes stdin a live trap for future edits: anything added to the
unix script that reads stdin would consume its own remaining lines. Nothing does
today.
