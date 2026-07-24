import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { detectGroups, parseResultLine, undetectableTools, RESULT_PREFIX } from '../lib/detect'
import { generateDetectScript } from '../lib/detectScript'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import { useDetectSession, type DetectReport } from '../lib/useDetectSession'
import { CommandBlock } from './CommandBlock'
import { Modal } from './Modal'

interface Props {
  platform: PlatformId
  // Batch-set installed state; value=true for found tools, false only via
  // the explicit "uncheck" button.
  onApply: (ids: string[], value: boolean) => void
  onClose: () => void
}

interface Applied {
  found: string[]
  notFound: string[]
  // Platform id the scan actually ran on, when it differs from the page.
  mismatch: string | null
}

export function DetectModal({ platform, onApply, onClose }: Props) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())
  const [manualText, setManualText] = useState('')
  const [manualError, setManualError] = useState(false)
  const [applied, setApplied] = useState<Applied | null>(null)
  const session = useDetectSession()

  const groups = useMemo(() => detectGroups(platform), [platform])
  const unscannable = useMemo(() => undetectableTools(platform), [platform])
  const script = useMemo(
    () => generateDetectScript(platform, excluded, session.code),
    [platform, excluded, session.code],
  )

  const allTools = groups.flatMap((g) => g.tools)
  const selectedIds = allTools.filter((t) => !excluded.has(t.id)).map((t) => t.id)
  const nameOf = (id: string) => allTools.find((t) => t.id === id)?.name ?? id
  const isWindows = PLATFORM_INFO[platform].os === 'win'

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleGroup = (ids: string[], selectAll: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (selectAll) next.delete(id)
        else next.add(id)
      }
      return next
    })

  const applyReport = (report: DetectReport) => {
    // Whitelist against the current selection — relay/paste data never writes
    // arbitrary ids into localStorage.
    const found = report.found.filter((id) => selectedIds.includes(id))
    const mismatch = report.platform !== platform
    const notFound = mismatch ? [] : selectedIds.filter((id) => !found.includes(id))
    onApply(found, true)
    setApplied({ found, notFound, mismatch: mismatch ? report.platform : null })
  }

  // Auto-apply the relay report exactly once per session code (guards Strict
  // Mode double-invokes and re-renders).
  const lastAppliedCode = useRef<string | null>(null)
  useEffect(() => {
    if (!session.report || lastAppliedCode.current === session.code) return
    lastAppliedCode.current = session.code
    applyReport(session.report)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.report, session.code])

  const applyManual = () => {
    const ids = parseResultLine(manualText)
    if (ids === null) {
      setManualError(true)
      return
    }
    setManualError(false)
    applyReport({ platform, found: ids }) // manual paste: assume current platform
  }

  const scanAgain = () => {
    setApplied(null)
    setManualText('')
    setManualError(false)
    session.restart()
  }

  const uncheckMissing = () => {
    if (!applied) return
    onApply(applied.notFound, false)
    setApplied({ ...applied, notFound: [] })
  }

  return (
    <Modal title="Detect installed tools" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-fg-muted">
          A web page can’t see your machine, so this works in one paste: copy the script below into {isWindows ? 'PowerShell' : 'your terminal'},
          run it, and this page ticks off what it finds{session.status !== 'off' ? ' by itself — no refresh needed' : ''}.{' '}
          <span className="text-fg">
            The only data that leaves your machine: a one-time code, your platform id (
            <span className="font-mono">{platform}</span>), and the ids of tools found.
          </span>{' '}
          The script is plain text — read it before running.
        </p>

        {session.status !== 'off' && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs">
            <span className="font-mono text-fg-subtle">code {session.code}</span>
            {session.status === 'waiting' && (
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Waiting for the scan… checks every 2s, code expires in 10 min.
              </span>
            )}
            {session.status === 'received' && (
              <span className="flex items-center gap-1.5 text-accent">
                <CheckCircle2 size={14} /> Result received.
              </span>
            )}
            {session.status === 'expired' && (
              <span className="flex items-center gap-2 text-warning">
                Code expired.
                <button
                  onClick={scanAgain}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-fg-muted transition-colors hover:text-fg cursor-pointer"
                >
                  <RefreshCw size={12} /> New code
                </button>
              </span>
            )}
            {session.unreachable && session.status === 'waiting' && (
              <span className="text-warning">Can’t reach the relay — the manual paste below still works.</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
          <p className="text-xs font-medium text-fg">
            Tools that will be checked{' '}
            <span className="font-normal text-fg-subtle">— untick anything you don’t want scanned; the script updates.</span>
          </p>
          {groups.map((group) => {
            const groupAllSelected = group.tools.every((t) => !excluded.has(t.id))
            return (
              <div key={group.id}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{group.title}</p>
                  <button
                    onClick={() => toggleGroup(group.tools.map((t) => t.id), !groupAllSelected)}
                    className="text-[11px] text-fg-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-fg cursor-pointer"
                  >
                    {groupAllSelected ? 'unselect all' : 'select all'}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {group.tools.map((tool) => (
                    <label key={tool.id} className="flex cursor-pointer items-start gap-1.5 text-xs text-fg-muted hover:text-fg">
                      <input
                        type="checkbox"
                        checked={!excluded.has(tool.id)}
                        onChange={() => toggle(tool.id)}
                        className="mt-0.5 accent-accent"
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{tool.name}</span>
                        <span className="block truncate font-mono text-[11px] text-fg-subtle">{tool.how}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
          {unscannable.length > 0 && (
            <p className="border-t border-border pt-2 text-xs leading-relaxed text-fg-subtle">
              {unscannable.length} tools can’t be detected from outside (Claude Code plugins, MCP servers, per-project
              steps): {unscannable.slice(0, 6).map((t) => t.name).join(', ')}
              {unscannable.length > 6 ? `, and ${unscannable.length - 6} more` : ''}. Tick those by hand.
            </p>
          )}
        </div>

        {selectedIds.length > 0 ? (
          <CommandBlock command={script} label="Copy scan script" filename={isWindows ? 'scan.ps1' : 'scan.sh'} multiline />
        ) : (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            Select at least one tool — the script has nothing to scan.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-fg-subtle">
            {session.status === 'off'
              ? `Then paste the ${RESULT_PREFIX} line the script prints:`
              : `If reporting fails (offline, firewall), paste the ${RESULT_PREFIX} line the script prints:`}
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
                <span className="font-mono">{platform}</span> — found tools were still ticked; switch platform to review.
              </p>
            )}
            {applied.notFound.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-fg-muted">
                  {applied.notFound.length} selected {applied.notFound.length === 1 ? 'tool was' : 'tools were'} not
                  found: {applied.notFound.map(nameOf).join(', ')}.
                </p>
                <button
                  onClick={uncheckMissing}
                  className="w-fit rounded-md border border-border bg-surface px-2 py-1 text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
                >
                  Uncheck these {applied.notFound.length} on the page too
                </button>
              </div>
            )}
            <button
              onClick={scanAgain}
              className="inline-flex w-fit items-center gap-1 text-fg-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-fg cursor-pointer"
            >
              <RefreshCw size={12} /> Scan again
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
