import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpBar } from './HelpBar'
import { useCircuitStore } from '@/store/circuitStore'

const actualSetState = useCircuitStore.setState

describe('HelpBar', () => {
  beforeEach(() => {
    actualSetState({
      placementMode: null,
      wiringFrom: null,
      selectedGateId: null,
      selectedWireId: null,
      selectedNodeId: null,
    })
  })

  it('renders in expanded state by default', () => {
    render(<HelpBar />)
    expect(screen.getByText('Select')).toBeInTheDocument()
  })

  it('renders in collapsed state when collapsed prop is true', () => {
    render(<HelpBar collapsed={true} />)
    expect(screen.queryByText('Select')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show shortcuts/i })).toBeInTheDocument()
  })

  it('calls onCollapsedChange when collapse button is clicked', () => {
    const handleCollapsedChange = vi.fn()
    render(<HelpBar onCollapsedChange={handleCollapsedChange} />)

    const collapseButton = screen.getByRole('button', { name: /Hide help bar/i })
    fireEvent.click(collapseButton)

    expect(handleCollapsedChange).toHaveBeenCalledWith(true)
  })

  it('calls onCollapsedChange when expand button is clicked from collapsed state', () => {
    const handleCollapsedChange = vi.fn()
    render(<HelpBar collapsed={true} onCollapsedChange={handleCollapsedChange} />)

    const expandButton = screen.getByRole('button', { name: /Show shortcuts/i })
    fireEvent.click(expandButton)

    expect(handleCollapsedChange).toHaveBeenCalledWith(false)
  })

  it('shows default mode shortcuts when no selection or mode is active', () => {
    render(<HelpBar />)
    expect(screen.getByText('Select')).toBeInTheDocument()
    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.getByText('Zoom')).toBeInTheDocument()
  })

  it('shows selecting mode shortcuts when an element is selected', () => {
    actualSetState({
      selectedGateId: 'gate-1',
    })

    render(<HelpBar />)
    expect(screen.getByText('Remove')).toBeInTheDocument()
    expect(screen.getByText('Rotate')).toBeInTheDocument()
    expect(screen.getByText('Duplicate')).toBeInTheDocument()
  })

  it('shows wiring mode shortcuts when wiringFrom is set', () => {
    actualSetState({
      wiringFrom: { type: 'gate', entityId: 'gate-1', pinId: 'pin-a' },
    })

    render(<HelpBar />)
    expect(screen.getByText('Connect')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Undo point')).toBeInTheDocument()
  })

  it('shows moving mode shortcuts when placement mode is active', () => {
    actualSetState({
      placementMode: 'NAND',
    })

    render(<HelpBar />)
    expect(screen.getByText('Snap to grid')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Place')).toBeInTheDocument()
  })

  it('opens keyboard shortcuts modal when all shortcuts button is clicked', () => {
    render(<HelpBar />)

    const allShortcutsButton = screen.getByRole('button', { name: /All shortcuts/i })
    fireEvent.click(allShortcutsButton)

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })
})
