import type { ReactNode } from 'react'
import { Check, Copy, FileDown } from 'lucide-react'
import { Tooltip } from './Tooltip'
import { useCopy } from '../lib/useCopy'

interface Props {
  command: string
  label?: string
  subtle?: boolean
  multiline?: boolean
  // Header label of the multiline variant (e.g. scan.ps1); single-line ignores it.
  // When download is set, it's also the saved file's name.
  filename?: string
  // Show a download button in the multiline header, saving `command` as `filename`.
  download?: boolean
  // Optional rendering override (e.g. highlighted {tokens}, trimmed whitespace);
  // copying always uses `command`.
  display?: ReactNode
}

export function CommandBlock({
  command,
  label = 'Copy command',
  subtle = false,
  multiline = false,
  filename = 'prompt.md',
  download = false,
  display,
}: Props) {
  const [copied, copy] = useCopy()
  const surface = subtle ? 'bg-bg/40' : 'bg-bg/70'
  const tip = copied ? 'Copied!' : label
  const glyph = copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />

  const downloadFile = () => {
    const url = URL.createObjectURL(new Blob([command], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    // Revoking synchronously can cut off the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  if (multiline) {
    return (
      <div className={`rounded-lg border border-border ${surface}`}>
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="font-mono text-xs text-fg-subtle">{filename}</span>
          <div className="flex items-center gap-1">
            {download && (
              <Tooltip label={`Download ${filename}`} align="end">
                <button
                  onClick={downloadFile}
                  aria-label={`Download ${filename}`}
                  className="flex items-center rounded-md p-1 text-fg-subtle transition-colors hover:text-fg cursor-pointer"
                >
                  <FileDown size={15} />
                </button>
              </Tooltip>
            )}
            <Tooltip label={tip} align="end">
              <button
                onClick={() => copy(command)}
                aria-label={label}
                className="flex items-center rounded-md p-1 text-fg-subtle transition-colors hover:text-fg cursor-pointer"
              >
                {glyph}
              </button>
            </Tooltip>
          </div>
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
      <Tooltip label={tip} align="end" className="self-stretch border-l border-border">
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
