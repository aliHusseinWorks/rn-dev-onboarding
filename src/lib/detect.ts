import { isAvailable, toolsInCategory } from './commands'
import { PLATFORM_INFO, type PlatformId } from './platform'
import { CATEGORIES, type Tool } from './tools'

// A web page can't see what's installed — browsers sandbox that. Detection
// works like the setup script in reverse: we generate a scan script the user
// pastes into their terminal; it checks each tool locally, reports back to a
// tiny relay (functions/report/[code].ts) the page is polling, and also
// prints a RN-ONBOARD/1 fallback line the user can paste manually.

export type OsId = 'mac' | 'win' | 'linux'

// How to tell a tool is installed. Any matching signal counts.
export interface DetectSpec {
  // Executables looked up on PATH (command -v / Get-Command), any OS.
  bins?: string[]
  // Replaces `bins` on Windows (e.g. Homebrew's Windows twin is Chocolatey).
  winBins?: string[]
  // Install locations, any-of per OS. mac/linux entries are literal paths
  // ('~' allowed, NO globs — zsh aborts on an unmatched glob before running
  // the command); Windows entries may use $env: tokens and wildcards
  // (Test-Path globs natively).
  macPaths?: string[]
  winPaths?: string[]
  linuxPaths?: string[]
  // MSIX/Store package name (Get-AppxPackage) — Windows only.
  winAppx?: string
  // Substring searched in ~/.claude.json (fixed-string match) — how MCP
  // servers are detected. Usually the quoted server key, because the card
  // dictates the name; a card that lets the reader name the server has to match
  // something the reader cannot change, such as the vendor's host.
  claudeConfig?: string
  // Plugins are read from ~/.claude/settings.json instead: ~/.claude.json only
  // gains an entry for a plugin once it has been used, so a fresh install reads
  // as missing there.
  claudePlugin?: string
}

