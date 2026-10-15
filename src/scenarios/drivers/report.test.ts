import { describe, expect, it } from 'vitest'
import { chipTestError, type TestReport } from '@/core'
import { testReportErrors } from './report'

const pass: TestReport = { status: 'pass', chip: 'Xor', rows: { passed: 4, expected: 4 }, failure: null, error: null }

describe('testReportErrors', () => {
  it('a pass reads as no errors', () => {
    expect(testReportErrors(pass)).toEqual([])
  })

  it('a fail reads as "row N: <column> expected X, got Y"', () => {
    const fail: TestReport = {
      ...pass,
      status: 'fail',
      rows: { passed: 1, expected: 4 },
      failure: { row: 2, column: 'out', expected: '1', actual: '0' },
    }
    expect(testReportErrors(fail)).toEqual(['row 2: out expected 1, got 0'])
  })

  it('an error report reads as its error', () => {
    expect(testReportErrors(chipTestError('Xor', 'Xor.tst:1:1: unexpected token'))).toEqual(['Xor.tst:1:1: unexpected token'])
  })
})
