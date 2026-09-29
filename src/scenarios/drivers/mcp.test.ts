// The `mcp` column of the scenario × driver suite: each scenario through `hacer_hdl` over an
// in-process MCP client.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { connectInProcess, type InProcessClient } from '@/mcp/inProcessClient'
import { threeGateScenario, type NandScenario, type Scenario } from '..'
import { runScenario, SCENARIOS } from './core'
import { runMcpScenario } from './mcp'

let mcp: InProcessClient

beforeAll(async () => {
  mcp = await connectInProcess()
})

afterAll(async () => {
  await mcp.close()
})

describe('mcp scenario driver', () => {
  it.each(SCENARIOS)('$name: hacer_hdl passes, as the core driver does', async (scenario) => {
    expect(runScenario(scenario).ok).toBe(true)
    expect(await runMcpScenario(scenario, mcp.client)).toEqual({ name: scenario.name, ok: true, errors: [] })
  })

  it('fails with the core driver when the recorded vector is wrong', async () => {
    const { expectations } = threeGateScenario
    const wrong: NandScenario = {
      ...threeGateScenario,
      expectations: { ...expectations, outputs: { ...expectations.outputs, gate3: 0 } },
    }
    expect(runScenario(wrong).ok).toBe(false)
    expect(await runMcpScenario(wrong, mcp.client)).toEqual({
      name: wrong.name,
      ok: false,
      errors: ['row 1: g2out expected 0, got 1'],
    })
  })

  it("reports the core driver's errors for a scenario that does not translate", async () => {
    const doubled: Scenario = {
      ...threeGateScenario,
      wires: [...threeGateScenario.wires, { fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-1' }],
    }
    const result = await runMcpScenario(doubled, mcp.client)
    expect(result).toEqual({ name: doubled.name, ok: false, errors: ['gate 2 pin in-1 has 2 drivers'] })
    expect(result.errors).toEqual(runScenario(doubled).errors)
  })
})