// Detection config lives here, not on the Tool, so tools.ts stays a pure
// "what to install" table. Tools without an entry are simply left out of the
// scan: per-project prompts, and the MCP servers that register at project scope,
// whose .mcp.json lives in a repo a home-directory scan never sees.
export const DETECT_SPECS: Record<string, DetectSpec> = {
  homebrew: { bins: ['brew'], winBins: ['choco'] },
  git: { bins: ['git'] },
  // Deliberately NOT fnm: fnm on PATH with no version installed/defaulted
  // would report node as present when `node` itself resolves to nothing.
  node: { bins: ['node'] },
  npm: { bins: ['npm'] },
  corepack: { bins: ['corepack'] },
  pnpm: { bins: ['pnpm'] },
  yarn: { bins: ['yarn'] },
  watchman: { bins: ['watchman'] },
  cocoapods: { bins: ['pod'] },
  // Deliberately NOT `bins: ['javac']`: checks are any-of, and javac says
  // nothing about which Java it is, so a machine with only JDK 21 ticked this
  // card green and then failed its first Gradle build on the exact mismatch the
  // card warns about. Only version-pinned paths can answer "is 17 here", so a
  // 17 installed somewhere unlisted (Corretto, SDKMAN, jenv) reads as missing —
  // the safe direction, since the fix is re-running an idempotent install.
  jdk: {
    macPaths: [
      '/Library/Java/JavaVirtualMachines/zulu-17.jdk',
      '/Library/Java/JavaVirtualMachines/temurin-17.jdk',
      '/Library/Java/JavaVirtualMachines/microsoft-17.jdk',
    ],
    winPaths: [
      '$env:ProgramFiles\\Microsoft\\jdk-17*',
      '$env:ProgramFiles\\Eclipse Adoptium\\jdk-17*',
      '$env:ProgramFiles\\Zulu\\zulu-17*',
    ],
    linuxPaths: ['/usr/lib/jvm/java-17-openjdk-amd64', '/usr/lib/jvm/java-17-openjdk-arm64', '/usr/lib/jvm/java-17-openjdk'],
  },
  'ssh-key': {
    macPaths: ['~/.ssh/id_ed25519.pub'],
    winPaths: ['$env:USERPROFILE\\.ssh\\id_ed25519.pub'],
    linuxPaths: ['~/.ssh/id_ed25519.pub'],
  },
  vscode: {
    bins: ['code'],
    macPaths: ['/Applications/Visual Studio Code.app'],
    winPaths: ['$env:LOCALAPPDATA\\Programs\\Microsoft VS Code', '$env:ProgramFiles\\Microsoft VS Code'],
  },
  cursor: {
    bins: ['cursor'],
    macPaths: ['/Applications/Cursor.app'],
    winPaths: ['$env:LOCALAPPDATA\\Programs\\cursor'],
  },
  xcode: { bins: ['xcodebuild'], macPaths: ['/Applications/Xcode.app'] },
  'android-studio': {
    macPaths: ['/Applications/Android Studio.app', '~/Library/Android/sdk'],
    winPaths: ['$env:ProgramFiles\\Android\\Android Studio', '$env:LOCALAPPDATA\\Android\\Sdk'],
    linuxPaths: ['/opt/android-studio', '~/Android/Sdk'],
  },
  docker: {
    bins: ['docker'],
    macPaths: ['/Applications/Docker.app'],
    winPaths: ['$env:ProgramFiles\\Docker\\Docker'],
  },
  reactotron: {
    // Linux ships as an AppImage (no fixed path) — undetectable there.
    macPaths: ['/Applications/Reactotron.app'],
    winPaths: ['$env:LOCALAPPDATA\\Programs\\Reactotron'],
  },
  'mongodb-compass': {
    bins: ['mongodb-compass'],
    macPaths: ['/Applications/MongoDB Compass.app'],
    winPaths: ['$env:LOCALAPPDATA\\MongoDBCompass'],
  },
  pgadmin: {
    macPaths: ['/Applications/pgAdmin 4.app'],
    winPaths: ['$env:ProgramFiles\\pgAdmin 4'],
    linuxPaths: ['/usr/pgadmin4'],
  },
  postman: {
    macPaths: ['/Applications/Postman.app'],
    winPaths: ['$env:LOCALAPPDATA\\Postman'],
    linuxPaths: ['/snap/bin/postman'],
  },
  termius: {
    bins: ['termius'],
    macPaths: ['/Applications/Termius.app'],
    winPaths: ['$env:LOCALAPPDATA\\Programs\\Termius'],
  },
  'cisco-vpn': {
    macPaths: ['/Applications/Cisco'],
    winPaths: ['${env:ProgramFiles(x86)}\\Cisco\\Cisco Secure Client'],
  },
  'cliq-desktop': {
    macPaths: ['/Applications/Cliq.app'],
    winPaths: ['$env:LOCALAPPDATA\\Programs\\zoho-cliq'],
  },
  'teams-desktop': {
    macPaths: ['/Applications/Microsoft Teams.app'],
    winAppx: 'MSTeams',
  },
  'slack-desktop': {
    bins: ['slack'],
    macPaths: ['/Applications/Slack.app'],
    winPaths: ['$env:LOCALAPPDATA\\slack\\slack.exe'],
  },
  'claude-code': {
    bins: ['claude'],
    macPaths: ['~/.local/bin/claude'],
    linuxPaths: ['~/.local/bin/claude'],
  },
  // The hook the `integration install claude` step writes, NOT `bins: ['herdr']`.
  // Checks are any-of, so keeping the binary alongside it would tick the card for
  // a machine that has herdr and restores every pane as a bare shell ([0029]).
  herdr: {
    macPaths: ['~/.claude/hooks/herdr-agent-state.sh'],
    winPaths: ['$env:USERPROFILE\\.claude\\hooks\\herdr-agent-state.sh'],
    linuxPaths: ['~/.claude/hooks/herdr-agent-state.sh'],
  },
  fastlane: { bins: ['fastlane'] },
  superpowers: { claudePlugin: 'superpowers@' },
  ponytail: { claudePlugin: 'ponytail@' },
  'ui-ux-pro-max': { claudePlugin: 'ui-ux-pro-max@' },
  context7: { claudeConfig: '"context7"' },
  'atlassian-mcp': { claudeConfig: '"atlassian"' },
  'figma-mcp': { claudeConfig: '"figma-dev-mode"' },
  'slack-mcp': { claudePlugin: 'slack@claude-plugins-official' },
  'zoho-cliq-mcp': { claudeConfig: 'zohomcp.com' },
  'teams-mcp': { claudeConfig: '"teams"' },
  'postman-mcp': { claudeConfig: '"postman"' },
}

export const RESULT_PREFIX = 'RN-ONBOARD/1'

