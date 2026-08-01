import { checksFor, describeChecks, DETECT_SPECS, detectGroups, RESULT_PREFIX, type DetectCheck } from './detect'
import { PLATFORM_INFO, type PlatformId } from './platform'

// Relay endpoint. The relay deploys with the site as a Cloudflare Pages
// Function (functions/report/[code].ts), so the page talks to its own
// origin — no configuration anywhere. Outside a browser (SSR, node) it is
// undefined and the modal falls back to manual-paste mode: the script skips
// the POST and the user pastes the RN-ONBOARD/1 line instead.
export const DETECT_ENDPOINT: string | undefined =
  typeof location !== 'undefined' ? location.origin : undefined

// One-time pairing code: 12 chars of [a-z0-9] via rejection sampling
// (~62 bits), matching the worker's ^[a-z0-9]{10,32}$.
export function makeSessionCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  while (code.length < 12) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    for (const b of bytes) {
      // 252 = largest multiple of 36 below 256 — reject above it to avoid bias
      if (b < 252 && code.length < 12) code += alphabet[b % 36]
    }
  }
  return code
}

const REPORT_FAIL_MSG = 'Could not report automatically - paste the RN-ONBOARD/1 line above into the page.'
const REPORT_OK_MSG = 'Reported - switch back to the browser tab.'

interface ScanTarget {
  id: string
  name: string
  how: string
  checks: DetectCheck[]
}

function scanTargets(platform: PlatformId): ScanTarget[] {
  const os = PLATFORM_INFO[platform].os
  return detectGroups(platform)
    .flatMap((g) => g.tools)
    .map((t) => ({
      id: t.id,
      name: t.name,
      how: describeChecks(DETECT_SPECS[t.id], os),
      checks: checksFor(DETECT_SPECS[t.id], os),
    }))
}

function header(platform: PlatformId, code: string): string[] {
  const lines = [
    `# RN dev setup - installed-tool scan for ${PLATFORM_INFO[platform].label}`,
    '# Checks ONLY the tools listed below (read them - each check is one line).',
  ]
  if (DETECT_ENDPOINT) {
    lines.push(
      `# The ONLY data sent: one-time code ${code}, platform id "${platform}",`,
      '# and the ids of tools found. The code works once; the result is kept 10 minutes.',
    )
  } else {
    lines.push('# Nothing is sent anywhere - paste the RN-ONBOARD/1 result line back into the page.')
  }
  return lines
}

// mac + linux. Pure POSIX sh so one script serves zsh (mac default) and bash:
// no arrays, no [[ ]], no set -e (a missing tool must not abort the scan),
// no globs in [ -e ] tests (zsh NOMATCH aborts unmatched globs).
function unixScript(platform: PlatformId, targets: ScanTarget[], code: string): string {
  const expand = (p: string) => (p.startsWith('~/') ? `$HOME/${p.slice(2)}` : p)
  const lines = [
    '#!/bin/sh',
    ...header(platform, code),
    'FOUND=""; IDS=""',
    `ok() { FOUND="$FOUND,$1"; IDS="$IDS,\\"$1\\""; printf '  [x] %s\\n' "$1"; }`,
    `no() { printf '  [ ] %s\\n' "$1"; }`,
    'has() { command -v "$1" >/dev/null 2>&1; }',
    'has_cfg() { [ -f "$HOME/.claude.json" ] && grep -qF "$1" "$HOME/.claude.json" 2>/dev/null; }',
    'has_plugin() { [ -f "$HOME/.claude/settings.json" ] && grep -qF "$1" "$HOME/.claude/settings.json" 2>/dev/null; }',
    '',
  ]
  for (const t of targets) {
    const conds = t.checks.map((c) => {
      if (c.kind === 'bin') return `has ${c.value}`
      if (c.kind === 'config') return `has_cfg '${c.value}'`
      if (c.kind === 'plugin') return `has_plugin '${c.value}'`
      return `[ -e "${expand(c.value)}" ]`
    })
    lines.push(`# ${t.name} - ${t.how}`)
    lines.push(`if ${conds.join(' || ')}; then ok ${t.id}; else no ${t.id}; fi`)
  }
  lines.push('', 'FOUND="${FOUND#,}"; IDS="${IDS#,}"', `printf '${RESULT_PREFIX} %s\\n' "$FOUND"`)
  if (DETECT_ENDPOINT) {
    lines.push(
      `PAYLOAD="{\\"v\\":1,\\"platform\\":\\"${platform}\\",\\"found\\":[$IDS]}"`,
      `URL="${DETECT_ENDPOINT}/report/${code}"`,
      'SENT=1',
      'if command -v curl >/dev/null 2>&1; then',
      `  curl -fsS -m 10 -H 'Content-Type: application/json' -d "$PAYLOAD" "$URL" >/dev/null 2>&1 && SENT=0`,
      'elif command -v wget >/dev/null 2>&1; then',
      `  wget -q -T 10 -O /dev/null --header='Content-Type: application/json' --post-data="$PAYLOAD" "$URL" 2>/dev/null && SENT=0`,
      'fi',
      `if [ "$SENT" -eq 0 ]; then echo '${REPORT_OK_MSG}'; else echo '${REPORT_FAIL_MSG}'; fi`,
    )
  }
  return lines.join('\n')
}

