---
paths:
  - "functions/**/*.ts"
  - "src/lib/detect.ts"
  - "src/lib/detectScript.ts"
  - "src/lib/useDetectSession.ts"
  - "src/lib/useLocalStorage.ts"
  - "src/lib/aiSetup.ts"
  - "src/lib/setupPrompt.ts"
---

# Security

This app has three trust boundaries and no auth. Each one has invariants that
must survive the change you're making; `security-reviewer` checks them, but keep
them true in the first place.

## The relay (`functions/report/[code].ts`)

Public, unauthenticated, and writable by anyone who can guess a code — so
correctness here is the whole defence. Its posture is documented in the file
header; a change must keep every part of it:

- Cap the body before parsing it, never after.
- Re-validate every field off the wire against its regex, including the code in the URL path. `JSON.parse` output is `unknown` until each field is checked.
- Reads and writes stay single-use, with a tombstone rather than a delete so a burned code stays burned for its TTL, and everything carries a TTL.
- Never echo the request, a stack trace, or a KV key back in a response body — status codes only.
- The stored report holds tool ids and a platform id. Never widen it into paths, hostnames, usernames, or anything else the scan can see.

## The generated scan script (`src/lib/detectScript.ts`)

Whatever this emits, a developer pastes into their own shell — so an
interpolation bug here is remote code execution on a teammate's machine.

- Only repo-authored constants (`tools.ts` ids and names, `detect.ts` needles and paths) go into the emitted script, always quoted. Never interpolate a value that came from the page: a form field, a URL parameter, a scan result, a clipboard read.
- The script's stated contract is that it sends the one-time code, the platform id and the matched ids, and nothing else. Adding a probe that reads file contents, env vars, or credentials breaks the promise printed in its own header.

## The browser (`src/` ships to everyone)

- No secrets, no tokens, no internal URLs in the bundle. There is no server-side place to hide one, so anything added to `src/` is public.
- Values a user types into a tool modal or the AI setup are for that user's clipboard. They must not reach `localStorage`, the relay, or any `fetch`.
- `localStorage` holds only tool ids, the platform choice and the version cache — all under the `rn-onboard:` prefix — plus the bare `theme` key. Ids arriving from the relay or a pasted result line are whitelisted against the page's own scan list first (`planApply` in `detect.ts`), so nothing off the wire becomes a key.
- The AI setup and team prompts are written to be pasted around a team, so treat their text as published: no machine-specific paths, no names, no anything a colleague shouldn't read.
