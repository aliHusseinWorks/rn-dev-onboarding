import type { PlatformId } from './platform'
import { ARGENT_SETUP_PROMPT, PLUGIN_BUILD_PROMPT, RUN_DOCS_PROMPT, SETUP_PROMPT } from './setupPrompt'
import type { VersionSource } from './versions'

export interface ToolAction {
  type: 'command' | 'link'
  value: string
  label?: string
}

export interface ModalStep {
  // A single command for every OS, or a per-platform variant. Steps with no
  // entry for the current platform are hidden.
  command: string | Partial<Record<PlatformId, string>>
  note?: string
  // true = a GUI/human instruction, not a shell command (e.g. "paste the key
  // into Bitbucket"). The AI setup prompt marks these as [HUMAN] steps.
  manual?: boolean
  // true = a real command that only the user can run, because it needs a
  // password the agent has no terminal to type. [HUMAN] in the prompt like
  // `manual`, but still copyable in the modal — `manual` renders as prose, which
  // is right for GUI wording and wrong for a line you have to retype.
  userRun?: boolean
  // One of several ways to do the step above, not a step of its own: bulleted
  // rather than numbered, and it doesn't advance the count. Numbered
  // alternatives read as a sequence you work through.
  alt?: boolean
  // Prose above the command, for a step that has to explain itself before
  // handing over a value. `manual` can't: it turns the command itself into the
  // prose, so a step needing both would have to become two.
  body?: string
  // true = reference material for later (per-repo usage), not part of machine
  // setup — shown in the modal but excluded from the AI setup prompt.
  docsOnly?: boolean
  // true = field values land inside single-quoted shell literals in this
  // command, so escape embedded quotes when filling the copyable text.
  shellQuoted?: boolean
  // Same three options ToolModal.prompt already has, for steps whose command is
  // a whole script rather than a line to paste.
  multiline?: boolean
  download?: boolean
  filename?: string | Partial<Record<PlatformId, string>>
  // Shown only while the named field has (or hasn't) a value the user entered,
  // so a step can offer a different route once something is filled in.
  whenFieldSet?: string
  whenFieldUnset?: string
  // Shown only while every listed field holds the given value — how a 'choice'
  // field splits one modal into modes.
  whenFieldIs?: Record<string, string>
  // Copy-button label, for a step whose command is a whole prompt rather than a
  // line to paste. Defaults to 'Copy'.
  label?: string
  // Detail behind an info icon next to the note — the caveat a reader needs
  // only once, kept out of the step's own line.
  tooltip?: string
  // Somewhere the reader has to go in a browser to carry the step out, for the
  // steps a terminal can't complete.
  link?: { href: string; label: string }
  // A sample of what the command produces, rendered under it. For steps whose
  // output is the point — pick-one alternatives you can only choose between by
  // seeing them. Newlines render as separate lines.
  preview?: string
}

// A fill-in input shown at the top of the modal. Its value replaces every
// {key} token in the modal's step commands and prompt. Fields whose token
// appears in no command for the current platform are hidden.
export interface ModalField {
  key: string
  label: string
  placeholder?: string
  // 'image' = an image drop/picker instead of a text box; the value is the
  // base64 of an icon converted in the browser, wrapped when filled in.
  // 'choice' = a segmented control over `options`. Its value is never
  // substituted into a command, so it stays visible on its own terms rather
  // than through the token check every other field is filtered by.
  kind?: 'text' | 'image' | 'choice'
  options?: { value: string; label: string }[]
  // A choice field can gate another, so the protocol picker only appears in the
  // mode whose commands carry a URL.
  whenFieldIs?: Record<string, string>
}

export interface ToolModal {
  intro?: string
  prereq?: string
  fields?: ModalField[]
  steps?: ModalStep[]
  prompt?: string
  copyLabel?: string
  // Field keys that must hold a value before anything is copyable. Commands
  // built around an unfilled token are worse than no command — they look
  // runnable and quietly aren't.
  requireFields?: string[]
}

export interface Tool {
  id: string
  category: string
  name: string
  description: string
  icon: string
  order: number
  docsUrl?: string
  note?: string
  // false = excluded from the generated setup script (per-project actions
  // like scaffolding an app, as opposed to machine setup).
  inScript?: boolean
  // Download size in MB, feeding the AI setup's download-total warning. Tools
  // installed as formulae carry none: a bottle's cost is mostly its dependencies.
  // Xcode's includes the iOS simulator runtime and Android Studio's the SDK
  // packages, neither of which has a card of its own to hang a size on.
  sizeMb?: number
  // true = the OS itself demands a password or UAC consent to install this, which
  // nothing the agent has can answer, so the AI setup hands it to the user.
  // Per-platform because the same app ships as a privileged `pkg` on macOS and a
  // user-scope install on Windows, where elevating is wrong rather than merely
  // unnecessary.
  elevated?: boolean | Partial<Record<PlatformId, boolean>>
  actions?: Partial<Record<PlatformId, ToolAction>>
  secondary?: Partial<Record<PlatformId, ToolAction>>
  modal?: ToolModal
  // Registry to look up the latest release from — shown as a live badge on the
  // card. Per-platform only for the few whose builds genuinely differ by OS
  // (Teams) or whose card covers a different tool per OS (Homebrew / winget);
  // anything shipping one version everywhere takes a bare source.
  version?: VersionSource | Partial<Record<PlatformId, VersionSource>>
}

export interface Category {
  id: string
  title: string
  description: string
  accent: string
  order: number
  // false = reusable per-project actions rather than machine state, so the
  // cards carry no checkmark and the section is left out of the progress
  // count, the AI setup and the detect scan.
  checkable?: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'essentials', title: 'System Essentials', description: 'Install these first, in order.', accent: '#38bdf8', order: 1 },
  { id: 'apps', title: 'Desktop Apps', description: 'Editors, IDEs, debuggers, and team chat.', accent: '#a78bfa', order: 2 },
  { id: 'ai', title: 'AI Tools & Claude Code', description: 'Agentic CLIs, prerequisites, and Claude Code plugins.', accent: '#fbbf24', order: 3 },
  { id: 'mcp', title: 'MCP Servers', description: 'Connect Claude Code to your tools with `claude mcp add`.', accent: '#2dd4bf', order: 4 },
  { id: 'project', title: 'Project Setup', description: 'Scaffold a Claude workspace in a repo, and the prompts that keep it current.', accent: '#f472b6', order: 5, checkable: false },
  { id: 'rn', title: 'React Native Setup', description: 'Create a project and verify the toolchain.', accent: '#61dafb', order: 6, checkable: false },
]

// action builders keep the config table terse
const cmd = (value: string, label?: string): ToolAction => ({ type: 'command', value, label })
const link = (value: string, label?: string): ToolAction => ({ type: 'link', value, label })
const mac = <T>(a: T): Partial<Record<PlatformId, T>> => ({ 'mac-arm': a, 'mac-intel': a })
const win = <T>(a: T): Partial<Record<PlatformId, T>> => ({ 'win-x64': a, 'win-arm': a })

const BREW_INSTALL = cmd('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')

const ANDROID_ENV_MAC = `printf '\\nexport ANDROID_HOME=$HOME/Library/Android/sdk\\nexport PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools\\n' >> ~/.zshrc && source ~/.zshrc`
const ANDROID_ENV_LINUX = `printf '\\nexport ANDROID_HOME=$HOME/Android/Sdk\\nexport PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools\\n' >> ~/.bashrc && source ~/.bashrc`
const ANDROID_ENV_WIN =
  '[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\\Android\\Sdk", "User"); [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools;$env:LOCALAPPDATA\\Android\\Sdk\\emulator", "User")'

const JAVA_HOME_WIN =
  '$jdk = Get-ChildItem "$env:ProgramFiles\\Microsoft" -Directory -Filter "jdk-17*" | Select-Object -First 1; [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdk.FullName, "User")'

// fnm publishes Node only through `fnm env`, into a per-shell directory that
// dies with the shell, so anything not launched from an interactive shell sees no
// node at all. These symlinks are the copy those callers resolve; they point at
// the `default` alias rather than a version directory, so `fnm default` moves
// them. fnm's own directory still comes first on an interactive PATH, so
// `fnm use` keeps switching per repo.
const FNM_STABLE_UNIX = `mkdir -p ~/.local/bin; for b in node npm npx; do ln -sfn ~/.local/share/fnm/aliases/default/bin/$b ~/.local/bin/$b; done`

