import { useEffect, useRef, useState } from 'react'
import { DETECT_ENDPOINT, makeSessionCode } from './detectScript'

// Pairing session for the detect scan: owns the one-time code and polls the
// relay for the script's report. It belongs to `App` so the session survives the
// modal closing; `enabled` holds the polling back until the modal has been
// opened at least once.

export type DetectStatus = 'off' | 'waiting' | 'received'

export interface DetectReport {
  platform: string
  found: string[]
}

export interface DetectSession {
  code: string
  status: DetectStatus
  report: DetectReport | null
  unreachable: boolean
  restart: () => void
}

const POLL_MS = 2000
const POLL_SLOW_MS = 10_000
const POLL_IDLE_MS = 60_000
const POLL_UNREACHABLE_MS = 5000
const UNREACHABLE_AFTER = 5 // consecutive failures before the soft warning

// A code stays good for as long as the tab is open, so the poll has to get
// cheaper on its own: a tab left open all day would otherwise cost ~1,800 relay
// reads an hour. A scan run in the first couple of minutes lands in one tick.
function pollDelay(elapsed: number): number {
  return elapsed > 10 * 60_000 ? POLL_IDLE_MS : elapsed > 2 * 60_000 ? POLL_SLOW_MS : POLL_MS
}

export function useDetectSession(enabled: boolean): DetectSession {
  const [code, setCode] = useState(makeSessionCode)
  const [status, setStatus] = useState<DetectStatus>(DETECT_ENDPOINT ? 'waiting' : 'off')
  const [report, setReport] = useState<DetectReport | null>(null)
  const [unreachable, setUnreachable] = useState(false)
  const failures = useRef(0)

  const restart = () => {
    failures.current = 0
    setUnreachable(false)
    setReport(null)
    setStatus(DETECT_ENDPOINT ? 'waiting' : 'off')
    setCode(makeSessionCode())
  }

  useEffect(() => {
    if (!enabled || !DETECT_ENDPOINT || status !== 'waiting') return
    const startedAt = Date.now()
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let stopped = false

    // Chained setTimeout (not setInterval) so slow responses never overlap.
    const tick = async () => {
      try {
        const res = await fetch(`${DETECT_ENDPOINT}/report/${code}`, { signal: controller.signal })
        if (res.status === 404) {
          // Pending — and the relay answered, so it's reachable.
          failures.current = 0
          setUnreachable(false)
        } else if (res.ok) {
          const data = (await res.json()) as Partial<DetectReport>
          if (typeof data.platform === 'string' && Array.isArray(data.found)) {
            setReport({ platform: data.platform, found: data.found.filter((id) => typeof id === 'string') })
            setStatus('received')
            return
          }
          failures.current += 1
        } else {
          failures.current += 1
        }
      } catch {
        if (controller.signal.aborted) return
        failures.current += 1
      }
      if (failures.current >= UNREACHABLE_AFTER) setUnreachable(true)
      if (!stopped) {
        const delay = pollDelay(Date.now() - startedAt)
        timer = setTimeout(
          () => void tick(),
          failures.current >= UNREACHABLE_AFTER ? Math.max(POLL_UNREACHABLE_MS, delay) : delay,
        )
      }
    }

    timer = setTimeout(() => void tick(), POLL_MS)
    return () => {
      stopped = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [code, status, enabled])

  return { code, status, report, unreachable, restart }
}
