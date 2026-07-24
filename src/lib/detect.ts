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
  // servers ("server-key") and plugins (name@marketplace) are detected.
  claudeConfig?: string
}

// Detection config lives here, not on the Tool, so tools.ts stays a pure
// "what to install" table. Tools without an entry (per-project prompts)
// can't be seen from outside and are simply left out of the scan.
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
  superpowers: { claudeConfig: 'superpowers@' },
  'ui-ux-pro-max': { claudeConfig: 'ui-ux-pro-max@' },
  context7: { claudeConfig: '"context7"' },
  'atlassian-mcp': { claudeConfig: '"atlassian"' },
  'xcodebuild-mcp': { claudeConfig: '"XcodeBuildMCP"' },
  'android-dev-mcp': { claudeConfig: '"android-dev"' },
  'sentry-mcp': { claudeConfig: '"sentry"' },
  'firebase-mcp': { claudeConfig: '"firebase"' },
  'figma-mcp': { claudeConfig: '"figma-dev-mode"' },
  'slack-mcp': { claudeConfig: 'slack@claude-plugins-official' },
  'zoho-cliq-mcp': { claudeConfig: '"zoho-cliq"' },
  'teams-mcp': { claudeConfig: '"teams"' },
  'postman-mcp': { claudeConfig: '"postman"' },
}

export const RESULT_PREFIX = 'RN-ONBOARD/1'

export type DetectCheck =
  | { kind: 'bin'; value: string }
  | { kind: 'path'; value: string }
  | { kind: 'appx'; value: string }
  | { kind: 'config'; value: string }

export function checksFor(spec: DetectSpec, os: OsId): DetectCheck[] {
  const checks: DetectCheck[] = []
  const bins = os === 'win' && spec.winBins ? spec.winBins : (spec.bins ?? [])
  const paths = (os === 'mac' ? spec.macPaths : os === 'win' ? spec.winPaths : spec.linuxPaths) ?? []
  checks.push(...bins.map((value): DetectCheck => ({ kind: 'bin', value })))
  checks.push(...paths.map((value): DetectCheck => ({ kind: 'path', value })))
  if (os === 'win' && spec.winAppx) checks.push({ kind: 'appx', value: spec.winAppx })
  if (spec.claudeConfig) checks.push({ kind: 'config', value: spec.claudeConfig })
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
