import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import {
  registerImplementationSource,
  resetImplementationSourcesForTests,
} from '@/core/testing/implementationSources'
import { createChipRegistry, registerBuiltin } from '@/core/chips/registry'

beforeEach(() => {
  localStorage.clear()
  resetImplementationSourcesForTests()
  useCircuitStore.setState({ testResult: null, testColumns: [], completedChips: [] })
})

describe('runChipTest', () => {
  it('passes Not against the builtin source and marks it completed', () => {
    circuitActions.runChipTest('Not', 'builtin')
    const s = useCircuitStore.getState()
    expect(s.testResult?.passed).toBe(true)
    // testColumns now carries full column metadata; verify name and format for Not's output-list
    expect(s.testColumns.map((c) => c.name)).toEqual(['in', 'out'])
    expect(s.testColumns.every((c) => c.format === 'B')).toBe(true)
    expect(s.completedChips).toContain('Not')
    expect(JSON.parse(localStorage.getItem('hacer-completed-chips') ?? '[]')).toContain('Not')
  })

  it('sets an error result for an unknown source', () => {
    circuitActions.runChipTest('Not', 'nope')
    expect(useCircuitStore.getState().testResult?.error).toMatch(/source/i)
  })

  it('reports firstFailure when the implementation is wrong', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    registerImplementationSource({
      id: 'broken',
      label: 'Broken',
      resolve: (name) => (name === 'Not' ? { chip: reg.get('Not')!, registry: reg } : null),
    })
    circuitActions.runChipTest('Not', 'broken')
    const r = useCircuitStore.getState().testResult
    expect(r?.passed).toBe(false)
    expect(r?.firstFailure).toMatchObject({ row: 0, column: 'out' })
  })

  it('does not modify completedChips on a failed run (unknown source)', () => {
    useCircuitStore.setState({ completedChips: ['And'] })
    circuitActions.runChipTest('Not', 'nope')
    expect(useCircuitStore.getState().completedChips).toEqual(['And'])
  })

  it('clearTestResult resets the result', () => {
    circuitActions.runChipTest('Not', 'builtin')
    circuitActions.clearTestResult()
    expect(useCircuitStore.getState().testResult).toBeNull()
  })

  it('captures an error (does not throw) when a source resolve throws', () => {
    registerImplementationSource({
      id: 'throwing',
      label: 'Throwing',
      resolve: () => { throw new Error('boom from resolve') },
    })
    expect(() => circuitActions.runChipTest('Not', 'throwing')).not.toThrow()
    expect(useCircuitStore.getState().testResult?.error).toMatch(/boom/i)
  })

  it('uses resolved.chip from source even when registry does not contain it under that name', () => {
    // A source whose resolve() returns a broken Not (always out:0) in a registry that does NOT
    // register it under "Not". If runChipTest fell back to registry.get("Not") after load Not.hdl,
    // it would either error ("Not not found") or pick up some other chip — it would NOT observe
    // the broken chip's failure.  The fix must prove that the source chip is actually tested.
    const wrongReg = createChipRegistry()
    // Register a DIFFERENT chip so the registry is non-empty but has no "Not":
    registerBuiltin(wrongReg, 'Placeholder', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    const brokenChip: import('@/core/chips/types').ChipDefinition = {
      name: 'Not',
      inputs: [{ name: 'in', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) }, // always wrong
    }
    registerImplementationSource({
      id: 'source-chip-only',
      label: 'SourceChipOnly',
      // resolved.chip is brokenChip; registry does NOT contain "Not"
      resolve: (name) => (name === 'Not' ? { chip: brokenChip, registry: wrongReg } : null),
    })
    circuitActions.runChipTest('Not', 'source-chip-only')
    const r = useCircuitStore.getState().testResult
    // Must have observed the broken chip (always-0) and failed, not errored with "Not not found"
    expect(r?.error).toBeNull()
    expect(r?.passed).toBe(false)
    expect(r?.firstFailure).toMatchObject({ row: 0, column: 'out' })
  })
})