export type DetectCheck =
  | { kind: 'bin'; value: string }
  | { kind: 'path'; value: string }
  | { kind: 'appx'; value: string }
  | { kind: 'config'; value: string }
  | { kind: 'plugin'; value: string }

export function checksFor(spec: DetectSpec, os: OsId): DetectCheck[] {
  const checks: DetectCheck[] = []
  const bins = os === 'win' && spec.winBins ? spec.winBins : (spec.bins ?? [])
  const paths = (os === 'mac' ? spec.macPaths : os === 'win' ? spec.winPaths : spec.linuxPaths) ?? []
  checks.push(...bins.map((value): DetectCheck => ({ kind: 'bin', value })))
  checks.push(...paths.map((value): DetectCheck => ({ kind: 'path', value })))
  if (os === 'win' && spec.winAppx) checks.push({ kind: 'appx', value: spec.winAppx })
  if (spec.claudeConfig) checks.push({ kind: 'config', value: spec.claudeConfig })
  if (spec.claudePlugin) checks.push({ kind: 'plugin', value: spec.claudePlugin })
  return checks
}

export function isDetectable(tool: Tool, platform: PlatformId): boolean {
  const spec = DETECT_SPECS[tool.id]
  if (!spec || !isAvailable(tool, platform)) return false
  return checksFor(spec, PLATFORM_INFO[platform].os).length > 0
}

// Human-readable "how it's checked" label used in the generated script comments.
function describeCheck(check: DetectCheck, os: OsId): string {
  switch (check.kind) {
    case 'bin':
      return os === 'win' ? `Get-Command ${check.value}` : `command -v ${check.value}`
    case 'path':
      return `${check.value} exists`
    case 'appx':
      return `Store package "${check.value}"`
    case 'config':
      return `~/.claude.json has ${check.value}`
    case 'plugin':
      return `~/.claude/settings.json has ${check.value}`
  }
}

export function describeChecks(spec: DetectSpec, os: OsId): string {
  return checksFor(spec, os)
    .map((c) => describeCheck(c, os))
    .join(' or ')
}

// Which tools the scan covers, grouped by category — feeds the script
// generator and the modal's coverage summary.
export interface DetectGroup {
  id: string
  title: string
  tools: Array<{ id: string; name: string }>
}

export function detectGroups(platform: PlatformId): DetectGroup[] {
  const groups: DetectGroup[] = []
  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    if (category.checkable === false) continue
    const tools = toolsInCategory(category.id).filter((t) => isDetectable(t, platform))
    if (tools.length === 0) continue
    groups.push({
      id: category.id,
      title: category.title,
      tools: tools.map((t) => ({ id: t.id, name: t.name })),
    })
  }
  return groups
}

// What a scan result does to the checklist, and the pre-scan state of every
// scanned tool so Undo can replay it verbatim.
export interface Applied {
  found: string[]
  notFound: string[]
  // Platform id the scan actually ran on, when it differs from the page.
  mismatch: string | null
  before: { on: string[]; off: string[] }
  undone: boolean
}

export function planApply(
  report: { platform: string; found: string[] },
  platform: PlatformId,
  installed: Record<string, boolean>,
): Applied {
  const ids = detectGroups(platform).flatMap((g) => g.tools.map((t) => t.id))
  // Whitelist against our own scan list — relay/paste data never writes
  // arbitrary ids into localStorage.
  const found = report.found.filter((id) => ids.includes(id))
  const mismatch = report.platform !== platform
  return {
    found,
    // A scan from another platform says nothing about this checklist, so it
    // ticks what it found and clears nothing.
    notFound: mismatch ? [] : ids.filter((id) => !found.includes(id)),
    mismatch: mismatch ? report.platform : null,
    before: { on: ids.filter((id) => installed[id]), off: ids.filter((id) => !installed[id]) },
    undone: false,
  }
}

// Pull the RN-ONBOARD/1 line out of whatever was pasted (possibly the whole
// terminal output). Returns found tool ids, [] for an empty result, or null
// when no result line is present.
export function parseResultLine(text: string): string[] | null {
  const match = /RN-ONBOARD\/1[ \t]*([a-z0-9,-]*)/i.exec(text)
  if (!match) return null
  const ids = match[1]
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter((id) => id in DETECT_SPECS)
  return [...new Set(ids)]
}
