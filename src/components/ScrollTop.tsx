import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Floating scroll-to-top button — appears once the header is out of view.
export function ScrollTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface text-fg-muted shadow-lg transition-colors hover:border-accent hover:text-fg cursor-pointer"
    >
      <ArrowUp size={18} />
    </button>
  )
}
