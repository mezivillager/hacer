import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

const getState = () => useCircuitStore.getState()

function resetCircuitStoreState() {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    selectedGateId: null,
    selectedWireId: null,
    simulationRunning: false,
    simulationSpeed: 100,
    lastSimulationError: null,
    placementMode: null,
    placementPreviewPosition: null,
    wiringFrom: null,
    isDragActive: false,
    hoveredGateId: null,
    showAxes: false,
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    nodePlacementMode: null,
    selectedNodeId: null,
    selectedNodeType: null,
    junctionPlacementMode: null,
    junctionPreviewPosition: null,
    junctionPreviewWireId: null,
    statusMessages: [],
  })
}

beforeEach(() => {
  resetCircuitStoreState()
})

describe('statusActions', () => {
  it('adds a status message and returns it', () => {
    const created = getState().addStatus('info', 'Ready')

    expect(getState().statusMessages).toHaveLength(1)
    expect(getState().statusMessages[0]).toMatchObject({
      id: created.id,
      severity: 'info',
      text: 'Ready',
    })
    expect(created.timestamp).toBeTypeOf('number')
  })

  it('clearStatus removes only the targeted message', () => {
    const first = getState().addStatus('warning', 'First')
    getState().addStatus('error', 'Second')

    getState().clearStatus(first.id)

    expect(getState().statusMessages).toHaveLength(1)
    expect(getState().statusMessages[0].text).toBe('Second')
  })

  it('clearAllStatus removes all messages', () => {
    getState().addStatus('info', 'One')
    getState().addStatus('warning', 'Two')

    getState().clearAllStatus()

    expect(getState().statusMessages).toHaveLength(0)
  })

  it('clearStatus is no-op for unknown id', () => {
    getState().addStatus('info', 'Keep')

    getState().clearStatus('missing-id')

    expect(getState().statusMessages).toHaveLength(1)
  })
})
