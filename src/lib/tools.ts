import type { PlatformId } from './platform'
import { PLUGIN_FILL_PROMPT, RUN_DOCS_PROMPT, SETUP_PROMPT } from './setupPrompt'
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
  kind?: 'text' | 'image'
}

export interface ToolModal {
  intro?: string
  prereq?: string
  fields?: ModalField[]
  steps?: ModalStep[]
  prompt?: string
  copyLabel?: string
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
  { id: 'project', title: 'Project Setup', description: 'Scaffold a Claude workspace in a repo, and tune Claude Code itself.', accent: '#f472b6', order: 5, checkable: false },
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
    note: 'Installs fnm + Node LTS (v24) and hooks your shell so `node` works in every new terminal.',
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
      ...mac(cmd('brew install fnm && fnm install --lts && fnm default lts-latest && echo \'eval "$(fnm env --use-on-cd)"\' >> ~/.zshrc && eval "$(fnm env --use-on-cd)"')),
      linux: cmd('curl -fsSL https://fnm.vercel.app/install | bash && fnm install --lts && fnm default lts-latest && echo \'eval "$(fnm env --use-on-cd)"\' >> ~/.bashrc && eval "$(fnm env --use-on-cd)"'),
      ...win(cmd('winget install --id Schniz.fnm -e --accept-source-agreements --accept-package-agreements; $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User"); Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force; fnm install --lts; fnm default lts-latest; if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }; Add-Content $PROFILE \'fnm env --use-on-cd | Out-String | Invoke-Expression\'; fnm env --use-on-cd | Out-String | Invoke-Expression')),
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
    name: 'JDK 17 (Azul Zulu)',
    description: 'Java 17 — the version React Native targets.',
    icon: 'coffee',
    order: 10,
    docsUrl: 'https://www.azul.com/downloads/?version=java-17-lts&package=jdk',
    version: { brew: 'zulu@17' },
    note: 'React Native needs JDK 17 specifically, not the newest Java. The Windows command also sets JAVA_HOME, which Gradle and `react-native doctor` require — restart your terminal after.',
    actions: {
      ...mac(cmd('brew install --cask zulu@17')),
      linux: cmd('sudo apt-get install -y openjdk-17-jdk'),
      ...win(cmd('winget install --id Microsoft.OpenJDK.17 -e --accept-source-agreements --accept-package-agreements; $jdk = Get-ChildItem "$env:ProgramFiles\\Microsoft" -Directory -Filter "jdk-17*" | Select-Object -First 1; [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdk.FullName, "User")')),
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
          note: 'Run anywhere — the key is saved machine-wide in ~/.ssh and works for every repo. ssh-keygen asks a few questions (save location, passphrase); hit Enter at each to accept the defaults. Your public key lands on the clipboard (Linux: printed — copy it).',
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
    actions: { ...mac(link('https://apps.apple.com/us/app/xcode/id497799835', 'Open in App Store')) },
    modal: {
      intro: 'Install from the App Store (button on the card), then finish these two steps.',
      steps: [
        { command: 'xcode-select --install', note: 'Installs the Command Line Tools — run in your terminal.' },
        {
          command: 'Xcode → Settings → Platforms → download iOS',
          note: 'Adds the iOS Simulator. First launch also asks to install required components — accept.',
          manual: true,
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
    description: 'Run & monitor all your coding agents (tmux-style).',
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
        { command: '/plugin marketplace add obra/superpowers-marketplace', note: 'Send this as its own prompt.' },
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
        { command: '/plugin marketplace add DietrichGebert/ponytail', note: 'Send this as its own prompt.' },
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
        { command: '/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill', note: 'Send as its own prompt.' },
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
      ...mac(cmd('claude mcp add --transport http context7 https://mcp.context7.com/mcp')),
      linux: cmd('claude mcp add --transport http context7 https://mcp.context7.com/mcp'),
      ...win(cmd('claude mcp add --transport http context7 https://mcp.context7.com/mcp')),
    },
  },
  {
    id: 'atlassian-mcp',
    category: 'mcp',
    name: 'Atlassian (Bitbucket + Jira)',
    description: 'PRs, pipelines, and issues from Claude.',
    icon: 'git-pull-request',
    order: 2,
    docsUrl: 'https://github.com/atlassian/atlassian-mcp-server',
    note: 'Approve the OAuth prompt in your browser. One connection covers Bitbucket, Jira & Confluence.',
    actions: {
      ...mac(cmd('claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse')),
      linux: cmd('claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse'),
      ...win(cmd('claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse')),
    },
  },
  {
    id: 'xcodebuild-mcp',
    category: 'mcp',
    name: 'XcodeBuildMCP',
    description: 'Build, run & test iOS from Claude (macOS).',
    icon: 'apple',
    order: 3,
    docsUrl: 'https://github.com/getsentry/XcodeBuildMCP',
    version: { npm: 'xcodebuildmcp' },
    note: 'Requires macOS 14.5+ and Xcode 16+.',
    actions: { ...mac(cmd('claude mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp')) },
  },
  {
    id: 'android-dev-mcp',
    category: 'mcp',
    name: 'Android Dev MCP',
    description: 'Run, drive & debug Android devices and emulators from Claude.',
    icon: 'smartphone',
    order: 4,
    docsUrl: 'https://github.com/kingbin/android-dev-mcp-server',
    version: { npm: 'android-dev-mcp-server' },
    modal: {
      intro: 'Screenshots, screen interaction, logcat, crash diagnostics, and React Native helpers over ADB. Community package.',
      prereq: 'Android Studio card done first — this needs adb on PATH, ANDROID_HOME set, and a running emulator or connected device.',
      steps: [
        { command: 'adb devices', note: 'Verify the prerequisites — your emulator or device should be listed.' },
        { command: 'claude mcp add android-dev -- npx -y android-dev-mcp-server', note: 'Then register the server.' },
      ],
    },
  },
  {
    id: 'sentry-mcp',
    category: 'mcp',
    name: 'Sentry',
    description: 'Pull crash issues with full context into Claude.',
    icon: 'bug',
    order: 5,
    docsUrl: 'https://mcp.sentry.dev',
    modal: {
      intro: 'Pull Sentry crash issues, with full context, straight into Claude.',
      steps: [
        { command: 'claude mcp add --transport http sentry https://mcp.sentry.dev/mcp', note: 'Register the server.' },
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
    docsUrl: 'https://firebase.google.com/docs/crashlytics/ai-assistance-mcp',
    version: { npm: 'firebase-tools' },
    modal: {
      intro: 'Pull Crashlytics crash issues into Claude via the Firebase CLI.',
      steps: [
        { command: 'npx -y firebase-tools@latest login', note: 'The MCP server reuses your Firebase CLI credentials.' },
        { command: 'claude mcp add firebase -- npx -y firebase-tools@latest mcp', note: 'Then register the server.' },
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
        { command: 'claude mcp add --transport http figma-dev-mode http://127.0.0.1:3845/mcp', note: 'Then run this in your terminal.' },
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
    name: 'Zoho Cliq',
    description: 'Bring team chats into Claude.',
    icon: 'message-circle',
    order: 9,
    docsUrl: 'https://www.zoho.com/cliq/help/platform/connect-zoho-cliq-mcp-with-claude.html',
    modal: {
      intro: 'Summarize channels, post messages, and search chats from Claude.',
      prereq: 'A Zoho account with Cliq.',
      fields: [{ key: 'mcp-url', label: 'Your Zoho MCP URL', placeholder: 'https://mcp.zoho.com/…' }],
      steps: [
        { command: 'Zoho MCP console → Add Tools → Cliq → copy the server URL', note: 'Generate your MCP URL first and paste it in the field above.', manual: true },
        { command: `claude mcp add --transport http zoho-cliq '{mcp-url}'`, note: 'Then approve OAuth.', shellQuoted: true },
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
      prereq: 'A Microsoft 365 work account.',
      steps: [
        { command: 'claude mcp add teams -- npx -y @floriscornel/teams-mcp@latest', note: 'Register the server.' },
        { command: 'Ask Claude to authenticate with Teams, then finish the device-code sign-in in your browser.', note: 'One-time — tokens are cached and refreshed.', manual: true },
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
        { command: 'claude mcp add --transport http postman https://mcp.postman.com/mcp', note: 'Register the server.' },
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
      prompt: SETUP_PROMPT,
      copyLabel: 'Copy prompt',
    },
  },
  {
    id: 'statusline',
    category: 'project',
    name: 'Claude Code statusline',
    description: 'Model, context and spend, always visible.',
    icon: 'gauge',
    order: 2,
    docsUrl: 'https://code.claude.com/docs/en/statusline',
    note: 'Two things no profile can show: permission mode, which Claude Code draws in its own footer below, and rate limits before the session\'s first API response — blank throughout on API billing.',
    modal: {
      intro: 'Pick ONE and send it as a prompt in Claude Code — it writes the script and wires it up for you. Send another later to replace it.',
      steps: [
        {
          command:
            '/statusline two lines. First: repo name and git branch, model display name, effort level, context used percentage. Second: 5-hour and weekly rate limit percentages each with time until reset, session cost in USD, lines added and removed, session duration. Add a "fast" flag on line one only when fast mode is on. Do not print the context window size separately — the model display name already carries it.',
          note: 'Recommended — the bar we run. The 5-hour and weekly numbers need a Pro or Max plan.',
          preview:
            'rn-dev-onboarding:main │ Opus 5 (1M context) │ effort max │ ctx 30%\nsession 9% (4h31m) │ week 15% (6d13h) │ $16.57 │ +237 -25 │ 2h45m',
        },
        {
          command:
            '/statusline one line: repo name and git branch, model display name, effort level, context used percentage, lines added and removed. Cache the git lookup per session.',
          note: 'One line. Keeps where you are and what you\'ve changed; loses the usage limits, cost and session clock.',
          preview: 'rn-dev-onboarding:main │ Opus 5 │ effort max │ ctx 30% │ +237 -25',
        },
        {
          command: '/statusline one line, no git: model display name, effort level, context used percentage.',
          note: 'One line, and the quickest to draw — no git lookup, so no branch either.',
          preview: 'Opus 5 │ effort max │ ctx 30%',
        },
      ],
    },
  },
  {
    id: 'run-docs',
    category: 'project',
    name: 'Run-the-app docs',
    description: 'Generate docs/RUNNING.md: clone → deps → emulator or device.',
    icon: 'rocket',
    order: 3,
    modal: {
      intro: 'Paste this into Claude Code inside a cloned repo. It reads the repo and writes docs/RUNNING.md with the exact steps to run the app — dependencies, emulator/simulator, and physical devices.',
      prereq: 'Repo cloned.',
      prompt: RUN_DOCS_PROMPT,
      copyLabel: 'Copy prompt',
    },
  },
  {
    id: 'team-plugin',
    category: 'project',
    name: 'Team plugin',
    description: 'Shared agents, skills & hooks — install it, or author it once.',
    icon: 'package-2',
    order: 4,
    docsUrl: 'https://docs.claude.com/en/docs/claude-code/overview',
    modal: {
      intro: 'Our shared RN tooling. Every dev: run steps 1–2 inside Claude Code (each command as its own prompt). Plugin author only: steps 3–5 scaffold and publish the plugin in the first place.',
      prereq: 'Fill both fields below — they prefill the commands and the prompt.',
      fields: [
        { key: 'repo', label: 'Plugin repo (org/repo)', placeholder: 'yourorg/rn-team-tools' },
        { key: 'name', label: 'Plugin name', placeholder: 'rn-team-tools' },
      ],
      steps: [
        { command: '/plugin marketplace add {repo}', note: 'Every dev — send as its own prompt.' },
        { command: '/plugin install {name}@{name}', note: 'Then a separate prompt; restart Claude Code after.' },
        { command: 'claude plugin init {name} --with skills agents hooks', note: 'Author only from here — scaffolds under ~/.claude/skills.' },
        { command: 'cd ~/.claude/skills/{name} && claude', note: 'Open Claude Code inside the plugin folder, then paste the fill prompt below. It asks 3 questions, then writes generic agents, skills, and hooks.' },
        { command: 'git init -b main && git add -A && git commit -m "feat: team plugin" && git push', note: 'Push to a new git repo — then every dev installs it with steps 1–2.' },
      ],
      prompt: PLUGIN_FILL_PROMPT,
      copyLabel: 'Copy fill prompt (author only)',
    },
  },
]
