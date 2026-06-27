import { Vector3, Euler } from 'three'
import type { PinHelpers, Position, CircuitStore, GateInstance, BusComponent } from '../../types'
import { computeChipLayout } from '@/components/scene/chipBodyLayout'
import { computeBusPinLayout } from '@/components/scene/busBodyLayout'
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'

type GetState = () => CircuitStore

/**
 * Calculates the world-space orientation (direction) of a pin.
 *
 * Input pins face left (negative X) in local space; output pins face right
 * (positive X). After applying gate rotation, this direction is transformed
 * to world space. Used to direct wire entry/exit segments away from pin
 * centers along the perpendicular of the chip edge.
 *
 * @param gates - All gate instances in the circuit
 * @param gateId - Gate containing the pin
 * @param pinId - Pin to get orientation for
 * @returns Normalized direction vector in world space, or null if not found
 */
function computePinOrientation(
  gates: GateInstance[],
  gateId: string,
  pinId: string
): { x: number; y: number; z: number } | null {
  const gate = gates.find((g) => g.id === gateId)
  if (!gate) return null

  const isInput = gate.inputs.some((p) => p.id === pinId)
  const isOutput = gate.outputs.some((p) => p.id === pinId)
  if (!isInput && !isOutput) return null

  const localDirection = isInput
    ? new Vector3(-1, 0, 0)
    : new Vector3(1, 0, 0)

  const euler = new Euler(gate.rotation.x, gate.rotation.y, gate.rotation.z, 'XYZ')
  localDirection.applyEuler(euler)

  return {
    x: localDirection.x,
    y: localDirection.y,
    z: localDirection.z,
  }
}

/**
 * Calculates the world-space position of a pin center, reading the pin's
 * local layout from {@link computeChipLayout} — the same function that
 * `ChipBody3D` uses to render the visible pin. Keeping the two paths on a
 * single source of truth prevents wire endpoints from diverging from the
 * rendered pins (which previously caused clicks on a visible pin to wire to
 * a different pin entirely).
 *
 * @param gates - All gate instances in the circuit
 * @param gateId - Gate containing the pin
 * @param pinId - Pin id, e.g. `${gate.id}-in-1`
 * @returns Pin center position in world space, or null if gate/chip/pin
 *   cannot be resolved
 */
function computePinWorldPosition(
  gates: GateInstance[],
  gateId: string,
  pinId: string
): Position | null {
  const gate = gates.find((g) => g.id === gateId)
  if (!gate) return null

  // Source of truth for pin positions is the same layout function used by
  // ChipBody3D. Builtin registry first, then user registry (per createGateInstance).
  const chip =
    getBuiltinChipRegistry().get(gate.chipName) ??
    getUserChipRegistry().get(gate.chipName)
  if (!chip) return null

  const layout = computeChipLayout(chip, gate.id)
  const slot = layout.pinSlots.find((s) => s.pinId === pinId)
  if (!slot) return null

  const localOffset = new Vector3(slot.position[0], slot.position[1], slot.position[2])
  const euler = new Euler(gate.rotation.x, gate.rotation.y, gate.rotation.z, 'XYZ')
  localOffset.applyEuler(euler)

  return {
    x: gate.position.x + localOffset.x,
    y: gate.position.y + localOffset.y,
    z: gate.position.z + localOffset.z,
  }
}

/**
 * World-space position of a bus component's pin, computed from the SAME layout
 * function the renderer uses (computeBusPinLayout) so wire endpoints never
 * diverge from the rendered pins.
 */
function computeBusPinWorldPosition(
  busComponents: BusComponent[],
  entityId: string,
  pinId: string,
): Position | null {
  const component = busComponents.find((c) => c.id === entityId)
  if (!component) return null
  const slot = computeBusPinLayout(component).find((s) => s.pinId === pinId)
  if (!slot) return null
  const localOffset = new Vector3(slot.position[0], slot.position[1], slot.position[2])
  const euler = new Euler(component.rotation.x, component.rotation.y, component.rotation.z, 'XYZ')
  localOffset.applyEuler(euler)
  return {
    x: component.position.x + localOffset.x,
    y: component.position.y + localOffset.y,
    z: component.position.z + localOffset.z,
  }
}

function computeBusPinOrientation(
  busComponents: BusComponent[],
  entityId: string,
  pinId: string,
): { x: number; y: number; z: number } | null {
  const component = busComponents.find((c) => c.id === entityId)
  if (!component) return null
  const slot = computeBusPinLayout(component).find((s) => s.pinId === pinId)
  if (!slot) return null
  const localDirection = slot.side === 'input' ? new Vector3(-1, 0, 0) : new Vector3(1, 0, 0)
  const euler = new Euler(component.rotation.x, component.rotation.y, component.rotation.z, 'XYZ')
  localDirection.applyEuler(euler)
  return { x: localDirection.x, y: localDirection.y, z: localDirection.z }
}

export const createPinHelpers = (get: GetState): PinHelpers => ({
  getPinWorldPosition: (gateId: string, pinId: string) => {
    const state = get()
    return (
      computePinWorldPosition(state.gates, gateId, pinId) ??
      computeBusPinWorldPosition(state.busComponents, gateId, pinId)
    )
  },
  getPinOrientation: (gateId: string, pinId: string) => {
    const state = get()
    return (
      computePinOrientation(state.gates, gateId, pinId) ??
      computeBusPinOrientation(state.busComponents, gateId, pinId)
    )
  },
})
