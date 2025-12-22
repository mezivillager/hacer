import { Vector3, Euler } from 'three'
import type { PinHelpers, Position, CircuitStore, GateInstance } from '../../types'

type GetState = () => CircuitStore

// Pin position constants - must match gate component geometry
const INPUT_PIN_X = -0.6   // BODY_LEFT - PIN_RADIUS = -0.5 - 0.1
const OUTPUT_PIN_X_NO_BUBBLE = 0.6   // BODY_RIGHT + PIN_RADIUS = 0.5 + 0.1 (for AND, OR, XOR)
const OUTPUT_PIN_X_WITH_BUBBLE = 0.84  // BUBBLE_RIGHT + PIN_RADIUS = 0.74 + 0.1 (for NAND, NOT)

/**
 * Calculates the world-space orientation (direction) of a pin.
 * 
 * Input pins face left (negative X) in local space; output pins face right (positive X).
 * After applying gate rotation, this direction is transformed to world space.
 * The orientation is used to determine the direction wire entry/exit segments should extend from pin centers.
 * 
 * @param gates - Array of all gate instances in the circuit
 * @param gateId - ID of the gate containing the pin
 * @param pinId - ID of the pin to get orientation for
 * @returns Normalized direction vector in world space, or null if gate/pin not found
 * 
 * @example
 * ```ts
 * const orientation = computePinOrientation(gates, 'gate-1', 'gate-1-out-0')
 * // Returns { x: 1, y: 0, z: 0 } for output pin at 0° rotation
 * const inputOrientation = computePinOrientation(gates, 'gate-1', 'gate-1-in-0')
 * // Returns { x: -1, y: 0, z: 0 } for input pin at 0° rotation
 * ```
 */
function computePinOrientation(
  gates: GateInstance[],
  gateId: string,
  pinId: string
): { x: number; y: number; z: number } | null {
  const gate = gates.find((g) => g.id === gateId)
  if (!gate) return null

  // Check if pin exists (input or output)
  const isInput = gate.inputs.some((p) => p.id === pinId)
  const isOutput = gate.outputs.some((p) => p.id === pinId)
  if (!isInput && !isOutput) return null

  // In local space:
  // - Input pins are on the left side and face left (negative X direction) - wires come TO them
  // - Output pins are on the right side and face right (positive X direction) - wires exit FROM them
  const localDirection = isInput 
    ? new Vector3(-1, 0, 0) // Input pins face left
    : new Vector3(1, 0, 0)  // Output pins face right

  // Apply gate rotation to get world direction
  const euler = new Euler(gate.rotation.x, gate.rotation.y, gate.rotation.z, 'XYZ')
  localDirection.applyEuler(euler)

  return {
    x: localDirection.x,
    y: localDirection.y,
    z: localDirection.z,
  }
}

/**
 * Calculates the world-space position of a pin center.
 * 
 * Accounts for gate position and rotation. Pins are positioned relative to
 * the gate body in local space, then transformed to world space using the
 * gate's position and rotation.
 * 
 * @param gates - Array of all gate instances in the circuit
 * @param gateId - ID of the gate containing the pin
 * @param pinId - ID of the pin to get position for
 * @returns Pin center position in world space, or null if gate/pin not found
 * 
 * @example
 * ```ts
 * const position = computePinWorldPosition(gates, 'gate-1', 'gate-1-out-0')
 * // Returns { x: 0.84, y: 0.2, z: 0 } for output pin at origin with default rotation
 * ```
 */
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
    // Determine input pin X and Y based on gate type
    // Single-input gates (NOT): input at Y=0, X position depends on gate geometry
    // Two-input gates: inputs at Y=0.2 and Y=-0.2, X position is standard
    const isSingleInputGate = gate.type === 'NOT'
    
    let inputPinX: number
    let yOffset: number
    
    if (isSingleInputGate) {
      // NOT gate: triangle left edge is at -0.4, pin is at -0.5 (triangleLeft - pinRadius)
      // Using NOT_DIMENSIONS.triangleLeft = -0.4, PIN_RADIUS = 0.1
      inputPinX = -0.5
      yOffset = 0 // Single input at center (Y=0)
    } else {
      // Two-input gates: standard input pin position
      inputPinX = INPUT_PIN_X // -0.6 (BODY_LEFT - PIN_RADIUS)
      yOffset = inputIndex === 0 ? 0.2 : -0.2 // First input at Y=0.2, second at Y=-0.2
    }
    
    localOffset = new Vector3(inputPinX, yOffset, 0)
  } else if (outputIndex !== -1) {
    // Determine output pin X based on gate type (bubble gates use different position)
    // Gates with bubbles: NAND, NOT
    // Gates without bubbles: AND, OR, XOR
    const hasBubble = gate.type === 'NAND' || gate.type === 'NOT'
    const outputPinX = hasBubble ? OUTPUT_PIN_X_WITH_BUBBLE : OUTPUT_PIN_X_NO_BUBBLE
    localOffset = new Vector3(outputPinX, 0, 0)
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
  getPinOrientation: (gateId: string, pinId: string) => {
    const state = get()
    return computePinOrientation(state.gates, gateId, pinId)
  },
})
