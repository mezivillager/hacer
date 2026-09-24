import { describe, expect, it } from 'vitest'
import { nand3Scenario, threeGateScenario } from '../nand3'
import { runAllScenarios } from './core'

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

  it('runs every recovered scenario as NAND through the engine', () => {
    expect(runAllScenarios()).toEqual([
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
    ])
  })
})
