// The parts of CLAUDE.md that context alone doesn't hold, checked when a session
// tries to end: no AI-shaped comments, and nothing touched source today without
// its CHANGELOG line. Node rather than a shell script so it runs the same on
// Windows and macOS without jq.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

let raw = ''
for await (const chunk of process.stdin) raw += chunk
const input = raw ? JSON.parse(raw) : {}

// Everything below is end-of-session. A second entry in settings.json pointing
// at this script would otherwise run it mid-edit; give that event its own branch
// here instead.
if (input.hook_event_name !== 'Stop') process.exit(0)

// Only the tells code-style.md names outright. The rest of that rule — whether a
// well-formed comment says anything the code doesn't — needs judgement no regex
// has, so the rule file carries it and this carries the mechanical half.
// Anchored: these describe how a comment opens. Unanchored, "needs a short
// note:" mid-sentence reads as the explainer prefix the rule forbids.
const TELLS = [
  [/\p{Extended_Pictographic}/u, 'an emoji'],
  [/[=\-~_]{5,}/, 'a section banner'],
  [/^Notes?:/i, 'a "Note:" explainer'],
]

// A session can be started in a subdirectory, which is where a hook's relative
// paths would otherwise resolve.
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? '.'
// Any git failure is a fail-open: a hook that can't read the tree must not be
// the reason a session can't end.
const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  } catch {
    return ''
  }
}

const offences = []
const check = (file, text) => {
  const line = text.trim()
  if (!/^(\/\/|\/\*|\*|\{\/\*)/.test(line)) return
  const content = line.replace(/^(\{?\/\*+|\/+|\*+)\s*/, '')
  for (const [pattern, name] of TELLS) if (pattern.test(content)) offences.push(`${file}: ${name} — ${line.slice(0, 70)}`)
}

// HEAD, so staged work counts too.
let file = ''
for (const line of git(['diff', 'HEAD', '-U0', '--', 'src', 'functions']).split('\n')) {
  if (line.startsWith('+++ b/')) file = line.slice(6)
  else if (line.startsWith('+')) check(file, line.slice(1))
}

// A new file is absent from every diff until it's tracked, so its comments are
// invisible to the pass above — read those whole.
for (const path of git(['ls-files', '--others', '--exclude-standard', '--', 'src', 'functions']).split('\n')) {
  if (!path.trim()) continue
  const full = join(root, path)
  if (existsSync(full)) for (const line of readFileSync(full, 'utf8').split('\n')) check(path, line)
}

if (offences.length > 0) {
  process.stderr.write(
    `Comments added that .claude/rules/code-style.md rules out:\n${offences.join('\n')}\nRemove them, or say why the rule doesn't apply and stop again.`,
  )
  process.exit(2)
}

// mtime, not `git diff`: the question is whether source was edited *today*, and
// an uncommitted tree can carry earlier days' work that was logged under its own
// heading. Catches the session that ends with nothing logged at all, which is
// the way this contract actually gets missed.
// git, not `fs.globSync`: that landed in Node 22 and this repo's own hook has to
// run on whatever `node` a contributor has on PATH.
const today = new Date().toISOString().slice(0, 10)
const sources = git(['ls-files', '--cached', '--others', '--exclude-standard', '--', 'src', 'functions'])
  .split('\n')
  .filter((p) => /\.(ts|tsx|css)$/.test(p))
  .map((p) => join(root, p))
  .filter((p) => existsSync(p))
if (!sources.some((p) => statSync(p).mtime.toISOString().slice(0, 10) === today)) process.exit(0)

// Missing file reads as "nothing logged" rather than throwing: an uncaught
// exception exits 1, which Claude Code treats as a hook error and lets the
// session end — a fail-open on the one thing this is here to catch.
const changelogPath = join(root, 'docs/CHANGELOG.md')
const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : ''
const section = changelog.split(/^## /m).find((s) => s.startsWith(today))
if (!section || !/^- /m.test(section)) {
  process.stderr.write(
    `Source changed today with nothing under \`## ${today}\` in docs/CHANGELOG.md. Add the one line for what shipped (creating the heading if today has none), then finish. If the change is genuinely not user-visible, say so and stop again.`,
  )
  process.exit(2)
}
