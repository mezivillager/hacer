/**
 * MCP driver. Sends each scenario's `.hdl`, `.tst` and `.cmp` (a recovered circuit's as its NAND
 * chip and recorded vector) to the `hacer_hdl` tool through an MCP client: the verdict is the tool's.
 */
import type { Client } from '@modelcontextprotocol/client'
import type { TestReport } from '@/core'
import { HDL_TOOL } from '@/mcp/server'
import type { ChipScenario, Scenario } from '../types'
import { asChipScenario } from './asChipScenario'
import type { CoreScenarioResult } from './core'
import { testReportErrors } from './report'

/** The verdict half of the core driver's result; `errors` holds the tool's first mismatch or error. */
export type McpScenarioResult = Pick<CoreScenarioResult, 'name' | 'ok' | 'errors'>

/** Run one scenario through `hacer_hdl`. One that does not translate never calls the tool. */
export async function runMcpScenario(scenario: Scenario | ChipScenario, client: Client): Promise<McpScenarioResult> {
  const name = scenario.name
  const asChip = asChipScenario(scenario)
  if (!asChip.ok) return { name, ok: false, errors: asChip.errors }

  const { hdl, tst, cmp } = asChip.scenario
  const result = await client.callTool({ name: HDL_TOOL, arguments: { hdl, tst, cmp } })
  if (result.isError || !result.structuredContent) {
    return { name, ok: false, errors: [`${HDL_TOOL} failed: ${JSON.stringify(result.content)}`] }
  }
  const report = result.structuredContent as unknown as TestReport
  return { name, ok: report.status === 'pass', errors: testReportErrors(report) }
}
