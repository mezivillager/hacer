import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { CircuitLibrary } from './CircuitLibrary'

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  circuitActions.clearCircuit()
})

describe('CircuitLibrary', () => {
  it('renders an empty state when no saved circuits exist', () => {
    render(<CircuitLibrary />)
    expect(screen.getByTestId('library-empty-state')).toBeInTheDocument()
  })

  it('saves the current circuit when the user submits a name', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    render(<CircuitLibrary />)
    fireEvent.change(screen.getByTestId('library-name-input'), { target: { value: 'my-circuit' } })
    fireEvent.click(screen.getByTestId('library-save'))
    expect(localStorage.getItem('hacer-circuit-my-circuit')).not.toBeNull()
    expect(screen.getByTestId('library-entry-my-circuit')).toBeInTheDocument()
  })

  it('loads a saved circuit when the user clicks the row Load button', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.saveCircuit('one')
    circuitActions.clearCircuit()
    render(<CircuitLibrary />)
    fireEvent.click(screen.getByTestId('library-load-one'))
    expect(useCircuitStore.getState().gates).toHaveLength(1)
  })

  it('deletes a saved circuit when the user clicks the row Delete button', () => {
    circuitActions.saveCircuit('one')
    render(<CircuitLibrary />)
    fireEvent.click(screen.getByTestId('library-delete-one'))
    expect(localStorage.getItem('hacer-circuit-one')).toBeNull()
    expect(screen.queryByTestId('library-entry-one')).not.toBeInTheDocument()
  })

  it('triggers export when the Export button is clicked', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    render(<CircuitLibrary />)
    fireEvent.change(screen.getByTestId('library-name-input'), { target: { value: 'demo' } })
    vi.useFakeTimers()

    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    const realCreateElement = document.createElement.bind(document)
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return anchor
      return realCreateElement(tag)
    })
    const createObjectURL = vi.fn().mockReturnValue('blob:hacer-test')
    const revokeObjectURL = vi.fn()
    const originalURL = globalThis.URL
    globalThis.URL = { ...originalURL, createObjectURL, revokeObjectURL } as unknown as typeof URL

    try {
      fireEvent.click(screen.getByTestId('library-export'))
      expect(click).toHaveBeenCalled()
      vi.runAllTimers()
    } finally {
      vi.useRealTimers()
      globalThis.URL = originalURL
      createElement.mockRestore()
      click.mockRestore()
    }
  })

  it('imports a circuit when the user selects a JSON file', async () => {
    const blob = JSON.stringify({
      version: 1,
      name: 'imp',
      savedAt: new Date().toISOString(),
      gates: [
        {
          id: 'gate-imp-1',
          type: 'NAND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 },
          width: 1,
        },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
    })
    const file = new File([blob], 'imp.circuit.json', { type: 'application/json' })

    render(<CircuitLibrary />)
    const input = screen.getByTestId('library-import-input')
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    // importCircuitJSON only mutates the in-memory store; it does NOT add to the
    // saved-circuits list. Wait for the async file.text() promise chain to resolve
    // by polling the store.
    await vi.waitFor(() => {
      expect(useCircuitStore.getState().gates).toHaveLength(1)
    })
    expect(useCircuitStore.getState().gates[0].id).toBe('gate-imp-1')
  })
})
