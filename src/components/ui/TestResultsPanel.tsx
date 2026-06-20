import { useState } from 'react'
import { Button } from '@/components/ui-kit/button'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { project1TstFixtures } from '@/core/testing/project1TstFixtures'
import { getImplementationSources } from '@/core/testing/implementationSources'

const CHIP_NAMES = Object.keys(project1TstFixtures)
const SELECT_CLASS = 'font-mono text-xs rounded border border-border bg-background px-2 py-1 cursor-pointer'

export function TestResultsPanel() {
  const sources = getImplementationSources()
  const [chipName, setChipName] = useState<string>(CHIP_NAMES[0] ?? '')
  const [sourceId, setSourceId] = useState<string>(sources[0]?.id ?? 'builtin')
  const testResult = useCircuitStore((s) => s.testResult)
  const testColumns = useCircuitStore((s) => s.testColumns)
  const completedChips = useCircuitStore((s) => s.completedChips)

  return (
    <div data-testid="test-results-panel" className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Chip</label>
        <select
          data-testid="test-chip-select"
          className={SELECT_CLASS}
          value={chipName}
          onChange={(e) => setChipName(e.target.value)}
        >
          {CHIP_NAMES.map((name) => (
            <option key={name} value={name}>{completedChips.includes(name) ? `✓ ${name}` : name}</option>
          ))}
        </select>
        <label className="text-xs text-muted-foreground">Implementation</label>
        <select
          data-testid="test-source-select"
          className={SELECT_CLASS}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        >
          {sources.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
        </select>
      </div>

      <Button
        data-testid="run-test-button"
        size="sm"
        onClick={() => circuitActions.runChipTest(chipName, sourceId)}
        disabled={!chipName}
      >
        Run Test
      </Button>

      {testResult && (
        <div className="space-y-2">
          <div data-testid="test-summary" className="text-xs">
            {testResult.error ? (
              <span className="text-destructive">{testResult.error}</span>
            ) : testResult.passed ? (
              <span className="text-green-500">Comparison ended successfully</span>
            ) : (
              <span className="text-destructive">
                Comparison failure at row {testResult.firstFailure?.row}, column &apos;{testResult.firstFailure?.column}&apos;:
                expected {testResult.firstFailure?.expected}, got {testResult.firstFailure?.actual}
              </span>
            )}
          </div>

          {testResult.outputRows.length > 0 && testColumns.length > 0 && (
            <div data-testid="output-table" className="overflow-x-auto">
              <table className="border-collapse font-mono text-[11px]">
                <thead>
                  <tr>
                    <th className="px-1.5 py-0.5 border-b border-border">#</th>
                    {testColumns.map((col) => (
                      <th key={col} className="px-1.5 py-0.5 border-b border-border">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testResult.outputRows.map((row, i) => {
                    const failing = !testResult.passed && testResult.firstFailure?.row === i
                    return (
                      <tr key={i} data-testid={`output-row-${i}`}>
                        <td className="px-1.5 py-0.5 text-muted-foreground">{i}</td>
                        {testColumns.map((col) => {
                          const failCol = failing && testResult.firstFailure?.column === col
                          return (
                            <td
                              key={col}
                              data-testid={failCol ? 'fail-cell' : undefined}
                              className={failCol ? 'px-1.5 py-0.5 bg-destructive/20 text-destructive' : 'px-1.5 py-0.5'}
                            >
                              {row.values[col] ?? '-'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground">Steps: {testResult.passedSteps}/{testResult.totalSteps}</div>
        </div>
      )}
    </div>
  )
}
