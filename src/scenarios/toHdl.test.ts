import { describe, expect, it } from 'vitest'
import { circuitBuildScenario } from './circuitBuilding'
import { threeGateScenario } from './nand3'
import { simulationTwoGateScenario } from './simulation'
import { scenarioTest, scenarioToHdl, type ScenarioChip } from './toHdl'
import type { Scenario } from './types'

const chipOf = (scenario: Scenario): ScenarioChip => {
  const result = scenarioToHdl(scenario)
  if (!result.ok) throw new Error(result.errors.join('; '))
  return result.chip
}

describe('scenarioToHdl', () => {
  it('writes the three-gate circuit as a NAND chip with its recorded vector', () => {
    expect(scenarioToHdl(threeGateScenario)).toEqual({
      ok: true,
      chip: {
        hdl: [
          'CHIP Scenario {',
          'IN g0a, g0b, g1a, g1b;',
          'OUT g0out, g1out, g2out;',
          'PARTS:',
          'Nand(a=g0a, b=g0b, out=g0out);',
          'Nand(a=g1a, b=g1b, out=g1out);',
          'Nand(a=g0out, b=g1out, out=g2out);',
          '}',
        ].join('\n'),
        inputs: [
          { name: 'g0a', value: 1 },
          { name: 'g0b', value: 1 },
          { name: 'g1a', value: 1 },
          { name: 'g1b', value: 0 },
        ],
        outputs: ['g0out', 'g1out', 'g2out'],
        pins: [
          ['g0a', 'g0b'],
          ['g1a', 'g1b'],
          ['g0out', 'g1out'],
        ],
        expected: [
          { label: 'gate 1 out', signal: 'g0out', value: 0 },
          { label: 'gate 2 out', signal: 'g1out', value: 1 },
          { label: 'gate 3 out', signal: 'g2out', value: 1 },
          { label: 'gate 3 in 0', signal: 'g0out', value: 0 },
          { label: 'gate 3 in 1', signal: 'g1out', value: 1 },
        ],
      },
    })
  })

  it('sets every input of a build scenario to 0 and expects nothing', () => {
    expect(chipOf(circuitBuildScenario)).toMatchObject({
      inputs: [
        { name: 'g0a', value: 0 },
        { name: 'g0b', value: 0 },
        { name: 'g1b', value: 0 },
      ],
      pins: [
        ['g0a', 'g0b'],
        ['g0out', 'g1b'],
      ],
      expected: [],
    })
  })

  it('reads a simulation vector as the signals its pins carry', () => {
    expect(chipOf(simulationTwoGateScenario).expected).toEqual([
      { label: 'gate 0 out', signal: 'g0out', value: 0 },
      { label: 'gate 1 out', signal: 'g1out', value: 1 },
      { label: 'gate 1 in 0', signal: 'g0out', value: 0 },
    ])
  })

  it.each<[string, Scenario, string[]]>([
    [
      'a wire outside the placements',
      { ...circuitBuildScenario, wire: { fromGate: 0, fromPin: 'out-0', toGate: 5, toPin: 'in-0' } },
      ['wire 0→5 is outside 0..1'],
    ],
    [
      'two wires into one pin',
      {
        ...threeGateScenario,
        wires: [...threeGateScenario.wires, { fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-0' }],
      },
      ['gate 2 pin in-0 has 2 drivers'],
    ],
    [
      'a gate count the placements do not have',
      { ...simulationTwoGateScenario, expectations: { ...simulationTwoGateScenario.expectations, gates: 3 } },
      ['gates: expected 3, got 2'],
    ],
    [
      'a vector on a pin the gate does not have',
      {
        ...simulationTwoGateScenario,
        expectations: { ...simulationTwoGateScenario.expectations, outputs: [{ gateIndex: 1, outputIndex: 1, value: 0 }] },
      },
      ['gate 1 out: expected 0, got undefined'],
    ],
  ])('refuses %s', (_, scenario, errors) => {
    expect(scenarioToHdl(scenario)).toEqual({ ok: false, errors })
  })
})

describe('scenarioTest', () => {
  it('sets the recorded inputs, outputs one row, and expects the recorded vector in the .cmp', () => {
    expect(scenarioTest(chipOf(simulationTwoGateScenario))).toEqual({
      tst: [
        'load Scenario.hdl,',
        'compare-to Scenario.cmp,',
        'output-list g0a%B1.1.1 g0b%B1.1.1 g1b%B1.1.1 g0out%B2.1.2 g1out%B2.1.2 g0out%B2.1.2;',
        'set g0a 1,',
        'set g0b 1,',
        'set g1b 0,',
        'eval,',
        'output;',
        '',
      ].join('\n'),
      cmp: ['|g0a|g0b|g1b|g0out|g1out|g0out|', '| 1 | 1 | 0 |  0  |  1  |  0  |', ''].join('\n'),
    })
  })

  it('compares only the inputs when the scenario records no vector', () => {
    expect(scenarioTest(chipOf(circuitBuildScenario)).cmp).toBe('|g0a|g0b|g1b|\n| 0 | 0 | 0 |\n')
  })
})
