import { Moon, Sun } from 'lucide-react'

interface Props {
  light: boolean
  onToggle: () => void
}

export function ThemeToggle({ light, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      className="rounded-lg border border-border p-2 text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
    >
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  )
}
