import { describe, it, expect, afterEach, vi } from 'vitest'

describe('circuitStore autosave bootstrap', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    localStorage.clear()
  })

  it('does not subscribe autosave at module load in test mode', async () => {
    vi.useFakeTimers()
    vi.resetModules()

    const { circuitActions } = await import('./circuitStore')
    const { AUTOSAVE_KEY } = await import('./actions/persistenceActions/persistenceActions')

    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })

    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(2500)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })
})
