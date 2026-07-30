import { useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, Undo2 } from 'lucide-react'
import { detectGroups, parseResultLine, RESULT_PREFIX, type Applied } from '../lib/detect'
import { generateDetectScript } from '../lib/detectScript'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import type { DetectReport, DetectSession } from '../lib/useDetectSession'
import { CommandBlock } from './CommandBlock'
import { Modal } from './Modal'

interface Props {
  platform: PlatformId
  // Session and result both belong to App: they outlive this modal, and a
  // report can arrive while it's closed.
  session: DetectSession
  applied: Applied | null
  onApplyReport: (report: DetectReport) => void
  onUndo: () => void
  onScanAgain: () => void
  onClose: () => void
}

export function DetectModal({ platform, session, applied, onApplyReport, onUndo, onScanAgain, onClose }: Props) {
  const [manualText, setManualText] = useState('')
  const [manualError, setManualError] = useState(false)

  const scannable = useMemo(() => detectGroups(platform).flatMap((g) => g.tools), [platform])
  const script = useMemo(() => generateDetectScript(platform, session.code), [platform, session.code])

  const nameOf = (id: string) => scannable.find((t) => t.id === id)?.name ?? id
  const isWindows = PLATFORM_INFO[platform].os === 'win'

  const applyManual = () => {
    const ids = parseResultLine(manualText)
    if (ids === null) {
      setManualError(true)
      return
    }
    setManualError(false)
    onApplyReport({ platform, found: ids }) // manual paste: assume current platform
  }

  const scanAgain = () => {
    setManualText('')
    setManualError(false)
    onScanAgain()
  }

  return (
    <Modal title="Detect installed tools" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
          Copy the script below into {isWindows ? 'PowerShell' : 'your terminal'} and run it — this page ticks off
          what it finds by itself, no refresh needed. It checks {scannable.length} tools: command-line tools, desktop
          apps in their standard folders, and your Claude Code setup (MCP servers and plugins).
        </p>
        <p className="max-w-lg text-xs leading-relaxed text-fg-subtle">
          The only data that leaves your machine: a one-time code, your platform id (
          <span className="font-mono">{platform}</span>), and the ids of tools found. The script is plain text — every
          check is one readable line.
        </p>

        {session.status !== 'off' && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs">
            <span className="font-mono text-fg-subtle">code {session.code}</span>
            {session.status === 'waiting' && (
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Waiting for the scan — you can close this, the page picks it up whenever it runs.
              </span>
            )}
            {session.status === 'received' && !applied?.undone && (
              <span className="flex items-center gap-1.5 text-accent">
                <CheckCircle2 size={14} /> Result received.
              </span>
            )}
            {session.unreachable && session.status === 'waiting' && (
              <span className="text-warning">Can’t reach the relay — the manual paste below still works.</span>
            )}
          </div>
        )}

        <CommandBlock
          command={script}
          // The script's trailing newline matters when pasted, not on screen.
          display={script.trimEnd()}
          label="Copy scan script"
          filename={isWindows ? 'scan.ps1' : 'scan.sh'}
          download
          multiline
        />

        <div className="flex max-w-lg flex-col gap-1.5">
          <p className="text-xs text-fg-subtle">
            {session.status === 'off'
              ? `Then paste the ${RESULT_PREFIX} line the script prints:`
              : `No internet, or a firewall blocked the report? The script prints a ${RESULT_PREFIX} line — paste it here instead:`}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={`${RESULT_PREFIX} git,node,vscode`}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[13px] text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-accent"
            />
            <button
              onClick={applyManual}
              disabled={manualText.trim().length === 0}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Apply
            </button>
          </div>
          {manualError && (
            <p className="text-xs text-destructive">No {RESULT_PREFIX} line found in that paste — copy the script’s output line.</p>
          )}
        </div>

        {applied && (
          <div className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-3 text-xs">
            {applied.undone ? (
              <p className="text-fg-muted">Undone — the checklist is back to how it was before the scan.</p>
            ) : (
              <>
                <p className="flex items-center gap-1.5 font-medium text-fg">
                  <CheckCircle2 size={14} className="text-accent" />
                  Marked {applied.found.length} {applied.found.length === 1 ? 'tool' : 'tools'} as installed
                  {applied.found.length > 0 && (
                    <span className="font-normal text-fg-muted"> — {applied.found.map(nameOf).join(', ')}</span>
                  )}
                </p>
                {applied.mismatch && (
                  <p className="text-warning">
                    This scan ran on <span className="font-mono">{applied.mismatch}</span> but the page shows{' '}
                    <span className="font-mono">{platform}</span> — found tools were still ticked, but nothing was
                    cleared. Switch platform to review.
                  </p>
                )}
                {applied.notFound.length > 0 && (
                  <p className="text-fg-muted">
                    Cleared {applied.notFound.length} {applied.notFound.length === 1 ? 'tool' : 'tools'} the scan
                    didn’t find: {applied.notFound.map(nameOf).join(', ')}.
                  </p>
                )}
              </>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {!applied.undone && (
                <button
                  onClick={onUndo}
                  className="inline-flex items-center gap-1 text-fg-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-fg cursor-pointer"
                >
                  <Undo2 size={12} /> Undo
                </button>
              )}
              <button
                onClick={scanAgain}
                className="inline-flex items-center gap-1 text-fg-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-fg cursor-pointer"
              >
                <RefreshCw size={12} /> Scan again
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
