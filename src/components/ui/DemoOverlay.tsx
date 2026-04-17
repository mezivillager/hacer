import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui-kit/button'
import { Card } from '@/components/ui-kit/card'
import {
  DISMISS_DEMO_TOUR_EVENT,
  shouldSuppressDemoTourFromSearchParams,
} from '@/lib/demoTour'

/**
 * Non-modal floating tour: clicks pass through everywhere except the card.
 * Dismiss is in-memory only (shows again on full page load unless `?notour=1`).
 *
 * Programmatic dismiss: window.dispatchEvent(new CustomEvent('hacer-dismiss-demo-tour')).
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

  if (suppressed || !visible) return null

  return (
    <Card
      role="region"
      aria-label="App tour"
      data-testid="demo-overlay"
      className="absolute bottom-20 right-4 w-80 z-10 overflow-hidden bg-card/95 backdrop-blur-sm border-border shadow-xl animate-in slide-in-from-bottom-4 duration-300 p-0 gap-0"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 w-7 h-7 z-10"
        onClick={() => setVisible(false)}
        aria-label="Close demo"
      >
        <X className="w-4 h-4" />
      </Button>
      <div className="aspect-video bg-muted">
        <img
          src={`${import.meta.env.BASE_URL}hacer-demo.gif`}
          alt="HACER demo \u2014 place gates, wire them together, and simulate"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 space-y-1">
        <p className="text-sm font-semibold">Quick tour</p>
        <p className="text-xs text-muted-foreground">
          Place gates, connect pins, and run your circuit!
        </p>
      </div>
    </Card>
  )
}
