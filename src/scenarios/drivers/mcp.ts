/**
 * MCP driver. Sends each scenario's `Scenario.hdl` and the `.tst`/`.cmp` pair for its recorded
 * vector to the `hacer_hdl` tool through an MCP client: the verdict is the tool's.
 */
import type { Client } from '@modelcontextprotocol/client'
import type { TestReport } from '@/core'
import { HDL_TOOL } from '@/mcp/server'
import { scenarioTest, scenarioToHdl } from '../toHdl'
import type { Scenario } from '../types'
import type { CoreScenarioResult } from './core'

/** The verdict half of the core driver's result; `errors` holds the tool's first mismatch or error. */
export type McpScenarioResult = Pick<CoreScenarioResult, 'name' | 'ok' | 'errors'>

/** Run one scenario through `hacer_hdl`. One that does not translate never calls the tool. */
export async function runMcpScenario(scenario: Scenario, client: Client): Promise<McpScenarioResult> {
  const name = scenario.name
  const translated = scenarioToHdl(scenario)
  if (!translated.ok) return { name, ok: false, errors: translated.errors }

  const { tst, cmp } = scenarioTest(translated.chip)
  const result = await client.callTool({ name: HDL_TOOL, arguments: { hdl: translated.chip.hdl, tst, cmp } })
  if (result.isError || !result.structuredContent) {
    return { name, ok: false, errors: [`${HDL_TOOL} failed: ${JSON.stringify(result.content)}`] }
  }
  const { status, failure, error } = result.structuredContent as unknown as TestReport
  const found = failure ? `row ${failure.row}: ${failure.column} expected ${failure.expected}, got ${failure.actual}` : error
  return { name, ok: status === 'pass', errors: found === null ? [] : [found] }
}
