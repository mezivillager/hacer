import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { serializeCircuit } from './serialize'
import { CIRCUIT_FORMAT_VERSION } from './types'

beforeEach(() => {
  circuitActions.clearCircuit()
})

describe('serializeCircuit', () => {
  it('produces a SerializedCircuit with version 1 and the given name', () => {
    const out = serializeCircuit(useCircuitStore.getState(), 'empty')
    expect(out.version).toBe(CIRCUIT_FORMAT_VERSION)
    expect(out.name).toBe('empty')
    expect(out.gates).toEqual([])
    expect(out.wires).toEqual([])
    expect(out.inputNodes).toEqual([])
    expect(out.outputNodes).toEqual([])
    expect(out.junctions).toEqual([])
  })

  it('writes an ISO timestamp to savedAt', () => {
    const out = serializeCircuit(useCircuitStore.getState(), 'empty')
    expect(() => new Date(out.savedAt).toISOString()).not.toThrow()
    expect(out.savedAt).toBe(new Date(out.savedAt).toISOString())
  })

  it('serializes a single gate including width', () => {
    const gate = circuitActions.addGate('NAND', { x: 4, y: 0, z: 4 })
    const out = serializeCircuit(useCircuitStore.getState(), 'one-gate')
    expect(out.gates).toHaveLength(1)
    expect(out.gates[0]).toEqual({
      id: gate.id,
      type: 'NAND',
      position: { x: 4, y: 0, z: 4 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      width: 1,
    })
  })

  it('preserves multi-bit gate width', () => {
    const gate = circuitActions.addGate('AND', { x: 0, y: 0, z: 0 }, 16)
    const out = serializeCircuit(useCircuitStore.getState(), 'wide')
    expect(out.gates[0].width).toBe(16)
    expect(out.gates[0].id).toBe(gate.id)
  })

  it('serializes I/O nodes with name + width + value', () => {
    const i = circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(i.id, 0)
    circuitActions.addOutputNode('out', { x: 4, y: 0, z: 0 })
    const out = serializeCircuit(useCircuitStore.getState(), 'io')
    expect(out.inputNodes).toHaveLength(1)
    expect(out.outputNodes).toHaveLength(1)
    expect(out.inputNodes[0].name).toBe('a')
    expect(out.inputNodes[0].value).toBe(0)
    expect(out.inputNodes[0].width).toBe(1)
    expect(out.outputNodes[0].name).toBe('out')
  })

  it('deep-clones positions and segments (no shared refs with store)', () => {
    const gate = circuitActions.addGate('NAND', { x: 4, y: 0, z: 4 })
    const out = serializeCircuit(useCircuitStore.getState(), 'isolated')
    out.gates[0].position.x = 9999
    expect(useCircuitStore.getState().gates.find((g) => g.id === gate.id)?.position.x).toBe(4)
  })

  it('serializes wire segments with type and optional arc metadata', () => {
    const a = circuitActions.addGate('NAND', { x: -4, y: 0, z: 0 })
    const b = circuitActions.addGate('NAND', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'gate', entityId: a.id, pinId: `${a.id}-out-0` },
      { type: 'gate', entityId: b.id, pinId: `${b.id}-in-0` },
      [
        { start: { x: -3, y: 0.2, z: 0 }, end: { x: 0, y: 0.2, z: 0 }, type: 'horizontal' },
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 0.15, y: 0.2, z: 0 },
          type: 'arc',
          arcCenter: { x: 0.075, y: 0.2, z: 0 },
          arcRadius: 0.075,
          crossedWireId: 'some-other-wire',
        },
        { start: { x: 0.15, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' },
      ],
    )
    const out = serializeCircuit(useCircuitStore.getState(), 'arced')
    expect(out.wires).toHaveLength(1)
    const segs = out.wires[0].segments
    expect(segs).toHaveLength(3)
    expect(segs[1]).toEqual({
      start: { x: 0, y: 0.2, z: 0 },
      end: { x: 0.15, y: 0.2, z: 0 },
      type: 'arc',
      arcCenter: { x: 0.075, y: 0.2, z: 0 },
      arcRadius: 0.075,
      crossedWireId: 'some-other-wire',
    })
  })
})
