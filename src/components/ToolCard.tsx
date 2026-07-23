import { Check, Circle, Download, ExternalLink } from 'lucide-react'
import { buttonLabel, isAvailable, resolveAction, resolveSecondary } from '../lib/commands'
import { toolIcon } from '../lib/icons'
import { useLatestVersion } from '../lib/versions'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import type { Category, Tool } from '../lib/tools'
import { CommandBlock } from './CommandBlock'

interface Props {
  tool: Tool
  category: Category
  platform: PlatformId
  index: number
  installed: boolean
  onToggle: () => void
  onOpen: () => void
}

export function ToolCard({ tool, category, platform, index, installed, onToggle, onOpen }: Props) {
  const Icon = toolIcon(tool.icon)
  const available = isAvailable(tool, platform)
  const action = resolveAction(tool, platform)
  const secondary = resolveSecondary(tool, platform)
  const primaryLabel = action ? buttonLabel(action, platform) : ''
  const isDownload = /download/i.test(primaryLabel)
  const latestVersion = useLatestVersion(tool.version)

  return (
    <div
      className={`card-in relative flex flex-col rounded-xl border bg-surface p-4 transition-colors ${
        available ? 'border-border hover:border-border-strong' : 'border-border opacity-55'
      }`}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      title={available ? undefined : `Not available on ${PLATFORM_INFO[platform].label}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${category.accent}1a`, color: category.accent }}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-sm font-semibold text-fg">
            {tool.name}
            {latestVersion && (
              <span
                title="Latest release"
                className="ml-2 rounded-full bg-muted px-1.5 py-0.5 align-middle font-mono text-[10px] font-medium text-fg-subtle"
              >
                v{latestVersion}
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{tool.description}</p>
        </div>
        {available && (
          <button
            onClick={onToggle}
            aria-pressed={installed}
            aria-label={installed ? `Mark ${tool.name} as not installed` : `Mark ${tool.name} as installed`}
            className={`shrink-0 cursor-pointer rounded-md p-1 transition-colors ${
              installed ? 'text-accent' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            {installed ? <Check size={18} /> : <Circle size={18} />}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {!available && (
          <p className="text-xs text-fg-subtle">Not available on {PLATFORM_INFO[platform].label}.</p>
        )}

        {/* Fixed order: commands → download/link → View setup. */}
        {available && action?.type === 'command' && (
          <CommandBlock command={action.value} label={primaryLabel} />
        )}

        {available && secondary?.type === 'command' && (
          <CommandBlock command={secondary.value} label={secondary.label ?? 'Copy'} subtle />
        )}

        {available && action?.type === 'link' && (
          <a
            href={action.value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-strong cursor-pointer"
          >
            {isDownload ? <Download size={16} /> : <ExternalLink size={16} />}
            {primaryLabel}
          </a>
        )}

        {available && secondary?.type === 'link' && (
          <a
            href={secondary.value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
          >
            <ExternalLink size={15} />
            {secondary.label ?? 'Open'}
          </a>
        )}

        {available && tool.modal && (
          <button
            onClick={onOpen}
            className={
              action
                ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer'
                : 'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-strong cursor-pointer'
            }
          >
            View setup →
          </button>
        )}
      </div>

      {tool.note && <p className="mt-3 text-xs leading-relaxed text-fg-subtle">{tool.note}</p>}

      {tool.docsUrl && (
        <div className="mt-auto pt-3">
          <a
            href={tool.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 text-xs text-fg-subtle transition-colors hover:text-fg cursor-pointer"
          >
            <ExternalLink size={12} /> Docs
          </a>
        </div>
      )}
    </div>
  )
}
