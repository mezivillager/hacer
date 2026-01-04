/**
 * Circuit Building Scenario
 *
 * A basic two-gate scenario for testing circuit building workflows.
 * Gate types can be parameterized in tests.
 */

import { DEFAULT_POSITIONS } from '../config/constants'
import type { CircuitBuildScenario } from './types'

export const circuitBuildScenario: CircuitBuildScenario = {
  name: 'two-gate build and cleanup',
  placements: [
    { label: 'g1', position: DEFAULT_POSITIONS.left }, // Default orientation, output faces right
    { label: 'g2', position: DEFAULT_POSITIONS.right, rotate: { direction: 'left', times: 2 } }, // Rotate to face left, input exposed
  ],
  wire: { fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' },
}

/**
 * Multi-gate chain scenario for testing longer circuits.
 */
export const chainCircuitScenario: CircuitBuildScenario = {
  name: 'three-gate chain',
  placements: [
    { label: 'g1', position: DEFAULT_POSITIONS.left },
    { label: 'g2', position: DEFAULT_POSITIONS.center, rotate: { direction: 'left', times: 2 } },
    { label: 'g3', position: DEFAULT_POSITIONS.right, rotate: { direction: 'left', times: 2 } },
  ],
  wire: { fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' },
}
