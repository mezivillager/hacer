import type { ViewActions, CircuitStore } from '../../types'
import { writePerformanceMode } from '@/lib/performanceModeStorage'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

export const createViewActions = (set: SetState): ViewActions => ({
  toggleAxes: () => {
    set((state) => {
      state.showAxes = !state.showAxes
    }, false, 'toggleAxes')
  },
  openPropertiesPanel: () => {
    set((state) => {
      state.propertiesPanelOpen = true
    }, false, 'openPropertiesPanel')
  },
  closePropertiesPanel: () => {
    set((state) => {
      state.propertiesPanelOpen = false
    }, false, 'closePropertiesPanel')
  },
  togglePropertiesPanel: () => {
    set((state) => {
      state.propertiesPanelOpen = !state.propertiesPanelOpen
    }, false, 'togglePropertiesPanel')
  },
  setPerformanceMode: (mode) => {
    writePerformanceMode(mode)
    set((state) => {
      state.performanceMode = mode
    }, false, 'setPerformanceMode')
  },
  togglePerformanceMode: () => {
    set((state) => {
      const nextMode = state.performanceMode === 'normal' ? 'low-power' : 'normal'
      state.performanceMode = nextMode
      writePerformanceMode(nextMode)
    }, false, 'togglePerformanceMode')
  },
})
