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

// {key} tokens become explicit ask-the-user placeholders in the prompt. Labels
// of the ones actually hit land in `asked`, so STEP 0 can collect every question
// into one upfront batch instead of stalling the run at each placeholder.
function askTokens(text: string, fields: ModalField[], asked: Set<string>): string {
  return fields.reduce((acc, f) => {
    if (!acc.includes(`{${f.key}}`)) return acc
    asked.add(f.label)
    return acc.replaceAll(`{${f.key}}`, `<ask the user for: ${f.label}>`)
  }, text)
}

function isSlashCommand(command: string): boolean {
  return command.startsWith('/')
}

// Plugin slash commands have a non-interactive CLI twin (`claude plugin …`)
// the agent can run itself; any other slash command only exists
// inside the Claude Code UI and must be sent by the user.
function slashToCli(command: string): string | undefined {
  if (command.startsWith('/plugin ')) return `claude ${command.slice(1)}`
  return undefined
}

// Tools whose GUI-worded steps rule 4 hands back to the agent (sdkmanager,
// avdmanager, xcodebuild). Their [HUMAN] lines aren't the user's work, so they
// don't count towards the hands-on estimate the modal shows.
const AGENT_HANDLES_GUI = new Set(['android-studio', 'xcode'])

// Serialize one tool into prompt lines. Slash commands (Claude Code inputs the
// agent cannot send itself) are returned separately for the final checklist, and
// `handsOn` counts the steps that genuinely land on the user.
function emitTool(
  tool: Tool,
  platform: PlatformId,
): { body: string[]; slash: string[]; asks: Array<{ label: string; tool: string }>; handsOn: number } {
  const body: string[] = []
  const slash: string[] = []
  const asked = new Set<string>()
  const fields = tool.modal?.fields ?? []
  const action = resolveAction(tool, platform)
  const secondary = resolveSecondary(tool, platform)
  let handsOn = 0

  const lines: string[] = []
  if (action?.type === 'command') {
    lines.push(`  RUN: ${action.value}`)
  } else if (action?.type === 'link') {
    if (secondary?.type === 'command') {
      lines.push(`  RUN: ${secondary.value}`)
      lines.push(`  (GUI installer fallback: ${action.value})`)
    } else {
      lines.push(`  [HUMAN] Download and install from ${action.value}`)
      handsOn++
    }
  } else if (secondary?.type === 'command') {
    lines.push(`  RUN: ${secondary.value}`)
  }

  for (const step of tool.modal?.steps ?? []) {
    if (step.docsOnly) continue // per-repo reference, not machine setup
    const raw = resolveStepCommand(step, platform)
    if (!raw) continue
    const command = askTokens(raw, fields, asked)
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
    if (step.manual && !AGENT_HANDLES_GUI.has(tool.id)) handsOn++
    lines.push(`${prefix}${command}${step.note ? `  — ${step.note}` : ''}`)
  }

  const asks = [...asked].map((label) => ({ label, tool: tool.name }))
  if (lines.length === 0) return { body, slash, asks, handsOn: 0 }

  body.push(`- ${tool.name} — ${tool.description}`)
  body.push(...lines)
  if (tool.note) body.push(`  Context: ${tool.note}`)
  return { body, slash, asks, handsOn }
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
    if (category.checkable === false) continue
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
  installed: ReadonlySet<string> = new Set(),
): { bootstrap: string; prompt: string; asks: number; handsOn: number } {
  const os = PLATFORM_INFO[platform]
  const isWindows = os.os === 'win'
  const isMac = os.os === 'mac'
  const bootstrap = resolveAction(TOOLS.find((t) => t.id === 'claude-code')!, platform)!.value

  const sections: string[] = []
  const slashChecklist: string[] = []
  const askList: Array<{ label: string; tool: string }> = []
  const emitted = new Set<string>()
  let handsOn = 0
  const excludedNames: string[] = []
  const installedNames: string[] = []

  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    if (category.checkable === false) continue
    const bodies: string[] = []
    for (const tool of eligibleTools(category.id, platform)) {
      // Checked off on the page wins over the modal's tick — the checkbox is
      // disabled there, so an id can't be in both by user action.
      if (installed.has(tool.id)) {
        installedNames.push(tool.name)
        continue
      }
      if (excluded.has(tool.id)) {
        excludedNames.push(tool.name)
        continue
      }
      const emit = emitTool(tool, platform)
      bodies.push(...emit.body)
      slashChecklist.push(...emit.slash)
      askList.push(...emit.asks)
      handsOn += emit.handsOn
      if (emit.body.length > 0) emitted.add(tool.id)
    }
    if (bodies.length > 0) sections.push(`### ${category.title}`, ...bodies, '')
  }

  // Only Homebrew has a prefetch a later install actually reuses; `winget
  // download` writes a file `winget install` never looks at, so Windows has
  // nothing to overlap — telling the user to fetch it by hand would just
  // duplicate what winget does anyway. Linux earns the manual download because
  // Android Studio has no install command there at all.
  const downloads: string[] = []
  if (emitted.has('xcode')) {
    downloads.push('- [HUMAN] Open the App Store and start the Xcode download now — ~10 GB, the longest step in the run.')
  }
  if (emitted.has('android-studio')) {
    if (isMac) {
      downloads.push('- Start `brew fetch --cask android-studio` in the background now — the later `brew install --cask` reads it from the cache.')
    } else if (!isWindows) {
      downloads.push('- [HUMAN] Start the Android Studio download from https://developer.android.com/studio now, in the browser, so it streams while you work.')
    }
  }

  // One line per distinct label, naming every tool that wants it: Git and the SSH
  // key both ask for "Work email" under different token keys, and asking twice for
  // one value is exactly the mid-run friction STEP 0 exists to remove.
  const asksByLabel = new Map<string, Set<string>>()
  for (const { label, tool } of askList) {
    const tools = asksByLabel.get(label) ?? new Set<string>()
    tools.add(tool)
    asksByLabel.set(label, tools)
  }
  const askLines = [...asksByLabel].map(([label, tools]) => `- ${label} (${[...tools].join(', ')})`)
  const step0 = [
    askLines.length > 0 &&
      `Ask the user for all of these in ONE message and wait for the answers — they are every <ask the user for: ...> placeholder in the list below. Collecting them now is what lets the user walk away for the rest of the run; never stall mid-run for one. If the user doesn't have a value to hand, the step that produces it is in the list below — tell them where it comes from rather than just repeating the question. If it genuinely can't be obtained until later, ask that one at its own step in the end block instead of holding up STEP 0.\n${askLines.join('\n')}`,
    downloads.length > 0 && `Then start the long downloads so they stream while you install everything else:\n${downloads.join('\n')}`,
  ].filter(Boolean)

  const windowsRules = [
    `- Every command is PowerShell. Never use cmd.exe syntax, and never chain with && (invalid in PowerShell 5.1) — use ; instead.`,
    `- Freshly installed tools are NOT on PATH in this session. After each installer, refresh it with:\n  ${WIN_PATH_REFRESH}`,
    `- winget exit 0 / "Successfully installed" is NOT proof of installation — some packages (e.g. Android Studio) launch an interactive setup wizard instead of installing silently. Prefer adding --silent (and --custom "/S" for NSIS installers like Android Studio) to winget installs. If an install produces no new output for ~2 minutes, check Get-Process for an open "* Setup" wizard before waiting longer.`,
    `- If piping y/N answers into a .bat (e.g. sdkmanager --licenses) doesn't take, use file redirection through cmd: cmd /c "tool.bat < yes.txt".`,
  ]
  const unixRules = [`- Commands target ${os.label}'s default shell. Re-source the shell profile (or open the config's suggested command) after installs that edit it.`]

  const prompt = `You are setting up this ${os.label} machine for React Native development. ${step0.length > 0 ? 'Do STEP 0, then work' : 'Work'} through the GROUND TRUTH tool list below, top to bottom — the order matters, later tools depend on earlier ones. The run is shaped so the user answers everything up front and can then walk away until the end; keep it that way.

This prompt assumes Claude Code was started with --dangerously-skip-permissions: nothing below pauses for per-command approval, and rule 4 has you accept licence agreements on the user's behalf (\`sdkmanager --licenses\`${isMac ? ', `sudo xcodebuild -runFirstLaunch`' : ''}). If you were started without that flag, say so before you begin — the user approves each step instead, and should not walk away.

RULES
1. Idempotency first: before installing anything, check whether it already exists (version command or ${isWindows ? 'Get-Command' : 'command -v'}). If present and healthy, report it and skip.
2. Run RUN commands exactly as written. If one fails, diagnose (PATH, permissions, proxy, partial installs) and fix the environment, then re-run and verify. Never substitute a different tool or install method than the one listed. One allowed change: append non-interactive flags (silent-install switches, ssh-keygen -f/-N to accept defaults) so a command runs unattended.
2b. Trust nothing an installer prints — after every install, verify the binary or app actually exists (version command, Get-Command/command -v, or checking the install path) before marking it done.
3. [HUMAN] lines are steps only the user can do (GUI sign-ins, pasting keys, OAuth approvals) — except the ones rule 4 claims for you, which stay yours no matter how they are worded. Assume the user has walked away after STEP 0, so do NOT stop at each one — collect them and walk the user through the whole batch at the end (rule 9). The exception is a [HUMAN] step a later RUN genuinely needs: Xcode has to exist before xcode-select, the Android SDK before adb verifies. Do those in place, and verify each yourself afterwards where a verification command exists.
4. Some steps below are worded as GUI clicks but have a CLI form, and those are YOURS — do them yourself, do not hand them to the user. Android Studio's SDK and AVD: \`sdkmanager\` to install "platforms;android-35" + "platform-tools", \`avdmanager\` to create one Pixel AVD, and \`sdkmanager --licenses\` to accept the licences. If sdkmanager isn't on PATH, install the standalone Android command-line tools${isMac ? ' (`brew install --cask android-commandlinetools`)' : ''} rather than falling back to the wizard.${isMac ? ' Xcode: `sudo xcodebuild -runFirstLaunch` for the required-components dialog, `xcodebuild -downloadPlatform iOS` for the simulator runtime.' : ''} Only use the GUI wording if the CLI genuinely fails, and say so when you do.
5. Placeholders like <ask the user for: ...> are personal values, all collected in STEP 0. Ask there; never invent them.
${isWindows ? windowsRules.join('\n') : unixRules.join('\n')}
6. Some installs prompt for elevation or confirmation, and those prompts are the OS asking, not you — no permission mode can auto-accept them. ${isWindows ? 'Elevation (UAC) prompts appear on a dimmed secure desktop and auto-cancel after ~2 minutes, so they cannot wait for an absent user: run the installs that need elevation as one contiguous block as early as the dependency order allows, tell the user to stay at the machine for it, and only then let them leave. Never hoist one above something it depends on — run the chain up to it first.' : 'Run the installs that need a sudo password as one contiguous block as early as the dependency order allows — never hoisting one above something it depends on — and prime the credential cache with a single `sudo -v` at the top of it: the timestamp expires in minutes, so a scattered sudo later in the run will hang on an absent user.'} If a command fails for lack of admin rights, re-run the SAME command via an elevated shell — and if the failed attempt left a partial install dir behind, delete it before retrying.
6b. Your shell is non-interactive (stdin is not a terminal). Commands that need typed input or a terminal-bound browser-login handshake (claude mcp login, firebase login, OAuth device flows) will fail if you run them — treat them as [HUMAN] steps: tell the user to send "! <command>" as a prompt in this session, then verify afterwards.
7. After finishing each section, print a short checklist: tool name + installed/skipped/failed.
8. Verify the toolchain directly: node --version, git --version, java -version, adb --version, and that JAVA_HOME and ANDROID_HOME are set. Fix anything failing. Do NOT run npx react-native doctor — it only works inside an RN project; tell the user to run it after they clone or create one.
9. Finish in this order: (a) the [HUMAN] steps you collected under rule 3 — the user is back now, so walk them through the batch one at a time, (b) the rule 8 verification, which needs those steps done first, (c) a final summary table${slashChecklist.length > 0 ? ', (d) the SEND-YOURSELF checklist below printed verbatim — these are Claude Code slash commands the user must send as their own prompts (you cannot run them), one per prompt' : ''}. If any "claude plugin" installs ran, remind the user to restart Claude Code so the plugins load.

${installedNames.length > 0 ? `ALREADY INSTALLED\nThe user has these ticked off as installed, so they are not in the list below — do NOT install or configure them: ${installedNames.join(', ')}. If a tool below genuinely depends on one and you find it missing or broken, tell the user and ask before touching it; don't quietly install something they told you they already have.\n\n` : ''}${excludedNames.length > 0 ? `USER-EXCLUDED TOOLS\nThe user deliberately opted out of these — do NOT install, configure, or recommend them, and don't count them as missing in checklists or doctor fixes: ${excludedNames.join(', ')}.\n\n` : ''}${step0.length > 0 ? `STEP 0 — BEFORE YOU INSTALL ANYTHING\n${step0.join('\n\n')}\n\n` : ''}GROUND TRUTH — install in this order
${sections.join('\n')}
${slashChecklist.length > 0 ? `SEND-YOURSELF CHECKLIST (print at the end; the user sends each as its own prompt in Claude Code)\n${slashChecklist.join('\n')}\n\n` : ''}Do not modify any project code. This session is machine setup only.`

  return { bootstrap, prompt, asks: asksByLabel.size, handsOn }
}
