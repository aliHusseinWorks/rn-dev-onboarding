import type { ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { Tooltip } from './Tooltip'
import { useCopy } from '../lib/useCopy'

interface Props {
  command: string
  label?: string
  subtle?: boolean
  multiline?: boolean
  // Header label of the multiline variant (e.g. scan.ps1); single-line ignores it.
  filename?: string
  // Optional styled rendering (e.g. highlighted {tokens}); copying always uses `command`.
  display?: ReactNode
}

export function CommandBlock({
  command,
  label = 'Copy command',
  subtle = false,
  multiline = false,
  filename = 'prompt.md',
  display,
}: Props) {
  const [copied, copy] = useCopy()
  const surface = subtle ? 'bg-bg/40' : 'bg-bg/70'
  const tip = copied ? 'Copied!' : label
  const glyph = copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />

  if (multiline) {
    return (
      <div className={`rounded-lg border border-border ${surface}`}>
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="font-mono text-xs text-fg-subtle">{filename}</span>
          <Tooltip label={tip}>
            <button
              onClick={() => copy(command)}
              aria-label={label}
              className="flex items-center rounded-md p-1 text-fg-subtle transition-colors hover:text-fg cursor-pointer"
            >
              {glyph}
            </button>
          </Tooltip>
        </div>
        <pre className="thin-scroll max-h-80 overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-xs leading-relaxed text-fg-muted">
          {display ?? command}
        </pre>
      </div>
    )
  }

  return (
    <div className={`flex items-center rounded-lg border border-border ${surface}`}>
      <code className="thin-scroll min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2 font-mono text-[13px] text-fg-muted">
        {display ?? command}
      </code>
      <Tooltip label={tip} className="self-stretch border-l border-border">
        <button
          onClick={() => copy(command)}
          aria-label={label}
          className="flex items-center px-2.5 text-fg-subtle transition-colors hover:text-fg cursor-pointer"
        >
          {glyph}
        </button>
      </Tooltip>
    </div>
  )
}
