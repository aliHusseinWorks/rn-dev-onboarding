import { isAvailable, toolsInCategory } from './commands'
import { PLATFORM_INFO, type PlatformId } from './platform'
import { CATEGORIES, TOOLS, type Tool } from './tools'

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
}

// Detection config lives here, not on the Tool, so tools.ts stays a pure
// "what to install" table. Tools without an entry (Claude Code plugins, MCP
// servers, per-project prompts) can't be seen from outside — the modal lists
// them as not scannable.
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
  jdk: {
    bins: ['javac'],
    macPaths: ['/Library/Java/JavaVirtualMachines/zulu-17.jdk'],
    winPaths: ['$env:ProgramFiles\\Microsoft\\jdk-17*'],
    linuxPaths: ['/usr/lib/jvm/java-17-openjdk-amd64'],
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
  herdr: { bins: ['herdr'] },
  uv: { bins: ['uv'] },
  graphify: { bins: ['graphify'] },
  fastlane: { bins: ['fastlane'] },
}

export const RESULT_PREFIX = 'RN-ONBOARD/1'

export type DetectCheck =
  | { kind: 'bin'; value: string }
  | { kind: 'path'; value: string }
  | { kind: 'appx'; value: string }

export function checksFor(spec: DetectSpec, os: OsId): DetectCheck[] {
  const checks: DetectCheck[] = []
  const bins = os === 'win' && spec.winBins ? spec.winBins : (spec.bins ?? [])
  const paths = (os === 'mac' ? spec.macPaths : os === 'win' ? spec.winPaths : spec.linuxPaths) ?? []
  checks.push(...bins.map((value): DetectCheck => ({ kind: 'bin', value })))
  checks.push(...paths.map((value): DetectCheck => ({ kind: 'path', value })))
  if (os === 'win' && spec.winAppx) checks.push({ kind: 'appx', value: spec.winAppx })
  return checks
}

export function isDetectable(tool: Tool, platform: PlatformId): boolean {
  const spec = DETECT_SPECS[tool.id]
  if (!spec || !isAvailable(tool, platform)) return false
  return checksFor(spec, PLATFORM_INFO[platform].os).length > 0
}

// Human-readable "how it's checked" label shown next to each checkbox.
function describeCheck(check: DetectCheck, os: OsId): string {
  switch (check.kind) {
    case 'bin':
      return os === 'win' ? `Get-Command ${check.value}` : `command -v ${check.value}`
    case 'path':
      return `${check.value} exists`
    case 'appx':
      return `Store package "${check.value}"`
  }
}

// max caps how many checks are spelled out (UI rows truncate; the generated
// script passes Infinity — there the comment IS the documentation).
export function describeChecks(spec: DetectSpec, os: OsId, max = 2): string {
  const parts = checksFor(spec, os).map((c) => describeCheck(c, os))
  if (parts.length <= max) return parts.join(' or ')
  return `${parts.slice(0, max).join(' or ')} +${parts.length - max} more`
}

// Which tools the scan covers, grouped by category — drives the modal's
// include/exclude checkboxes, mirroring aiSetupGroups.
export interface DetectGroup {
  id: string
  title: string
  tools: Array<{ id: string; name: string; how: string }>
}

export function detectGroups(platform: PlatformId): DetectGroup[] {
  const os = PLATFORM_INFO[platform].os
  const groups: DetectGroup[] = []
  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    const tools = toolsInCategory(category.id).filter((t) => isDetectable(t, platform))
    if (tools.length === 0) continue
    groups.push({
      id: category.id,
      title: category.title,
      tools: tools.map((t) => ({ id: t.id, name: t.name, how: describeChecks(DETECT_SPECS[t.id], os) })),
    })
  }
  return groups
}

// Tools shown on the page for this platform that the scan cannot see
// (Claude Code plugins, MCP servers, per-project prompts, AppImage-only apps).
export function undetectableTools(platform: PlatformId): Array<{ id: string; name: string }> {
  return TOOLS.filter((t) => isAvailable(t, platform) && !isDetectable(t, platform)).map((t) => ({
    id: t.id,
    name: t.name,
  }))
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
