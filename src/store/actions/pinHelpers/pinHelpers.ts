import { Vector3, Euler } from 'three'
import type { PinHelpers, Position, CircuitStore, GateInstance } from '../../types'

type GetState = () => CircuitStore

// Pin position constants - must match gate component geometry (NandGate.tsx etc.)
const INPUT_PIN_X = -0.6   // From NandGate: BODY_LEFT - PIN_RADIUS
const OUTPUT_PIN_X = 0.84  // From NandGate: BUBBLE_RIGHT + PIN_RADIUS

// Helper to get pin world position (accounts for gate rotation)
function computePinWorldPosition(
  gates: GateInstance[],
  gateId: string,
  pinId: string
): Position | null {
  const gate = gates.find((g) => g.id === gateId)
  if (!gate) return null

  const inputIndex = gate.inputs.findIndex((p) => p.id === pinId)
  const outputIndex = gate.outputs.findIndex((p) => p.id === pinId)

  let localOffset: Vector3
  if (inputIndex !== -1) {
    const yOffset = inputIndex === 0 ? 0.2 : -0.2
    localOffset = new Vector3(INPUT_PIN_X, yOffset, 0)
  } else if (outputIndex !== -1) {
    localOffset = new Vector3(OUTPUT_PIN_X, 0, 0)
  } else {
    return null
  }

  const euler = new Euler(gate.rotation.x, gate.rotation.y, gate.rotation.z, 'XYZ')
  localOffset.applyEuler(euler)

  return {
    x: gate.position.x + localOffset.x,
    y: gate.position.y + localOffset.y,
    z: gate.position.z + localOffset.z,
  }
}

export const createPinHelpers = (get: GetState): PinHelpers => ({
  getPinWorldPosition: (gateId: string, pinId: string) => {
    const state = get()
    return computePinWorldPosition(state.gates, gateId, pinId)
  },
})
