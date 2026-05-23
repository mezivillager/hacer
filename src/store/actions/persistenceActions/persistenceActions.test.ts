import { describe, it, expect, beforeEach, vi } from 'vitest'
import { circuitActions } from '@/store/circuitStore'

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  circuitActions.clearCircuit()
})

describe('saveCircuit', () => {
  it('writes a SerializedCircuit JSON under hacer-circuit-<name>', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.saveCircuit('demo')
    const raw = localStorage.getItem('hacer-circuit-demo')
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!)
    expect(data.version).toBe(1)
    expect(data.name).toBe('demo')
    expect(data.gates).toHaveLength(1)
  })

  it('rejects empty or whitespace-only names (no localStorage entry)', async () => {
    const { notify } = await import('@/lib/notify')
    circuitActions.saveCircuit('')
    circuitActions.saveCircuit('   ')
    expect(localStorage.length).toBe(0)
    expect(notify.warning).toHaveBeenCalled()
  })

  it('overwrites an existing entry under the same name', () => {
    circuitActions.saveCircuit('demo')
    const first = JSON.parse(localStorage.getItem('hacer-circuit-demo')!)
    circuitActions.addGate('AND', { x: 4, y: 0, z: 4 })
    circuitActions.saveCircuit('demo')
    const second = JSON.parse(localStorage.getItem('hacer-circuit-demo')!)
    expect(second.gates.length).toBeGreaterThan(first.gates.length)
  })
})

describe('listSavedCircuits', () => {
  it('returns sorted entries with name + savedAt (newest first)', async () => {
    circuitActions.saveCircuit('first')
    await new Promise((r) => setTimeout(r, 5))
    circuitActions.saveCircuit('second')
    const list = circuitActions.listSavedCircuits()
    expect(list.map((e) => e.name)).toEqual(['second', 'first'])
  })

  it('excludes the __autosave__ slot from the user-facing list', () => {
    circuitActions.saveCircuit('a')
    localStorage.setItem(
      'hacer-circuit-__autosave__',
      JSON.stringify({
        version: 1,
        name: '__autosave__',
        savedAt: new Date().toISOString(),
        gates: [],
        wires: [],
        inputNodes: [],
        outputNodes: [],
        junctions: [],
      }),
    )
    const list = circuitActions.listSavedCircuits()
    expect(list.map((e) => e.name)).toEqual(['a'])
  })
})

describe('deleteSavedCircuit', () => {
  it('removes the named entry only', () => {
    circuitActions.saveCircuit('a')
    circuitActions.saveCircuit('b')
    circuitActions.deleteSavedCircuit('a')
    expect(localStorage.getItem('hacer-circuit-a')).toBeNull()
    expect(localStorage.getItem('hacer-circuit-b')).not.toBeNull()
  })
})
