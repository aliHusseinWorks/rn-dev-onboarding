import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
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
    </div>
  )
}
