// The `mcp` column of the scenario × driver suite: each scenario through `hacer_hdl` over an
// in-process MCP client.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { connectInProcess, type InProcessClient } from '@/mcp/inProcessClient'
import { threeGateScenario, type NandScenario, type Scenario } from '..'
import { project1Scenario, project1Scenarios, project1Vector } from '../project1'
import { runChipScenario, runScenario, SCENARIOS } from './core'
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

  it.each(project1Scenarios())('$name: hacer_hdl passes, as the core driver does', async (scenario) => {
    expect(runChipScenario(scenario).ok).toBe(true)
    expect(await runMcpScenario(scenario, mcp.client)).toEqual({ name: scenario.name, ok: true, errors: [] })
  })

  it('fails project1/Xor on the vendored empty template, as every driver does', async () => {
    const template = { ...project1Scenario('Xor'), hdl: project1Vector('Xor', 'hdl') }
    const failed = { name: 'project1/Xor', ok: false, errors: ['row 2: out expected 1, got 0'] }
    expect(runChipScenario(template)).toEqual(failed)
    expect(await runMcpScenario(template, mcp.client)).toEqual(failed)
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
