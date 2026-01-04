/**
 * Three-Gate Circuit Scenario
 *
 * A standard test scenario with 3 gates wired together
 * for verifying circuit building and simulation.
 * Gate types are parameterized - defaults to NAND for backward compatibility.
 */

import { GATE_Y } from '../config/constants'
import type { NandScenario } from './types'

export const threeGateScenario: NandScenario = {
  name: 'three-gate circuit',
  placements: [
    { label: 'g1', position: { x: -1, y: GATE_Y, z: -1 } },
    { label: 'g2', position: { x: -1, y: GATE_Y, z: 3 } },
    { label: 'g3', position: { x: 3, y: GATE_Y, z: 1 }, rotate: { direction: 'left', times: 2 } },
  ],
  wires: [
    { fromGate: 0, fromPin: 'out-0', toGate: 2, toPin: 'in-0' },
    { fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-1' },
  ],
  toggles: [
    { gate: 0, pin: 'in-0', value: true },
    { gate: 0, pin: 'in-1', value: true },
    { gate: 1, pin: 'in-0', value: true },
  ],
  expectations: {
    gates: 3,
    wires: 2,
    outputs: {
      gate1: false,
      gate2: true,
      gate3: true,
      gate3Inputs: [false, true],
    },
  },
}

// Backward compatibility alias
export const nand3Scenario = threeGateScenario
