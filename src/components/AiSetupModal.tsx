import { useMemo, useState } from 'react'
import { aiSetupGroups, generateAiSetup } from '../lib/aiSetup'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import { CommandBlock } from './CommandBlock'
import { Modal } from './Modal'

interface Props {
  platform: PlatformId
  onClose: () => void
}

export function AiSetupModal({ platform, onClose }: Props) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())
  const groups = useMemo(() => aiSetupGroups(platform), [platform])
  const { bootstrap, prompt } = useMemo(() => generateAiSetup(platform, excluded), [platform, excluded])

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

  const selectedCount = groups.reduce((n, g) => n + g.tools.filter((t) => !excluded.has(t.id)).length, 0)

  const steps = [
    { command: bootstrap, note: 'Install Claude Code — the only manual install.' },
    { command: 'claude', note: 'Open a NEW terminal (so PATH is fresh), start Claude Code, then paste the prompt below.' },
  ]

  return (
    <Modal title="Full AI setup" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-fg-muted">
          Two pastes and the AI does the rest: it installs every tool selected below for{' '}
          <span className="font-mono text-fg">{PLATFORM_INFO[platform].label}</span>, verifies each one, fixes
          failures, and pauses to walk you through the few steps only a human can do (sign-ins, key pastes).
        </p>
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-fg-subtle">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-fg-muted">
                {i + 1}
              </span>
              <span>{step.note}</span>
            </div>
            <CommandBlock command={step.command} label="Copy" />
          </div>
        ))}

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
          <p className="text-xs font-medium text-fg">
            Included tools <span className="font-normal text-fg-subtle">— untick anything you don’t want; the prompt updates and tells the AI to leave it alone.</span>
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
              <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {group.tools.map((tool) => (
                  <label key={tool.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
                    <input
                      type="checkbox"
                      checked={!excluded.has(tool.id)}
                      onChange={() => toggle(tool.id)}
                      className="accent-accent"
                    />
                    <span className="truncate">{tool.name}</span>
                  </label>
                ))}
              </div>
            </div>
            )
          })}
        </div>

        {selectedCount > 0 ? (
          <CommandBlock command={prompt} label="Copy AI setup prompt" filename="ai-setup-prompt.md" download multiline />
        ) : (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            Select at least one tool — the prompt has nothing to install.
          </p>
        )}
      </div>
    </Modal>
  )
}