// ~/.local/bin is only on PATH because something put it there (the Claude Code
// installer, on a machine that ran this app's bootstrap first), and a reader
// working down the cards by hand reaches this one before that — so the card adds
// it. Each line carries its own guard: the fnm eval is also what fnm's own docs
// tell people to add, so a shared guard would match on any machine that already
// has it and skip the PATH line on exactly the machines this needs to repair.
const fnmShellHook = (rc: string) =>
  `grep -q '.local/bin' ${rc} || printf '\\nexport PATH="$HOME/.local/bin:$PATH"\\n' >> ${rc}; grep -q 'fnm env --use-on-cd' ${rc} || printf 'eval "$(fnm env --use-on-cd)"\\n' >> ${rc}`

// Same-origin like DETECT_ENDPOINT — the launcher scripts and the icon ship in
// public/, so a paste reaches whichever origin served the page.
const SITE = typeof location !== 'undefined' ? location.origin : 'https://rn-dev-onboarding.pages.dev'

// The launcher logic lives in public/herdr-launcher.{ps1,sh} so the common case
// is one paste with nothing to download. It takes the form values as arguments
// and pulls herdr's icon from the site; the leading-brace check there is what
// handles an unfilled {dest}.
// -IconUrl/--icon-url is passed rather than left to the script's default so the
// icon comes from whichever origin served the page, not always production.
const HERDR_LAUNCH_WIN = `& ([scriptblock]::Create((irm ${SITE}/herdr-launcher.ps1))) -Dest '{dest}' -IconUrl ${SITE}/herdr.ico`
const HERDR_LAUNCH_UNIX = `curl -fsSL ${SITE}/herdr-launcher.sh | sh -s -- --dest '{dest}' --icon-url ${SITE}/herdr.png`

// A dropped icon can't be hosted, so its bytes ride along in the command and get
// written to a temp file. Still one line: a multi-line script with a here-string
// silently does nothing when pasted, and asking the user to download the icon and
// leave it at an exact path failed the moment a browser saved it anywhere else.
const HERDR_LAUNCH_WIN_ICON = `$i = [IO.Path]::GetTempFileName(); [IO.File]::WriteAllBytes($i, [Convert]::FromBase64String('{iconData}')); & ([scriptblock]::Create((irm ${SITE}/herdr-launcher.ps1))) -Dest '{dest}' -IconFile $i; Remove-Item $i -Force`
const HERDR_LAUNCH_UNIX_ICON = `ICO=$(mktemp); printf %s '{iconData}' | base64 -d > "$ICO"; curl -fsSL ${SITE}/herdr-launcher.sh | sh -s -- --dest '{dest}' --icon-file "$ICO"; rm -f "$ICO"`

