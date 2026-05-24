import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  circuitActions.clearCircuit()
})

describe('saveCircuit', () => {
  it('writes a SerializedCircuit JSON under hacer-circuit-<name>', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.saveCircuit('demo')
    const raw = localStorage.getItem('hacer-circuit-demo')
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!)
    expect(data.version).toBe(1)
    expect(data.name).toBe('demo')
    expect(data.gates).toHaveLength(1)
  })

  it('rejects empty or whitespace-only names (no localStorage entry)', async () => {
    const { notify } = await import('@/lib/notify')
    circuitActions.saveCircuit('')
    circuitActions.saveCircuit('   ')
    expect(localStorage.length).toBe(0)
    expect(notify.warning).toHaveBeenCalled()
  })

  it('overwrites an existing entry under the same name', () => {
    circuitActions.saveCircuit('demo')
    const first = JSON.parse(localStorage.getItem('hacer-circuit-demo')!)
    circuitActions.addGate('AND', { x: 4, y: 0, z: 4 })
    circuitActions.saveCircuit('demo')
    const second = JSON.parse(localStorage.getItem('hacer-circuit-demo')!)
    expect(second.gates.length).toBeGreaterThan(first.gates.length)
  })
})

describe('listSavedCircuits', () => {
  it('returns sorted entries with name + savedAt (newest first)', async () => {
    circuitActions.saveCircuit('first')
    await new Promise((r) => setTimeout(r, 5))
    circuitActions.saveCircuit('second')
    const list = circuitActions.listSavedCircuits()
    expect(list.map((e) => e.name)).toEqual(['second', 'first'])
  })

  it('excludes the __autosave__ slot from the user-facing list', () => {
    circuitActions.saveCircuit('a')
    localStorage.setItem(
      'hacer-circuit-__autosave__',
      JSON.stringify({
        version: 1,
        name: '__autosave__',
        savedAt: new Date().toISOString(),
        gates: [],
        wires: [],
        inputNodes: [],
        outputNodes: [],
        junctions: [],
      }),
    )
    const list = circuitActions.listSavedCircuits()
    expect(list.map((e) => e.name)).toEqual(['a'])
  })
})

describe('deleteSavedCircuit', () => {
  it('removes the named entry only', () => {
    circuitActions.saveCircuit('a')
    circuitActions.saveCircuit('b')
    circuitActions.deleteSavedCircuit('a')
    expect(localStorage.getItem('hacer-circuit-a')).toBeNull()
    expect(localStorage.getItem('hacer-circuit-b')).not.toBeNull()
  })
})

