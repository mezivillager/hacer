import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { NodeSelector } from './NodeSelector'
import { useCircuitStore } from '@/store/circuitStore'

const setState = useCircuitStore.setState

describe('NodeSelector', () => {
  beforeEach(() => {
    setState({
      nodePlacementMode: null,
      junctionPlacementMode: false,
      startNodePlacement: vi.fn(),
      cancelNodePlacement: vi.fn(),
      cancelPlacement: vi.fn(),
      startJunctionPlacement: vi.fn(),
      cancelJunctionPlacement: vi.fn(),
    })
  })

  it('renders compact segmented selector', () => {
    render(<NodeSelector compact />)
    expect(screen.getByTestId('node-compact-selector')).toBeInTheDocument()
  })

  it('selects input mode from compact segmented control', () => {
    const startNodePlacement = vi.fn()
    setState({ nodePlacementMode: null, startNodePlacement })

    render(<NodeSelector compact />)
    fireEvent.click(screen.getByRole('radio', { name: 'Input' }))

    expect(startNodePlacement).toHaveBeenCalledWith('INPUT')
  })
})
