import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useContextMode } from './useContextMode'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

function placeAndSelect(): string {
  circuitActions.startPlacement('AND')
  circuitActions.placeGate({ x: 1, y: 0.2, z: 1 })
  const id = useCircuitStore.getState().gates[0].id
  circuitActions.selectGate(id)
  return id
}

describe('useContextMode', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
    circuitActions.deselectAll()
    circuitActions.cancelPlacement()
    circuitActions.cancelNodePlacement()
    circuitActions.cancelJunctionPlacement()
    useCircuitStore.setState((s) => {
      s.wiringFrom = null
    })
  })

  it('returns "default" when nothing is happening', () => {
    expect(renderHook(() => useContextMode()).result.current).toBe('default')
  })

  it('returns "moving" when placementMode is set', () => {
    circuitActions.startPlacement('AND')
    expect(renderHook(() => useContextMode()).result.current).toBe('moving')
  })

  it('returns "moving" when nodePlacementMode is set', () => {
    circuitActions.startNodePlacement('INPUT')
    expect(renderHook(() => useContextMode()).result.current).toBe('moving')
  })

  it('returns "moving" when junctionPlacementMode is true', () => {
    circuitActions.startJunctionPlacement()
    expect(renderHook(() => useContextMode()).result.current).toBe('moving')
  })

  it('returns "wiring" when wiringFrom is set', () => {
    useCircuitStore.setState((s) => {
      s.wiringFrom = {
        fromGateId: 'g1',
        fromPinId: 'p1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
      }
    })
    expect(renderHook(() => useContextMode()).result.current).toBe('wiring')
  })

  it('returns "selecting" when something is selected and no placement/wiring', () => {
    placeAndSelect()
    expect(renderHook(() => useContextMode()).result.current).toBe('selecting')
  })

  it('priority moving > wiring > selecting > default', () => {
    placeAndSelect()
    circuitActions.startPlacement('OR')
    expect(renderHook(() => useContextMode()).result.current).toBe('moving')
  })
})
