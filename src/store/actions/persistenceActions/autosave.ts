import {
  deserializeCircuit,
  serializeCircuit,
  type DeserializedCircuit,
  type DeserializeResult,
  type SerializedCircuit,
} from '@/core/serialization'
import { notify } from '@/lib/notify'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { debounce, type DebouncedFunction } from '@/utils/debounce'
import { AUTOSAVE_KEY } from './storageKeys'

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

export type Announce = (show: () => void) => void

function readAutosave(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(AUTOSAVE_KEY)
  } catch {
    return null
  }
}

function deserializeAutosave(raw: string): DeserializeResult | null {
  try {
    return deserializeCircuit(JSON.parse(raw) as SerializedCircuit)
  } catch {
    return null
  }
}

const isEmptyCircuit = (c: DeserializedCircuit): boolean =>
  [c.gates, c.wires, c.inputNodes, c.outputNodes, c.junctions, c.busComponents].every((slice) => slice.length === 0)

/** Loads the autosave slot into the store and evaluates it; `announce` decides when its one toast shows. */
export function restoreAutosave(announce: Announce = (show) => show()): void {
  const raw = readAutosave()
  if (!raw) return
  const result = deserializeAutosave(raw)
  if (!result?.document) {
    const reason = result?.warnings[0]?.message ?? 'the saved data is not a circuit.'
    announce(() => notify.warning(`Could not restore your last circuit: ${reason}`))
    return
  }
  const restored = result.document
  if (isEmptyCircuit(restored)) return
  useCircuitStore.setState((s) => {
    s.gates = restored.gates
    s.wires = restored.wires
    s.inputNodes = restored.inputNodes
    s.outputNodes = restored.outputNodes
    s.junctions = restored.junctions
    s.busComponents = restored.busComponents
  }, false, 'restoreAutosave')
  circuitActions.simulationTick()
  const skipped = result.warnings.length
  const description = `Skipped ${String(skipped)} ${skipped === 1 ? 'entry' : 'entries'} this build could not read.`
  announce(() => notify.info('Restored your last circuit', skipped > 0 ? { description } : undefined))
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
