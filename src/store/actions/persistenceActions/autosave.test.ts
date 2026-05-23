import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { circuitActions } from '@/store/circuitStore'
import { AUTOSAVE_KEY } from './persistenceActions'
import { __resetAutosaveForTests, AUTOSAVE_DEBOUNCE_MS, subscribeAutosave } from './autosave'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  circuitActions.clearCircuit()
  __resetAutosaveForTests()
  subscribeAutosave()
})

afterEach(() => {
  __resetAutosaveForTests()
  vi.useRealTimers()
})

describe('subscribeAutosave', () => {
  it('does not write before the debounce window elapses', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })

  it('writes a SerializedCircuit to the autosave slot after the debounce', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
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
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.addGate('AND', { x: 4, y: 0, z: 0 })
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
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    const baseline = localStorage.getItem(AUTOSAVE_KEY)
    circuitActions.startPlacement('AND')
    circuitActions.cancelPlacement()
    circuitActions.addStatus('info', 'just a message')
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(baseline)
  })
})
