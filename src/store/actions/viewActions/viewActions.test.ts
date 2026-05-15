import { beforeEach, describe, expect, it } from 'vitest'
import { PERFORMANCE_MODE_STORAGE_KEY } from '@/lib/performanceModeStorage'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'

describe('viewActions performance mode', () => {
  beforeEach(() => {
    localStorage.clear()
    useCircuitStore.setState({
      performanceMode: 'normal',
      showAxes: false,
      propertiesPanelOpen: false,
    })
  })

  it('defaults to normal mode', () => {
    expect(useCircuitStore.getState().performanceMode).toBe('normal')
  })

  it('sets low-power mode and persists it', () => {
    circuitActions.setPerformanceMode('low-power')

    expect(useCircuitStore.getState().performanceMode).toBe('low-power')
    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('low-power')
  })

  it('sets normal mode and persists it', () => {
    circuitActions.setPerformanceMode('low-power')
    circuitActions.setPerformanceMode('normal')

    expect(useCircuitStore.getState().performanceMode).toBe('normal')
    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('normal')
  })

  it('toggles between modes', () => {
    circuitActions.togglePerformanceMode()
    expect(useCircuitStore.getState().performanceMode).toBe('low-power')

    circuitActions.togglePerformanceMode()
    expect(useCircuitStore.getState().performanceMode).toBe('normal')
  })
})
