import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { notify } from '@/lib/notify'
import { serializeCircuit } from './serialize'
import { deserializeCircuit } from './deserialize'
import { CIRCUIT_FORMAT_VERSION, type SerializedCircuit } from './types'

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
    const gate = circuitActions.addGate('Nand', { x: 4, y: 0, z: 4 })
    const out = serializeCircuit(useCircuitStore.getState(), 'one-gate')
    expect(out.gates).toHaveLength(1)
    expect(out.gates[0]).toEqual({
      id: gate.id,
      // SerializedGate keeps the `type` field on disk (see
      // src/core/serialization/types.ts). Phase 5 will migrate the on-disk
      // schema; for Phase 4 the runtime store renamed `type` → `chipName`,
      // but the saved blob still uses `type` and stores the canonical
      // chip name as the value.
      type: 'Nand',
      position: { x: 4, y: 0, z: 4 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      width: 1,
    })
  })

  it('preserves multi-bit gate width', () => {
    const gate = circuitActions.addGate('And', { x: 0, y: 0, z: 0 }, 16)
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
    const gate = circuitActions.addGate('Nand', { x: 4, y: 0, z: 4 })
    const out = serializeCircuit(useCircuitStore.getState(), 'isolated')
    out.gates[0].position.x = 9999
    expect(useCircuitStore.getState().gates.find((g) => g.id === gate.id)?.position.x).toBe(4)
  })

  it('serializes wire segments with type and optional arc metadata', () => {
    const a = circuitActions.addGate('Nand', { x: -4, y: 0, z: 0 })
    const b = circuitActions.addGate('Nand', { x: 4, y: 0, z: 0 })
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

describe('deserializeCircuit', () => {
  it('rejects unknown version', () => {
    expect(() =>
      deserializeCircuit({
        version: 0 as 1,
        name: 'x',
        savedAt: '',
        gates: [],
        wires: [],
        inputNodes: [],
        outputNodes: [],
        junctions: [],
      }),
    ).toThrow(/Unsupported circuit version/)
  })

  it('round-trips an empty circuit', () => {
    const out = serializeCircuit(useCircuitStore.getState(), 'empty')
    const restored = deserializeCircuit(out)
    expect(restored).toEqual({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })
  })

  it('round-trips a single gate and preserves its id, width, and pin ids', () => {
    const gate = circuitActions.addGate('Nand', { x: 4, y: 0, z: 4 }, 1)
    const expectedInIds = gate.inputs.map((p) => p.id)
    const expectedOutIds = gate.outputs.map((p) => p.id)

    const blob = serializeCircuit(useCircuitStore.getState(), 'one-gate')
    const restored = deserializeCircuit(blob)

    expect(restored.gates).toHaveLength(1)
    expect(restored.gates[0].id).toBe(gate.id)
    expect(restored.gates[0].width).toBe(1)
    expect(restored.gates[0].inputs.map((p) => p.id)).toEqual(expectedInIds)
    expect(restored.gates[0].outputs.map((p) => p.id)).toEqual(expectedOutIds)
  })

  it('round-trips a 16-bit gate', () => {
    const gate = circuitActions.addGate('And', { x: 0, y: 0, z: 0 }, 16)
    const blob = serializeCircuit(useCircuitStore.getState(), 'wide')
    const restored = deserializeCircuit(blob)
    expect(restored.gates[0].width).toBe(16)
    expect(restored.gates[0].inputs.every((p) => p.width === 16)).toBe(true)
    expect(restored.gates[0].outputs.every((p) => p.width === 16)).toBe(true)
    expect(restored.gates[0].id).toBe(gate.id)
  })

  it('round-trips a gate-to-gate wire with arc segment', () => {
    const a = circuitActions.addGate('Nand', { x: -4, y: 0, z: 0 })
    const b = circuitActions.addGate('Nand', { x: 4, y: 0, z: 0 })
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
          crossedWireId: 'other',
        },
        { start: { x: 0.15, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' },
      ],
    )
    const blob = serializeCircuit(useCircuitStore.getState(), 'arced')
    const restored = deserializeCircuit(blob)
    expect(restored.wires).toHaveLength(1)
    expect(restored.wires[0].segments).toEqual(blob.wires[0].segments)
    expect(restored.wires[0].from).toEqual(blob.wires[0].from)
  })

  it('round-trips junctions with signalId and wireIds', () => {
    const a = circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    const blob: ReturnType<typeof serializeCircuit> = {
      version: 1,
      name: 'jn',
      savedAt: new Date().toISOString(),
      gates: [
        {
          id: a.id,
          // SerializedGate keeps `type` for cross-version compatibility — see
          // src/core/serialization/types.ts. The runtime store renamed
          // `type` → `chipName`, but the saved blob still uses `type`.
          type: 'Nand',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 },
          width: 1,
        },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [
        { id: 'junction-test-1', position: { x: 2, y: 0.2, z: 0 }, signalId: 'sig-1', wireIds: ['wire-a', 'wire-b'] },
      ],
    }
    const restored = deserializeCircuit(blob)
    expect(restored.junctions).toEqual(blob.junctions)
  })

  it('honors the saved InputNode value (does not re-default to 1)', () => {
    const i = circuitActions.addInputNode('a', { x: 0, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(i.id, 0)
    const blob = serializeCircuit(useCircuitStore.getState(), 'val')
    const restored = deserializeCircuit(blob)
    expect(restored.inputNodes[0].value).toBe(0)
  })
})

describe('deserialize legacy GateType migration', () => {
  it('maps NAND/AND/OR/NOT/XOR to Nand/And/Or/Not/Xor', () => {
    const legacy: SerializedCircuit = {
      version: CIRCUIT_FORMAT_VERSION,
      name: 'legacy',
      savedAt: new Date().toISOString(),
      gates: [
        { id: 'g1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g2', type: 'AND', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g3', type: 'OR', position: { x: 4, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g4', type: 'NOT', position: { x: 6, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g5', type: 'XOR', position: { x: 8, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
    }
    const restored = deserializeCircuit(legacy)
    expect(restored.gates.map((g) => g.chipName)).toEqual(['Nand', 'And', 'Or', 'Not', 'Xor'])
  })

  it('warns and skips NOR/XNOR gates', () => {
    const notifySpy = vi.spyOn(notify, 'warning').mockImplementation(() => {})
    const legacy: SerializedCircuit = {
      version: CIRCUIT_FORMAT_VERSION,
      name: 'has-nor',
      savedAt: new Date().toISOString(),
      gates: [
        { id: 'g1', type: 'NOR', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g2', type: 'And', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
    }
    const restored = deserializeCircuit(legacy)
    expect(restored.gates).toHaveLength(1)
    expect(restored.gates[0].chipName).toBe('And')
    expect(notifySpy).toHaveBeenCalledWith(expect.stringMatching(/NOR.*not supported/i))
    notifySpy.mockRestore()
  })

  it('accepts modern chip names verbatim', () => {
    const modern: SerializedCircuit = {
      version: CIRCUIT_FORMAT_VERSION,
      name: 'modern',
      savedAt: new Date().toISOString(),
      gates: [
        { id: 'g1', type: 'Mux16', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
    }
    const restored = deserializeCircuit(modern)
    expect(restored.gates[0].chipName).toBe('Mux16')
  })
})
