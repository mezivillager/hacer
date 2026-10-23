import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { notify } from '@/lib/notify'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore } from '@/store/types'
import { AUTOSAVE_KEY } from './persistenceActions'
import { __resetAutosaveForTests, AUTOSAVE_DEBOUNCE_MS, restoreAutosave, subscribeAutosave } from './autosave'

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
  circuitActions.clearCircuit()
  __resetAutosaveForTests()
  subscribeAutosave()
})

afterEach(() => {
  __resetAutosaveForTests()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('subscribeAutosave', () => {
  it('does not write before the debounce window elapses', () => {
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })

  it('writes a SerializedCircuit to the autosave slot after the debounce', () => {
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!)
    expect(data.version).toBe(1)
    expect(data.name).toBe('__autosave__')
    expect(data.gates).toHaveLength(1)
  })

  it('coalesces multiple rapid changes into a single write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    circuitActions.addGate('And', { x: 4, y: 0, z: 0 })
    circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
    expect(setItem.mock.calls.filter(([k]) => k === AUTOSAVE_KEY)).toHaveLength(0)
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(setItem.mock.calls.filter(([k]) => k === AUTOSAVE_KEY)).toHaveLength(1)
    setItem.mockRestore()
  })

  it('ignores UI-only mutations that do not touch the watched slices', () => {
    // `gates` / `wires` / `inputNodes` / `outputNodes` / `junctions` are the watched
    // slices. `placementMode`, `statusMessages`, `propertiesPanelOpen`, etc. live
    // outside that set, so toggling them must NOT schedule a new autosave write.
    //
    // NOTE: `selectGate` mutates each gate's `selected` field via Immer, which
    // does produce a new `gates` array reference and therefore DOES schedule an
    // autosave. That is intentional and harmless (the serializer drops `selected`,
    // so the write is functionally a no-op besides the new `savedAt`).
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    const baseline = localStorage.getItem(AUTOSAVE_KEY)
    circuitActions.startPlacement('And')
    circuitActions.cancelPlacement()
    circuitActions.addStatus('info', 'just a message')
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(baseline)
  })
})

const idsOf = (s: CircuitStore) => ({
  gates: s.gates.map((g) => g.id),
  wires: s.wires.map((w) => w.id),
  inputNodes: s.inputNodes.map((n) => n.id),
  outputNodes: s.outputNodes.map((n) => n.id),
  junctions: s.junctions.map((j) => j.id),
  busComponents: s.busComponents.map((b) => b.id),
})

const EMPTY_IDS = { gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [], busComponents: [] }

/** Input `a`, held at 0, drives both Nand inputs, the Nand drives `out`; a junction on the first wire, a 4-bit splitter. */
function buildCircuit(): void {
  const a = circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
  circuitActions.updateInputNodeValue(a.id, 0)
  const out = circuitActions.addOutputNode('out', { x: 4, y: 0, z: 0 })
  const nand = circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
  const segment = (z: number) => [{ start: { x: -3, y: 0.2, z }, end: { x: -1, y: 0.2, z }, type: 'horizontal' as const }]
  const corner = { x: -2, y: 0.2, z: 0 }
  const bent = [
    { start: { x: -3, y: 0.2, z: 0 }, end: corner, type: 'horizontal' as const },
    { start: corner, end: { x: -2, y: 0.2, z: -1 }, type: 'vertical' as const },
  ]
  const first = circuitActions.addWire({ type: 'input', entityId: a.id }, { type: 'gate', entityId: nand.id, pinId: `${nand.id}-in-0` }, bent)
  circuitActions.addWire({ type: 'input', entityId: a.id }, { type: 'gate', entityId: nand.id, pinId: `${nand.id}-in-1` }, segment(0.6))
  circuitActions.addWire({ type: 'gate', entityId: nand.id, pinId: `${nand.id}-out-0` }, { type: 'output', entityId: out.id }, segment(1.2))
  circuitActions.placeJunctionOnWire(corner, first.id)
  circuitActions.placeBusSplitter(4, { x: 3, y: 0, z: 3 })
}

/** What a page load leaves: the slot on disk, no pending write, an empty store, a fresh writer. */
function reload(): void {
  __resetAutosaveForTests()
  circuitActions.clearCircuit()
  subscribeAutosave()
}

/** Builds the circuit, lets the writer save it with `out` left stale at 0, then reloads. */
function saveAndReload(): ReturnType<typeof idsOf> {
  buildCircuit()
  vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
  const saved = idsOf(useCircuitStore.getState())
  const data = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!)
  data.outputNodes[0].value = 0
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
  reload()
  return saved
}

function writeSlot(raw: string): void {
  localStorage.setItem(AUTOSAVE_KEY, raw)
  reload()
}

const emptyDocument = {
  version: 1,
  name: '__autosave__',
  savedAt: '2026-10-23T00:00:00.000Z',
  gates: [],
  wires: [],
  inputNodes: [],
  outputNodes: [],
  junctions: [],
  busComponents: [],
}

const toastCount = () =>
  [notify.success, notify.info, notify.warning, notify.error].reduce((n, fn) => n + vi.mocked(fn).mock.calls.length, 0)

