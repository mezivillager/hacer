import type { TestReport } from '@/core'

/** A report's first mismatch or error, as the drivers' `errors`; a pass has none. */
export function testReportErrors(_report: TestReport): string[] {
  return ['not implemented']
}
