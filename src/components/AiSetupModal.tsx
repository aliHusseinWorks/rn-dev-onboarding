import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { aiSetupGroups, generateAiSetup } from '../lib/aiSetup'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import { CommandBlock } from './CommandBlock'
import { Modal } from './Modal'

interface Props {
  platform: PlatformId
  // Tools ticked off on the page are already done, so they're shown as such and
  // left out of the prompt entirely — the page is the source of truth, and the
  // way back in is unticking the card, not a second control in here.
  installed: Record<string, boolean>
  onClose: () => void
}

export function AiSetupModal({ platform, installed, onClose }: Props) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())
  const groups = useMemo(() => aiSetupGroups(platform), [platform])
  const done = useMemo(() => new Set(Object.keys(installed).filter((id) => installed[id])), [installed])
  const { bootstrap, prompt } = useMemo(() => generateAiSetup(platform, excluded, done), [platform, excluded, done])

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

  const selectable = (group: (typeof groups)[number]) => group.tools.filter((t) => !done.has(t.id))
  const selectedCount = groups.reduce((n, g) => n + selectable(g).filter((t) => !excluded.has(t.id)).length, 0)
  const nothingLeft = groups.length > 0 && groups.every((g) => selectable(g).length === 0)

  // Claude Code is a card like any other, so a ticked-off one drops its install
  // step here too — the fresh-PATH warning only matters right after installing.
  const hasClaude = done.has('claude-code')
  const steps = [
    ...(hasClaude ? [] : [{ command: bootstrap, note: 'Install Claude Code — the only manual install.' }]),
    {
      command: 'claude',
      note: hasClaude
        ? 'Start Claude Code, then paste the prompt below.'
        : 'Open a NEW terminal (so PATH is fresh), start Claude Code, then paste the prompt below.',
    },
  ]

  return (
    <Modal title="Full AI setup" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Nothing to install means nothing to paste — the list below is then the whole point. */}
        {!nothingLeft && (
          <p className="text-sm leading-relaxed text-fg-muted">
            {steps.length === 1 ? 'One paste' : 'Two pastes'} and the AI does the rest: it installs every tool selected
            below for{' '}
            <span className="font-mono text-fg">{PLATFORM_INFO[platform].label}</span>, verifies each one, fixes
            failures, and pauses to walk you through the few steps only a human can do (sign-ins, key pastes).
          </p>
        )}
        {!nothingLeft &&
          steps.map((step, i) => (
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
            Included tools{' '}
            <span className="font-normal text-fg-subtle">
              — untick anything you don’t want; the prompt updates and tells the AI to leave it alone. Tools you’ve
              already ticked off on the page show a ✓ and are left out — untick one there to bring it back.
            </span>
          </p>
          {groups.map((group) => {
            const open = selectable(group)
            const groupAllSelected = open.every((t) => !excluded.has(t.id))
            return (
            <div key={group.id}>
              <div className="mb-1 flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{group.title}</p>
                {open.length > 0 && (
                  <button
                    onClick={() => toggleGroup(open.map((t) => t.id), !groupAllSelected)}
                    className="text-[11px] text-fg-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-fg cursor-pointer"
                  >
                    {groupAllSelected ? 'unselect all' : 'select all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {group.tools.map((tool) =>
                  done.has(tool.id) ? (
                    <span
                      key={tool.id}
                      title="Already installed — untick it on the page to include it"
                      className="flex items-center gap-1.5 text-xs text-fg-subtle"
                    >
                      <Check size={13} aria-hidden className="shrink-0 text-accent" />
                      <span className="truncate line-through">{tool.name}</span>
                      <span className="sr-only">— already installed</span>
                    </span>
                  ) : (
                    <label key={tool.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
                      <input
                        type="checkbox"
                        checked={!excluded.has(tool.id)}
                        onChange={() => toggle(tool.id)}
                        className="accent-accent"
                      />
                      <span className="truncate">{tool.name}</span>
                    </label>
                  ),
                )}
              </div>
            </div>
            )
          })}
        </div>

        {selectedCount > 0 ? (
          <CommandBlock command={prompt} label="Copy AI setup prompt" filename="ai-setup-prompt.md" download multiline />
        ) : nothingLeft ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-fg-muted">
            Every tool for this platform is already ticked off — nothing left to install.
          </p>
        ) : (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            Select at least one tool — the prompt has nothing to install.
          </p>
        )}
      </div>
    </Modal>
  )
}
