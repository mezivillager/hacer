import { describe, it, expect } from 'vitest'
import {
  LINE_BUDGETS,
  countLines,
  findLineBudgetViolations,
  formatLineBudgetViolations,
} from './docLineBudget.logic.mjs'

const linesOf = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n')

describe('countLines', () => {
  it('returns 0 for empty text', () => {
    expect(countLines('')).toBe(0)
  })

  it('counts a single line with no trailing newline', () => {
    expect(countLines('one line')).toBe(1)
  })

  it('counts lines the way `wc -l` does, ignoring one final trailing newline', () => {
    expect(countLines('a\nb\nc\n')).toBe(3)
  })

  it('counts a trailing blank line when the text ends with two newlines', () => {
    expect(countLines('a\n\n')).toBe(2)
  })
})

describe('findLineBudgetViolations', () => {
  it('flags a budgeted file over its limit', () => {
    const files = [{ path: 'AGENTS.md', text: linesOf(121) }]
    expect(findLineBudgetViolations(files)).toEqual([{ path: 'AGENTS.md', lines: 121, limit: 120 }])
  })

  it('passes a budgeted file exactly at its limit', () => {
    const files = [{ path: 'AGENTS.md', text: linesOf(120) }]
    expect(findLineBudgetViolations(files)).toEqual([])
  })

  it('ignores a file with no budget entry', () => {
    const files = [{ path: 'README.md', text: linesOf(999) }]
    expect(findLineBudgetViolations(files)).toEqual([])
  })

  it('respects a custom budgets map instead of the default LINE_BUDGETS', () => {
    const files = [{ path: 'x.md', text: 'a\nb\nc' }]
    expect(findLineBudgetViolations(files, { 'x.md': 2 })).toEqual([{ path: 'x.md', lines: 3, limit: 2 }])
  })

  it('exports AGENTS.md at 120 in the default budgets', () => {
    expect(LINE_BUDGETS['AGENTS.md']).toBe(120)
  })
})

describe('formatLineBudgetViolations', () => {
  it('renders one OVER BUDGET line per violation', () => {
    const out = formatLineBudgetViolations([
      { path: 'AGENTS.md', lines: 130, limit: 120 },
    ])
    expect(out).toBe('OVER BUDGET AGENTS.md: 130 lines (limit 120)')
  })

  it('joins multiple violations with newlines', () => {
    const out = formatLineBudgetViolations([
      { path: 'AGENTS.md', lines: 130, limit: 120 },
      { path: 'x.md', lines: 3, limit: 2 },
    ])
    expect(out).toBe('OVER BUDGET AGENTS.md: 130 lines (limit 120)\nOVER BUDGET x.md: 3 lines (limit 2)')
  })

  it('returns an empty string for no violations', () => {
    expect(formatLineBudgetViolations([])).toBe('')
  })
})
