import type { ReactNode } from 'react'
import type { ModalField } from './tools'

// Only {key}s declared as modal fields are tokens — any other braces in
// commands or prompts are left untouched.
function tokenRegex(fields: ModalField[]): RegExp {
  return new RegExp(`\\{(${fields.map((f) => f.key).join('|')})\\}`, 'g')
}

// Plain-text substitution for copying. Unfilled tokens stay as {key} so the
// user can still spot and replace them after pasting.
export function fillTokens(text: string, fields: ModalField[], values: Record<string, string>): string {
  if (fields.length === 0) return text
  return text.replace(tokenRegex(fields), (match, key: string) => values[key]?.trim() || match)
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
    return value ? (
      <span key={i} className="token-filled">
        {value}
      </span>
    ) : (
      <span key={i} className="token-glow">{`{${part}}`}</span>
    )
  })
}
