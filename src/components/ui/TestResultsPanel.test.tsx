import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestResultsPanel } from './TestResultsPanel'
import { useCircuitStore } from '@/store/circuitStore'
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

describe('TestResultsPanel', () => {
  it('renders the run button and selectors', () => {
    render(<TestResultsPanel />)
    expect(screen.getByTestId('run-test-button')).toBeTruthy()
    expect(screen.getByTestId('test-chip-select')).toBeTruthy()
    expect(screen.getByTestId('test-source-select')).toBeTruthy()
  })

  it('runs Not against the builtin and shows success + a table', () => {
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'builtin' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison ended successfully')
    expect(screen.getByTestId('output-table')).toBeTruthy()
    expect(screen.getByTestId('output-row-0')).toBeTruthy()
  })

  it('highlights the failing cell for a broken implementation', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    registerImplementationSource({
      id: 'broken', label: 'Broken',
      resolve: (n) => (n === 'Not' ? { chip: reg.get('Not')!, registry: reg } : null),
    })
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'broken' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('fail-cell')).toBeTruthy()
    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison failure')
  })

  it('marks a passed chip with a ✓ in the dropdown', () => {
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('test-chip-select').textContent).toContain('✓ Not')
  })

  it('renders 16-bit binary column values as 16-character binary strings, not raw decimals', () => {
    // Not16: output-list in%B1.16.1 out%B1.16.1 — both columns are 16-bit binary
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not16' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'builtin' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison ended successfully')
    // First row: in=0b0000000000000000 → out=0b1111111111111111 (65535)
    // The cell must show the binary string, not a raw decimal like 65535
    const firstRow = screen.getByTestId('output-row-0')
    expect(firstRow.textContent).toMatch(/[01]{16}/)
    expect(firstRow.textContent).not.toContain('65535')
  })
})