// Windows. PowerShell 5.1-compatible: no && / || chains, no ternary,
// ArrayList instead of += array copies, JSON built by string concat
// (5.1's ConvertTo-Json unwraps single-element arrays), Invoke-RestMethod
// (5.1 aliases curl to Invoke-WebRequest), explicit TLS 1.2 opt-in.
// Every statement must also fit on ONE line: the console runs a paste line by
// line, but an unclosed brace switches it to the >> continuation prompt, where
// it buffers the rest of the script and waits for a blank line that a paste
// never contains.
function psScript(platform: PlatformId, targets: ScanTarget[], code: string): string {
  const lines = [
    ...header(platform, code),
    '$found = New-Object System.Collections.ArrayList',
    "function Test-Bin($n) { [bool](Get-Command $n -ErrorAction SilentlyContinue) }",
    'function Test-Appx($n) { try { [bool](Get-AppxPackage -Name $n -ErrorAction SilentlyContinue) } catch { $false } }',
    'function Test-Cfg($n) { (Test-Path "$env:USERPROFILE\\.claude.json") -and (Select-String -Path "$env:USERPROFILE\\.claude.json" -Pattern $n -SimpleMatch -Quiet) }',
    'function Test-Plugin($n) { (Test-Path "$env:USERPROFILE\\.claude\\settings.json") -and (Select-String -Path "$env:USERPROFILE\\.claude\\settings.json" -Pattern $n -SimpleMatch -Quiet) }',
    'function Ok($id) { [void]$found.Add($id); "  [x] $id" }',
    'function No($id) { "  [ ] $id" }',
    '',
  ]
  for (const t of targets) {
    const conds = t.checks.map((c) => {
      if (c.kind === 'bin') return `(Test-Bin '${c.value}')`
      if (c.kind === 'appx') return `(Test-Appx '${c.value}')`
      if (c.kind === 'config') return `(Test-Cfg '${c.value}')`
      if (c.kind === 'plugin') return `(Test-Plugin '${c.value}')`
      return `(Test-Path "${c.value}")`
    })
    lines.push(`# ${t.name} - ${t.how}`)
    lines.push(`if (${conds.join(' -or ')}) { Ok '${t.id}' } else { No '${t.id}' }`)
  }
  lines.push('', `"${RESULT_PREFIX} $($found -join ',')"`)
  if (DETECT_ENDPOINT) {
    lines.push(
      `$ids = ($found | ForEach-Object { '"' + $_ + '"' }) -join ','`,
      `$body = '{"v":1,"platform":"${platform}","found":[' + $ids + ']}'`,
      `try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; Invoke-RestMethod -Method Post -Uri '${DETECT_ENDPOINT}/report/${code}' -ContentType 'application/json' -Body $body -TimeoutSec 10 | Out-Null; '${REPORT_OK_MSG}' } catch { '${REPORT_FAIL_MSG}' }`,
    )
  }
  // `exit` closes the console itself, not just the script — the results are the
  // whole point of the run, so the window holds until it is dismissed rather
  // than vanishing or being left behind. The prompt is written separately
  // because Read-Host appends ': ' to one it is given.
  lines.push('', `Write-Host 'Press Enter to close...' -NoNewline; Read-Host | Out-Null; exit`)
  return lines.join('\n')
}

export function generateDetectScript(platform: PlatformId, code: string): string {
  const targets = scanTargets(platform)
  const script =
    PLATFORM_INFO[platform].os === 'win'
      ? psScript(platform, targets, code)
      : unixScript(platform, targets, code)
  // Trailing newline: a pasted last line without one just sits at the prompt
  // unexecuted, so the report step would never run.
  return `${script}\n`
}
