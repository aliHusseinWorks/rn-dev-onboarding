import { Check, CheckCheck, ChevronDown, Copy } from 'lucide-react'
import { copyAllForCategory, isAvailable, matchesQuery, toolsInCategory } from '../lib/commands'
import type { PlatformId } from '../lib/platform'
import type { Category } from '../lib/tools'
import { useCopy } from '../lib/useCopy'
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
  const [copiedAll, copyAll] = useCopy()

  const tools = toolsInCategory(category.id).filter((t) => matchesQuery(t, category, query))

  if (tools.length === 0) return null

  const expanded = query.trim() ? true : open
  const allCommands = copyAllForCategory(category.id, platform)
  const availableIds = tools.filter((t) => isAvailable(t, platform)).map((t) => t.id)
  const allDone = availableIds.length > 0 && availableIds.every((id) => installed[id])

  return (
    <section className="scroll-mt-4">
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
          aria-expanded={expanded}
        >
          <span className="h-4 w-1 shrink-0 rounded-full" style={{ backgroundColor: category.accent }} />
          <h2 className="font-mono text-base font-semibold text-fg">{category.title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-fg-subtle">{tools.length}</span>
          <span className="hidden text-xs text-fg-subtle sm:inline">{category.description}</span>
          <ChevronDown
            size={18}
            className={`ml-auto shrink-0 text-fg-subtle transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </button>
        {availableIds.length > 0 && (
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
        {allCommands && (
          <Tooltip label="Copies every command in this category for your OS." side="bottom" align="end" className="shrink-0">
            <button
              onClick={() => copyAll(allCommands)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
            >
              {copiedAll ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
              {copiedAll ? 'Copied!' : 'Copy all'}
            </button>
          </Tooltip>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => (
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
        </div>
      )}
    </section>
  )
}
