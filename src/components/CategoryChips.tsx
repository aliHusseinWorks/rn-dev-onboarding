import { useState } from 'react'
import { categoryProgress, toolsMatching } from '../lib/commands'
import type { PlatformId } from '../lib/platform'
import type { Category } from '../lib/tools'

interface Props {
  categories: Category[]
  platform: PlatformId
  installed: Record<string, boolean>
  query: string
}

// The rail's job below xl, where there is no room for a sidebar: jump, and mark
// the chip you tapped so the jump is acknowledged. Still no scroll-spy — a
// highlight tracking the scroll would have to drag the strip along to keep itself
// visible, out from under the thumb panning it. A tap moves it, nothing else does.
export function CategoryChips({ categories, platform, installed, query }: Props) {
  const [tapped, setTapped] = useState<string | null>(null)

  return (
    <nav
      aria-label="Categories"
      className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6 xl:hidden"
    >
      {categories.map((category) => {
        const { done, total } = categoryProgress(category.id, platform, installed)
        const present = toolsMatching(category, query).length > 0
        const isTapped = present && tapped === category.id
        return (
          <button
            key={category.id}
            disabled={!present}
            onClick={() => {
              setTapped(category.id)
              document.getElementById(category.id)?.scrollIntoView()
            }}
            aria-current={isTapped || undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              isTapped
                ? 'border-border-strong bg-muted text-fg'
                : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg'
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category.accent }} />
            {category.title}
            <span className="font-mono text-fg-subtle">
              {category.checkable !== false ? `${done}/${total}` : '—'}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
