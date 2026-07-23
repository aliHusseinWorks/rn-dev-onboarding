import { useCallback, useRef, useState } from 'react'

export function useCopy(resetMs = 1600): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard
        ?.writeText(text)
        .then(() => {
          setCopied(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), resetMs)
        })
        .catch(() => undefined)
    },
    [resetMs],
  )

  return [copied, copy]
}
