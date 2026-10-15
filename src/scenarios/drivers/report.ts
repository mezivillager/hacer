import type { TestReport } from '@/core'

/** A report's first mismatch or error, as the drivers' `errors`; a pass has none. */
export function testReportErrors({ failure, error }: TestReport): string[] {
  if (failure) return [`row ${failure.row}: ${failure.column} expected ${failure.expected}, got ${failure.actual}`]
  return error === null ? [] : [error]
}
