import { useEffect, useRef, useState } from 'react'
import { categoryProgress } from '../lib/commands'
import type { PlatformId } from '../lib/platform'
import type { Category } from '../lib/tools'
import { ProgressBar } from './ProgressBar'

interface Props {
  categories: Category[]
  platform: PlatformId
  installed: Record<string, boolean>
  query: string
  done: number
  total: number
  // True once the header's progress bar has scrolled out of view — the rail
  // picks it up from there rather than showing a second copy alongside it.
  showProgress: boolean
}

// Scrolling the reader starts themselves. A programmatic scroll fires none of
// these, which is what makes them usable as "I'm steering now".
const RELEASE_EVENTS = ['wheel', 'touchmove'] as const

// The keys that scroll. A bare keydown listener would count typing as steering.
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'])

export function CategoryRail({ categories, platform, installed, query, done, total, showProgress }: Props) {
  const [active, setActive] = useState<string | null>(null)
  // A clicked row is an intent no scroll position can express: the sections at the
  // end of the page sit below the observer's band at full scroll and can never win
  // it. Hold the click until the reader scrolls for themselves.
  const pinned = useRef<string | null>(null)

  // query is a dependency because search unmounts filtered-out sections: one that
  // comes back is a new element the observer from the previous run never saw.
  useEffect(() => {
    const ids = categories.map((c) => c.id).filter((id) => document.getElementById(id))
    // A callback only carries the sections whose visibility changed, so the set
    // outlives it: the highest one still in the band is the active category.
    const visible = new Set<string>()

    const resolve = () => {
      if (pinned.current) return
      // Past the last band crossing there are no intersections left to observe, so
      // the end of the document is what names the final section.
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      const next = atEnd ? ids[ids.length - 1] : ids.find((id) => visible.has(id))
      if (next) setActive(next)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        resolve()
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    for (const id of ids) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }

    const release = () => {
      pinned.current = null
    }
    const releaseOnKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) release()
    }
    // Only the scrollbar track. Every click on the page bubbles to window too,
    // and ticking a tool off right after jumping to it is not steering — that
    // click would otherwise drop the pin and hand the highlight back to the
    // observer, which is the whole failure this pin exists to prevent.
    const releaseOnPointer = (e: PointerEvent) => {
      if (e.target === document.scrollingElement) release()
    }
    window.addEventListener('scroll', resolve, { passive: true })
    for (const type of RELEASE_EVENTS) window.addEventListener(type, release, { passive: true })
    window.addEventListener('keydown', releaseOnKey, { passive: true })
    window.addEventListener('pointerdown', releaseOnPointer, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', resolve)
      for (const type of RELEASE_EVENTS) window.removeEventListener(type, release)
      window.removeEventListener('keydown', releaseOnKey)
      window.removeEventListener('pointerdown', releaseOnPointer)
    }
  }, [categories, query])

  return (
    <nav aria-label="Categories" className="sticky top-20 hidden w-56 shrink-0 flex-col gap-0.5 self-start xl:flex">
      <div
        className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
          showProgress ? 'max-h-24 opacity-100' : 'max-h-0 -translate-y-1.5 opacity-0'
        }`}
      >
        <div className="pb-3">
          <div className="rounded-lg border border-border bg-surface/70 px-3 py-2.5">
            <ProgressBar done={done} total={total} />
          </div>
        </div>
      </div>

      {categories.map((category) => {
        const { done, total } = categoryProgress(category.id, platform, installed)
        return (
          <button
            key={category.id}
            onClick={() => {
              pinned.current = category.id
              setActive(category.id)
              document.getElementById(category.id)?.scrollIntoView()
            }}
            aria-current={active === category.id || undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${
              active === category.id ? 'bg-muted text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category.accent }} />
            <span className="min-w-0 flex-1 truncate">{category.title}</span>
            <span className="shrink-0 font-mono text-xs text-fg-subtle">
              {category.checkable !== false ? `${done}/${total}` : '—'}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
