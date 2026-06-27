import { serializeCircuit } from '@/core/serialization'
import { useCircuitStore } from '@/store/circuitStore'
import { debounce, type DebouncedFunction } from '@/utils/debounce'
import { AUTOSAVE_KEY } from './persistenceActions'

export const AUTOSAVE_DEBOUNCE_MS = 2000
export const AUTOSAVE_NAME = '__autosave__'

let unsubscribe: (() => void) | null = null
let pendingWrite: DebouncedFunction<() => void> | null = null

function writeAutosave(): void {
  if (typeof window === 'undefined') return
  const state = useCircuitStore.getState()
  const data = serializeCircuit(state, AUTOSAVE_NAME)
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable; the next change will retry.
  }
}

export function subscribeAutosave(): void {
  if (unsubscribe) return
  pendingWrite = debounce(writeAutosave, AUTOSAVE_DEBOUNCE_MS)
  unsubscribe = useCircuitStore.subscribe((state, prev) => {
    if (
      state.gates !== prev.gates ||
      state.wires !== prev.wires ||
      state.inputNodes !== prev.inputNodes ||
      state.outputNodes !== prev.outputNodes ||
      state.junctions !== prev.junctions ||
      state.busComponents !== prev.busComponents
    ) {
      pendingWrite!()
    }
  })
}

export function isAutosaveSubscribed(): boolean {
  return unsubscribe !== null
}

export function __resetAutosaveForTests(): void {
  if (pendingWrite) pendingWrite.cancel()
  pendingWrite = null
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}
