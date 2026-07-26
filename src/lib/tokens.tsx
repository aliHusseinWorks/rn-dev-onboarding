import type { ReactNode } from 'react'
import { PLATFORM_INFO, type PlatformId } from './platform'
import type { ModalField } from './tools'

// Only {key}s declared as modal fields are tokens — any other braces in
// commands or prompts are left untouched.
function tokenRegex(fields: ModalField[]): RegExp {
  return new RegExp(`\\{(${fields.map((f) => f.key).join('|')})\\}`, 'g')
}

// Plain-text substitution for copying. Unfilled tokens stay as {key} so the
// user can still spot and replace them after pasting. When a step feeds values
// into a shell command, pass `escape` so a value like O'Brien can't break out
// of (or inject past) the quoting.
export function fillTokens(
  text: string,
  fields: ModalField[],
  values: Record<string, string>,
  escape?: (value: string) => string,
): string {
  if (fields.length === 0) return text
  return text.replace(tokenRegex(fields), (match, key: string) => {
    const value = values[key]?.trim()
    if (!value) return match
    return escape ? escape(value) : value
  })
}

// Escapes a value destined for a single-quoted literal in the platform's shell:
// PowerShell doubles the quote, POSIX shells use the close/escape/reopen idiom.
// Only ' is special inside either kind of literal, so nothing else needs touching.
export function shellSingleQuote(platform: PlatformId): (value: string) => string {
  return PLATFORM_INFO[platform].os === 'win'
    ? (value) => value.replace(/'/g, "''")
    : (value) => value.replace(/'/g, "'\\''")
}

// JSX rendering of the same substitution: typed values show accented,
// unfilled tokens glow to signal "fill me in above".
export function renderTokens(text: string, fields: ModalField[], values: Record<string, string>): ReactNode {
  if (fields.length === 0) return text
  // split() with a capture group alternates literal chunks (even indices) and
  // captured token keys (odd indices).
  return text.split(tokenRegex(fields)).map((part, i) => {
    if (i % 2 === 0) return part
    const value = values[part]?.trim()
    // The copied text carries the icon's base64; showing it would bury the command.
    if (value && fields.find((f) => f.key === part)?.kind === 'image') {
      return (
        <span key={i} className="token-filled">
          your icon
        </span>
      )
    }
    return value ? (
      <span key={i} className="token-filled">
        {value}
      </span>
    ) : (
      <span key={i} className="token-glow">{`{${part}}`}</span>
    )
  })
}
