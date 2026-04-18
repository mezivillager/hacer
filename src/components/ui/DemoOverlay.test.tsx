import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DemoOverlay } from './DemoOverlay'
import { DISMISS_DEMO_TOUR_EVENT } from '@/lib/demoTour'

describe('DemoOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Default: clean URL, no suppress
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing in the first 600ms after mount', () => {
    render(<DemoOverlay />)
    expect(screen.queryByTestId('demo-overlay')).not.toBeInTheDocument()
  })

  it('appears after 600ms', () => {
    render(<DemoOverlay />)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByTestId('demo-overlay')).toBeInTheDocument()
  })

  it('renders nothing when ?notour=1 is in the URL', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?notour=1' },
      writable: true,
    })
    render(<DemoOverlay />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByTestId('demo-overlay')).not.toBeInTheDocument()
  })

  it('clicking close button hides it', async () => {
    render(<DemoOverlay />)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByTestId('demo-overlay')).toBeInTheDocument()
    vi.useRealTimers() // userEvent needs real timers
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/close demo/i))
    await waitFor(() => {
      expect(screen.queryByTestId('demo-overlay')).not.toBeInTheDocument()
    })
  })

  it('dispatching DISMISS_DEMO_TOUR_EVENT hides it', () => {
    render(<DemoOverlay />)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByTestId('demo-overlay')).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new CustomEvent(DISMISS_DEMO_TOUR_EVENT))
    })
    expect(screen.queryByTestId('demo-overlay')).not.toBeInTheDocument()
  })

  it('renders demo image with role region and aria-label', () => {
    render(<DemoOverlay />)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    const region = screen.getByRole('region', { name: /app tour/i })
    expect(region).toBeInTheDocument()
    const img = region.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('src')).toContain('hacer-demo.gif')
  })
})
