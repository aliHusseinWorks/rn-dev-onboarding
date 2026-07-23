// Weekly health check for the tool config: every URL must resolve and every
// winget package ID must still exist. Run: npx tsx scripts/check-links.ts
// Hard failures (exit 1): 404/410, DNS errors, missing winget manifests.
// Bot-blocking responses (403/429/timeouts) are warnings — a dead page 404s.
import { TOOLS } from '../src/lib/tools'

const UA = 'Mozilla/5.0 (compatible; rn-dev-onboarding-linkcheck)'

const urls = new Set<string>()
const wingetIds = new Set<string>()
for (const t of TOOLS) {
  if (t.docsUrl) urls.add(t.docsUrl)
  for (const rec of [t.actions, t.secondary]) {
    for (const a of Object.values(rec ?? {})) {
      if (a.type === 'link') urls.add(a.value)
      if (a.type === 'command') {
        for (const hit of a.value.match(/winget install --id ([\w.\-]+)/g) ?? []) {
          wingetIds.add(hit.replace('winget install --id ', ''))
        }
      }
    }
  }
}

const failures: string[] = []
const warnings: string[] = []

async function checkUrl(url: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20000),
    })
    if (res.status === 404 || res.status === 410) {
      failures.push(`URL ${url} -> HTTP ${res.status}`)
    } else if (!res.ok) {
      warnings.push(`URL ${url} -> HTTP ${res.status} (likely bot-blocking; verify manually if repeated)`)
    }
  } catch (e) {
    const msg = String(e)
    if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')) {
      failures.push(`URL ${url} -> DNS failure`)
    } else {
      warnings.push(`URL ${url} -> ${msg}`)
    }
  }
}

// winget IDs map to folders in microsoft/winget-pkgs:
// Publisher.Package[.Sub] -> manifests/<p>/<Publisher>/<Package>[/<Sub>]
async function checkWingetId(id: string): Promise<void> {
  const path = `manifests/${id[0].toLowerCase()}/${id.split('.').join('/')}`
  const headers: Record<string, string> = { 'user-agent': UA }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  try {
    const res = await fetch(`https://api.github.com/repos/microsoft/winget-pkgs/contents/${path}`, {
      headers,
      signal: AbortSignal.timeout(20000),
    })
    if (res.status === 404) failures.push(`winget ${id} -> manifest not found (${path})`)
    else if (!res.ok) warnings.push(`winget ${id} -> HTTP ${res.status} from GitHub API`)
  } catch (e) {
    warnings.push(`winget ${id} -> ${String(e)}`)
  }
}

await Promise.all([...[...urls].map(checkUrl), ...[...wingetIds].map(checkWingetId)])

console.log(`Checked ${urls.size} URLs and ${wingetIds.size} winget IDs.`)
for (const w of warnings) console.log(`WARN  ${w}`)
for (const f of failures) console.log(`FAIL  ${f}`)
if (failures.length > 0) {
  console.log(`\n${failures.length} hard failure(s) — update src/lib/tools.ts.`)
  process.exit(1)
}
console.log('All links healthy.')
