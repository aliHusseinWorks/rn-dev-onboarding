import { isAvailable, resolveAction, resolveElevated, resolveSecondary, toolsInCategory } from './commands'
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

// Tools whose GUI-worded steps rule 4a hands back to the agent (sdkmanager,
// avdmanager). Their [HUMAN] lines aren't the user's work, so they don't count
// towards the hands-on estimate the modal shows. Xcode is deliberately not here:
// its GUI step is an `alt` the prompt drops anyway, and the manual step it does
// carry — `sudo xcode-select -s` — really is the user's, since no agent can
// answer a password prompt.
const AGENT_HANDLES_GUI = new Set(['android-studio'])

// A tool's install as a command: its own if it has one, otherwise the one behind
// a download-link card's secondary button. Shared with the elevated block, so
// that block installs exactly what the ground-truth list does.
function installCommand(tool: Tool, platform: PlatformId): string | undefined {
  const action = resolveAction(tool, platform)
  if (action?.type === 'command') return action.value
  const secondary = resolveSecondary(tool, platform)
  return secondary?.type === 'command' ? secondary.value : undefined
}

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
  let handsOn = 0

  const lines: string[] = []
  const install = installCommand(tool, platform)
  if (install) {
    lines.push(`  RUN: ${install}`)
    if (action?.type === 'link') lines.push(`  (GUI installer fallback: ${action.value})`)
  } else if (action?.type === 'link') {
    lines.push(`  [HUMAN] Download and install from ${action.value}`)
    handsOn++
  }

  for (const step of tool.modal?.steps ?? []) {
    if (step.docsOnly) continue // per-repo reference, not machine setup
    if (step.alt) continue // one of several ways to do the step above, so listing them all says "run all three"
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
    // The prompt draws no distinction the modal needs: either way the agent
    // cannot carry the step out itself.
    const byUser = step.manual || step.userRun
    const prefix = byUser ? '  [HUMAN] ' : '  RUN: '
    if (byUser && !AGENT_HANDLES_GUI.has(tool.id)) handsOn++
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
): { bootstrap: string; prompt: string; asks: number; handsOn: number; downloadMb: number; elevatedCount: number } {
  const os = PLATFORM_INFO[platform]
  const isWindows = os.os === 'win'
  const isMac = os.os === 'mac'
  // Named per OS wherever the prompt tells the user to leave Claude Code:
  // Terminal.app and iTerm don't exist on Linux, and PowerShell isn't a window
  // on either Unix.
  const terminal = isWindows ? 'a real PowerShell window' : isMac ? 'Terminal.app or iTerm' : 'a real terminal window'
  // PowerShell reads environment variables through the env: drive, so the Unix
  // spelling expands to nothing there — and `--sdk_root=""` sends every package
  // to the wrong place rather than failing loudly.
  const sdkRoot = isWindows ? '$env:ANDROID_HOME' : '$ANDROID_HOME'
  // Apple Silicon puts Homebrew in /opt/homebrew, Intel in /usr/local.
  const brewPrefix = platform === 'mac-arm' ? '/opt/homebrew' : '/usr/local'
  // Where a GUI app lands, for the idempotency check, and the shell that reads
  // the profile these installs edit. Three platforms, so none of these can be a
  // two-way branch on isWindows — Linux would inherit the macOS answer.
  const appDirHint = isWindows
    ? '`$env:ProgramFiles\\<Name>`, `$env:LOCALAPPDATA\\Programs\\<name>`'
    : isMac
      ? '`/Applications/<Name>.app`'
      : '`/opt/<name>`, or the prefix the vendor .deb or AppImage used'
  const verifyShell = isWindows
    ? '`powershell -NoProfile` skips the profile these installs just edited, so use a normal `powershell -Command` session'
    : isMac
      ? '`zsh -i -l -c` (interactive AND login). `zsh -l -c` alone does NOT source ~/.zshrc, so it reports a perfectly working toolchain as entirely missing'
      : '`bash -i -l -c` (interactive AND login). `bash -l -c` alone does NOT source ~/.bashrc, so it reports a perfectly working toolchain as entirely missing'
  const bootstrap = resolveAction(TOOLS.find((t) => t.id === 'claude-code')!, platform)!.value

  const sections: string[] = []
  const slashChecklist: string[] = []
  const askList: Array<{ label: string; tool: string }> = []
  const emitted = new Set<string>()
  let handsOn = 0
  const excludedNames: string[] = []
  const installedNames: string[] = []
  const elevated: Array<{ id: string; name: string; command: string }> = []
  let downloadMb = 0

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
      downloadMb += tool.sizeMb ?? 0
      // Collected in list order, so the block installs Homebrew before the casks
      // that need it. `elevated` marks packaging that prompts without saying so;
      // an apt command announces it in its own text, so the prefix test covers
      // Linux without needing a flag per card.
      const command = installCommand(tool, platform)
      if (command && (resolveElevated(tool, platform) || command.startsWith('sudo '))) {
        elevated.push({ id: tool.id, name: tool.name, command })
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
    downloads.push('- [HUMAN] Open the App Store and start the Xcode download now — ~3.5 GB. Its iOS simulator runtime is a separate ~8.5 GB that rule 4b downloads later, and THAT is the longest single step in the run, so do not treat a finished Xcode as the end of the waiting.')
  }
  if (emitted.has('android-studio')) {
    if (isMac) {
      downloads.push('- Start `HOMEBREW_NO_AUTO_UPDATE=1 brew fetch --cask android-studio` in the background now — the later `brew install --cask` reads it from the cache. Keep that variable set for every brew command in the run: an auto-update mid-run bumps the cask version and silently orphans everything you prefetched.')
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
    downloads.length > 0 &&
      `Also in that message, start the long downloads so they stream while everything else happens — these come FIRST, because they are unattended and the block below is not:\n${downloads.join('\n')}\nOverlapping them is a win on a fast link and a liability on a slow one: several multi-gigabyte transfers sharing a thin connection stall each other past the server's idle timeout, and they die at zero bytes while small packages sail through. If big downloads start failing while small ones succeed, that is the signal — stop overlapping, run them one at a time, and retry under rule 2c rather than concluding the tool or the URL is broken.`,
    elevated.length > 0 &&
      `Then hand the user this block to run themselves, and wait for them to confirm before you install anything else. ${
        isWindows
          ? 'Tell them to open PowerShell as Administrator for it: Chocolatey writes to C:\\ProgramData and fails outright from a normal shell rather than raising a UAC dialog to accept, and running the block elevated also collapses the other installers\' own dialogs into one. Nothing in this block writes a user-scope setting, which is what makes elevating it safe — the JDK\'s JAVA_HOME step is deliberately outside it, because "User" scope from an elevated shell lands in the administrator\'s profile instead.'
          : 'It asks for their password once — sudo caches the timestamp for the rest of the block — and most of what follows cannot install until it has run.'
      } It has to run in ${terminal} — NOT in Claude Code, and NOT via "! <command>". Neither of those has a terminal the prompt can reach, so you cannot run these yourself and must not keep retrying them.\n${elevated
        .flatMap((e) => {
          const lines = [`- ${e.name}`, `  ${e.command}`]
          // Homebrew's installer edits the profile, which does nothing for the
          // shell already running it, and /opt/homebrew/bin is not on the default
          // macOS PATH — so without this every `brew` line pasted after it in the
          // same block dies with "command not found" on a fresh machine.
          if (isMac && e.id === 'homebrew') lines.push(`  eval "$(${brewPrefix}/bin/brew shellenv)"`)
          return lines
        })
        .join('\n')}\nThey stay in the list below because rule 1 has you verify them afterwards, not reinstall them.`,
  ].filter(Boolean)

  const windowsRules = [
    `- Every command is PowerShell. Never use cmd.exe syntax, and never chain with && (invalid in PowerShell 5.1) — use ; instead.`,
    `- Freshly installed tools are NOT on PATH in this session. After each installer, refresh it with:\n  ${WIN_PATH_REFRESH}`,
    `- winget exit 0 / "Successfully installed" is NOT proof of installation — some packages (e.g. Android Studio) launch an interactive setup wizard instead of installing silently. Prefer adding --silent (and --custom "/S" for NSIS installers like Android Studio) to winget installs. If an install produces no new output for ~2 minutes, check Get-Process for an open "* Setup" wizard before waiting longer.`,
    `- If piping y/N answers into a .bat (e.g. sdkmanager --licenses) doesn't take, use file redirection through cmd: cmd /c "tool.bat < yes.txt".`,
  ]
  const unixRules = [`- Commands target ${os.label}'s default shell. Re-source the shell profile (or open the config's suggested command) after installs that edit it.`]

  const prompt = `You are setting up this ${os.label} machine for React Native development. ${step0.length > 0 ? 'Do STEP 0, then work' : 'Work'} through the GROUND TRUTH tool list below, top to bottom — the order matters, later tools depend on earlier ones. The run is shaped so the user answers everything up front and can then walk away until the end; keep it that way.

This prompt assumes Claude Code was started with --dangerously-skip-permissions: nothing below pauses for per-command approval, and rule 4 has you accept licence agreements on the user's behalf (\`sdkmanager --licenses\`). If you were started without that flag, say so before you begin — the user approves each step instead, and should not walk away.

RULES
1. Idempotency first: before installing anything, check whether it already exists (version command or ${isWindows ? 'Get-Command' : 'command -v'}). If present and healthy, report it and skip. A GUI app answers neither — check for its install directory instead (${appDirHint}), and do that before consulting the package manager: an app installed by hand is invisible to ${isWindows ? 'winget list' : isMac ? 'brew list' : 'dpkg -l'} and reinstalling over it is not always harmless.
1b. Where a tool names a version, "already installed" means THAT version. A different one being present is NOT a reason to skip — check the version, and install the pinned one if it doesn't match. Parallel runtimes coexist safely, so resolve this yourself rather than asking or leaving it for the user. JAVA_HOME is the one machine-wide setting you may repoint on your own initiative, because Gradle reads it rather than PATH and this toolchain pins the JDK; any OTHER global setting that software outside this setup may depend on goes to the user as a question in the end block, not a change you make and mention afterwards. When you repoint JAVA_HOME, put its old value, its new value and the exact command to restore it (${isWindows ? 'setx JAVA_HOME "<old value>"' : 'export JAVA_HOME=<old value>'}) in the final summary — one line in the report, never a question mid-run.
2. Run RUN commands exactly as written. If one fails, diagnose (PATH, permissions, proxy, partial installs) and fix the environment, then re-run and verify. Never substitute a different tool or install method than the one listed. One allowed change: append non-interactive flags (silent-install switches, ssh-keygen -f/-N to accept defaults) so a command runs unattended.
2b. Trust nothing an installer prints — after every install, verify the binary or app actually exists (version command, Get-Command/command -v, or checking the install path) before marking it done.
2c. A failed download is the expected case, not a broken tool. \`curl (18) transfer closed\`, \`curl (56) connection reset\`, \`curl (28) timed out\`, an archive that won't unpack, a package manager reporting a checksum or extraction failure — all of these mean retry. Retry each at least three times before you call it failed, and report the number of attempts in the section checklist so a genuinely flaky link is visible. Both ${isWindows ? 'winget and Chocolatey' : 'Homebrew and fnm'} resume or restart cleanly, so a retry costs only time.
3. [HUMAN] lines are steps only the user can do (GUI sign-ins, pasting keys, OAuth approvals) — except the ones rule 4 claims for you, which stay yours no matter how they are worded. Assume the user has walked away after STEP 0, so do NOT stop at each one — collect them and walk the user through the whole batch at the end (rule 9). The exception is a [HUMAN] step a later RUN genuinely needs: Xcode has to exist before xcode-select, the Android SDK before adb verifies. Do those in place, and verify each yourself afterwards where a verification command exists.
4. Some steps below are worded as GUI clicks but have a CLI form, and those are YOURS — do them yourself, do not hand them to the user. Only use the GUI wording if the CLI genuinely fails, and say so when you do.
4a. Android SDK and AVD, all via \`sdkmanager\` / \`avdmanager\`, never the Studio wizard. Pass \`--sdk_root="${sdkRoot}"\` on EVERY sdkmanager call: if sdkmanager isn't on PATH you'll be installing the standalone command-line tools${isMac ? ' (`brew install --cask android-commandlinetools`)' : ''}, and that copy defaults its SDK root to its own install directory, so packages land somewhere the emulator and \`avdmanager\` never look. Install \`sdkmanager --licenses\` first to accept the licences, then "platforms;android-35" and "platform-tools", then "emulator" and a system image ("system-images;android-35;google_apis;arm64-v8a" on Apple Silicon, x86_64 elsewhere) — an AVD cannot be created without the image or booted without the emulator package. Then install "cmdline-tools;latest" INTO the SDK root and create the Pixel AVD with THAT copy of avdmanager (\`${sdkRoot}${isWindows ? '\\cmdline-tools\\latest\\bin\\avdmanager.bat' : '/cmdline-tools/latest/bin/avdmanager'}\`), because avdmanager infers its SDK root from where it lives and the packaged copy will report "Package path is not valid. Valid system image paths are: null". Two \`Error: Could not load devices from …/devices.xml\` lines during create are harmless — that file is optional and this image ships none; check \`avdmanager list avd\` for the AVD rather than trusting the exit output.${isMac ? '\n4b. Xcode: `xcodebuild -downloadPlatform iOS` fetches the simulator runtime and needs no sudo, so that one is yours. Two others need it and belong to the user: `sudo xcode-select -s /Applications/Xcode.app`, without which the toolchain stays on the Command Line Tools and iOS builds fail, and `sudo xcodebuild -runFirstLaunch`, whose components install into root-owned /Library/Developer. Neither can join the STEP 0 block, because Xcode has not finished downloading that early — hand both over together once it has, and set `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` for your own commands meanwhile. Do not read a silent `-runFirstLaunch` as success: it exits 0 doing nothing when the components are already in, so check `xcodebuild -checkFirstLaunchStatus` instead. Verify with `xcodebuild -version` and `xcrun simctl list runtimes` — a runtime must be listed, an empty list means the download did not finish.' : ''}
5. Placeholders like <ask the user for: ...> are personal values, all collected in STEP 0. Ask there; never invent them.
${isWindows ? windowsRules.join('\n') : unixRules.join('\n')}
6. ${isWindows ? 'UAC consent dialogs' : 'Password prompts'} are the OS asking, not you, and NOTHING you can do answers them: no permission mode, no flag, and no shell you have access to. ${elevated.length > 0 ? 'The installs that raise one are already in STEP 0 for the user to run themselves — that is the only route.' : ''} If one appears anyway, hand the user the exact command to run in ${terminal} and wait; never retry it yourself, and never try to feed a password in. ${isWindows ? '' : 'In particular `sudo -v` cannot prime anything for you: with no terminal it fails outright rather than caching a timestamp. '}If an abandoned attempt left a partial install directory behind, delete it before the user retries.
6b. Your shell has no terminal attached (stdin is not a tty). Two different kinds of command hit this, and they need different handling. Browser-login handshakes (\`claude mcp login\`, \`firebase login\`, OAuth device flows) do work if the user sends them as "! <command>" in this session — tell them to. Anything that needs text TYPED at a prompt — above all a password — does NOT: "!" has no terminal either, and it will fail exactly the way your own call did. Those need a real terminal window, so say that instead of suggesting "!".
7. After finishing each section, print a short checklist: tool name + installed/skipped/failed.
8. Verify the toolchain in a shell that reads the user's profile the way a real terminal does — ${verifyShell} — and do not start "fixing" a machine on the strength of a check run the wrong way. Verify: node --version, git --version, java -version, adb --version, and that JAVA_HOME and ANDROID_HOME are set. Check JAVA_HOME resolves to the pinned JDK, not merely to some JDK — a newer Java answering \`java -version\` is the exact mismatch rule 1b exists to catch, and Gradle reads JAVA_HOME rather than PATH. Fix anything failing. Do NOT run npx react-native doctor — it only works inside an RN project; tell the user to run it after they clone or create one.
9. Finish in this order: (a) the [HUMAN] steps you collected under rule 3 — the user is back now, so walk them through the batch one at a time. Some of these turn out not to be theirs to do: a tenant admin has to grant consent, IT has to supply a portal URL, a workspace owner has to enable an integration. Mark those BLOCKED, name who is needed and what to ask them for, and stop re-presenting them as if another attempt would help. Then (b) the rule 8 verification, which needs those steps done first, (c) a final summary table${slashChecklist.length > 0 ? ', (d) the SEND-YOURSELF checklist below printed verbatim — these are Claude Code slash commands the user must send as their own prompts (you cannot run them), one per prompt' : ''}. If any "claude plugin" installs ran, remind the user to restart Claude Code so the plugins load.

${installedNames.length > 0 ? `ALREADY INSTALLED\nThe user has these ticked off as installed, so they are not in the list below — do NOT install or configure them: ${installedNames.join(', ')}. If a tool below genuinely depends on one and you find it missing or broken, tell the user and ask before touching it; don't quietly install something they told you they already have.\n\n` : ''}${excludedNames.length > 0 ? `USER-EXCLUDED TOOLS\nThe user deliberately opted out of these — do NOT install, configure, or recommend them, and don't count them as missing in checklists or doctor fixes: ${excludedNames.join(', ')}.\n\n` : ''}${step0.length > 0 ? `STEP 0 — BEFORE YOU INSTALL ANYTHING\n${step0.join('\n\n')}\n\n` : ''}GROUND TRUTH — install in this order
${sections.join('\n')}
${slashChecklist.length > 0 ? `SEND-YOURSELF CHECKLIST (print at the end; the user sends each as its own prompt in Claude Code)\n${slashChecklist.join('\n')}\n\n` : ''}Do not modify any project code. This session is machine setup only.`

  return { bootstrap, prompt, asks: asksByLabel.size, handsOn, downloadMb, elevatedCount: elevated.length }
}
