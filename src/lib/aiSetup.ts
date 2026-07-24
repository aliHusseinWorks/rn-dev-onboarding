import { isAvailable, resolveAction, resolveSecondary, toolsInCategory } from './commands'
import { PLATFORM_INFO, type PlatformId } from './platform'
import { CATEGORIES, TOOLS, type ModalField, type ModalStep, type Tool } from './tools'

// Builds the "Full AI setup" payload: a bootstrap command that installs
// Claude Code, and an orchestration prompt that makes Claude Code install and
// verify everything else. The prompt embeds this app's per-OS commands as
// ground truth so the AI runs vetted commands instead of improvising.

const WIN_PATH_REFRESH =
  '$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")'

function resolveStepCommand(step: ModalStep, platform: PlatformId): string | undefined {
  return typeof step.command === 'string' ? step.command : step.command[platform]
}

// {key} tokens become explicit ask-the-user placeholders in the prompt.
function askTokens(text: string, fields: ModalField[]): string {
  return fields.reduce((acc, f) => acc.replaceAll(`{${f.key}}`, `<ask the user for: ${f.label}>`), text)
}

function isSlashCommand(command: string): boolean {
  return command.startsWith('/')
}

// Plugin slash commands have a non-interactive CLI twin (`claude plugin …`)
// the agent can run itself; other slash commands (e.g. /graphify) only exist
// inside the Claude Code UI and must be sent by the user.
function slashToCli(command: string): string | undefined {
  if (command.startsWith('/plugin ')) return `claude ${command.slice(1)}`
  return undefined
}

// Serialize one tool into prompt lines. Slash commands (Claude Code inputs the
// agent cannot send itself) are returned separately for the final checklist.
function emitTool(tool: Tool, platform: PlatformId): { body: string[]; slash: string[] } {
  const body: string[] = []
  const slash: string[] = []
  const fields = tool.modal?.fields ?? []
  const action = resolveAction(tool, platform)
  const secondary = resolveSecondary(tool, platform)

  const lines: string[] = []
  if (action?.type === 'command') {
    lines.push(`  RUN: ${action.value}`)
  } else if (action?.type === 'link') {
    if (secondary?.type === 'command') {
      lines.push(`  RUN: ${secondary.value}`)
      lines.push(`  (GUI installer fallback: ${action.value})`)
    } else {
      lines.push(`  [HUMAN] Download and install from ${action.value}`)
    }
  } else if (secondary?.type === 'command') {
    lines.push(`  RUN: ${secondary.value}`)
  }

  for (const step of tool.modal?.steps ?? []) {
    if (step.docsOnly) continue // per-repo reference, not machine setup
    const raw = resolveStepCommand(step, platform)
    if (!raw) continue
    const command = askTokens(raw, fields)
    if (isSlashCommand(command)) {
      const cli = slashToCli(command)
      if (cli) {
        // Original note says "send as its own prompt" — wrong for the CLI form.
        lines.push(`  RUN: ${cli}`)
      } else {
        slash.push(`- ${command}${step.note ? `  (${step.note})` : ''}`)
      }
      continue
    }
    const prefix = step.manual ? '  [HUMAN] ' : '  RUN: '
    lines.push(`${prefix}${command}${step.note ? `  — ${step.note}` : ''}`)
  }

  if (lines.length === 0) return { body, slash }

  body.push(`- ${tool.name} — ${tool.description}`)
  body.push(...lines)
  if (tool.note) body.push(`  Context: ${tool.note}`)
  return { body, slash }
}

// Which tools the AI setup covers, grouped by category — drives the modal's
// include/exclude checkboxes. Must mirror generateAiSetup's filters.
export interface AiSetupGroup {
  id: string
  title: string
  tools: Array<{ id: string; name: string }>
}

function eligibleTools(categoryId: string, platform: PlatformId): Tool[] {
  return toolsInCategory(categoryId).filter(
    (t) => t.id !== 'claude-code' && t.inScript !== false && isAvailable(t, platform),
  )
}

export function aiSetupGroups(platform: PlatformId): AiSetupGroup[] {
  const groups: AiSetupGroup[] = []
  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    if (category.id === 'project') continue
    const tools = eligibleTools(category.id, platform)
    if (tools.length > 0) {
      groups.push({ id: category.id, title: category.title, tools: tools.map((t) => ({ id: t.id, name: t.name })) })
    }
  }
  return groups
}

