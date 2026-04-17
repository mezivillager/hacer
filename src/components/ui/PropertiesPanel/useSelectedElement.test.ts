import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSelectedElement } from './useSelectedElement'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

function placeGateAt(type: 'AND' | 'NAND' | 'OR', x: number, z: number): string {
  circuitActions.startPlacement(type)
  circuitActions.placeGate({ x, y: 0.2, z })
  return useCircuitStore.getState().gates[useCircuitStore.getState().gates.length - 1].id
}

describe('useSelectedElement', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
    circuitActions.deselectAll()
  })

  it('returns null when nothing is selected', () => {
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current).toBeNull()
  })

  it('returns gate-shaped object when a gate is selected', () => {
    const id = placeGateAt('AND', 1, 1)
    circuitActions.selectGate(id)
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current?.kind).toBe('gate')
    if (result.current?.kind === 'gate') {
      expect(result.current.gateType).toBe('AND')
      expect(result.current.id).toBe(id)
    }
  })

  it('returns wire-shaped object when a wire is selected', () => {
    // Manually inject a wire to keep the test focused on the adapter
    useCircuitStore.setState((s) => {
      s.wires = [
        {
          id: 'wire-1',
          from: { type: 'gate', entityId: 'g1', pinId: 'out' },
          to: { type: 'gate', entityId: 'g2', pinId: 'in1' },
          segments: [],
          crossesWireIds: [],
        },
      ]
      s.selectedWireId = 'wire-1'
    })
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current?.kind).toBe('wire')
    if (result.current?.kind === 'wire') {
      expect(result.current.id).toBe('wire-1')
      expect(result.current.from.entityId).toBe('g1')
      expect(result.current.to.entityId).toBe('g2')
    }
  })

  it('returns input-shaped object when an input node is selected', () => {
    circuitActions.addInputNode('a', { x: 0, y: 0.2, z: 0 })
    const id = useCircuitStore.getState().inputNodes[0].id
    circuitActions.selectNode(id, 'input')
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current?.kind).toBe('input')
    if (result.current?.kind === 'input') expect(result.current.id).toBe(id)
  })

  it('returns output-shaped object when an output node is selected', () => {
    circuitActions.addOutputNode('out', { x: 0, y: 0.2, z: 0 })
    const id = useCircuitStore.getState().outputNodes[0].id
    circuitActions.selectNode(id, 'output')
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current?.kind).toBe('output')
  })

  it('returns null when selectedNodeId is set but selectedNodeType is missing (defensive)', () => {
    useCircuitStore.setState((s) => {
      s.selectedNodeId = 'orphan'
      s.selectedNodeType = null
    })
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current).toBeNull()
  })

  it('priority: gate > wire > node when multiple slots are populated', () => {
    const gid = placeGateAt('AND', 1, 1)
    useCircuitStore.setState((s) => {
      s.selectedGateId = gid
      s.selectedWireId = 'fake-wire'
    })
    const { result } = renderHook(() => useSelectedElement())
    expect(result.current?.kind).toBe('gate')
  })
})
