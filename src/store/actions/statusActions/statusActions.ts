import type { CircuitStore, StatusActions, StatusMessage } from '../../types'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

let statusCounter = 0

export const createStatusActions = (set: SetState): StatusActions => ({
  addStatus: (severity, text) => {
    const message: StatusMessage = {
      id: `status-${++statusCounter}`,
      severity,
      text,
      timestamp: Date.now(),
    }

    set((state) => {
      state.statusMessages.push(message)
    }, false, 'addStatus')

    return message
  },

  clearStatus: (id) => {
    set((state) => {
      state.statusMessages = state.statusMessages.filter((message) => message.id !== id)
    }, false, 'clearStatus')
  },

  clearAllStatus: () => {
    set((state) => {
      state.statusMessages = []
    }, false, 'clearAllStatus')
  },
})
