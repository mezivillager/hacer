import { notify } from '@/lib/notify'
import {
  deserializeCircuit,
  serializeCircuit,
  type DeserializedCircuit,
  type DeserializeResult,
  type DeserializeWarning,
  type SerializedCircuit,
} from '@/core/serialization'
import { useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore, PersistenceActions, SavedCircuitSummary } from '../../types'

import { AUTOSAVE_KEY, STORAGE_PREFIX } from './storageKeys'

export { AUTOSAVE_KEY, STORAGE_PREFIX }

type SetState = (fn: (state: CircuitStore) => void, replace?: false, actionName?: string) => void
type GetState = () => CircuitStore

function safeWrite(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function normalizeName(name: string): string {
  return name.trim()
}

function storageKeyFor(name: string): string {
  return `${STORAGE_PREFIX}${name}`
}

/** The two codes summarised into one line instead of one toast each. Every other code keeps the
 *  toast it has always raised, with its text and its place in document order untouched: #181
 *  froze that set to exactly what already reached a person, and #402 does not reopen it. */
const SUMMARISED_CODES = new Set<DeserializeWarning['code']>(['dropped-wire', 'dropped-junction'])

/** `12 wires`, `1 junction`. */
const countOf = (n: number, noun: string): string => `${String(n)} ${noun}${n === 1 ? '' : 's'}`

/**
 * One line naming how much wiring the load pruned, or `null` when it pruned none — so a document
 * that drops nothing gains no toast it did not raise before. Only the counts reach the person;
 * the per-entity ids stay in the warning objects, which is where a caller or a test wants them.
 */
function droppedWiringSummary(warnings: DeserializeWarning[]): string | null {
  const wires = warnings.filter((w) => w.code === 'dropped-wire').length
  const junctions = warnings.filter((w) => w.code === 'dropped-junction').length
  if (wires === 0 && junctions === 0) return null
  const counts = [
    ...(wires > 0 ? [countOf(wires, 'wire')] : []),
    ...(junctions > 0 ? [countOf(junctions, 'junction')] : []),
  ]
  return (
    `Skipped ${counts.join(' and ')} while loading circuit — ` +
    'wiring left dangling by gates or bus components that could not be loaded.'
  )
}

/**
 * Turns a reader result into what the person sees. `deserializeCircuit` is pure
 * logic and returns its warnings as data (#181); this is the one place that
 * decides they become toasts.
 *
 * Three outcomes, one per way a load can end:
 * - **`null` document** — not readable at all (today: a version this build does not
 *   know). The first warning says why, shown as one error, exactly as the thrown
 *   version used to be.
 * - **document + warnings** — every gate entry the reader could not rebuild was
 *   dropped and named: one warning toast each, in document order, then the circuit
 *   loads. Same count and order as the reader's own `notify.warning` calls used to
 *   produce; two of the texts changed (same information, better wording). The wires
 *   and junctions pruning took with those gates are the exception (#402): they are
 *   reported one warning per entity, but shown as **one** line naming the counts —
 *   a document that loses 40 wires must not raise 40 toasts, and the ids are for the
 *   caller and its tests, not for the person.
 * - **a throw out of `deserializeCircuit`** — the document's own shape is wrong (a
 *   missing top-level array, a malformed wire/node/junction/bus record), so there is
 *   nothing to load. Unchanged: each caller's `try/catch` turns it into one error
 *   toast. Recovery is per *gate* entry only — see `DeserializeWarning`.
 *
 * @returns the restored circuit, or `null` when there is nothing to load.
 */
function reportDeserialized(result: DeserializeResult, failurePrefix: string): DeserializedCircuit | null {
  if (!result.document) {
    notify.error(`${failurePrefix}: ${result.warnings[0]?.message ?? 'unknown error'}`)
    return null
  }
  for (const warning of result.warnings) {
    if (!SUMMARISED_CODES.has(warning.code)) notify.warning(warning.message)
  }
  const summary = droppedWiringSummary(result.warnings)
  if (summary) notify.warning(summary)
  return result.document
}

export const createPersistenceActions = (_set: SetState, get: GetState): PersistenceActions => ({
  saveCircuit: (rawName: string) => {
    const name = normalizeName(rawName)
    if (!name) {
      notify.warning('Save needs a name')
      return
    }
    const data = serializeCircuit(get(), name)
    const ok = safeWrite(storageKeyFor(name), JSON.stringify(data))
    if (ok) {
      notify.success(`Saved circuit "${name}"`)
    } else {
      notify.error(`Could not save circuit "${name}"`)
    }
  },

  loadCircuit: (rawName: string) => {
    const name = normalizeName(rawName)
    if (!name) return false
    const raw = safeRead(storageKeyFor(name))
    if (!raw) {
      notify.warning(`Circuit "${name}" not found`)
      return false
    }
    let parsed: SerializedCircuit
    try {
      parsed = JSON.parse(raw) as SerializedCircuit
    } catch {
      notify.error(`Saved circuit "${name}" is corrupt`)
      return false
    }
    let result: DeserializeResult
    try {
      result = deserializeCircuit(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      notify.error(`Could not load "${name}": ${message}`)
      return false
    }
    const restored = reportDeserialized(result, `Could not load "${name}"`)
    if (!restored) return false
    useCircuitStore.setState((s) => {
      s.gates = restored.gates
      s.wires = restored.wires
      s.inputNodes = restored.inputNodes
      s.outputNodes = restored.outputNodes
      s.junctions = restored.junctions
      s.busComponents = restored.busComponents

      s.selectedGateId = null
      s.selectedWireId = null
      s.selectedNodeId = null
      s.selectedNodeType = null
      s.placementMode = null
      s.placementPreviewPosition = null
      s.nodePlacementMode = null
      s.junctionPlacementMode = null
      s.junctionPreviewPosition = null
      s.junctionPreviewWireId = null
      s.wiringFrom = null
      s.lastSimulationError = null
    }, false, 'loadCircuit')
    useCircuitStore.getState().simulationTick()
    notify.success(`Loaded "${name}"`)
    return true
  },

  listSavedCircuits: () => {
    if (typeof window === 'undefined') return []
    const out: SavedCircuitSummary[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(STORAGE_PREFIX) || key === AUTOSAVE_KEY) continue
      const raw = safeRead(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as { name?: string; savedAt?: string }
        if (typeof parsed.name === 'string' && typeof parsed.savedAt === 'string') {
          out.push({ name: parsed.name, savedAt: parsed.savedAt })
        }
      } catch {
        // ignore corrupt entries
      }
    }
    return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  },

  deleteSavedCircuit: (rawName: string) => {
    const name = normalizeName(rawName)
    if (!name) return
    safeRemove(storageKeyFor(name))
    notify.info(`Deleted circuit "${name}"`)
  },

  exportCircuitJSON: (rawName?: string) => {
    const name = normalizeName(rawName ?? '') || 'circuit'
    const data = serializeCircuit(get(), name)
    const json = JSON.stringify(data, null, 2)
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.circuit.json`
    a.style.display = 'none'
    document.body.appendChild(a)
    try {
      a.click()
    } finally {
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  },

  importCircuitJSON: (json: string) => {
    let parsed: SerializedCircuit
    try {
      parsed = JSON.parse(json) as SerializedCircuit
    } catch {
      notify.error('Imported file is not valid JSON')
      return false
    }
    let result: DeserializeResult
    try {
      result = deserializeCircuit(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      notify.error(`Import failed: ${message}`)
      return false
    }
    const restored = reportDeserialized(result, 'Import failed')
    if (!restored) return false
    useCircuitStore.setState((s) => {
      s.gates = restored.gates
      s.wires = restored.wires
      s.inputNodes = restored.inputNodes
      s.outputNodes = restored.outputNodes
      s.junctions = restored.junctions
      s.busComponents = restored.busComponents

      s.selectedGateId = null
      s.selectedWireId = null
      s.selectedNodeId = null
      s.selectedNodeType = null
      s.placementMode = null
      s.placementPreviewPosition = null
      s.nodePlacementMode = null
      s.junctionPlacementMode = null
      s.junctionPreviewPosition = null
      s.junctionPreviewWireId = null
      s.wiringFrom = null
      s.lastSimulationError = null
    }, false, 'importCircuitJSON')
    useCircuitStore.getState().simulationTick()
    notify.success(`Imported "${parsed.name ?? 'circuit'}"`)
    return true
  },
})