describe('loadCircuit', () => {
  it('returns false when the named circuit is missing', () => {
    expect(circuitActions.loadCircuit('does-not-exist')).toBe(false)
  })

  it('replaces gates / wires / nodes / junctions with the saved snapshot', () => {
    const a = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    const b = circuitActions.addGate('NAND', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'gate', entityId: a.id, pinId: `${a.id}-out-0` },
      { type: 'gate', entityId: b.id, pinId: `${b.id}-in-0` },
      [{ start: { x: -2, y: 0.2, z: 0 }, end: { x: 2, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    circuitActions.saveCircuit('snap')
    circuitActions.clearCircuit()

    expect(circuitActions.loadCircuit('snap')).toBe(true)
    const state = useCircuitStore.getState()
    expect(state.gates).toHaveLength(2)
    expect(state.wires).toHaveLength(1)
    expect(state.wires[0].from.entityId).toBe(a.id)
    expect(state.wires[0].to.entityId).toBe(b.id)
  })

  it('clears selection, placement, wiring, and lastSimulationError before applying', () => {
    const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.selectGate(gate.id)
    circuitActions.startPlacement('AND')
    useCircuitStore.setState((s) => {
      s.lastSimulationError = { type: 'cycle', involvedGateIds: [gate.id] }
    })
    circuitActions.saveCircuit('s')

    circuitActions.loadCircuit('s')
    const s = useCircuitStore.getState()
    expect(s.selectedGateId).toBeNull()
    expect(s.selectedWireId).toBeNull()
    expect(s.selectedNodeId).toBeNull()
    expect(s.placementMode).toBeNull()
    expect(s.nodePlacementMode).toBeNull()
    expect(s.wiringFrom).toBeNull()
    expect(s.lastSimulationError).toBeNull()
  })

  it('ticks the simulation so outputs reflect saved input values', () => {
    const i = circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
    const o = circuitActions.addOutputNode('out', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'input', entityId: i.id },
      { type: 'output', entityId: o.id },
      [{ start: { x: -3, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    circuitActions.updateInputNodeValue(i.id, 1)
    circuitActions.saveCircuit('passthrough')
    circuitActions.clearCircuit()

    circuitActions.loadCircuit('passthrough')
    const out = useCircuitStore.getState().outputNodes[0]
    expect(out.value).toBe(1)
  })

  it('returns false on JSON parse failure', () => {
    localStorage.setItem('hacer-circuit-broken', '{ this is not json')
    expect(circuitActions.loadCircuit('broken')).toBe(false)
  })

  it('returns false on unsupported version', () => {
    localStorage.setItem(
      'hacer-circuit-future',
      JSON.stringify({
        version: 999,
        name: 'future',
        savedAt: new Date().toISOString(),
        gates: [],
        wires: [],
        inputNodes: [],
        outputNodes: [],
        junctions: [],
      }),
    )
    expect(circuitActions.loadCircuit('future')).toBe(false)
  })
})

describe('exportCircuitJSON', () => {
  it('triggers a Blob URL download with the serialized JSON', () => {
    const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    vi.useFakeTimers()

    const createObjectURL = vi.fn().mockReturnValue('blob:hacer-test')
    const revokeObjectURL = vi.fn()
    const originalURL = globalThis.URL
    globalThis.URL = { ...originalURL, createObjectURL, revokeObjectURL } as unknown as typeof URL

    const click = vi.fn()
    const anchor = document.createElement('a')
    const remove = vi.spyOn(anchor, 'remove')
    anchor.click = click
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    const appendChild = vi.spyOn(document.body, 'appendChild')

    try {
      circuitActions.exportCircuitJSON('export-1')
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(appendChild).toHaveBeenCalledWith(anchor)
      expect(click).toHaveBeenCalledTimes(1)
      expect(remove).toHaveBeenCalledTimes(1)
      vi.runAllTimers()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:hacer-test')
      const [blob] = createObjectURL.mock.calls[0] as [Blob]
      expect(blob).toBeInstanceOf(Blob)
      expect(anchor.download).toBe('export-1.circuit.json')

      return blob.text().then((text) => {
        const parsed = JSON.parse(text)
        expect(parsed.name).toBe('export-1')
        expect(parsed.gates).toHaveLength(1)
        expect(parsed.gates[0].id).toBe(gate.id)
      })
    } finally {
      vi.useRealTimers()
      globalThis.URL = originalURL
      createElement.mockRestore()
      appendChild.mockRestore()
      remove.mockRestore()
    }
  })
})

describe('importCircuitJSON', () => {
  it('replaces current state with the imported JSON and returns true', () => {
    const blob = JSON.stringify({
      version: 1,
      name: 'imported',
      savedAt: new Date().toISOString(),
      gates: [
        {
          id: 'gate-imp-1',
          type: 'NAND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 },
          width: 1,
        },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
    })
    expect(circuitActions.importCircuitJSON(blob)).toBe(true)
    const state = useCircuitStore.getState()
    expect(state.gates).toHaveLength(1)
    expect(state.gates[0].id).toBe('gate-imp-1')
  })

  it('returns false on invalid JSON', () => {
    expect(circuitActions.importCircuitJSON('not json')).toBe(false)
  })

  it('returns false on unsupported version', () => {
    expect(
      circuitActions.importCircuitJSON(
        JSON.stringify({
          version: 999,
          name: 'x',
          savedAt: new Date().toISOString(),
          gates: [],
          wires: [],
          inputNodes: [],
          outputNodes: [],
          junctions: [],
        }),
      ),
    ).toBe(false)
  })
})
