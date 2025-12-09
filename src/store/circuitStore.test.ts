import { describe, it, expect, beforeEach } from 'vitest'
import { circuitStore, circuitActions } from './circuitStore'

describe('circuitStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.selectedGateId = null
    circuitStore.simulationRunning = false
    circuitStore.placementMode = null
    circuitStore.wiringFrom = null
  })

  describe('Gate Actions', () => {
    describe('addGate', () => {
      it('adds a gate with correct type and position', () => {
        const gate = circuitActions.addGate('NAND', { x: 1, y: 2, z: 3 })
        
        expect(circuitStore.gates).toHaveLength(1)
        expect(gate.type).toBe('NAND')
        expect(gate.position).toEqual({ x: 1, y: 2, z: 3 })
      })

      it('creates gate with unique id', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 1, y: 0, z: 0 })
        
        expect(gate1.id).not.toBe(gate2.id)
      })

      it('creates 2 inputs for NAND gate', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        expect(gate.inputs).toHaveLength(2)
        expect(gate.inputs[0].type).toBe('input')
        expect(gate.inputs[1].type).toBe('input')
      })

      it('creates 1 input for NOT gate', () => {
        const gate = circuitActions.addGate('NOT', { x: 0, y: 0, z: 0 })
        
        expect(gate.inputs).toHaveLength(1)
      })

      it('creates 1 output for all gates', () => {
        const nand = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const not = circuitActions.addGate('NOT', { x: 1, y: 0, z: 0 })
        
        expect(nand.outputs).toHaveLength(1)
        expect(not.outputs).toHaveLength(1)
      })

      it('initializes gate as not selected', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        expect(gate.selected).toBe(false)
      })
    })

    describe('removeGate', () => {
      it('removes gate from store', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        expect(circuitStore.gates).toHaveLength(1)
        
        circuitActions.removeGate(gate.id)
        expect(circuitStore.gates).toHaveLength(0)
      })

      it('removes associated wires when gate is removed', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        circuitActions.addWire(
          gate1.id, gate1.outputs[0].id,
          gate2.id, gate2.inputs[0].id
        )
        expect(circuitStore.wires).toHaveLength(1)
        
        circuitActions.removeGate(gate1.id)
        expect(circuitStore.wires).toHaveLength(0)
      })

      it('does nothing if gate does not exist', () => {
        circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        expect(circuitStore.gates).toHaveLength(1)
        
        circuitActions.removeGate('non-existent-id')
        expect(circuitStore.gates).toHaveLength(1)
      })
    })

    describe('selectGate', () => {
      it('selects a gate by id', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        circuitActions.selectGate(gate.id)
        
        expect(circuitStore.selectedGateId).toBe(gate.id)
        expect(circuitStore.gates[0].selected).toBe(true)
      })

      it('deselects previously selected gate', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        circuitActions.selectGate(gate1.id)
        circuitActions.selectGate(gate2.id)
        
        expect(circuitStore.gates[0].selected).toBe(false)
        expect(circuitStore.gates[1].selected).toBe(true)
      })

      it('clears selection when null is passed', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        circuitActions.selectGate(gate.id)
        
        circuitActions.selectGate(null)
        
        expect(circuitStore.selectedGateId).toBe(null)
        expect(circuitStore.gates[0].selected).toBe(false)
      })
    })

    describe('rotateGate', () => {
      it('rotates gate by specified angle', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        circuitActions.rotateGate(gate.id, 'y', Math.PI / 2)
        
        expect(circuitStore.gates[0].rotation.y).toBeCloseTo(Math.PI / 2)
      })

      it('accumulates rotation', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        circuitActions.rotateGate(gate.id, 'y', Math.PI / 4)
        circuitActions.rotateGate(gate.id, 'y', Math.PI / 4)
        
        expect(circuitStore.gates[0].rotation.y).toBeCloseTo(Math.PI / 2)
      })
    })
  })

  describe('Wire Actions', () => {
    describe('addWire', () => {
      it('adds a wire between two gates', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        const wire = circuitActions.addWire(
          gate1.id, gate1.outputs[0].id,
          gate2.id, gate2.inputs[0].id
        )
        
        expect(circuitStore.wires).toHaveLength(1)
        expect(wire.fromGateId).toBe(gate1.id)
        expect(wire.toGateId).toBe(gate2.id)
      })

      it('creates wire with unique id', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        const wire1 = circuitActions.addWire(
          gate1.id, gate1.outputs[0].id,
          gate2.id, gate2.inputs[0].id
        )
        const wire2 = circuitActions.addWire(
          gate1.id, gate1.outputs[0].id,
          gate2.id, gate2.inputs[1].id
        )
        
        expect(wire1.id).not.toBe(wire2.id)
      })
    })

    describe('removeWire', () => {
      it('removes wire from store', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        const wire = circuitActions.addWire(
          gate1.id, gate1.outputs[0].id,
          gate2.id, gate2.inputs[0].id
        )
        expect(circuitStore.wires).toHaveLength(1)
        
        circuitActions.removeWire(wire.id)
        expect(circuitStore.wires).toHaveLength(0)
      })
    })

    describe('setInputValue', () => {
      it('sets input pin value', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        circuitActions.setInputValue(gate.id, gate.inputs[0].id, true)
        
        expect(circuitStore.gates[0].inputs[0].value).toBe(true)
      })
    })
  })

  describe('Simulation Actions', () => {
    describe('toggleSimulation', () => {
      it('toggles simulation running state', () => {
        expect(circuitStore.simulationRunning).toBe(false)
        
        circuitActions.toggleSimulation()
        expect(circuitStore.simulationRunning).toBe(true)
        
        circuitActions.toggleSimulation()
        expect(circuitStore.simulationRunning).toBe(false)
      })
    })

    describe('clearCircuit', () => {
      it('clears all gates and wires', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        circuitActions.addWire(
          gate1.id, gate1.outputs[0].id,
          gate2.id, gate2.inputs[0].id
        )
        circuitActions.selectGate(gate1.id)
        
        circuitActions.clearCircuit()
        
        expect(circuitStore.gates).toHaveLength(0)
        expect(circuitStore.wires).toHaveLength(0)
        expect(circuitStore.selectedGateId).toBe(null)
      })
    })
  })

  describe('Placement Actions', () => {
    describe('startPlacement', () => {
      it('sets placement mode', () => {
        circuitActions.startPlacement('NAND')
        
        expect(circuitStore.placementMode).toBe('NAND')
      })

      it('clears selected gate', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        circuitActions.selectGate(gate.id)
        
        circuitActions.startPlacement('AND')
        
        expect(circuitStore.selectedGateId).toBe(null)
      })
    })

    describe('placeGate', () => {
      it('places gate at position and clears placement mode', () => {
        circuitActions.startPlacement('NAND')
        
        circuitActions.placeGate({ x: 1, y: 2, z: 3 })
        
        expect(circuitStore.gates).toHaveLength(1)
        expect(circuitStore.gates[0].position).toEqual({ x: 1, y: 2, z: 3 })
        expect(circuitStore.placementMode).toBe(null)
      })

      it('does nothing if not in placement mode', () => {
        circuitActions.placeGate({ x: 1, y: 2, z: 3 })
        
        expect(circuitStore.gates).toHaveLength(0)
      })
    })
  })

  describe('Wiring Actions', () => {
    describe('completeWiring', () => {
      it('creates wire when connecting output to input', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        circuitActions.startWiring(
          gate1.id, gate1.outputs[0].id, 'output',
          { x: 0.7, y: 0, z: 0 }
        )
        circuitActions.completeWiring(gate2.id, gate2.inputs[0].id, 'input')
        
        expect(circuitStore.wires).toHaveLength(1)
        expect(circuitStore.wiringFrom).toBe(null)
      })

      it('rejects connection between same pin types', () => {
        const gate1 = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        const gate2 = circuitActions.addGate('NAND', { x: 2, y: 0, z: 0 })
        
        circuitActions.startWiring(
          gate1.id, gate1.outputs[0].id, 'output',
          { x: 0.7, y: 0, z: 0 }
        )
        circuitActions.completeWiring(gate2.id, gate2.outputs[0].id, 'output')
        
        expect(circuitStore.wires).toHaveLength(0)
      })

      it('rejects connection to same gate', () => {
        const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
        
        circuitActions.startWiring(
          gate.id, gate.outputs[0].id, 'output',
          { x: 0.7, y: 0, z: 0 }
        )
        circuitActions.completeWiring(gate.id, gate.inputs[0].id, 'input')
        
        expect(circuitStore.wires).toHaveLength(0)
      })
    })
  })
})
