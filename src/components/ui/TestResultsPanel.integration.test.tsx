import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderShell } from '@/test/renderShell'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { resetImplementationSourcesForTests } from '@/core/testing/implementationSources'

beforeEach(() => {
  localStorage.clear()
  resetImplementationSourcesForTests()
  circuitActions.clearCircuit()
  useCircuitStore.setState({ testResult: null, testColumns: [], completedChips: [] })
})

describe('Test Lab (shell integration)', () => {
  it('user opens the Tests panel from the action bar, runs a chip, and sees a passing result', () => {
    renderShell()
    // The panel is not visible until the user opens it from the RightActionBar.
    expect(screen.queryByTestId('test-results-panel')).toBeNull()
    fireEvent.click(screen.getByTestId('right-bar-tests-trigger'))
    expect(screen.getByTestId('test-results-panel')).toBeTruthy()

    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'builtin' } })
    fireEvent.click(screen.getByTestId('run-test-button'))

    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison ended successfully')
    expect(screen.getByTestId('output-table')).toBeTruthy()
    expect(screen.getByTestId('output-row-0')).toBeTruthy()
  })
})
