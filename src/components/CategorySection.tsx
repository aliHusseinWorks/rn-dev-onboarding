import { CheckCheck, ChevronDown } from 'lucide-react'
import { categoryProgress, isAvailable, toolsMatching } from '../lib/commands'
import { toolIcon } from '../lib/icons'
import { PLATFORM_INFO, type PlatformId } from '../lib/platform'
import type { Category } from '../lib/tools'
import { ToolCard } from './ToolCard'
import { Tooltip } from './Tooltip'

interface Props {
  category: Category
  platform: PlatformId
  installed: Record<string, boolean>
  query: string
  open: boolean
  onToggleOpen: () => void
  onToggle: (id: string) => void
  onSetMany: (ids: string[], value: boolean) => void
  onOpenModal: (toolId: string) => void
}

export function CategorySection({ category, platform, installed, query, open, onToggleOpen, onToggle, onSetMany, onOpenModal }: Props) {
  const tools = toolsMatching(category, query)

  if (tools.length === 0) return null

  const expanded = query.trim() ? true : open
  const availableTools = tools.filter((t) => isAvailable(t, platform))
  const unavailableTools = tools.filter((t) => !isAvailable(t, platform))
  const availableIds = availableTools.map((t) => t.id)
  const allDone = availableIds.length > 0 && availableIds.every((id) => installed[id])
  // Whole-category, not the filtered subset: this number sits beside the rail's,
  // and a search must not make the two disagree. "Mark all done" still acts on
  // what's on screen, which is why availableIds stays query-scoped.
  const progress = categoryProgress(category.id, platform, installed)

  return (
    <section id={category.id} className="scroll-mt-[var(--bar-h)]">
      <div className="z-10 mb-3 flex items-center gap-3 bg-bg/85 py-2 backdrop-blur sm:sticky sm:top-[var(--bar-h)]">
        <button
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
          aria-expanded={expanded}
        >
          <span className="h-4 w-1 shrink-0 rounded-full" style={{ backgroundColor: category.accent }} />
          <h2 className="font-mono text-base font-semibold text-fg">{category.title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-fg-subtle">{availableTools.length}</span>
          <span className="hidden text-xs text-fg-subtle sm:inline">{category.description}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {category.checkable !== false && progress.total > 0 && (
              <span className="hidden font-mono text-xs text-fg-subtle sm:inline">
                {progress.done}/{progress.total} installed
              </span>
            )}
            <ChevronDown
              size={18}
              className={`shrink-0 text-fg-subtle transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
          </span>
        </button>
        {category.checkable !== false && availableIds.length > 0 && (
          <Tooltip
            label={allDone ? 'Clear the installed checkmarks in this section.' : 'Check off every tool in this section as installed.'}
            side="bottom"
            align="end"
            className="shrink-0"
          >
            <button
              onClick={() => onSetMany(availableIds, !allDone)}
              className={`flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-border-strong cursor-pointer ${
                allDone ? 'text-accent hover:text-accent' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <CheckCheck size={13} />
              {allDone ? 'Uncheck all' : 'Mark all done'}
            </button>
          </Tooltip>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
          {availableTools.map((tool, i) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              category={category}
              platform={platform}
              index={i}
              installed={Boolean(installed[tool.id])}
              onToggle={() => onToggle(tool.id)}
              onOpen={() => onOpenModal(tool.id)}
            />
          ))}

          {unavailableTools.length > 0 && (
            <div className="col-span-full flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3">
              <span className="text-xs text-fg-subtle">Not on {PLATFORM_INFO[platform].label}:</span>
              {unavailableTools.map((tool) => {
                const Icon = toolIcon(tool.icon)
                return (
                  <span
                    key={tool.id}
                    title={tool.note ?? `Not available on ${PLATFORM_INFO[platform].label}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-fg-muted"
                  >
                    <Icon size={13} />
                    {tool.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
