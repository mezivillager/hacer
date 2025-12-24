import type { ViewActions, CircuitStore } from '../../types'

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
})



