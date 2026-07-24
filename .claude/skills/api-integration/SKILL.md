---
name: api-integration
description: Add a network call using the project's existing bare-fetch pattern from src/lib/versions.ts. Use for any "fetch data / call an API / add an endpoint" request.
---

# Adding an API call in this repo

There is no API client, no axios, no fetch wrapper — and you must not create one. The entire network surface of this app is `src/lib/versions.ts` (client-side version lookups against public registries). That file **is** the pattern; extend it or copy its shape into a sibling `src/lib/` module.

This is a static site on GitHub Pages: any endpoint you call must send permissive CORS headers (`versions.ts` documents that all four registries were verified to do so — verify yours the same way and say so in a comment if non-obvious).

## The pattern, from `versions.ts`

- Plain `fetch` inside a module-level `async function`, wrapped in `try { … } catch { return null }`. Check `r.ok` before parsing. Type the JSON with an inline cast on exactly the fields used: `((await r.json()) as { version?: string }).version ?? null`.
- Failure is silent degradation, never an error state: return `null` and let the UI simply not render the data. No toasts, no error boundaries, no retry loops.
- Cache in `localStorage` under an `rn-onboard:`-prefixed key with a TTL timestamp, both read and write wrapped in try/catch (private mode / quota).
- De-dupe concurrent requests with a module-level `Map<string, Promise<…>>` of in-flight lookups when multiple components can trigger the same call.
- Expose to components as a hook (`useLatestVersion`) that seeds state from cache, fetches in `useEffect` with an `alive` flag for unmount, and returns the value or `null`. Components never call `fetch` themselves.

## Hard rules

- Never add a dependency for networking (no axios, ky, swr, react-query).
- Never build a "generic" apiClient/http.ts abstraction — one purpose-built module per data source, like `versions.ts`.
- No API keys or secrets: everything ships in a public static bundle. Anonymous, public endpoints only; respect their rate limits with caching and a generous TTL, as the 6-hour TTL comment in `versions.ts` does for GitHub's 60/hr anonymous limit.
