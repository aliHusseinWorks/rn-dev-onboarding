import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  // For the two modals holding a code block or a tool grid: their content needs
  // ~110 monospace columns and four grid columns, which 2xl can't give. Prose
  // inside them caps itself at max-w-lg, so the extra width only reaches content
  // that uses it. The per-tool modals are prose plus a field or two and stay 2xl.
  wide?: boolean
}

export function Modal({ title, onClose, children, wide }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Move focus off the trigger button and into the dialog — standard dialog
    // behavior, and it keeps the trigger's tooltip from re-appearing on close.
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`card-in flex max-h-full w-full flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl outline-none ${
          wide ? 'max-w-5xl' : 'max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-mono text-base font-semibold text-fg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        {/* @container so grids inside size against the panel, not the viewport. */}
        <div className="@container overflow-y-auto overflow-x-hidden px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