describe('restoreAutosave', () => {
  it('loads a valid autosave slot into the store and evaluates it once', () => {
    const saved = saveAndReload()
    expect(idsOf(useCircuitStore.getState())).toEqual(EMPTY_IDS)
    const tick = vi.spyOn(circuitActions, 'simulationTick')

    expect(() => restoreAutosave()).not.toThrow()

    const state = useCircuitStore.getState()
    expect(idsOf(state)).toEqual(saved)
    expect(state.busComponents[0]).toMatchObject({ kind: 'splitter', width: 4 })
    expect(tick).toHaveBeenCalledTimes(1)
    expect(state.outputNodes[0].value).toBe(1)
  })

  it('announces a restore once with notify.info', () => {
    saveAndReload()
    expect(() => restoreAutosave()).not.toThrow()
    expect(notify.info).toHaveBeenCalledTimes(1)
    expect(toastCount()).toBe(1)
  })

  it('hands its notice to the caller to show later, after restoring at once', () => {
    const saved = saveAndReload()
    const notices: (() => void)[] = []

    expect(() => restoreAutosave((show) => notices.push(show))).not.toThrow()

    expect(idsOf(useCircuitStore.getState())).toEqual(saved)
    expect(toastCount()).toBe(0)
    for (const show of notices) show()
    expect(notify.info).toHaveBeenCalledTimes(1)
  })

  it('keeps autosaving the restored circuit', () => {
    const saved = saveAndReload()
    expect(() => restoreAutosave()).not.toThrow()
    circuitActions.addGate('And', { x: 8, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)

    const data = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!)
    expect(data.gates).toHaveLength(saved.gates.length + 1)
    expect(data.wires.map((w: { id: string }) => w.id)).toEqual(saved.wires)
  })

  it('restores what it can read and says how much it skipped, in the one notice', () => {
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    const data = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!)
    data.gates.push({ ...data.gates[0], id: 'gate-from-a-newer-build', type: 'NotAChipThisBuildKnows' })
    writeSlot(JSON.stringify(data))

    expect(() => restoreAutosave()).not.toThrow()

    expect(useCircuitStore.getState().gates).toHaveLength(1)
    expect(toastCount()).toBe(1)
    expect(notify.info).toHaveBeenCalledWith(expect.any(String), { description: expect.stringMatching(/\b1 entry\b/) })
  })

  it('does nothing, and shows no toast, when there is no slot', () => {
    reload()
    expect(() => restoreAutosave()).not.toThrow()
    expect(idsOf(useCircuitStore.getState())).toEqual(EMPTY_IDS)
    expect(toastCount()).toBe(0)
  })

  it('does nothing, and shows no toast, when localStorage cannot be read', () => {
    reload()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(() => restoreAutosave()).not.toThrow()
    expect(idsOf(useCircuitStore.getState())).toEqual(EMPTY_IDS)
    expect(toastCount()).toBe(0)
  })

  it('does nothing, and shows no toast, when the slot holds an empty circuit', () => {
    writeSlot(JSON.stringify(emptyDocument))
    expect(() => restoreAutosave()).not.toThrow()
    expect(idsOf(useCircuitStore.getState())).toEqual(EMPTY_IDS)
    expect(toastCount()).toBe(0)
  })

  it.each([
    ['not JSON', '{"version":1,'],
    ['JSON null', 'null'],
    ['a document with no arrays', '{"version":1}'],
    ['a version this build does not read', JSON.stringify({ ...emptyDocument, version: 2 })],
  ])('leaves the store empty and warns once when the slot is %s', (_label, raw) => {
    writeSlot(raw)
    expect(() => restoreAutosave()).not.toThrow()
    expect(idsOf(useCircuitStore.getState())).toEqual(EMPTY_IDS)
    expect(notify.warning).toHaveBeenCalledTimes(1)
    expect(toastCount()).toBe(1)
  })

  it('a restored circuit with a cycle reports it through the boot announcer', () => {
    const a = circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    const b = circuitActions.addGate('Nand', { x: 4, y: 0, z: 0 })
    const segment = [{ start: { x: 1, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' as const }]
    circuitActions.addWire({ type: 'gate', entityId: a.id, pinId: a.outputs[0].id }, { type: 'gate', entityId: b.id, pinId: b.inputs[0].id }, segment)
    circuitActions.addWire({ type: 'gate', entityId: b.id, pinId: b.outputs[0].id }, { type: 'gate', entityId: a.id, pinId: a.inputs[0].id }, segment)
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    reload()
    const notices: (() => void)[] = []

    expect(() => restoreAutosave((show) => notices.push(show))).not.toThrow()
    vi.clearAllMocks()
    for (const show of notices) show()

    expect(notify.error).toHaveBeenCalledTimes(1)
    const [report] = vi.mocked(notify.error).mock.calls[0]
    expect(report).toMatch(/cycle/i)
    expect(report).toContain(a.id)
    expect(report).toContain(b.id)
    expect(vi.mocked(notify.info).mock.calls.map(([message]) => message)).toEqual(['Restored your last circuit'])

    vi.clearAllMocks()
    circuitActions.simulationTick()
    expect(notify.error).not.toHaveBeenCalled()
  })

  it('evaluates the restored circuit before any collected notice runs', () => {
    saveAndReload()
    const notices: (() => void)[] = []

    expect(() => restoreAutosave((show) => notices.push(show))).not.toThrow()

    expect(notices.length).toBeGreaterThan(0)
    expect(useCircuitStore.getState().outputNodes[0].value).toBe(1)
  })
})
