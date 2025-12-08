import { proxy, useSnapshot, subscribe } from 'valtio'

// Gate logic functions
const gateLogic: Record<GateInstance['type'], (inputs: boolean[]) => boolean> = {
  NAND: (inputs) => !(inputs[0] && inputs[1]),
  AND: (inputs) => inputs[0] && inputs[1],
  OR: (inputs) => inputs[0] || inputs[1],
  NOT: (inputs) => !inputs[0],
  NOR: (inputs) => !(inputs[0] || inputs[1]),
  XOR: (inputs) => inputs[0] !== inputs[1],
  XNOR: (inputs) => inputs[0] === inputs[1],
}

// Types for the circuit simulation
export interface Pin {
  id: string
  name: string
  type: 'input' | 'output'
  value: boolean
}

export interface Wire {
  id: string
  fromGateId: string
  fromPinId: string
  toGateId: string
  toPinId: string
}

export interface GateInstance {
  id: string
  type: 'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
}

export interface WiringState {
  fromGateId: string
  fromPinId: string
  fromPinType: 'input' | 'output'
  fromPosition: { x: number; y: number; z: number }
  previewEndPosition: { x: number; y: number; z: number } | null
}

export interface CircuitState {
  gates: GateInstance[]
  wires: Wire[]
  selectedGateId: string | null
  simulationRunning: boolean
  simulationSpeed: number // ms per tick
  // Placement mode
  placementMode: GateInstance['type'] | null
  // Wiring mode
  wiringFrom: WiringState | null
}

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
  addGate: (type: GateInstance['type'], position: { x: number; y: number; z: number }) => {
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
  startPlacement: (type: GateInstance['type']) => {
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
  
  // Update wire preview end position
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
  
  // Get pin world position helper
  getPinWorldPosition: (gateId: string, pinId: string): { x: number; y: number; z: number } | null => {
    const gate = circuitStore.gates.find(g => g.id === gateId)
    if (!gate) return null
    
    // Find which pin it is
    const inputIndex = gate.inputs.findIndex(p => p.id === pinId)
    const outputIndex = gate.outputs.findIndex(p => p.id === pinId)
    
    if (inputIndex !== -1) {
      // Input pins are on the left side
      const yOffset = inputIndex === 0 ? 0.2 : -0.2
      return {
        x: gate.position.x - 0.7,
        y: gate.position.y + yOffset,
        z: gate.position.z,
      }
    } else if (outputIndex !== -1) {
      // Output pin is on the right side
      return {
        x: gate.position.x + 0.7,
        y: gate.position.y,
        z: gate.position.z,
      }
    }
    
    return null
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

// Subscribe to simulation state changes
subscribe(circuitStore, () => {
  if (circuitStore.simulationRunning) {
    if (!simulationInterval) {
      // Start simulation loop
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

