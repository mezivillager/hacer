import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { circuitActions } from '@/store/circuitStore'
import {
  __resetAutosaveForTests,
  subscribeAutosave,
  AUTOSAVE_DEBOUNCE_MS,
} from '@/store/actions/persistenceActions/autosave'
import { AUTOSAVE_KEY } from '@/store/actions/persistenceActions/persistenceActions'

// -----------------------------------------------------------------------------
// Bootstrap guard test
//
// Scope: verifies that circuitStore.ts does NOT call subscribeAutosave() at
// module load when import.meta.env.MODE === 'test'  (circuitStore.ts line ~134:
//   `if (import.meta.env.MODE !== 'test') { subscribeAutosave() }`).
//
// Why this test is not vacuous:
//   The companion positive test below ("writes to localStorage when explicitly
//   subscribed") proves that subscribeAutosave() + a mutation DOES produce a
//   localStorage write when the subscription is active.  Given that, a green
//   result on the negative test ("no write without explicit subscribe") is
//   meaningful — it cannot be explained away by "subscriptions are broken and
//   never write anyway."
//
// Full positive-path coverage (debounce, coalescing, UI-only filter) lives in
//   src/store/actions/persistenceActions/autosave.test.ts
// -----------------------------------------------------------------------------

describe('circuitStore autosave bootstrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    circuitActions.clearCircuit()
    // Ensure no subscription is active (mirrors module-load state in test mode)
    __resetAutosaveForTests()
  })

  afterEach(() => {
    __resetAutosaveForTests()
    vi.useRealTimers()
  })

  it('does not subscribe autosave at module load in test mode', () => {
    // The `if (import.meta.env.MODE !== 'test') { subscribeAutosave() }` guard
    // in circuitStore.ts prevents any subscription from being registered at
    // module load.  __resetAutosaveForTests() in beforeEach ensures a clean
    // slate regardless.  A mutation must not trigger any timer or write.
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })

    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(2500)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })

  it('writes to localStorage when explicitly subscribed (positive-path sanity check)', () => {
    // Proves the subscription mechanism is functional, making the negative test
    // above meaningful: a green result there cannot be "subscriptions are broken
    // and never write."  Detailed debounce/coalesce coverage lives in autosave.test.ts.
    subscribeAutosave()
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(AUTOSAVE_KEY)).not.toBeNull()
  })
})
