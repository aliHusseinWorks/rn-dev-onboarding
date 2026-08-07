import { useMemo, useState } from 'react'
import { Check, Info } from 'lucide-react'
import { aiSetupGroups, generateAiSetup } from '../lib/aiSetup'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import { CommandBlock } from './CommandBlock'
import { Modal } from './Modal'
import { Tooltip } from './Tooltip'

interface Props {
  platform: PlatformId
  // Tools ticked off on the page are already done, so they're shown as such and
  // left out of the prompt entirely — the page is the source of truth, and the
  // way back in is unticking the card, not a second control in here.
  installed: Record<string, boolean>
  onClose: () => void
}

const LAUNCH = 'claude --dangerously-skip-permissions'

const FLAG_TIP =
  'Without it, Claude Code asks before every command and you approve each step yourself, so you can’t walk away. Neither mode can absorb your OS’s own prompts — and Claude has no terminal to type a password into, so those installs are handed back to you as one block.'

const REMOTE_TIP =
  'Adds --remote-control, which also opens the session at claude.ai/code and in the Claude app. Send /config once and turn on “Push when actions required” so it can notify you there.'

export function AiSetupModal({ platform, installed, onClose }: Props) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())
  const [remote, setRemote] = useState(false)
  const groups = useMemo(() => aiSetupGroups(platform), [platform])
  const done = useMemo(() => new Set(Object.keys(installed).filter((id) => installed[id])), [installed])
  const { bootstrap, prompt, asks, handsOn, downloadMb, elevatedCount } = useMemo(
    () => generateAiSetup(platform, excluded, done),
    [platform, excluded, done],
  )

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

  // Rough minutes off the counts rather than a per-tool duration table nobody
  // would keep accurate: install times average out over a few dozen tools, and
  // a hands-on step is one sign-in or dialog either way.
  const plan = useMemo(() => {
    const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)
    // The elevated tools install while the user watches, so their minutes belong
    // to that phase rather than the walk-away one.
    const unattended = Math.max(0, selectedCount - elevatedCount)
    // round5 floors at 5, so each of these has to be gated or a phase claims five
    // minutes for nothing.
    const installing = unattended > 0 ? round5(unattended * 0.7) : 0
    const ending = handsOn > 0 ? round5(handsOn * 2) : 0
    const blocking = elevatedCount > 0 ? round5(elevatedCount * 0.7) : 0
    const phases: Array<{ time: string; label: string }> = []
    if (asks > 0) phases.push({ time: '1 min', label: `Answer the ${asks} questions it asks up front` })
    if (elevatedCount > 0) {
      phases.push({
        time: `~${blocking} min`,
        label:
          PLATFORM_INFO[platform].os === 'win'
            ? `Run one block yourself in PowerShell — ${elevatedCount} installs that need admin`
            : `Run one block yourself in a terminal — ${elevatedCount} installs, one password`,
      })
    }
    if (unattended > 0) {
      phases.push({
        time: `~${installing} min`,
        label: `Walk away — ${unattended} tools install and verify themselves`,
      })
    }
    if (ending > 0) {
      phases.push({ time: `~${ending} min`, label: `Come back for ${handsOn} steps only you can do — sign-ins, key pastes` })
    }
    return { phases, away: installing, total: round5((asks > 0 ? 1 : 0) + blocking + installing + ending) }
  }, [platform, selectedCount, asks, handsOn, elevatedCount])

  const downloadGb = downloadMb >= 1000 ? Math.round(downloadMb / 1000) : 0

  // Claude Code is a card like any other, so a ticked-off one drops its install
  // step here too — the fresh-PATH warning only matters right after installing.
  const hasClaude = done.has('claude-code')
  const steps = [
    ...(hasClaude ? [] : [{ command: bootstrap, note: 'Install Claude Code — the only manual install.' }]),
    {
      command: remote ? `${LAUNCH} --remote-control` : LAUNCH,
      note: hasClaude
        ? 'Start Claude Code, then paste the prompt below.'
        : 'Open a NEW terminal (so PATH is fresh), start Claude Code, then paste the prompt below.',
    },
  ]

  return (
    <Modal title="Full AI setup" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        {/* Nothing to install means nothing to paste — the list below is then the whole point. */}
        {!nothingLeft && plan.phases.length > 0 && (
          <div className="max-w-lg text-sm leading-relaxed text-fg-muted">
            <p>
              {steps.length === 1 ? 'One paste' : 'Two pastes'} and the AI installs every tool selected below for{' '}
              <span className="font-mono text-fg">{PLATFORM_INFO[platform].label}</span>, verifying each one and fixing
              its own failures. Roughly <span className="text-fg">{plan.total} min</span>, and you can leave the machine
              for <span className="text-fg">{plan.away} min</span> of it:
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-xs">
              {plan.phases.map((phase) => (
                <li key={phase.label} className="flex gap-2.5">
                  <span className="w-16 shrink-0 text-right font-mono text-fg-subtle">{phase.time}</span>
                  <span>{phase.label}</span>
                </li>
              ))}
            </ul>
            {downloadGb > 0 && (
              <p className="mt-2 text-xs text-warning">
                Those minutes assume a fast connection. This selection pulls{' '}
                <span className="font-mono">~{downloadGb} GB</span> — on slow Wi-Fi it is hours, not minutes.
              </p>
            )}
          </div>
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
              {i === steps.length - 1 && (
                <div className="flex items-center gap-1.5">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
                    <input
                      type="checkbox"
                      checked={remote}
                      onChange={() => setRemote((v) => !v)}
                      className="accent-accent"
                    />
                    Ping my phone if it needs me
                  </label>
                  <Tooltip label={REMOTE_TIP}>
                    <button
                      type="button"
                      aria-label="Remote control info"
                      className="text-fg-subtle transition-colors hover:text-fg cursor-pointer"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        {!nothingLeft && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <p className="max-w-lg text-xs leading-relaxed text-fg-muted">
              <span className="font-mono text-fg">--dangerously-skip-permissions</span> governs Claude&rsquo;s own
              approvals and nothing else — it is not an auto mode for your machine. It stops Claude asking before each
              command, which is what lets the install phase run unattended.{' '}
              {PLATFORM_INFO[platform].os === 'win'
                ? 'UAC dialogs still come from Windows and no flag can accept them, which is why one block is yours to run.'
                : 'Your password prompt still comes from the OS and no flag can answer it, which is why one block is yours to run.'}
            </p>
            <Tooltip label={FLAG_TIP}>
              <button
                type="button"
                aria-label="Skip-permissions flag info"
                className="text-fg-subtle transition-colors hover:text-fg cursor-pointer"
              >
                <Info size={13} />
              </button>
            </Tooltip>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
          <p className="max-w-lg text-xs font-medium text-fg">
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
              <div className="grid grid-cols-1 gap-x-3 gap-y-1 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
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
