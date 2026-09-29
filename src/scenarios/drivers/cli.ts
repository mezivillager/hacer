import type { Scenario } from '../types'
import type { CoreScenarioResult } from './core'

export type CliScenarioResult = Pick<CoreScenarioResult, 'name' | 'ok' | 'errors'>

export function runCliScenario(_scenario: Scenario, _bin: string): CliScenarioResult {
  throw new Error('not implemented')
}
