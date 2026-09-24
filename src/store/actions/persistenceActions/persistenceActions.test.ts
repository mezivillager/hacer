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
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
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
    circuitActions.addGate('And', { x: 4, y: 0, z: 4 })
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
    const a = circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    const b = circuitActions.addGate('Nand', { x: 4, y: 0, z: 0 })
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

  it('restores busComponents from the saved snapshot', () => {
    const splitter = circuitActions.placeBusSplitter(4, { x: 3, y: 0, z: 0 })!
    circuitActions.saveCircuit('bus-snap')
    circuitActions.clearCircuit()
    expect(useCircuitStore.getState().busComponents).toHaveLength(0)

    expect(circuitActions.loadCircuit('bus-snap')).toBe(true)
    const state = useCircuitStore.getState()
    expect(state.busComponents).toHaveLength(1)
    expect(state.busComponents[0].id).toBe(splitter.id)
    expect(state.busComponents[0].kind).toBe('splitter')
    expect(state.busComponents[0].width).toBe(4)
  })

  it('clears selection, placement, wiring, and lastSimulationError before applying', () => {
    const gate = circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    circuitActions.selectGate(gate.id)
    circuitActions.startPlacement('And')
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
    const gate = circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
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
          // SerializedGate keeps `type` on disk; Phase 5 will migrate.
          type: 'Nand',
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

// ── What a person is told when a load prunes wiring (#402) ─────────────────────────────────────
// `reportDeserialized` raises one toast per warning, which is right for the codes #181 froze —
// each is one gate the person placed. It is wrong for the wires and junctions pruning takes with
// those gates: a document losing 40 wires would raise 40 toasts. Those two codes are summarised
// into one line naming the counts; the per-entity ids stay in the warning data for callers.
describe('loadCircuit: telling the person what the load pruned', () => {
  /** A document whose only NOR gate is always skipped, with `wires` wires into it — all pruned —
   *  and `junctions` junctions that join nothing but those wires, so they are pruned too. */
  const withDanglingWiring = (wires: number, junctions: number) => ({
    version: 1,
    name: 'dangling',
    savedAt: new Date().toISOString(),
    gates: [
      { id: 'g-nor', type: 'NOR', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      { id: 'g-and', type: 'And', position: { x: 4, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
    ],
    wires: Array.from({ length: wires }, (_, i) => ({
      id: `w-${i}`,
      from: { type: 'gate', entityId: 'g-nor', pinId: 'g-nor-out-0' },
      to: { type: 'gate', entityId: 'g-and', pinId: 'g-and-in-0' },
      segments: [],
      crossesWireIds: [],
    })),
    inputNodes: [],
    outputNodes: [],
    junctions: Array.from({ length: junctions }, (_, i) => ({
      id: `j-${i}`,
      position: { x: 1, y: 0.2, z: 0 },
      signalId: `sig-${i}`,
      wireIds: [`w-${i}`],
    })),
  })

  /** Loads a freshly written document and returns the warning toasts it raised, in order. */
  const warningsFrom = async (doc: unknown): Promise<string[]> => {
    const { notify } = await import('@/lib/notify')
    vi.mocked(notify.warning).mockClear()
    localStorage.setItem('hacer-circuit-dangling', JSON.stringify(doc))
    expect(circuitActions.loadCircuit('dangling')).toBe(true)
    return vi.mocked(notify.warning).mock.calls.map(([message]) => message)
  }

  it('raises one summary line for 12 dropped wires and 2 dropped junctions, not 14 toasts', async () => {
    expect(await warningsFrom(withDanglingWiring(12, 2))).toEqual([
      'Skipped unsupported gate type "NOR" — NOR and XNOR are not supported in the builtin chip system.',
      'Skipped 12 wires and 2 junctions while loading circuit — ' +
        'wiring left dangling by gates or bus components that could not be loaded.',
    ])
    expect(useCircuitStore.getState().wires).toEqual([])
    expect(useCircuitStore.getState().junctions).toEqual([])
  })

  it('counts in the singular, and names only what was actually dropped', async () => {
    const [, summary] = await warningsFrom(withDanglingWiring(1, 0))
    expect(summary).toBe(
      'Skipped 1 wire while loading circuit — ' +
        'wiring left dangling by gates or bus components that could not be loaded.',
    )
  })

  it('says nothing extra when the load prunes no wiring', async () => {
    expect(await warningsFrom(withDanglingWiring(0, 0))).toEqual([
      'Skipped unsupported gate type "NOR" — NOR and XNOR are not supported in the builtin chip system.',
    ])
  })
})
