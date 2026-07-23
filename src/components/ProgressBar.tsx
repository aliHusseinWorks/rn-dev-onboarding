interface Props {
  done: number
  total: number
}

export function ProgressBar({ done, total }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-fg-muted">
          {done} / {total} tools installed
        </span>
        <span className="font-mono text-fg-subtle">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
