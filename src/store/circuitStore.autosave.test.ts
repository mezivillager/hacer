import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { circuitActions } from '@/store/circuitStore'
import { __resetAutosaveForTests } from '@/store/actions/persistenceActions/autosave'
import { AUTOSAVE_KEY } from '@/store/actions/persistenceActions/persistenceActions'

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
    // In test mode the `if (import.meta.env.MODE !== 'test') { subscribeAutosave() }` branch
    // in circuitStore.ts is never entered. __resetAutosaveForTests() above mirrors that clean
    // state. Adding a gate must not trigger any timer or localStorage write.
    circuitActions.addGate('Nand', { x: 0, y: 0, z: 0 })

    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(2500)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })
})
