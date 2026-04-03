import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  DISMISS_DEMO_TOUR_EVENT,
  shouldSuppressDemoTourFromSearchParams,
} from '@/lib/demoTour'

/**
 * Non-modal floating tour: clicks pass through everywhere except the card.
 * Dismiss is in-memory only (shows again on full page load unless `?notour=1`).
 *
 * Programmatic dismiss: `window.dispatchEvent(new CustomEvent('hacer-dismiss-demo-tour'))`
 */
export function DemoOverlay() {
  const [suppressed] = useState(
    () =>
      typeof window !== 'undefined' &&
      shouldSuppressDemoTourFromSearchParams(window.location.search),
  )
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (suppressed) return
    const timer = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(timer)
  }, [suppressed])

  useEffect(() => {
    const onDismiss = () => setVisible(false)
    window.addEventListener(DISMISS_DEMO_TOUR_EVENT, onDismiss)
    return () => window.removeEventListener(DISMISS_DEMO_TOUR_EVENT, onDismiss)
  }, [])

  function dismiss() {
    setVisible(false)
  }

  if (suppressed || !visible) return null

  return (
    <div className="fixed inset-0 z-[1100] pointer-events-none bg-transparent" role="region" aria-label="App tour">
      <div className="absolute top-6 right-6 w-[360px] pointer-events-auto bg-gradient-to-br from-[#1e2a3a] to-[#162032] border border-primary/30 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(74,158,255,0.1)] animate-[demo-slide-down_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        <button
          className="absolute top-2 right-2 z-[2] w-7 h-7 border-none rounded-full bg-black/60 text-white/80 text-xs cursor-pointer flex items-center justify-center transition-colors hover:bg-red-500/70 hover:text-white"
          onClick={dismiss}
          aria-label="Close demo"
        >
          <X className="size-4" />
        </button>
        <div className="w-full overflow-hidden bg-[#0d1520]">
          <img
            src={`${import.meta.env.BASE_URL}hacer-demo.gif`}
            alt="HACER demo — place gates, wire them together, and simulate"
            className="w-full h-auto block"
          />
        </div>
        <div className="px-3.5 py-3 flex flex-col gap-0.5">
          <strong className="text-[13px] text-[#e0e6ed]">Quick tour</strong>
          <span className="text-xs text-white/55">Place gates, connect pins, and run your circuit!</span>
        </div>
      </div>
    </div>
  )
}
