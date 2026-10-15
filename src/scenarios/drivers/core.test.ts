import { describe, expect, it } from 'vitest'
import { nand3Scenario, threeGateScenario } from '../nand3'
import { project1Scenario, project1Scenarios, project1Vector } from '../project1'
import { runAllScenarios, runChipScenario, runScenario, SCENARIOS, type CoreScenarioResult } from './core'

const EXPECTED: CoreScenarioResult[] = [
  {
    name: 'three-gate circuit',
    ok: true,
    errors: [],
    outputs: [0, 1, 1],
    pins: [
      [1, 1],
      [1, 0],
      [0, 1],
    ],
  },
  {
    name: 'two-gate build and cleanup',
    ok: true,
    errors: [],
    outputs: [1, 1],
    pins: [
      [0, 0],
      [1, 0],
    ],
  },
  {
    name: 'three-gate chain',
    ok: true,
    errors: [],
    outputs: [1, 1, 1],
    pins: [
      [0, 0],
      [1, 0],
      [0, 0],
    ],
  },
  {
    name: 'two-gate propagation',
    ok: true,
    errors: [],
    outputs: [0, 1],
    pins: [
      [1, 1],
      [0, 0],
    ],
  },
]

describe('core scenario driver', () => {
  it('keeps the recovered three-gate circuit', () => {
    expect(nand3Scenario).toBe(threeGateScenario)
    expect(threeGateScenario.placements.map((gate) => gate.position)).toEqual([
      { x: -1, y: 0.2, z: -1 },
      { x: -1, y: 0.2, z: 3 },
      { x: 3, y: 0.2, z: 1 },
    ])
    expect(threeGateScenario.wires).toEqual([
      { fromGate: 0, fromPin: 'out-0', toGate: 2, toPin: 'in-0' },
      { fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-1' },
    ])
  })

  it('runs every recovered scenario, in order', () => {
    expect(runAllScenarios().map((result) => result.name)).toEqual(EXPECTED.map((result) => result.name))
  })

  it.each(SCENARIOS)('$name: runs as NAND through the engine', (scenario) => {
    expect(runScenario(scenario)).toEqual(EXPECTED.find((result) => result.name === scenario.name))
  })

  it.each(project1Scenarios())('$name: testChip passes', (scenario) => {
    expect(runChipScenario(scenario)).toEqual({ name: scenario.name, ok: true, errors: [] })
  })

  it('fails project1/Xor on the vendored empty template, as every driver does', () => {
    const template = { ...project1Scenario('Xor'), hdl: project1Vector('Xor', 'hdl') }
    expect(runChipScenario(template)).toEqual({ name: 'project1/Xor', ok: false, errors: ['row 2: out expected 1, got 0'] })
  })
})
