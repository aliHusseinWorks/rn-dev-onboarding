import { useEffect, useState } from 'react'

// Where a tool's latest version can be looked up, client-side. All five
// registries send Access-Control-Allow-Origin: * (verified), so this works
// from the static GitHub Pages deployment.
export type VersionSource =
  | { npm: string }
  | { github: string } // owner/repo — latest release tag
  | { brew: string } // Homebrew cask token — for GUI apps with no public release feed
  | { pypi: string }
  | { nodeLts: true }

const TTL_MS = 6 * 60 * 60 * 1000 // 6h — fresh enough, and keeps GitHub's 60/hr anonymous API limit far away
const keyOf = (s: VersionSource): string =>
  'npm' in s
    ? `npm:${s.npm}`
    : 'github' in s
      ? `gh:${s.github}`
      : 'brew' in s
        ? `brew:${s.brew}`
        : 'pypi' in s
          ? `pypi:${s.pypi}`
          : 'node-lts'

// Release tags and cask versions carry extra parts: "v2.55.0.windows.3",
// "3.13.10,4f02290cc", "2026.1.2.11,quail2-patch1" — keep the leading
// dotted-number part.
const dottedPart = (raw: string): string => raw.match(/\d+(\.\d+)+/)?.[0] ?? raw.replace(/^v/i, '')

function readCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(`rn-onboard:ver:${key}`)
    if (!raw) return null
    const { v, t } = JSON.parse(raw) as { v: string; t: number }
    return Date.now() - t < TTL_MS ? v : null
  } catch {
    return null
  }
}

function writeCache(key: string, v: string): void {
  try {
    localStorage.setItem(`rn-onboard:ver:${key}`, JSON.stringify({ v, t: Date.now() }))
  } catch {
    // storage full/blocked — versions just won't cache
  }
}

async function fetchLatest(source: VersionSource): Promise<string | null> {
  try {
    if ('npm' in source) {
      const r = await fetch(`https://registry.npmjs.org/${source.npm}/latest`)
      if (!r.ok) return null
      return ((await r.json()) as { version?: string }).version ?? null
    }
    if ('github' in source) {
      const r = await fetch(`https://api.github.com/repos/${source.github}/releases/latest`)
      if (!r.ok) return null
      const tag = ((await r.json()) as { tag_name?: string }).tag_name ?? null
      return tag ? dottedPart(tag) : null
    }
    if ('brew' in source) {
      // Static JSON, so no rate limit to budget for (unlike GitHub's 60/hr), and
      // it carries the app's own version rather than a repo tag. Casks pinned
      // `version :latest` report the string "latest" — no version to show.
      const r = await fetch(`https://formulae.brew.sh/api/cask/${source.brew}.json`)
      if (!r.ok) return null
      const v = ((await r.json()) as { version?: string }).version
      return v && v !== 'latest' ? dottedPart(v) : null
    }
    if ('pypi' in source) {
      const r = await fetch(`https://pypi.org/pypi/${source.pypi}/json`)
      if (!r.ok) return null
      return ((await r.json()) as { info?: { version?: string } }).info?.version ?? null
    }
    const r = await fetch('https://nodejs.org/dist/index.json')
    if (!r.ok) return null
    const releases = (await r.json()) as Array<{ version: string; lts: string | false }>
    return releases.find((rel) => rel.lts !== false)?.version.replace(/^v/, '') ?? null
  } catch {
    return null // offline / blocked — badge simply doesn't render
  }
}

// De-dupe concurrent lookups (several cards can share a registry hit).
const inFlight = new Map<string, Promise<string | null>>()

export function useLatestVersion(source?: VersionSource): string | null {
  const key = source ? keyOf(source) : null
  const [version, setVersion] = useState<string | null>(() => (key ? readCache(key) : null))

  useEffect(() => {
    if (!source || !key || version) return
    let alive = true
    let p = inFlight.get(key)
    if (!p) {
      p = fetchLatest(source).then((v) => {
        inFlight.delete(key)
        if (v) writeCache(key, v)
        return v
      })
      inFlight.set(key, p)
    }
    void p.then((v) => {
      if (alive && v) setVersion(v)
    })
    return () => {
      alive = false
    }
    // key fully identifies the source
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return version
}
