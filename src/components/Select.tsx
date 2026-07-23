import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

export function Select({ value, options, onChange, ariaLabel, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const [active, setActive] = useState(selectedIndex)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const openWith = (index: number) => {
    setActive(index)
    setOpen(true)
  }
  const choose = (index: number) => {
    onChange(options[index].value)
    setOpen(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        open ? setActive((i) => Math.min(options.length - 1, i + 1)) : openWith(selectedIndex)
        break
      case 'ArrowUp':
        e.preventDefault()
        open ? setActive((i) => Math.max(0, i - 1)) : openWith(selectedIndex)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        open ? choose(active) : openWith(selectedIndex)
        break
      case 'Escape':
        setOpen(false)
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActive(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActive(options.length - 1)
        }
        break
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openWith(selectedIndex))}
        onKeyDown={onKey}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-bg py-1.5 pl-3 pr-2 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong cursor-pointer"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown size={14} className={`shrink-0 text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 z-30 mt-1 max-h-72 w-max min-w-full overflow-auto rounded-lg border border-border-strong bg-surface p-1 shadow-xl"
        >
          {options.map((o, i) => {
            const selected = o.value === value
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  i === active ? 'bg-muted text-fg' : 'text-fg-muted'
                }`}
              >
                {o.label}
                {selected && <Check size={13} className="text-accent" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
