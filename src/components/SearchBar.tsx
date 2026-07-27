import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return
      // Modal.tsx is the only thing that locks body scroll, so this reads as "a dialog is open".
      if (document.body.style.overflow === 'hidden') return
      // Firefox binds / to quick-find.
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tools…"
        aria-label="Search tools"
        className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-accent"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-subtle transition-colors hover:text-fg cursor-pointer"
        >
          <X size={15} />
        </button>
      )}
      {!value && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-fg-subtle sm:block"
        >
          /
        </kbd>
      )}
    </div>
  )
}
