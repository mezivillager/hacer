import { describe, it, expect } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { gateRecord, importDocument, wireRecord } from './documentFixtures'

describe('importDocument', () => {
  it('loads the document through importCircuitJSON, wires and junction wireIds as written', () => {
    importDocument({
      gates: [gateRecord('g-a'), gateRecord('g-b', { x: 4, y: 0, z: 0 })],
      wires: [
        wireRecord('w-1', { type: 'gate', entityId: 'g-a', pinId: 'g-a-out-0' }, { type: 'junction', entityId: 'j-1' }),
        wireRecord('w-2', { type: 'junction', entityId: 'j-1' }, { type: 'gate', entityId: 'g-b', pinId: 'g-b-in-0' }),
      ],
      junctions: [{ id: 'j-1', position: { x: 2, y: 0, z: 0 }, signalId: 'sig', wireIds: ['w-2', 'w-1'] }],
    })

    const state = useCircuitStore.getState()
    expect(state.gates.map((g) => g.id)).toEqual(['g-a', 'g-b'])
    expect(state.wires.map((w) => w.id)).toEqual(['w-1', 'w-2'])
    expect(state.junctions).toEqual([{ id: 'j-1', position: { x: 2, y: 0, z: 0 }, signalId: 'sig', wireIds: ['w-2', 'w-1'] }])
  })

  it('throws when the document loads differently from how it was written', () => {
    expect(() =>
      importDocument({
        gates: [gateRecord('g-nor', undefined, 'NOR'), gateRecord('g-b')],
        wires: [wireRecord('w-1', { type: 'gate', entityId: 'g-nor', pinId: 'g-nor-out-0' }, { type: 'gate', entityId: 'g-b', pinId: 'g-b-in-0' })],
      })
    ).toThrow(/loaded as/)
  })
})
