import { useState, useEffect } from 'react'
import { CloseOutlined } from '@ant-design/icons'
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
    <div className="demo-overlay" role="region" aria-label="App tour">
      <div className="demo-overlay-card">
        <button className="demo-overlay-close" onClick={dismiss} aria-label="Close demo">
          <CloseOutlined />
        </button>
        <div className="demo-overlay-media">
          <img
            src={`${import.meta.env.BASE_URL}hacer-demo.gif`}
            alt="HACER demo — place gates, wire them together, and simulate"
          />
        </div>
        <div className="demo-overlay-caption">
          <strong>Quick tour</strong>
          <span>Place gates, connect pins, and run your circuit!</span>
        </div>
      </div>
    </div>
  )
}
