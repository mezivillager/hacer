import { proxy, useSnapshot, subscribe } from 'valtio'
import { Vector3, Euler } from 'three'
import type { CircuitState, GateInstance, GateType, Pin, Wire } from './types'
import { gateLogic } from '@/simulation/gateLogic'

// Re-export types for convenience
export type { CircuitState, GateInstance, GateType, Pin, Wire, WiringState } from './types'

// Initial state
export const circuitStore = proxy<CircuitState>({
  gates: [],
  wires: [],
  selectedGateId: null,
  simulationRunning: false,
  simulationSpeed: 100,
  placementMode: null,
  wiringFrom: null,
})

// Actions
export const circuitActions = {
  // Gate actions
  addGate: (type: GateType, position: { x: number; y: number; z: number }) => {
    const id = `gate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const inputCount = type === 'NOT' ? 1 : 2
    const inputs: Pin[] = Array.from({ length: inputCount }, (_, i) => ({
      id: `${id}-in-${i}`,
      name: `IN${i}`,
      type: 'input',
      value: false,
    }))
    
    const outputs: Pin[] = [{
      id: `${id}-out-0`,
      name: 'OUT',
      type: 'output',
      value: false,
    }]
    
    const gate: GateInstance = {
      id,
      type,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      inputs,
      outputs,
      selected: false,
    }
    
    circuitStore.gates.push(gate)
    return gate
  },
  
  removeGate: (gateId: string) => {
    const index = circuitStore.gates.findIndex(g => g.id === gateId)
    if (index !== -1) {
      circuitStore.gates.splice(index, 1)
      // Remove associated wires
      circuitStore.wires = circuitStore.wires.filter(
        w => w.fromGateId !== gateId && w.toGateId !== gateId
      )
    }
  },
  
  selectGate: (gateId: string | null) => {
    circuitStore.gates.forEach(g => {
      g.selected = g.id === gateId
    })
    circuitStore.selectedGateId = gateId
  },
  
  updateGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => {
    const gate = circuitStore.gates.find(g => g.id === gateId)
    if (gate) {
      gate.position = position
    }
  },
  
  updateGateRotation: (gateId: string, rotation: { x: number; y: number; z: number }) => {
    const gate = circuitStore.gates.find(g => g.id === gateId)
    if (gate) {
      gate.rotation = rotation
    }
  },
  
  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => {
    const gate = circuitStore.gates.find(g => g.id === gateId)
    if (gate) {
      const current = gate.rotation
      gate.rotation = {
        ...current,
        [axis]: (current[axis] + angle) % (Math.PI * 2)
      }
    }
  },

  // Wire actions
  addWire: (fromGateId: string, fromPinId: string, toGateId: string, toPinId: string) => {
    const wire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromGateId,
      fromPinId,
      toGateId,
      toPinId,
    }
    circuitStore.wires.push(wire)
    return wire
  },
  
  removeWire: (wireId: string) => {
    const index = circuitStore.wires.findIndex(w => w.id === wireId)
    if (index !== -1) {
      circuitStore.wires.splice(index, 1)
    }
  },
  
  setInputValue: (gateId: string, pinId: string, value: boolean) => {
    const gate = circuitStore.gates.find(g => g.id === gateId)
    if (gate) {
      const pin = gate.inputs.find(p => p.id === pinId)
      if (pin) {
        pin.value = value
      }
    }
  },

  // Simulation actions
  toggleSimulation: () => {
    circuitStore.simulationRunning = !circuitStore.simulationRunning
  },
  
  setSimulationSpeed: (speed: number) => {
    circuitStore.simulationSpeed = speed
  },
  
  clearCircuit: () => {
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.selectedGateId = null
    circuitStore.placementMode = null
  },

  // Placement mode actions
  startPlacement: (type: GateType) => {
    circuitStore.placementMode = type
    circuitStore.selectedGateId = null
  },
  
  cancelPlacement: () => {
    circuitStore.placementMode = null
  },
  
  placeGate: (position: { x: number; y: number; z: number }) => {
    if (circuitStore.placementMode) {
      circuitActions.addGate(circuitStore.placementMode, position)
      circuitStore.placementMode = null
    }
  },

  // Wiring mode actions
  startWiring: (gateId: string, pinId: string, pinType: 'input' | 'output', position: { x: number; y: number; z: number }) => {
    circuitStore.wiringFrom = {
      fromGateId: gateId,
      fromPinId: pinId,
      fromPinType: pinType,
      fromPosition: position,
      previewEndPosition: null,
    }
    circuitStore.placementMode = null
  },
  
  updateWirePreviewPosition: (position: { x: number; y: number; z: number } | null) => {
    if (circuitStore.wiringFrom) {
      circuitStore.wiringFrom.previewEndPosition = position
    }
  },
  
  cancelWiring: () => {
    circuitStore.wiringFrom = null
  },
  
  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => {
    const from = circuitStore.wiringFrom
    if (!from) return
    
    // Validate: must connect output to input (or vice versa)
    if (from.fromPinType === toPinType) {
      console.warn('Cannot connect same pin types')
      circuitStore.wiringFrom = null
      return
    }
    
    // Validate: cannot connect to same gate
    if (from.fromGateId === toGateId) {
      console.warn('Cannot connect gate to itself')
      circuitStore.wiringFrom = null
      return
    }
    
    // Check if wire already exists
    const exists = circuitStore.wires.some(w => 
      (w.fromGateId === from.fromGateId && w.fromPinId === from.fromPinId && 
       w.toGateId === toGateId && w.toPinId === toPinId) ||
      (w.fromGateId === toGateId && w.fromPinId === toPinId && 
       w.toGateId === from.fromGateId && w.toPinId === from.fromPinId)
    )
    
    if (exists) {
      console.warn('Wire already exists')
      circuitStore.wiringFrom = null
      return
    }
    
    // Normalize: always store as output -> input
    if (from.fromPinType === 'output') {
      circuitActions.addWire(from.fromGateId, from.fromPinId, toGateId, toPinId)
    } else {
      circuitActions.addWire(toGateId, toPinId, from.fromGateId, from.fromPinId)
    }
    
    circuitStore.wiringFrom = null
  },
  
  // Helper to get pin world position (accounts for gate rotation)
  getPinWorldPosition: (gateId: string, pinId: string): { x: number; y: number; z: number } | null => {
    const gate = circuitStore.gates.find(g => g.id === gateId)
    if (!gate) return null
    
    const inputIndex = gate.inputs.findIndex(p => p.id === pinId)
    const outputIndex = gate.outputs.findIndex(p => p.id === pinId)
    
    let localOffset: Vector3
    if (inputIndex !== -1) {
      const yOffset = inputIndex === 0 ? 0.2 : -0.2
      localOffset = new Vector3(-0.7, yOffset, 0)
    } else if (outputIndex !== -1) {
      localOffset = new Vector3(0.7, 0, 0)
    } else {
      return null
    }
    
    const euler = new Euler(gate.rotation.x, gate.rotation.y, gate.rotation.z, 'XYZ')
    localOffset.applyEuler(euler)
    
    return {
      x: gate.position.x + localOffset.x,
      y: gate.position.y + localOffset.y,
      z: gate.position.z + localOffset.z,
    }
  },
  
  // Simulation tick - propagate signals through circuit
  simulationTick: () => {
    // Step 1: Propagate output values through wires to connected inputs
    for (const wire of circuitStore.wires) {
      const fromGate = circuitStore.gates.find(g => g.id === wire.fromGateId)
      const toGate = circuitStore.gates.find(g => g.id === wire.toGateId)
      
      if (fromGate && toGate) {
        const outputPin = fromGate.outputs.find(p => p.id === wire.fromPinId)
        const inputPin = toGate.inputs.find(p => p.id === wire.toPinId)
        
        if (outputPin && inputPin) {
          inputPin.value = outputPin.value
        }
      }
    }
    
    // Step 2: Calculate new output values for all gates
    for (const gate of circuitStore.gates) {
      const inputValues = gate.inputs.map(p => p.value)
      const logic = gateLogic[gate.type]
      if (logic) {
        const outputValue = logic(inputValues)
        for (const output of gate.outputs) {
          output.value = outputValue
        }
      }
    }
  },
}

// Simulation loop
let simulationInterval: ReturnType<typeof setInterval> | null = null

subscribe(circuitStore, () => {
  if (circuitStore.simulationRunning) {
    if (!simulationInterval) {
      simulationInterval = setInterval(() => {
        circuitActions.simulationTick()
      }, circuitStore.simulationSpeed)
    }
  } else {
    if (simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
  }
})

// Hook for reading state reactively
export const useCircuitStore = () => useSnapshot(circuitStore)
