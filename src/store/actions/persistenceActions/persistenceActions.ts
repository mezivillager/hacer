import { notify } from '@/lib/notify'
import { serializeCircuit } from '@/core/serialization'
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

  loadCircuit: (_name: string) => {
    throw new Error('loadCircuit: not implemented yet (Task 7)')
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

  exportCircuitJSON: (_name?: string) => {
    throw new Error('exportCircuitJSON: not implemented yet (Task 8)')
  },

  importCircuitJSON: (_json: string) => {
    throw new Error('importCircuitJSON: not implemented yet (Task 8)')
  },
})
