import type { Client } from '@modelcontextprotocol/client'
import type { Scenario } from '../types'
import type { CoreScenarioResult } from './core'

export type McpScenarioResult = Pick<CoreScenarioResult, 'name' | 'ok' | 'errors'>

export async function runMcpScenario(scenario: Scenario, client: Client): Promise<McpScenarioResult> {
  await client.ping()
  return { name: scenario.name, ok: false, errors: ['not implemented'] }
}
