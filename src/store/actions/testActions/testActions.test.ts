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
    expect(s.testColumns).toEqual(['in', 'out'])
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

  it('clearTestResult resets the result', () => {
    circuitActions.runChipTest('Not', 'builtin')
    circuitActions.clearTestResult()
    expect(useCircuitStore.getState().testResult).toBeNull()
  })
})
