import { MonitorCheck } from 'lucide-react'
import { PLATFORMS, PLATFORM_INFO, type PlatformId } from '../lib/platform'
import { Select } from './Select'

interface Props {
  platform: PlatformId
  detected: PlatformId
  onChange: (platform: PlatformId) => void
}

export function PlatformBanner({ platform, detected, onChange }: Props) {
  const options = PLATFORMS.map((id) => ({ value: id, label: PLATFORM_INFO[id].label }))
  const isWindows = PLATFORM_INFO[platform].os === 'win'
  const overridden = platform !== detected
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/70 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <MonitorCheck size={18} className="text-accent" />
        <span className="text-sm text-fg-muted">
          {overridden ? 'Selected: ' : 'Detected: '}
          <span className="font-mono font-semibold text-fg">{PLATFORM_INFO[platform].label}</span>
        </span>
        {overridden && (
          <button
            onClick={() => onChange(detected)}
            className="text-xs text-fg-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-fg cursor-pointer"
          >
            detected: {PLATFORM_INFO[detected].label}
          </button>
        )}
        <Select
          value={platform}
          options={options}
          onChange={(v) => onChange(v as PlatformId)}
          ariaLabel="Override detected platform"
          className="ml-auto min-w-[190px]"
        />
      </div>
      {isWindows && (
        <p className="text-xs text-fg-subtle">
          Windows commands assume <span className="font-mono text-fg-muted">PowerShell</span>, the default terminal —
          run them there, not in cmd.exe.
        </p>
      )}
    </div>
  )
}
