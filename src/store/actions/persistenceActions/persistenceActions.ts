import { notify } from '@/lib/notify'
import { deserializeCircuit, serializeCircuit, type SerializedCircuit } from '@/core/serialization'
import { useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore, PersistenceActions, SavedCircuitSummary } from '../../types'

export const STORAGE_PREFIX = 'hacer-circuit-'
export const AUTOSAVE_KEY = `${STORAGE_PREFIX}__autosave__`

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
    let restored
    try {
      restored = deserializeCircuit(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      notify.error(`Could not load "${name}": ${message}`)
      return false
    }
    useCircuitStore.setState((s) => {
      s.gates = restored.gates
      s.wires = restored.wires
      s.inputNodes = restored.inputNodes
      s.outputNodes = restored.outputNodes
      s.junctions = restored.junctions

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
    a.click()
    URL.revokeObjectURL(url)
  },

  importCircuitJSON: (json: string) => {
    let parsed: SerializedCircuit
    try {
      parsed = JSON.parse(json) as SerializedCircuit
    } catch {
      notify.error('Imported file is not valid JSON')
      return false
    }
    let restored
    try {
      restored = deserializeCircuit(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      notify.error(`Import failed: ${message}`)
      return false
    }
    useCircuitStore.setState((s) => {
      s.gates = restored.gates
      s.wires = restored.wires
      s.inputNodes = restored.inputNodes
      s.outputNodes = restored.outputNodes
      s.junctions = restored.junctions

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
