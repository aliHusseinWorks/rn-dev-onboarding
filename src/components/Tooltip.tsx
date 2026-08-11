import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  label: string
  children: ReactNode
  // Preferred edge only — the panel flips to the other one when the preferred
  // side has no room.
  side?: 'top' | 'bottom'
  className?: string
}

const GAP = 6
const EDGE = 8

// The outer max wins, so a panel larger than the viewport still starts on screen
// rather than being pushed off the opposite edge by the min.
function clamp(value: number, extent: number, size: number) {
  return Math.max(EDGE, Math.min(value, extent - size - EDGE))
}

// The panel renders into the body. `Modal`'s scrolling content box clips a
// positioned descendant, and any `backdrop-blur` ancestor becomes the containing
// block of a `fixed` child, so viewport coordinates land offset by wherever that
// ancestor sits. A body child is out of reach of both.
export function Tooltip({ label, children, side = 'top', className = '' }: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Measured, not declared: clamping needs the panel's own size, and `label`
  // changes it — a copy button's tip becomes 'Copied!' and back while the panel
  // is still open. Scroll is captured, because a panel that left the scrolling
  // box to avoid being clipped by it cannot follow a trigger still inside it.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      if (!wrapRef.current || !panelRef.current) return
      const trigger = wrapRef.current.getBoundingClientRect()
      const { width, height } = panelRef.current.getBoundingClientRect()
      const fitsAbove = trigger.top - height - GAP >= EDGE
      const fitsBelow = trigger.bottom + GAP + height <= window.innerHeight - EDGE
      const above = side === 'top' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove
      setPos({
        top: clamp(above ? trigger.top - height - GAP : trigger.bottom + GAP, window.innerHeight, height),
        left: clamp(trigger.left + trigger.width / 2 - width / 2, window.innerWidth, width),
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, side, label])

  return (
    <span
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      // A pointer crossing a trigger the keyboard opened must not close it.
      onMouseLeave={() => !wrapRef.current?.querySelector(':focus-visible') && setOpen(false)}
      // focus-visible only, or clicking a copy button leaves its tooltip pinned
      // open for as long as the button holds focus.
      onFocus={(e) => e.target instanceof Element && e.target.matches(':focus-visible') && setOpen(true)}
      onBlur={() => setOpen(false)}
      className={`inline-flex ${className}`}
    >
      {children}
      {createPortal(
        <span
          ref={panelRef}
          role="tooltip"
          // Transparent is still readable: the panel sits at the end of the body,
          // far from the trigger it describes, so a closed one has to be hidden
          // outright rather than left for a screen reader to find as stray text.
          aria-hidden={!open}
          style={pos ?? undefined}
          className={`pointer-events-none fixed z-[60] w-max max-w-[16rem] rounded-md border border-border-strong bg-bg px-2 py-1 text-center text-[11px] font-medium leading-snug text-fg shadow-lg transition-opacity duration-150 ${
            open && pos ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  )
}