export const TOOLS: Tool[] = [
  // ─── System Essentials ───────────────────────────────────────────────
  {
    id: 'homebrew',
    category: 'essentials',
    name: 'Homebrew / winget',
    description: 'The package manager that installs everything else.',
    icon: 'package',
    order: 1,
    docsUrl: 'https://brew.sh',
    note: 'macOS & Linux use Homebrew. Windows ships with winget; this command installs Chocolatey as an extra.',
    // The installer sudos to create /opt/homebrew and also waits on a RETURN,
    // so it strands an unattended run on the very first card.
    elevated: true,
    // mac/linux only: this one card fronts three package managers, and on Windows
    // the name says winget while the button installs Chocolatey — no single number
    // describes that. Homebrew is unambiguous on the other two.
    version: { ...mac({ github: 'Homebrew/brew' }), linux: { github: 'Homebrew/brew' } },
    actions: {
      ...mac(BREW_INSTALL),
      linux: BREW_INSTALL,
      ...win(cmd(
        `Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`,
        'Copy Chocolatey install',
      )),
    },
  },
  {
    id: 'git',
    category: 'essentials',
    name: 'Git',
    description: 'Version control.',
    icon: 'git-branch',
    order: 2,
    docsUrl: 'https://git-scm.com/downloads',
    version: { github: 'git-for-windows/git' },
    modal: {
      intro: 'Set your commit identity once — every commit on this machine uses it.',
      fields: [
        { key: 'git-name', label: 'Full name', placeholder: 'Your Name' },
        { key: 'git-email', label: 'Work email', placeholder: 'you@company.com' },
      ],
      steps: [
        { command: `git config --global user.name '{git-name}'`, shellQuoted: true },
        { command: `git config --global user.email '{git-email}'`, shellQuoted: true },
      ],
    },
    actions: {
      ...mac(cmd('brew install git')),
      linux: cmd('sudo apt-get install -y git'),
      ...win(cmd('winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'node',
    category: 'essentials',
    name: 'Node.js (via fnm)',
    description: 'JS runtime + a version switcher.',
    icon: 'hexagon',
    order: 3,
    docsUrl: 'https://nodejs.org',
    version: { nodeLts: true },
    note: 'Installs fnm + Node LTS (v24) and hooks your shell so `node` works in every new terminal — and in tools that never open one, which is what the npx-based MCP servers need.',
    modal: {
      intro: 'fnm keeps Node versions side by side — each repo pins its own in a .nvmrc file, so upgrading one project never breaks another.',
      fields: [{ key: 'node-version', label: 'Node version', placeholder: '22' }],
      steps: [
        { command: 'fnm use', note: 'Inside a repo — switches this terminal to the version in its .nvmrc.', docsOnly: true },
        { command: 'fnm install', note: 'To upgrade a repo: edit its .nvmrc to the new version, then run this inside it. Other repos are unaffected.', docsOnly: true },
        { command: `fnm install '{node-version}'; fnm use '{node-version}'`, note: 'No .nvmrc? Install any version and switch this terminal to it directly.', docsOnly: true, shellQuoted: true },
        { command: `fnm default '{node-version}'`, note: 'Make a version the default for every terminal and folder without a .nvmrc.', docsOnly: true, shellQuoted: true },
        { command: 'fnm list', note: 'See installed versions and which is the default.', docsOnly: true },
      ],
    },
    actions: {
      // `;` not `&&`: the profile edit has to land even when the download fails,
      // or `node` works in this terminal and nowhere else.
      ...mac(cmd(`brew install fnm; fnm install --lts; fnm default lts-latest; ${FNM_STABLE_UNIX}; ${fnmShellHook('~/.zshrc')}; export PATH="$HOME/.local/bin:$PATH"; eval "$(fnm env --use-on-cd)"`)),
      linux: cmd(`curl -fsSL https://fnm.vercel.app/install | bash; fnm install --lts; fnm default lts-latest; ${FNM_STABLE_UNIX}; ${fnmShellHook('~/.bashrc')}; export PATH="$HOME/.local/bin:$PATH"; eval "$(fnm env --use-on-cd)"`),
      ...win(cmd('winget install --id Schniz.fnm -e --accept-source-agreements --accept-package-agreements; $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User"); Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force; fnm install --lts; fnm default lts-latest; [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:APPDATA\\fnm\\aliases\\default", "User"); if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }; Add-Content $PROFILE \'fnm env --use-on-cd | Out-String | Invoke-Expression\'; fnm env --use-on-cd | Out-String | Invoke-Expression')),
    },
  },
  {
    id: 'npm',
    category: 'essentials',
    name: 'npm',
    description: 'Ships with Node — this just updates it.',
    icon: 'boxes',
    order: 4,
    docsUrl: 'https://docs.npmjs.com',
    version: { npm: 'npm' },
    note: 'Nothing to install: Node includes npm. Run this only to bump it to the latest.',
    actions: {
      ...mac(cmd('npm install -g npm@latest')),
      linux: cmd('npm install -g npm@latest'),
      ...win(cmd('npm install -g npm@latest')),
    },
  },
  {
    id: 'corepack',
    category: 'essentials',
    name: 'Corepack',
    description: 'Manages pnpm/yarn versions — enable it before those cards.',
    icon: 'package-check',
    order: 5,
    docsUrl: 'https://github.com/nodejs/corepack',
    version: { npm: 'corepack' },
    note: 'Corepack ships with Node but is off by default (and is unbundled in newer Node releases). This enables it, installing it via npm first if it’s missing. Run this before the pnpm/yarn cards.',
    actions: {
      ...mac(cmd('corepack enable || (npm install -g corepack && corepack enable)')),
      linux: cmd('corepack enable || (npm install -g corepack && corepack enable)'),
      ...win(cmd('corepack enable; if (-not $?) { npm install -g corepack; corepack enable }')),
    },
  },
  {
    id: 'pnpm',
    category: 'essentials',
    name: 'pnpm (via Corepack)',
    description: 'Fast package manager, pinned per repo.',
    icon: 'package-2',
    order: 6,
    docsUrl: 'https://pnpm.io',
    version: { npm: 'pnpm' },
    modal: {
      intro: "Corepack always runs the exact pnpm version pinned in a repo's package.json (the packageManager field) — every dev gets the same one automatically.",
      prereq: 'Corepack enabled (card above).',
      fields: [{ key: 'version', label: 'pnpm version', placeholder: 'latest' }],
      steps: [
        { command: `corepack use pnpm@'{version}'`, note: 'Inside a repo — changes its pin and updates package.json for the whole team.', docsOnly: true, shellQuoted: true },
      ],
    },
    actions: {
      ...mac(cmd('corepack prepare pnpm@latest --activate')),
      linux: cmd('corepack prepare pnpm@latest --activate'),
      ...win(cmd('corepack prepare pnpm@latest --activate')),
    },
  },
  {
    id: 'yarn',
    category: 'essentials',
    name: 'Yarn (via Corepack)',
    description: 'Alternative package manager, pinned per repo.',
    icon: 'package',
    order: 7,
    docsUrl: 'https://yarnpkg.com',
    version: { npm: '@yarnpkg/cli' },
    modal: {
      intro: "Like pnpm: the version pinned in a repo's packageManager field always wins, for every dev.",
      prereq: 'Corepack enabled (card above).',
      fields: [{ key: 'version', label: 'Yarn version', placeholder: 'stable' }],
      steps: [
        { command: `corepack use yarn@'{version}'`, note: 'Inside a repo — changes its pin and updates package.json for the whole team.', docsOnly: true, shellQuoted: true },
      ],
    },
    actions: {
      ...mac(cmd('corepack prepare yarn@stable --activate')),
      linux: cmd('corepack prepare yarn@stable --activate'),
      ...win(cmd('corepack prepare yarn@stable --activate')),
    },
  },
  {
    id: 'watchman',
    category: 'essentials',
    name: 'Watchman',
    description: 'File watcher required by RN on macOS.',
    icon: 'eye',
    order: 8,
    docsUrl: 'https://facebook.github.io/watchman/',
    version: { github: 'facebook/watchman' },
    actions: { ...mac(cmd('brew install watchman')) },
  },
  {
    id: 'cocoapods',
    category: 'essentials',
    name: 'Ruby + CocoaPods',
    description: 'iOS native dependency manager.',
    icon: 'gem',
    order: 9,
    docsUrl: 'https://cocoapods.org',
    version: { github: 'CocoaPods/CocoaPods' },
    note: 'iOS tooling — macOS only. In a project with a Gemfile, use `bundle install` instead.',
    actions: { ...mac(cmd('brew install cocoapods')) },
  },
  {
    id: 'jdk',
    category: 'essentials',
    name: 'JDK 17',
    description: 'Java 17 — the version React Native targets.',
    icon: 'coffee',
    order: 10,
    docsUrl: 'https://openjdk.org/projects/jdk/17/',
    // One card, a different JDK per OS — Azul Zulu via cask, Microsoft's build via
    // winget, the distro's OpenJDK via apt. They track the same upstream 17.0.x,
    // but only the macOS one has a source worth badging: Windows publishes its
    // number solely as folder names in winget-pkgs ([0021]) and apt's depends on
    // the release.
    version: { ...mac({ brew: 'zulu@17' }) },
    note: 'React Native needs JDK 17 specifically, not the newest Java. On Windows, set JAVA_HOME after installing (second step below) — Gradle and `react-native doctor` both read it, and it must be set from your own shell, not an elevated one.',
    sizeMb: 185,
    // zulu@17 is a `pkg` cask. The formula openjdk@17 would avoid the prompt but
    // is keg-only, and its own caveats want a sudo symlink for
    // /usr/libexec/java_home to see it — so it trades one prompt for another
    // plus a hardcoded JAVA_HOME.
    elevated: true,
    actions: {
      ...mac(cmd('brew install --cask zulu@17')),
      linux: cmd('sudo apt-get install -y openjdk-17-jdk'),
      ...win(cmd('winget install --id Microsoft.OpenJDK.17 -e --accept-source-agreements --accept-package-agreements')),
    },
    modal: {
      intro: 'On Windows the install and the JAVA_HOME setting have to happen in separate shells.',
      steps: [
        {
          command: { ...win(JAVA_HOME_WIN) },
          note: 'Run this in your OWN PowerShell, not an elevated one — "User" scope writes to whichever account the shell belongs to, so from an Administrator window it lands in the admin\'s profile and yours never gets JAVA_HOME. Restart your terminal after.',
        },
      ],
    },
  },
  {
    id: 'fastlane',
    category: 'essentials',
    name: 'fastlane',
    description: 'Automate iOS & Android builds and releases.',
    icon: 'ship',
    order: 11,
    docsUrl: 'https://docs.fastlane.tools/',
    version: { github: 'fastlane/fastlane' },
    note: 'macOS only here — iOS lanes require it, and releases are cut from macOS or CI. It needs Ruby, which Homebrew handles.',
    actions: { ...mac(cmd('brew install fastlane')) },
  },
  {
    id: 'ssh-key',
    category: 'essentials',
    name: 'SSH key for Bitbucket',
    description: 'Generate a key so you can clone repos.',
    icon: 'key-round',
    order: 12,
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/set-up-personal-ssh-keys-on-macos/',
    modal: {
      intro: 'Generate a key, add it to Bitbucket, verify — then `git clone` away.',
      fields: [{ key: 'email', label: 'Work email', placeholder: 'you@company.com' }],
      steps: [
        {
          command: {
            'mac-arm': `ssh-keygen -t ed25519 -C '{email}' && pbcopy < ~/.ssh/id_ed25519.pub`,
            'mac-intel': `ssh-keygen -t ed25519 -C '{email}' && pbcopy < ~/.ssh/id_ed25519.pub`,
            linux: `ssh-keygen -t ed25519 -C '{email}' && cat ~/.ssh/id_ed25519.pub`,
            'win-x64': `ssh-keygen -t ed25519 -C '{email}'; Get-Content $env:USERPROFILE\\.ssh\\id_ed25519.pub | clip`,
            'win-arm': `ssh-keygen -t ed25519 -C '{email}'; Get-Content $env:USERPROFILE\\.ssh\\id_ed25519.pub | clip`,
          },
          shellQuoted: true,
          note: 'Run anywhere — the key is saved for your whole account (`~/.ssh`, or `%USERPROFILE%\\.ssh` on Windows) and works for every repo. ssh-keygen asks a few questions (save location, passphrase); hit Enter at each to accept the defaults. Your public key lands on the clipboard (Linux: printed — copy it).',
        },
        {
          command: 'bitbucket.org → your avatar → Personal settings → SSH keys → Add key → paste',
          note: 'In the browser.',
          manual: true,
        },
        { command: 'ssh -T git@bitbucket.org', note: 'Verify — expect "authenticated via ssh key".' },
      ],
    },
  },

  // ─── Development Apps ────────────────────────────────────────────────
  {
    id: 'vscode',
    category: 'apps',
    name: 'VS Code',
    description: 'The editor.',
    icon: 'code',
    order: 1,
    docsUrl: 'https://code.visualstudio.com',
    version: { github: 'microsoft/vscode' },
    sizeMb: 305,
    actions: {
      'mac-arm': link('https://update.code.visualstudio.com/latest/darwin-arm64/stable'),
      'mac-intel': link('https://update.code.visualstudio.com/latest/darwin/stable'),
      'win-x64': link('https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user'),
      'win-arm': link('https://code.visualstudio.com/sha/download?build=stable&os=win32-arm64-user'),
      linux: link('https://code.visualstudio.com/download', 'Open downloads'),
    },
    secondary: {
      ...mac(cmd('brew install --cask visual-studio-code')),
      ...win(cmd('winget install --id Microsoft.VisualStudioCode -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'cursor',
    category: 'apps',
    name: 'Cursor',
    description: 'AI-first code editor (VS Code fork).',
    icon: 'code',
    order: 2,
    docsUrl: 'https://cursor.com',
    version: { brew: 'cursor' },
    sizeMb: 269,
    actions: {
      ...mac(link('https://cursor.com/downloads', 'Download Cursor')),
      linux: link('https://cursor.com/downloads', 'Download Cursor'),
      ...win(link('https://cursor.com/downloads', 'Download Cursor')),
    },
    secondary: {
      ...mac(cmd('brew install --cask cursor')),
      ...win(cmd('winget install --id Anysphere.Cursor -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'xcode',
    category: 'apps',
    name: 'Xcode',
    description: 'iOS builds and the Simulator (macOS).',
    icon: 'apple',
    order: 3,
    docsUrl: 'https://developer.apple.com/xcode/',
    // 3.5 GB for Xcode itself plus 8.5 GB for the iOS 26 simulator runtime.
    sizeMb: 12000,
    actions: { ...mac(link('https://apps.apple.com/us/app/xcode/id497799835', 'Open in App Store')) },
    modal: {
      intro: 'Install from the App Store (button on the card), then finish these steps.',
      steps: [
        { command: 'xcode-select --install', note: 'Installs the Command Line Tools — run in your terminal.' },
        {
          command: 'sudo xcode-select -s /Applications/Xcode.app',
          note: 'Points the toolchain at Xcode instead of the Command Line Tools — without it iOS builds fail even though Xcode is installed. Run it yourself in a terminal: it asks for your password, and it can only run once Xcode has finished downloading.',
          userRun: true,
        },
        {
          command: 'sudo xcodebuild -runFirstLaunch',
          note: 'Installs the required components the first launch otherwise asks about. They land in root-owned /Library/Developer, so this needs your password — run it in the same terminal as the step above.',
          userRun: true,
        },
        {
          command: 'xcodebuild -downloadPlatform iOS',
          note: 'Adds the iOS Simulator runtime — ~8.5 GB, the longest download in the whole setup. Check it landed with `xcrun simctl list runtimes`.',
        },
        {
          command: 'Xcode → Settings → Platforms → download iOS',
          note: 'Only if the command above fails — same result, more clicks.',
          manual: true,
          alt: true,
        },
      ],
    },
  },
  {
    id: 'android-studio',
    category: 'apps',
    name: 'Android Studio',
    description: 'Android SDK, emulator, and AVDs.',
    icon: 'smartphone',
    order: 4,
    docsUrl: 'https://developer.android.com/studio',
    version: { brew: 'android-studio' },
    // 1.4 GB for the dmg plus ~2 GB of SDK, emulator and system image.
    sizeMb: 3500,
    actions: {
      ...mac(link('https://developer.android.com/studio', 'Download Android Studio')),
      linux: link('https://developer.android.com/studio', 'Download Android Studio'),
      ...win(link('https://developer.android.com/studio', 'Download Android Studio')),
    },
    secondary: {
      ...mac(cmd('brew install --cask android-studio')),
      ...win(cmd('winget install --id Google.AndroidStudio -e --accept-source-agreements --accept-package-agreements')),
    },
    modal: {
      intro: 'Download from the card, install with defaults, then do these three steps — SDK, emulator, environment.',
      steps: [
        {
          command: 'Android Studio → More Actions → SDK Manager → check "Android SDK Platform 35" + "Android SDK Platform-Tools" → Apply',
          note: 'The first launch shows a setup wizard — accept the defaults, then do this.',
          manual: true,
        },
        {
          command: 'More Actions → Virtual Device Manager → Create Device',
          note: 'Any Pixel is fine — this is the emulator your RN app runs on.',
          manual: true,
          tooltip: 'Doing this from the command line instead? `avdmanager create avd` prints two `Error: Could not load devices from …/devices.xml` lines even when it succeeds — that file is optional and the system image ships none. Check `avdmanager list avd` rather than the exit output.',
        },
        {
          command: {
            'mac-arm': ANDROID_ENV_MAC,
            'mac-intel': ANDROID_ENV_MAC,
            linux: ANDROID_ENV_LINUX,
            'win-x64': ANDROID_ENV_WIN,
            'win-arm': ANDROID_ENV_WIN,
          },
          note: 'Sets ANDROID_HOME + PATH so builds and adb find the SDK. Restart your terminal after.',
        },
      ],
    },
  },
  {
    id: 'docker',
    category: 'apps',
    name: 'Docker Desktop',
    description: 'Containers (only if your project uses them).',
    icon: 'container',
    order: 5,
    docsUrl: 'https://www.docker.com/products/docker-desktop/',
    version: { brew: 'docker-desktop' },
    sizeMb: 550,
    // Installs a privileged helper, so it asks twice on macOS.
    elevated: true,
    actions: {
      'mac-arm': link('https://desktop.docker.com/mac/main/arm64/Docker.dmg'),
      'mac-intel': link('https://desktop.docker.com/mac/main/amd64/Docker.dmg'),
      'win-x64': link('https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe'),
      'win-arm': link('https://desktop.docker.com/win/main/arm64/Docker%20Desktop%20Installer.exe'),
      linux: link('https://docs.docker.com/desktop/setup/install/linux/', 'Open install guide'),
    },
    secondary: {
      ...mac(cmd('brew install --cask docker-desktop')),
      ...win(cmd('winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'reactotron',
    category: 'apps',
    name: 'Reactotron',
    description: 'Inspect RN state, logs, and network calls.',
    icon: 'activity',
    order: 6,
    docsUrl: 'https://github.com/infinitered/reactotron/releases',
    version: { github: 'infinitered/reactotron' },
    sizeMb: 112,
    actions: {
      ...mac(cmd('brew install --cask reactotron')),
      linux: link('https://github.com/infinitered/reactotron/releases', 'Download (releases)'),
      ...win(link('https://github.com/infinitered/reactotron/releases', 'Download (releases)')),
    },
    secondary: {
      ...win(cmd('winget install --id InfiniteRed.Reactotron -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'mongodb-compass',
    category: 'apps',
    name: 'MongoDB Compass',
    description: 'GUI for MongoDB — browse data, run queries.',
    icon: 'database',
    order: 7,
    docsUrl: 'https://www.mongodb.com/products/tools/compass',
    version: { github: 'mongodb-js/compass' },
    sizeMb: 157,
    actions: {
      ...mac(link('https://www.mongodb.com/try/download/compass', 'Download Compass')),
      linux: link('https://www.mongodb.com/try/download/compass', 'Download Compass'),
      ...win(link('https://www.mongodb.com/try/download/compass', 'Download Compass')),
    },
    secondary: {
      ...mac(cmd('brew install --cask mongodb-compass')),
      ...win(cmd('winget install --id MongoDB.Compass.Full -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'pgadmin',
    category: 'apps',
    name: 'pgAdmin 4',
    description: 'GUI for PostgreSQL — browse data, run queries.',
    icon: 'database',
    order: 8,
    docsUrl: 'https://www.pgadmin.org',
    version: { brew: 'pgadmin4' },
    sizeMb: 222,
    actions: {
      ...mac(link('https://www.pgadmin.org/download/', 'Download pgAdmin')),
      linux: link('https://www.pgadmin.org/download/', 'Download pgAdmin'),
      ...win(link('https://www.pgadmin.org/download/', 'Download pgAdmin')),
    },
    secondary: {
      ...mac(cmd('brew install --cask pgadmin4')),
      ...win(cmd('winget install --id PostgreSQL.pgAdmin -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'postman',
    category: 'apps',
    name: 'Postman',
    description: 'Build, test & document API requests.',
    icon: 'zap',
    order: 9,
    docsUrl: 'https://learning.postman.com',
    version: { brew: 'postman' },
    sizeMb: 138,
    actions: {
      ...mac(link('https://www.postman.com/downloads/', 'Download Postman')),
      linux: link('https://www.postman.com/downloads/', 'Download Postman'),
      ...win(link('https://www.postman.com/downloads/', 'Download Postman')),
    },
    secondary: {
      ...mac(cmd('brew install --cask postman')),
      ...win(cmd('winget install --id Postman.Postman -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'termius',
    category: 'apps',
    name: 'Termius',
    description: 'SSH client with synced hosts & keys.',
    icon: 'monitor',
    order: 10,
    docsUrl: 'https://termius.com',
    version: { brew: 'termius' },
    sizeMb: 159,
    actions: {
      ...mac(link('https://termius.com/download', 'Download Termius')),
      linux: link('https://termius.com/download', 'Download Termius'),
      ...win(link('https://termius.com/download', 'Download Termius')),
    },
    secondary: {
      ...mac(cmd('brew install --cask termius')),
      ...win(cmd('winget install --id Termius.Termius -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'cisco-vpn',
    category: 'apps',
    name: 'Cisco Secure Client (VPN)',
    description: 'Company VPN access.',
    icon: 'shield',
    order: 11,
    docsUrl: 'https://www.cisco.com/site/us/en/products/security/secure-client/index.html',
    modal: {
      intro: "Cisco doesn't offer a public download — the installer comes from your company VPN portal (or IT).",
      fields: [{ key: 'vpn-portal', label: 'Company VPN portal URL', placeholder: 'https://vpn.company.com' }],
      steps: [
        { command: 'Open {vpn-portal} in your browser, sign in, and download Cisco Secure Client', manual: true },
        { command: 'Install it, then connect to {vpn-portal} in the app with your company credentials', manual: true },
      ],
    },
  },
  {
    id: 'cliq-desktop',
    category: 'apps',
    name: 'Zoho Cliq (desktop)',
    description: 'Team chat app.',
    icon: 'message-circle',
    order: 12,
    docsUrl: 'https://www.zoho.com/cliq/',
    version: { brew: 'zoho-cliq' },
    sizeMb: 108,
    // pkg on macOS, but `Scope: user` in the winget manifest.
    elevated: { ...mac(true) },
    actions: {
      ...mac(link('https://www.zoho.com/cliq/desktop/osx.html', 'Download Cliq')),
      linux: link('https://www.zoho.com/cliq/desktop/linux.html', 'Download Cliq'),
      ...win(link('https://www.zoho.com/cliq/desktop/windows.html', 'Download Cliq')),
    },
    secondary: {
      ...mac(cmd('brew install --cask zoho-cliq')),
      ...win(cmd('winget install --id Zoho.Cliq -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'teams-desktop',
    category: 'apps',
    name: 'Microsoft Teams (desktop)',
    description: 'Team chat and meetings.',
    icon: 'users',
    order: 13,
    docsUrl: 'https://www.microsoft.com/en-us/microsoft-teams/download-app',
    // Mac only: Teams ships a different build per OS and the cask carries the
    // macOS one, so a single badge would be wrong on Windows. The Windows number
    // is only published as folder names in the winget-pkgs repo — a 63 KB
    // directory listing for one badge, declined in 0021.
    version: { ...mac({ brew: 'microsoft-teams' }) },
    sizeMb: 332,
    // macOS ships a pkg; the winget package is a user-scope MSIX with no
    // ElevationRequirement, and a user MSIX installed from an elevated shell
    // lands under the wrong account, so Windows must NOT be in the block.
    elevated: { ...mac(true) },
    actions: {
      ...mac(link('https://www.microsoft.com/en-us/microsoft-teams/download-app', 'Download Teams')),
      linux: link('https://www.microsoft.com/en-us/microsoft-teams/download-app', 'Download Teams'),
      ...win(link('https://www.microsoft.com/en-us/microsoft-teams/download-app', 'Download Teams')),
    },
    secondary: {
      ...mac(cmd('brew install --cask microsoft-teams')),
      ...win(cmd('winget install --id Microsoft.Teams -e --accept-source-agreements --accept-package-agreements')),
    },
  },
  {
    id: 'slack-desktop',
    category: 'apps',
    name: 'Slack (desktop)',
    description: 'Team chat app.',
    icon: 'hash',
    order: 14,
    docsUrl: 'https://slack.com/downloads',
    version: { brew: 'slack' },
    sizeMb: 111,
    actions: {
      'mac-arm': link('https://slack.com/ssb/download-osx-silicon'),
      'mac-intel': link('https://slack.com/ssb/download-osx'),
      'win-x64': link('https://slack.com/ssb/download-win64'),
      'win-arm': link('https://slack.com/downloads/windows', 'Download Slack'),
      linux: link('https://slack.com/downloads/linux', 'Download Slack'),
    },
    secondary: {
      ...mac(cmd('brew install --cask slack')),
      ...win(cmd('winget install --id SlackTechnologies.Slack -e --accept-source-agreements --accept-package-agreements')),
    },
  },

  // ─── React Native Setup ──────────────────────────────────────────────
  {
    id: 'rn-init',
    category: 'rn',
    name: 'Create a React Native app',
    description: 'Bare React Native CLI project.',
    icon: 'rocket',
    order: 1,
    inScript: false,
    docsUrl: 'https://reactnative.dev/docs/getting-started-without-a-framework',
    version: { npm: 'react-native' },
    note: 'Uses the community CLI for a bare native project. Expo is the alternative below.',
    actions: {
      ...mac(cmd('npx @react-native-community/cli@latest init MyApp')),
      linux: cmd('npx @react-native-community/cli@latest init MyApp'),
      ...win(cmd('npx @react-native-community/cli@latest init MyApp')),
    },
    secondary: {
      ...mac(cmd('npx create-expo-app@latest MyApp', 'Copy Expo init')),
      linux: cmd('npx create-expo-app@latest MyApp', 'Copy Expo init'),
      ...win(cmd('npx create-expo-app@latest MyApp', 'Copy Expo init')),
    },
  },
  {
    id: 'rn-doctor',
    category: 'rn',
    name: 'Verify: react-native doctor',
    description: 'Check the whole toolchain in one command.',
    icon: 'stethoscope',
    order: 2,
    inScript: false,
    docsUrl: 'https://reactnative.dev/docs/environment-setup',
    note: 'Run it INSIDE an RN project (create one above first) — outside a project it only half-runs, then errors. Expect green checks for Node, JDK 17, Android SDK, and (macOS) Xcode / CocoaPods / Watchman.',
    actions: {
      ...mac(cmd('npx react-native doctor')),
      linux: cmd('npx react-native doctor'),
      ...win(cmd('npx react-native doctor')),
    },
  },

  // ─── AI Tools & Claude Code ────────────────────────────────────────────────────────
  {
    id: 'claude-code',
    category: 'ai',
    name: 'Claude Code',
    description: "Anthropic's agentic coding CLI.",
    icon: 'terminal',
    order: 1,
    docsUrl: 'https://docs.claude.com/en/docs/claude-code/overview',
    version: { npm: '@anthropic-ai/claude-code' },
    note: 'The npm install needs Node 22+.',
    modal: {
      intro: 'Install from the card, then sign in once — every MCP and plugin card below assumes this is done.',
      prereq: 'A Claude Pro/Max or Console account.',
      steps: [
        {
          command: 'claude',
          note: 'In a NEW terminal. The first run opens a browser sign-in; approve it and you stay logged in.',
          manual: true,
        },
        {
          command:
            'A status line keeps the model, context left and spend at the bottom of every session. Send one of the prompts below and Claude Code writes the script and wires it up; send another later to replace it.',
          note: 'Optional — pick one.',
          manual: true,
          tooltip:
            'The rate-limit figures need a Pro or Max plan and stay blank until the session’s first response — always blank on API billing. Permission mode can’t be shown at all; Claude Code draws that in its own footer.',
          link: { href: 'https://code.claude.com/docs/en/statusline', label: 'Status line docs' },
        },
        {
          command:
            '/statusline two lines. First: repo name and git branch, model display name, effort level, context used percentage. Second: 5-hour and weekly rate limit percentages each with time until reset, session cost in USD, lines added and removed, session duration. Add a "fast" flag on line one only when fast mode is on. Do not print the context window size separately — the model display name already carries it.',
          note: 'Recommended — the bar we run.',
          alt: true,
          preview:
            'rn-dev-onboarding:main │ Opus 5 (1M context) │ effort max │ ctx 30%\nsession 9% (4h31m) │ week 15% (6d13h) │ $16.57 │ +237 -25 │ 2h45m',
        },
        {
          command:
            '/statusline one line: repo name and git branch, model display name, effort level, context used percentage, lines added and removed. Cache the git lookup per session.',
          note: 'One line. Keeps where you are and what you’ve changed; loses the usage limits, cost and session clock.',
          alt: true,
          preview: 'rn-dev-onboarding:main │ Opus 5 │ effort max │ ctx 30% │ +237 -25',
        },
        {
          command: '/statusline one line, no git: model display name, effort level, context used percentage.',
          note: 'One line, and the quickest to draw — no git lookup, so no branch either.',
          alt: true,
          preview: 'Opus 5 │ effort max │ ctx 30%',
        },
      ],
    },
    actions: {
      ...mac(cmd('curl -fsSL https://claude.ai/install.sh | bash')),
      linux: cmd('curl -fsSL https://claude.ai/install.sh | bash'),
      ...win(cmd('irm https://claude.ai/install.ps1 | iex')),
    },
    secondary: {
      ...mac(cmd('npm install -g @anthropic-ai/claude-code', 'Copy npm install')),
      linux: cmd('npm install -g @anthropic-ai/claude-code', 'Copy npm install'),
      ...win(cmd('npm install -g @anthropic-ai/claude-code', 'Copy npm install')),
    },
  },
  {
    id: 'herdr',
    category: 'ai',
    name: 'herdr',
    description: 'A terminal multiplexer for AI coding agents.',
    icon: 'layout-grid',
    order: 2,
    docsUrl: 'https://github.com/ogulcancelik/herdr',
    version: { github: 'ogulcancelik/herdr' },
    modal: {
      intro: 'herdr saves your tabs and folders itself; reopening each pane in the Claude conversation you left it in is the integration\'s job. The launcher is optional — one paste for a double-clickable shortcut carrying its own icon, nothing to download.',
      prereq: 'herdr installed (this card); Claude Code installed (card above) for the integration step.',
      fields: [
        { key: 'dest', label: 'Install to', placeholder: 'Desktop' },
        { key: 'iconData', label: 'Custom icon', kind: 'image' },
      ],
      steps: [
        {
          command: 'herdr integration install claude',
          note: 'Once per machine. Without it a restart returns your tabs as bare shells; with it each pane reopens in the conversation you left. Keep one conversation per pane — two panes sharing one and only one comes back.',
        },
        {
          command: {
            'mac-arm': HERDR_LAUNCH_UNIX,
            'mac-intel': HERDR_LAUNCH_UNIX,
            linux: HERDR_LAUNCH_UNIX,
            'win-x64': HERDR_LAUNCH_WIN,
            'win-arm': HERDR_LAUNCH_WIN,
          },
          note: 'Paste in a terminal. Both fields are optional — leave them alone and the launcher lands on your Desktop with herdr\'s own icon. Linux: right-click the launcher → Allow Launching the first time.',
          docsOnly: true,
          shellQuoted: true,
          whenFieldUnset: 'iconData',
        },
        {
          command: {
            'mac-arm': HERDR_LAUNCH_UNIX_ICON,
            'mac-intel': HERDR_LAUNCH_UNIX_ICON,
            linux: HERDR_LAUNCH_UNIX_ICON,
            'win-x64': HERDR_LAUNCH_WIN_ICON,
            'win-arm': HERDR_LAUNCH_WIN_ICON,
          },
          note: 'Paste in a terminal. Your icon is carried inside this line, so it is long — copy it with the button rather than by hand.',
          docsOnly: true,
          shellQuoted: true,
          whenFieldSet: 'iconData',
        },
      ],
    },
    actions: {
      ...mac(cmd('curl -fsSL https://herdr.dev/install.sh | sh')),
      linux: cmd('curl -fsSL https://herdr.dev/install.sh | sh'),
      ...win(cmd('powershell -ExecutionPolicy Bypass -c "irm https://herdr.dev/install.ps1 | iex"', 'Copy install (beta)')),
    },
    secondary: { ...mac(cmd('brew install herdr', 'Copy brew install')) },
  },
  {
    id: 'superpowers',
    category: 'ai',
    name: 'Superpowers',
    description: 'Skills framework — brainstorm, plan, TDD, debugging.',
    icon: 'zap',
    order: 4,
    docsUrl: 'https://github.com/obra/superpowers',
    version: { github: 'obra/superpowers' },
    modal: {
      intro: 'Teaches Claude a disciplined workflow: brainstorm → plan → TDD → verify. Send each command as its own prompt in Claude Code.',
      steps: [
        // Full HTTPS URL, not the owner/repo shorthand: the shorthand can resolve
        // to SSH, and a machine set up by this app has a key for Bitbucket, not
        // GitHub, so the clone fails on host-key or publickey.
        { command: '/plugin marketplace add https://github.com/obra/superpowers-marketplace.git', note: 'Send this as its own prompt.' },
        { command: '/plugin install superpowers@superpowers-marketplace', note: 'Then send this as a separate prompt.' },
      ],
    },
  },
  {
    id: 'ponytail',
    category: 'ai',
    name: 'Ponytail',
    description: 'Stops over-engineering — least code, no stray deps.',
    icon: 'scissors',
    order: 6,
    docsUrl: 'https://github.com/DietrichGebert/ponytail',
    version: { github: 'DietrichGebert/ponytail' },
    note: 'Ships two Node lifecycle hooks that run on Claude Code events — skim them before you approve. Takes effect in a new session.',
    modal: {
      intro: 'A lazy-senior-dev mindset: no speculative abstractions, no scaffolding for later, standard library before a new dependency. Send each command as its own prompt in Claude Code.',
      steps: [
        { command: '/plugin marketplace add https://github.com/DietrichGebert/ponytail.git', note: 'Send this as its own prompt.' },
        { command: '/plugin install ponytail@ponytail', note: 'Then send this as a separate prompt.' },
      ],
    },
  },
  {
    id: 'ui-ux-pro-max',
    category: 'ai',
    name: 'UI/UX Pro Max',
    description: 'Design intelligence — styles, palettes, RN UX rules.',
    icon: 'palette',
    order: 7,
    docsUrl: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    version: { github: 'nextlevelbuilder/ui-ux-pro-max-skill' },
    modal: {
      intro: 'Our frontend design skill — treats React Native as a first-class stack.',
      steps: [
        { command: '/plugin marketplace add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git', note: 'Send as its own prompt.' },
        { command: '/plugin install ui-ux-pro-max@ui-ux-pro-max-skill', note: 'Then a separate prompt.' },
      ],
    },
  },

  // ─── MCP Servers (configure inside Claude Code) ───
  {
    id: 'context7',
    category: 'mcp',
    name: 'Context7',
    description: 'Version-pinned library docs, fed into Claude.',
    icon: 'book-open',
    order: 1,
    docsUrl: 'https://context7.com',
    note: 'Stops Claude using outdated APIs. A free key (context7.com) raises rate limits.',
    actions: {
      ...mac(cmd('claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp')),
      linux: cmd('claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp'),
      ...win(cmd('claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp')),
    },
  },
  {
    id: 'atlassian-mcp',
    category: 'mcp',
    name: 'Atlassian',
    description: 'Jira, Confluence and Bitbucket from Claude.',
    icon: 'git-pull-request',
    order: 2,
    docsUrl: 'https://github.com/aashari/mcp-server-atlassian-bitbucket',
    version: { npm: '@aashari/mcp-server-atlassian-bitbucket' },
    note: 'Community packages rather than Atlassian\'s own: three servers by one maintainer, holding a token stored in cleartext in ~/.claude.json with write access to all three products. Atlassian\'s Rovo server gates Bitbucket per organisation, so an org that has not enabled it gets none at all.',
    inScript: false,
    modal: {
      intro: 'One token, then one command per product you want.',
      fields: [
        { key: 'email', label: 'Atlassian account email', placeholder: 'you@company.com' },
        { key: 'token', label: 'API token, from step 1', placeholder: 'ATATT3xFfGF0…' },
        { key: 'site', label: 'Site, from your Jira or Confluence URL', placeholder: 'yourteam' },
      ],
      steps: [
        {
          command: 'Create API token with scopes → name it → shortest expiry you can live with → pick the product → tick its scopes → copy it.',
          note: 'Get a token.',
          manual: true,
          link: { href: 'https://id.atlassian.com/manage-profile/security/api-tokens', label: 'Atlassian API tokens' },
          tooltip: 'Atlassian shows the token once, so copy it before leaving the page, and one token covers all three products. Scopes cannot be changed later, so tick everything you will want. Jira: read:jira-work, write:jira-work, read:jira-user. Confluence: read:confluence-content.all, write:confluence-content, read:confluence-space.summary. Bitbucket, each suffixed :bitbucket: read:repository, write:repository, read:pullrequest, write:pullrequest, read:user.',
        },
        {
          command: 'Run these yourself in a terminal. Any one product works alone, the same token covers all three, and the token should not go into a chat.',
          note: 'Add a server.',
          manual: true,
          tooltip: 'The -e flags have to come after the server name: -e takes repeated values, so a name placed after them is read as one more environment variable and the command fails.',
        },
        {
          command: `claude mcp add --scope user bitbucket -e ATLASSIAN_USER_EMAIL='{email}' -e ATLASSIAN_API_TOKEN='{token}' -- npx -y @aashari/mcp-server-atlassian-bitbucket`,
          note: 'Bitbucket, which needs no site.',
          alt: true,
          shellQuoted: true,
        },
        {
          command: `claude mcp add --scope user jira -e ATLASSIAN_SITE_NAME='{site}' -e ATLASSIAN_USER_EMAIL='{email}' -e ATLASSIAN_API_TOKEN='{token}' -- npx -y @aashari/mcp-server-atlassian-jira`,
          note: 'Jira.',
          alt: true,
          shellQuoted: true,
        },
        {
          command: `claude mcp add --scope user confluence -e ATLASSIAN_SITE_NAME='{site}' -e ATLASSIAN_USER_EMAIL='{email}' -e ATLASSIAN_API_TOKEN='{token}' -- npx -y @aashari/mcp-server-atlassian-confluence`,
          note: 'Confluence.',
          alt: true,
          shellQuoted: true,
        },
        {
          command: 'Restart Claude Code, then ask for one real issue, page or pull request.',
          note: 'Prove it works.',
          manual: true,
          tooltip: 'A tool list is read when a client connects, so a server added mid-session stays invisible until a restart. Connected only means the process started and answered; whether the token is valid is what one real call settles.',
        },
      ],
    },
  },
  {
    id: 'xcodebuild-mcp',
    category: 'mcp',
    name: 'XcodeBuildMCP',
    description: 'Build, run & test iOS from Claude (macOS).',
    icon: 'apple',
    order: 3,
    inScript: false,
    docsUrl: 'https://github.com/getsentry/XcodeBuildMCP',
    version: { npm: 'xcodebuildmcp' },
    note: 'Requires macOS 14.5+ and Xcode 16+. Run this inside the repo you want it in — it registers into the repo, not your machine.',
    actions: { ...mac(cmd('claude mcp add --scope project XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp')) },
  },
  {
    id: 'sentry-mcp',
    category: 'mcp',
    name: 'Sentry',
    description: 'Pull crash issues with full context into Claude.',
    icon: 'bug',
    order: 5,
    inScript: false,
    docsUrl: 'https://mcp.sentry.dev',
    modal: {
      intro: 'Pull Sentry crash issues, with full context, straight into Claude.',
      prereq: 'Run this inside the repo you want it in — it registers into the repo, not your machine. The first Claude session there asks you to approve the repo\u2019s servers — approve before logging in.',
      steps: [
        { command: 'claude mcp add --scope project --transport http sentry https://mcp.sentry.dev/mcp', note: 'Register the server.' },
        { command: 'claude mcp login sentry', note: 'Authenticate in the browser window it opens.' },
      ],
    },
  },
  {
    id: 'firebase-mcp',
    category: 'mcp',
    name: 'Firebase (Crashlytics)',
    description: 'Pull Crashlytics crash issues into Claude.',
    icon: 'activity',
    order: 6,
    inScript: false,
    docsUrl: 'https://firebase.google.com/docs/crashlytics/ai-assistance-mcp',
    version: { npm: 'firebase-tools' },
    modal: {
      intro: 'Pull Crashlytics crash issues into Claude via the Firebase CLI.',
      prereq: 'Run this inside the repo you want it in — it registers into the repo, not your machine.',
      steps: [
        { command: 'npx -y firebase-tools@latest login', note: 'The MCP server reuses your Firebase CLI credentials.' },
        { command: 'claude mcp add --scope project firebase -- npx -y firebase-tools@latest mcp', note: 'Then register the server.' },
      ],
    },
  },
  {
    id: 'figma-mcp',
    category: 'mcp',
    name: 'Figma (Dev Mode)',
    description: 'Turn Figma designs into code.',
    icon: 'figma',
    order: 7,
    docsUrl: 'https://help.figma.com/hc/en-us/articles/39888612464151-Claude-Code-and-Figma-Set-up-the-MCP-server',
    modal: {
      intro: 'Lets Claude read your Figma designs and match them in code.',
      prereq: 'Figma desktop app (latest) with a Dev or Full seat.',
      steps: [
        { command: 'Figma → menu → Preferences → Enable Dev Mode MCP Server', note: 'Do this in the Figma desktop app first.', manual: true },
        { command: 'claude mcp add --scope user --transport http figma-dev-mode http://127.0.0.1:3845/mcp', note: 'Then run this in your terminal.' },
      ],
    },
  },
  {
    id: 'slack-mcp',
    category: 'mcp',
    name: 'Slack',
    description: 'Read and post to Slack from Claude.',
    icon: 'hash',
    order: 8,
    docsUrl: 'https://docs.slack.dev/ai/slack-mcp-server/connect-to-claude/',
    modal: {
      intro: "Slack's official plugin — the MCP server is configured automatically; you authenticate via OAuth on first use.",
      prereq: 'A workspace admin must approve the MCP integration before you can authenticate.',
      steps: [
        { command: '/plugin install slack@claude-plugins-official', note: 'Run inside Claude Code.' },
      ],
    },
  },
  {
    id: 'zoho-cliq-mcp',
    category: 'mcp',
    name: 'Zoho MCP',
    description: 'Team chat, tickets and more from Claude.',
    icon: 'message-circle',
    order: 9,
    docsUrl: 'https://www.zoho.com/mcp/',
    note: 'One server per Zoho app. A single server carrying two apps loaded 166 tools, and the console has no bulk untick — so pick the tools while creating it.',
    modal: {
      intro: 'Create one server in Zoho’s console, register it, then repeat for the next app.',
      prereq: 'A Zoho plan that includes Zoho MCP. It is licensed separately, so check with your admin.',
      fields: [
        { key: 'name', label: 'Server name, your choice', placeholder: 'zoho-cliq' },
        { key: 'mcp-url', label: 'Server URL, from the Connect tab', placeholder: 'https://cliq-…zohomcp.com/mcp/…/message' },
      ],
      steps: [
        {
          command: 'Create MCP server → pick one app → tick only the tools you need → Connect tab → copy the URL.',
          note: 'Create the server.',
          manual: true,
          link: { href: 'https://mcp.zoho.com', label: 'Zoho MCP console' },
          tooltip: 'Create MCP server, not one of the pre-configured ones — "Cliq Messaging" connects and then exposes zero tools. Use mcp.zoho.eu / .in / .com.au if that is your data centre. Tick only what you would otherwise do by hand: Cliq wants about 13 of its 91 for reading and posting, Sprints about 25 of its 75 to read tickets, move them, comment and log hours. Leave every Delete and Remove unticked, along with lifecycle, project, release, billing and member administration — a wrong update is one undo, a wrong delete is not.',
        },
        {
          command: `claude mcp add --scope user --transport http {name} '{mcp-url}'`,
          note: 'Add it, then approve OAuth.',
          shellQuoted: true,
          tooltip: 'A second app is a second server: change both boxes above and copy this again.',
        },
        {
          command: 'Restart Claude Code, then ask for one real channel, chat or ticket.',
          note: 'Prove it works.',
          manual: true,
          tooltip: 'Restart again whenever you change which tools are ticked — a client reads the tool list when it connects, so a running session keeps the old one. The OAuth grant itself survives. Connected only means the server answered; whether it exposes the tools you ticked is what one real call settles.',
        },
      ],
    },
  },
  {
    id: 'teams-mcp',
    category: 'mcp',
    name: 'Microsoft Teams',
    description: 'Read chats, search users & post to channels from Claude.',
    icon: 'users',
    order: 10,
    docsUrl: 'https://github.com/floriscornel/teams-mcp',
    version: { npm: '@floriscornel/teams-mcp' },
    modal: {
      intro: 'Connects Claude to Microsoft Graph — Teams chats, channels, users, and files. Community package.',
      prereq: 'A Microsoft 365 work account. Signing into the Teams desktop app grants this nothing — it talks to Microsoft Graph and needs its own consent. In a managed tenant an Entra admin must approve the Microsoft first-party app "Microsoft Graph Command Line Tools" (14d82eec-204b-4c2f-b7e8-296a70dab67e) before the sign-in can complete; it uses delegated permissions only, so it can never do more than you can.',
      steps: [
        { command: 'claude mcp add --scope user teams -- npx -y @floriscornel/teams-mcp@latest', note: 'Register the server.' },
        {
          command: 'npx @floriscornel/teams-mcp@latest authenticate',
          note: 'Run this in a real terminal — it prints a device code for your browser, so it needs a window Claude does not have. One-time; tokens are cached and refreshed.',
          tooltip: 'If it stops at "Need admin approval", the tenant consent above is missing — the command itself worked. Nothing you or Claude can do gets past that.',
        },
      ],
    },
  },
  {
    id: 'postman-mcp',
    category: 'mcp',
    name: 'Postman',
    description: 'Run collections & manage API workflows from Claude.',
    icon: 'zap',
    order: 11,
    docsUrl: 'https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/overview',
    modal: {
      intro: "Postman's official remote MCP server — collections, environments, and workspaces from Claude.",
      prereq: 'A Postman account.',
      steps: [
        { command: 'claude mcp add --scope user --transport http postman https://mcp.postman.com/mcp', note: 'Register the server.' },
        { command: 'Approve the OAuth sign-in prompt in your browser on first use.', manual: true },
      ],
    },
  },

  // ─── Project Setup ───────────────────────────────────────────────────
  {
    id: 'team-setup-prompt',
    category: 'project',
    name: 'Team setup prompt',
    description: 'Scaffold our Claude workspace inside an existing RN repo.',
    icon: 'clipboard-list',
    order: 1,
    modal: {
      intro: 'One-time per repo. If the repo you cloned already has a .claude/ folder committed, SKIP this — you already got the setup with the clone. Otherwise, paste this into Claude Code inside the project: it studies the codebase, then sets up our workspace so AI contributions match the hand-written style — rules, hooks, skills, agents and the docs system.',
      prereq: 'Repo cloned.',
      prompt: SETUP_PROMPT,
      copyLabel: 'Copy prompt',
    },
  },
  {
    id: 'run-docs',
    category: 'project',
    name: 'Run-the-app docs',
    description: 'Generate docs/RUNNING.md: clone → deps → emulator or device.',
    icon: 'rocket',
    order: 2,
    modal: {
      intro: 'Paste this into Claude Code inside a cloned repo. It reads the repo and writes docs/RUNNING.md with the exact steps to run the app — dependencies, emulator/simulator, and physical devices.',
      prereq: 'Repo cloned.',
      prompt: RUN_DOCS_PROMPT,
      copyLabel: 'Copy prompt',
    },
  },
  {
    id: 'argent',
    category: 'project',
    name: 'Argent — verify on a device',
    description: 'Drive the app, read logs, prove the fix.',
    icon: 'gauge',
    order: 3,
    docsUrl: 'https://argent.swmansion.com',
    version: { npm: '@swmansion/argent' },
    note: 'Run the Team setup prompt first — both write into .claude/, and nothing merges them.',
    modal: {
      intro: 'Where react-native doctor stops. Argent drives simulators and emulators, reads device logs and network traffic at the JS and native layers, and attaches a debugger. Free and local. The last step sets the repo up once; after that you just ask Claude to verify something.',
      prereq: 'Repo cloned. App builds by hand. Xcode, or Android Studio with an AVD. Node 18+. Metro running.',
      steps: [
        {
          command: 'npx @swmansion/argent@latest init --local',
          note: 'In your terminal — an interactive wizard.',
          userRun: true,
          tooltip:
            '--local pins Argent in devDependencies and commits the MCP config, so teammates get the same version. Its licence is mixed: Apache 2.0 source, proprietary simulator-server and devtools binaries.',
        },
        {
          command: 'git status && git diff',
          note: 'init writes .mcp.json, .argent/ and its own .claude/ files. Revert what you did not want.',
        },
        {
          command: 'Restart Claude Code, then ask what Argent can do.',
          manual: true,
          tooltip:
            'Telemetry is on by default — usage and diagnostics, not your source. Turn it off with: argent telemetry disable',
        },
        {
          command: ARGENT_SETUP_PROMPT,
          note: 'Reads your build targets, asks four questions, writes the constants and a verify skill.',
          label: 'Copy prompt',
          multiline: true,
          download: true,
          filename: 'argent-setup-prompt.md',
        },
      ],
    },
  },
  {
    id: 'team-plugin',
    category: 'project',
    name: 'Team plugin',
    description: 'One repo of shared guards — created once, installed by everyone.',
    icon: 'package-2',
    order: 4,
    docsUrl: 'https://code.claude.com/docs/en/plugin-marketplaces',
    note: 'Lives on your machine, not in your repos — a plugin never writes a file into the project it works on.',
    modal: {
      intro: 'One repo named after your company, holding a baseline plugin every developer installs plus a plugin per stack. Create is for the one person who sets it up; Install is for everyone else.',
      requireFields: ['company'],
      fields: [
        {
          key: 'mode',
          label: 'I want to',
          kind: 'choice',
          options: [
            { value: 'create', label: 'Create' },
            { value: 'install', label: 'Install' },
          ],
        },
        {
          key: 'protocol',
          label: 'Clone over',
          kind: 'choice',
          whenFieldIs: { mode: 'install' },
          options: [
            { value: 'https', label: 'HTTPS' },
            { value: 'ssh', label: 'SSH' },
          ],
        },
        { key: 'company', label: 'Company slug', placeholder: 'acme' },
      ],
      steps: [
        {
          command:
            'Create an empty private repo named {company}-claude. One person does this, once — everyone else only needs the Install side.',
          note: 'On GitHub, before anything else.',
          manual: true,
          whenFieldIs: { mode: 'create' },
          tooltip: 'Cloned in plaintext onto every machine. Keep tokens and internal names out of it.',
        },
        {
          command: 'git clone https://github.com/{company}/{company}-claude.git && cd {company}-claude && claude',
          note: 'Clone it and open Claude Code inside.',
          whenFieldIs: { mode: 'create' },
        },
        {
          command: PLUGIN_BUILD_PROMPT,
          note: 'Paste this. It asks one question, then writes the marketplace and the {company} plugin.',
          label: 'Copy build prompt',
          multiline: true,
          download: true,
          filename: 'plugin-build-prompt.md',
          whenFieldIs: { mode: 'create' },
        },
        {
          command: '/plugin marketplace add ./',
          note: 'Try it locally before anyone else sees it — send as its own prompt.',
          whenFieldIs: { mode: 'create' },
        },
        {
          command: 'claude plugin details {company}@{company}-claude',
          note: 'What it ships, and what it costs in tokens.',
          whenFieldIs: { mode: 'create' },
          tooltip: 'What a plugin loads on every message is paid for on every message, by everyone.',
        },
        {
          command: 'git add -A && git commit -m "feat: {company} claude plugins" && git push',
          note: 'Ship it. Adding a stack plugin later is one folder and one line in the marketplace file.',
          whenFieldIs: { mode: 'create' },
        },
        {
          note: 'Optional — Team and Enterprise only.',
          body: 'An admin picks Add plugin → GitHub and pastes the repo below. Set it to install by default and every developer has it without running the Install commands; set it to required and they can’t uninstall it either. Left as available, they pick it out of the Browse plugins modal instead.',
          command: '{company}/{company}-claude',
          whenFieldIs: { mode: 'create' },
          tooltip:
            'Needs the Claude GitHub App installed on the repo, admin access to it, and Cowork and Skills enabled for the org.',
          link: { href: 'https://claude.ai/admin-settings/plugins', label: 'Open Organization settings → Plugins' },
        },
        {
          command: '/plugin marketplace add https://github.com/{company}/{company}-claude.git',
          note: 'Send as its own prompt.',
          whenFieldIs: { mode: 'install', protocol: 'https' },
          tooltip: 'Uses the credential manager Git already installs, or gh auth login.',
        },
        {
          command: '/plugin marketplace add {company}/{company}-claude',
          note: 'Send as its own prompt.',
          whenFieldIs: { mode: 'install', protocol: 'ssh' },
          tooltip: 'Needs your key loaded in ssh-agent — Claude Code suppresses the prompts.',
        },
        {
          command: '/plugin install {company}@{company}-claude',
          note: 'Then your team’s: {company}-rn-mobile@{company}-claude. Restart after.',
          whenFieldIs: { mode: 'install' },
          tooltip: 'Team and Enterprise admins can push this org-wide from Organization settings instead.',
        },
      ],
    },
  },
]
