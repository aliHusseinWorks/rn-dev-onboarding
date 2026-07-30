// The two parts of CLAUDE.md that context alone doesn't hold: a decision file is
// superseded, never edited, and a session that touched source doesn't end
// without its CHANGELOG line. Node rather than a shell script so it runs the
// same on Windows and macOS without jq.
import { existsSync, globSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

let raw = ''
for await (const chunk of process.stdin) raw += chunk
const input = raw ? JSON.parse(raw) : {}

if (input.hook_event_name === 'PreToolUse') {
  const file = (input.tool_input?.file_path ?? '').replace(/\\/g, '/')
  // Only one that already exists — writing the next numbered file is the right
  // move, and flipping a status to `rejected` is the one edit the contract
  // allows, so ask rather than deny.
  if (/docs\/decisions\/.+\.md$/.test(file) && existsSync(file)) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: `${file} already exists. Decisions are superseded by a new numbered file, not edited — the only edit the contract allows is flipping status to rejected.`,
        },
      }),
    )
  }
  process.exit(0)
}

// mtime, not `git diff`: the question is whether source was edited *today*, and
// an uncommitted tree can carry earlier days' work that was logged under its own
// heading. Catches the session that ends with nothing logged at all, which is
// the way this contract actually gets missed.
const today = new Date().toISOString().slice(0, 10)
// A session can be started in a subdirectory, which is where a hook's relative
// paths would otherwise resolve.
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? '.'
const sources = globSync('{src,functions}/**/*.{ts,tsx,css}', { cwd: root, withFileTypes: true })
if (!sources.some((f) => statSync(join(f.parentPath, f.name)).mtime.toISOString().slice(0, 10) === today)) process.exit(0)

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
