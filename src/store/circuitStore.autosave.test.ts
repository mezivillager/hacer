import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { circuitActions } from '@/store/circuitStore'
import {
  __resetAutosaveForTests,
  isAutosaveSubscribed,
  subscribeAutosave,
  AUTOSAVE_DEBOUNCE_MS,
} from '@/store/actions/persistenceActions/autosave'
import { AUTOSAVE_KEY } from '@/store/actions/persistenceActions/persistenceActions'

// -----------------------------------------------------------------------------
// Capture subscription state at module load — BEFORE any beforeEach runs.
//
// Static imports are resolved once per test file, so `circuitStore.ts` has
// already executed (and the MODE guard has either fired or not) by the time
// this line runs.  `beforeEach` runs later and calls `__resetAutosaveForTests`,
// which clears the subscription — but by then this snapshot is already taken.
//
// If the `if (import.meta.env.MODE !== 'test') { subscribeAutosave() }` guard
// in circuitStore.ts were removed, `isAutosaveSubscribed()` here would return
// true and `subscribedAtModuleLoad` would be `true`, causing the assertion in
// "guard: autosave is NOT subscribed at module load" to fail.
// -----------------------------------------------------------------------------
const subscribedAtModuleLoad = isAutosaveSubscribed()

// -----------------------------------------------------------------------------
// Bootstrap guard test
//
// Scope: verifies that circuitStore.ts does NOT call subscribeAutosave() at
// module load when import.meta.env.MODE === 'test'  (circuitStore.ts line ~141:
//   `if (import.meta.env.MODE !== 'test') { subscribeAutosave() }`).
//
// Why the guard test is not vacuous:
//   `subscribedAtModuleLoad` is captured above at module scope, before any
//   beforeEach can call __resetAutosaveForTests().  It reflects the raw state
//   left by circuitStore.ts at import time.  Removing the MODE guard makes the
//   assertion fail regardless of beforeEach cleanup.
//
//   The companion positive test ("writes to localStorage when explicitly
//   subscribed") additionally proves that subscribeAutosave() is functional, so
//   a green negative test cannot be explained away by "subscriptions never write
//   anyway."
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

  it('guard: autosave is NOT subscribed at module load (MODE guard in circuitStore.ts)', () => {
    // This assertion uses the module-scope snapshot taken before any beforeEach
    // cleanup, so it genuinely catches removal of the MODE guard.
    expect(subscribedAtModuleLoad).toBe(false)
  })

  it('does not write to localStorage after module load in test mode', () => {
    // Complementary behavioral check: even after a mutation, no timer fires and
    // no write occurs (relies on the guard being intact, confirmed above).
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })

    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(2500)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })

  it('writes to localStorage when explicitly subscribed (positive-path sanity check)', () => {
    // Proves the subscription mechanism is functional, making the negative tests
    // above meaningful: a green result there cannot be "subscriptions are broken
    // and never write."  Detailed debounce/coalesce coverage lives in autosave.test.ts.
    subscribeAutosave()
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(AUTOSAVE_KEY)).not.toBeNull()
  })
})
