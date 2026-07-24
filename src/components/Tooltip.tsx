import type { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
  // 'end' anchors the tooltip to the trigger's right edge — use for triggers
  // near the right side of the viewport so the tooltip isn't clipped.
  align?: 'center' | 'end'
  className?: string
}

// CSS-only tooltip — shows on hover and keyboard focus, no dependency.
export function Tooltip({ label, children, side = 'top', align = 'center', className = '' }: Props) {
  const pos = side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
  const anchor = align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
  return (
    <span className={`group/tt relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-40 w-max max-w-[16rem] ${anchor} ${pos} rounded-md border border-border-strong bg-bg px-2 py-1 text-center text-[11px] font-medium leading-snug text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 group-has-[:focus-visible]/tt:opacity-100`}
      >
        {label}
      </span>
    </span>
  )
}
