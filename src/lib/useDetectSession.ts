import { useEffect, useRef, useState } from 'react'
import { DETECT_ENDPOINT, makeSessionCode } from './detectScript'

// Pairing session for the detect scan: owns the one-time code and polls the
// relay for the script's report. Lives inside DetectModal, so closing the
// modal unmounts the hook and stops everything.

export type DetectStatus = 'off' | 'waiting' | 'received' | 'expired'

export interface DetectReport {
  platform: string
  found: string[]
}

const POLL_MS = 2000
const POLL_UNREACHABLE_MS = 5000
const SESSION_TTL_MS = 10 * 60_000
const UNREACHABLE_AFTER = 5 // consecutive failures before the soft warning

export function useDetectSession(): {
  code: string
  status: DetectStatus
  report: DetectReport | null
  unreachable: boolean
  restart: () => void
} {
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
    if (!DETECT_ENDPOINT || status !== 'waiting') return
    const startedAt = Date.now()
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let stopped = false

    // Chained setTimeout (not setInterval) so slow responses never overlap.
    const tick = async () => {
      if (Date.now() - startedAt > SESSION_TTL_MS) {
        setStatus('expired')
        return
      }
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
      if (!stopped) timer = setTimeout(() => void tick(), failures.current >= UNREACHABLE_AFTER ? POLL_UNREACHABLE_MS : POLL_MS)
    }

    timer = setTimeout(() => void tick(), POLL_MS)
    return () => {
      stopped = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [code, status])

  return { code, status, report, unreachable, restart }
}