export function generateAiSetup(
  platform: PlatformId,
  excluded: ReadonlySet<string> = new Set(),
): { bootstrap: string; prompt: string } {
  const os = PLATFORM_INFO[platform]
  const isWindows = os.os === 'win'
  const bootstrap = resolveAction(TOOLS.find((t) => t.id === 'claude-code')!, platform)!.value

  const sections: string[] = []
  const slashChecklist: string[] = []
  const excludedNames: string[] = []

  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    if (category.id === 'project') continue
    const bodies: string[] = []
    for (const tool of eligibleTools(category.id, platform)) {
      if (excluded.has(tool.id)) {
        excludedNames.push(tool.name)
        continue
      }
      const { body, slash } = emitTool(tool, platform)
      bodies.push(...body)
      slashChecklist.push(...slash)
    }
    if (bodies.length > 0) sections.push(`### ${category.title}`, ...bodies, '')
  }


  const windowsRules = [
    `- Every command is PowerShell. Never use cmd.exe syntax, and never chain with && (invalid in PowerShell 5.1) — use ; instead.`,
    `- Freshly installed tools are NOT on PATH in this session. After each installer, refresh it with:\n  ${WIN_PATH_REFRESH}`,
    `- winget exit 0 / "Successfully installed" is NOT proof of installation — some packages (e.g. Android Studio) launch an interactive setup wizard instead of installing silently. Prefer adding --silent (and --custom "/S" for NSIS installers like Android Studio) to winget installs. If an install produces no new output for ~2 minutes, check Get-Process for an open "* Setup" wizard before waiting longer.`,
    `- If piping y/N answers into a .bat (e.g. sdkmanager --licenses) doesn't take, use file redirection through cmd: cmd /c "tool.bat < yes.txt".`,
  ]
  const unixRules = [`- Commands target ${os.label}'s default shell. Re-source the shell profile (or open the config's suggested command) after installs that edit it.`]

  const prompt = `You are setting up this ${os.label} machine for React Native development. Work through the GROUND TRUTH tool list below, top to bottom — the order matters, later tools depend on earlier ones.

RULES
1. Idempotency first: before installing anything, check whether it already exists (version command or ${isWindows ? 'Get-Command' : 'command -v'}). If present and healthy, report it and skip.
2. Run RUN commands exactly as written. If one fails, diagnose (PATH, permissions, proxy, partial installs) and fix the environment, then re-run and verify. Never substitute a different tool or install method than the one listed. One allowed change: append non-interactive flags (silent-install switches, ssh-keygen -f/-N to accept defaults) so a command runs unattended.
2b. Trust nothing an installer prints — after every install, verify the binary or app actually exists (version command, Get-Command/command -v, or checking the install path) before marking it done.
3. [HUMAN] lines are steps only the user can do (GUI sign-ins, pasting keys, OAuth approvals). Stop, tell them exactly what to do, wait for confirmation, then verify yourself where a verification command exists.
4. Exception to rule 3: Android Studio's SDK and AVD steps may be done via sdkmanager / avdmanager CLI instead of the GUI if you prefer — install "SDK Platform 35" + "Platform-Tools" and create one Pixel AVD.
5. Placeholders like <ask the user for: ...> are personal values. Ask; never invent them.
${isWindows ? windowsRules.join('\n') : unixRules.join('\n')}
6. Some installs prompt for elevation or confirmation — warn the user before running those so they can approve. Elevation (UAC) prompts appear on a dimmed secure desktop and auto-cancel after ~2 minutes; tell the user to stay at the machine during install-heavy sections. If a command fails for lack of admin rights, re-run the SAME command via an elevated shell — and if the failed attempt left a partial install dir behind, delete it before retrying.
6b. Your shell is non-interactive (stdin is not a terminal). Commands that need typed input or a terminal-bound browser-login handshake (claude mcp login, firebase login, OAuth device flows) will fail if you run them — treat them as [HUMAN] steps: tell the user to send "! <command>" as a prompt in this session, then verify afterwards.
7. After finishing each section, print a short checklist: tool name + installed/skipped/failed.
8. When every section is done, verify the toolchain directly: node --version, git --version, java -version, adb --version, and that JAVA_HOME and ANDROID_HOME are set. Fix anything failing. Do NOT run npx react-native doctor — it only works inside an RN project; tell the user to run it after they clone or create one.
9. Finish with: (a) a final summary table${slashChecklist.length > 0 ? ', (b) the SEND-YOURSELF checklist below printed verbatim — these are Claude Code slash commands the user must send as their own prompts (you cannot run them), one per prompt' : ''}. If any "claude plugin" installs ran, remind the user to restart Claude Code so the plugins load.

${excludedNames.length > 0 ? `USER-EXCLUDED TOOLS\nThe user deliberately opted out of these — do NOT install, configure, or recommend them, and don't count them as missing in checklists or doctor fixes: ${excludedNames.join(', ')}.\n\n` : ''}GROUND TRUTH — install in this order
${sections.join('\n')}
${slashChecklist.length > 0 ? `SEND-YOURSELF CHECKLIST (print at the end; the user sends each as its own prompt in Claude Code)\n${slashChecklist.join('\n')}\n\n` : ''}Do not modify any project code. This session is machine setup only.`

  return { bootstrap, prompt }
}
