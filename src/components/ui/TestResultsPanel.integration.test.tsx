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

// #313: mounts the full `renderShell()` tree and then runs an actual chip comparison through
// the test-lab UI. Measured over 3 full `pnpm run test:run` runs with 2 other agent processes
// active: 1658-2642ms, up to 53% of vitest's 5000ms default. 10000ms is ~3.8x that worst
// measured duration.
const SLOW_MOUNT_TIMEOUT_MS = 10000

describe('Test Lab (shell integration)', () => {
  it(
    'user opens the Tests panel from the action bar, runs a chip, and sees a passing result',
    () => {
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
    },
    SLOW_MOUNT_TIMEOUT_MS,
  )
})
