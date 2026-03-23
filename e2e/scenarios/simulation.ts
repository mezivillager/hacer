/**
 * Simulation Scenario
 */

import { DEFAULT_POSITIONS } from '../config/constants'
import type { SimulationScenario } from './types'

export const simulationTwoGateScenario: SimulationScenario = {
  name: 'two-gate propagation',
  placements: [
    { label: 'g1', position: DEFAULT_POSITIONS.left }, // Default orientation
    { label: 'g2', position: DEFAULT_POSITIONS.right, rotate: { direction: 'left', times: 2 } }, // Rotate to face left
  ],
  wires: [
    { fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' },
  ],
  toggles: [
    { gate: 0, pin: 'in-0', value: 1 },
    { gate: 0, pin: 'in-1', value: 1 },
  ],
  expectations: {
    gates: 2,
    wires: 1,
    outputs: [
      { gateIndex: 0, outputIndex: 0, value: 0 },
      { gateIndex: 1, outputIndex: 0, value: 1 },
    ],
    inputs: [
      { gateIndex: 1, inputIndex: 0, value: 0 },
    ],
  },
}
