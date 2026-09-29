/**
 * Shared by the legacy store-action characterization files (`node`, and the `NEEDS_DOM` one for
 * `localStorage`). Each fixture builds its state on a fresh store and makes its call; the golden
 * records the state before, the call and the state after — today's behaviour, including what looks
 * wrong. Ids come from `Date.now()` and `Math.random()`, so entity ids are renamed by creation order
 * (`gate#1`) and the clock is frozen, advancing a second per action call. Nothing carries between
 * fixtures: the store is replaced with the one module load created, before and after each.
 */
import { vi } from 'vitest'
import { notify } from '@/lib/notify'
import { circuitActions, useCircuitStore } from './circuitStore'
import type { CircuitStore } from './types'

export type Actions = typeof circuitActions
export type Ids = Record<string, string>

export interface ActionFixture {
  /** The golden's file name: the action, then the case. */
  name: string
  /** The `@store` spec under `e2e/specs/` whose call this reproduces. */
  from: string
  /** Builds the state before, through the same actions; returns the ids the call needs. */
  setup?: (a: Actions) => Ids | void
  call: (a: Actions, ids: Ids, state: CircuitStore) => unknown
}

export function fixture(name: string, from: string, call: ActionFixture['call'], setup?: ActionFixture['setup']): ActionFixture {
  return { name, from, call, setup }
}

type Step = { action: string; args: unknown[]; returned?: unknown; threw?: string }

const pristine = useCircuitStore.getState()
const EPOCH = new Date('2026-09-29T00:00:00.000Z')
const NOTIFY_KINDS = ['success', 'info', 'warning', 'error'] as const

/** The collections whose `id` names an entity, and the alias each kind gets. */
const ENTITIES = {
  ...{ gates: 'gate', wires: 'wire', inputNodes: 'input', outputNodes: 'output' },
  ...{ junctions: 'junction', busComponents: 'bus', statusMessages: 'status' },
} as const

const clone = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))
const state = (): CircuitStore => useCircuitStore.getState()
const dataOf = (s: CircuitStore) => clone(Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')))

function learnIds(aliases: Map<string, string>): void {
  for (const [collection, kind] of Object.entries(ENTITIES)) {
    for (const { id } of state()[collection as keyof typeof ENTITIES]) {
      if (aliases.has(id)) continue
      const n = [...aliases.values()].filter((alias) => alias.startsWith(`${kind}#`)).length + 1
      aliases.set(id, `${kind}#${String(n)}`)
    }
  }
}

/** Replaces each raw id wherever it appears, pin ids and signal ids included. */
function renameIds(text: string, aliases: Map<string, string>): string {
  if (aliases.size === 0) return text
  const raw = [...aliases.keys()].sort((a, b) => b.length - a.length).map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return text.replace(new RegExp(`(?<![A-Za-z0-9])(?:${raw.join('|')})(?![A-Za-z0-9])`, 'g'), (id) => aliases.get(id) ?? id)
}

/** Keys below the top level in code-point order, so a golden does not depend on how an object was built. */
const sortedKeys = (key: string, value: unknown): unknown =>
  key !== '' && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
    : value

/** Proxies `circuitActions`, logging every call and learning the ids it creates. */
function recording(log: Step[], aliases: Map<string, string>, withResult: boolean): Actions {
  return new Proxy(circuitActions, {
    get(target, key: string) {
      const action = target[key as keyof Actions] as (...args: unknown[]) => unknown
      return (...args: unknown[]) => {
        const step: Step = { action: key, args: clone(args) as unknown[] }
        log.push(step)
        try {
          const result = action(...args)
          if (withResult) step.returned = clone(result)
          return result
        } catch (error) {
          step.threw = error instanceof Error ? error.message : String(error)
          throw error
        } finally {
          learnIds(aliases)
          vi.setSystemTime(Date.now() + 1000)
        }
      }
    },
  })
}

/** Runs one fixture and returns its golden text. `storage` reads what the action persisted. */
export function characterize(fixture: ActionFixture, storage?: () => Record<string, unknown>): string {
  vi.useFakeTimers({ now: EPOCH })
  useCircuitStore.setState(pristine, true)
  const notified: Array<[string, string]> = []
  for (const kind of NOTIFY_KINDS) {
    vi.spyOn(notify, kind).mockImplementation((message) => notified.push([kind, message]))
  }
  try {
    const aliases = new Map<string, string>()
    const setup: Step[] = []
    const ids = fixture.setup?.(recording(setup, aliases, false)) ?? {}
    learnIds(aliases)
    notified.length = 0
    const before = { state: dataOf(state()), storage: storage?.() }
    const calls: Step[] = []
    try {
      fixture.call(recording(calls, aliases, true), ids, state())
    } catch (error) {
      // An action's throw is behaviour, recorded on its step; any other throw is a broken fixture.
      if (calls[calls.length - 1]?.threw === undefined) throw error
    }
    const after = { state: dataOf(state()), storage: storage?.() }
    const golden = { fixture: fixture.name, from: fixture.from, setup, before, calls, notified, after }
    return `${renameIds(JSON.stringify(golden, sortedKeys, 2), aliases)}\n`
  } finally {
    useCircuitStore.setState(pristine, true)
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
}
