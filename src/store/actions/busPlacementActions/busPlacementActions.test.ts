import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

describe('busPlacementActions', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      busComponents: [],
      busPlacementMode: null,
      placementMode: null,
      nodePlacementMode: null,
    })
  })

  it('startBusPlacement sets the mode and clears other placement modes', () => {
    useCircuitStore.setState({ placementMode: 'Nand', nodePlacementMode: 'INPUT' })
    useCircuitStore.getState().startBusPlacement('splitter')
    expect(useCircuitStore.getState().busPlacementMode).toBe('splitter')
    expect(useCircuitStore.getState().placementMode).toBe(null)
    expect(useCircuitStore.getState().nodePlacementMode).toBe(null)
  })

  it('cancelBusPlacement clears the mode', () => {
    useCircuitStore.setState({ busPlacementMode: 'joiner' })
    useCircuitStore.getState().cancelBusPlacement()
    expect(useCircuitStore.getState().busPlacementMode).toBe(null)
  })

  it('placeBusComponent creates a width-16 splitter and clears the mode', () => {
    useCircuitStore.getState().startBusPlacement('splitter')
    useCircuitStore.getState().placeBusComponent({ x: 2, y: 0.2, z: 2 })
    const state = useCircuitStore.getState()
    expect(state.busComponents).toHaveLength(1)
    expect(state.busComponents[0].kind).toBe('splitter')
    expect(state.busComponents[0].width).toBe(16)
    expect(state.busComponents[0].outputs).toHaveLength(16)
    expect(state.busPlacementMode).toBe(null)
  })

  it('placeBusComponent creates a width-16 joiner', () => {
    useCircuitStore.getState().startBusPlacement('joiner')
    useCircuitStore.getState().placeBusComponent({ x: 0, y: 0.2, z: 0 })
    const state = useCircuitStore.getState()
    expect(state.busComponents[0].kind).toBe('joiner')
    expect(state.busComponents[0].inputs).toHaveLength(16)
  })

  it('placeBusComponent is a no-op when no mode is active', () => {
    useCircuitStore.getState().placeBusComponent({ x: 0, y: 0, z: 0 })
    expect(useCircuitStore.getState().busComponents).toHaveLength(0)
  })
})
