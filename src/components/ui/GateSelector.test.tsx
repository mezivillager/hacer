import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { GateSelector } from './GateSelector'
import { useCircuitStore } from '@/store/circuitStore'

// Mock gate icons
vi.mock('@/gates/icons', () => ({
  getGateIcon: () => {
    const MockIcon = ({ size, color }: { size: number; color: string }) => (
      <svg data-testid="gate-icon" width={size} height={size} fill={color} />
    )
    return MockIcon
  },
}))

// Mock shadcn Tooltip to just render children
vi.mock('./shadcn', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const setState = useCircuitStore.setState

describe('GateSelector', () => {
  beforeEach(() => {
    setState({
      placementMode: null,
    })
  })

  it('renders all elementary gates', () => {
    const { container } = render(<GateSelector />)
    const gateIcons = container.querySelectorAll('.gate-icon')
    expect(gateIcons.length).toBe(5) // NAND, AND, OR, NOT, XOR
  })

  it('renders gate labels', () => {
    const { getByText } = render(<GateSelector />)
    expect(getByText('NAND')).toBeInTheDocument()
    expect(getByText('AND')).toBeInTheDocument()
    expect(getByText('OR')).toBeInTheDocument()
    expect(getByText('NOT')).toBeInTheDocument()
    expect(getByText('XOR')).toBeInTheDocument()
  })

  it('applies active class to selected gate', () => {
    setState({ placementMode: 'NAND' })
    const { container } = render(<GateSelector />)
    const nandIcon = container.querySelector('[data-gate-type="NAND"]')
    expect(nandIcon?.className).toContain('active')
  })

  it('does not apply active class to unselected gates', () => {
    setState({ placementMode: 'NAND' })
    const { container } = render(<GateSelector />)
    const andIcon = container.querySelector('[data-gate-type="AND"]')
    expect(andIcon?.className).not.toContain('active')
  })

  it('calls startPlacement when clicking unselected gate', () => {
    const startPlacement = vi.fn()
    setState({ placementMode: null, startPlacement })
    const { container } = render(<GateSelector />)
    const andIcon = container.querySelector('[data-gate-type="AND"]')
    fireEvent.click(andIcon!)
    expect(startPlacement).toHaveBeenCalledWith('AND')
  })

  it('calls cancelPlacement when clicking already selected gate', () => {
    const cancelPlacement = vi.fn()
    setState({ placementMode: 'NAND', cancelPlacement })
    const { container } = render(<GateSelector />)
    const nandIcon = container.querySelector('[data-gate-type="NAND"]')
    fireEvent.click(nandIcon!)
    expect(cancelPlacement).toHaveBeenCalled()
  })

  it('handles Enter key press', () => {
    const startPlacement = vi.fn()
    setState({ placementMode: null, startPlacement })
    const { container } = render(<GateSelector />)
    const orIcon = container.querySelector('[data-gate-type="OR"]')
    fireEvent.keyDown(orIcon!, { key: 'Enter' })
    expect(startPlacement).toHaveBeenCalledWith('OR')
  })

  it('handles Space key press', () => {
    const startPlacement = vi.fn()
    setState({ placementMode: null, startPlacement })
    const { container } = render(<GateSelector />)
    const notIcon = container.querySelector('[data-gate-type="NOT"]')
    fireEvent.keyDown(notIcon!, { key: ' ' })
    expect(startPlacement).toHaveBeenCalledWith('NOT')
  })

  it('ignores other key presses', () => {
    const startPlacement = vi.fn()
    setState({ placementMode: null, startPlacement })
    const { container } = render(<GateSelector />)
    const xorIcon = container.querySelector('[data-gate-type="XOR"]')
    fireEvent.keyDown(xorIcon!, { key: 'Tab' })
    expect(startPlacement).not.toHaveBeenCalled()
  })

  it('has correct data-gate-type attributes', () => {
    const { container } = render(<GateSelector />)
    expect(container.querySelector('[data-gate-type="NAND"]')).toBeInTheDocument()
    expect(container.querySelector('[data-gate-type="AND"]')).toBeInTheDocument()
    expect(container.querySelector('[data-gate-type="OR"]')).toBeInTheDocument()
    expect(container.querySelector('[data-gate-type="NOT"]')).toBeInTheDocument()
    expect(container.querySelector('[data-gate-type="XOR"]')).toBeInTheDocument()
  })
})
