import type { WireActions, Wire, WireEndpoint, CircuitStore, GateInstance } from '../../types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { removeOrphanedArcs } from '@/utils/wiringScheme/crossing'

/**
 * A chip is "mixed-width" if its pins (as currently materialised on the
 * gate instance) have non-uniform widths. `createGateInstance` writes pin
 * widths from the chip definition, so this reflects the declared schema —
 * e.g. Mux16 has 16-bit `a/b/out` and a 1-bit `sel`.
 *
 * The legacy gate-widening path (`inferGateWidening` below + the bulk pin
 * overwrite in `addWire`) was designed for homogeneous-width primitives
 * like Not / And / Or where rewriting every pin to one width is a no-op
 * for the chip schema. For mixed-width chips, bulk rewriting silently
 * collapses the schema (e.g. would set Mux16.sel.width to 16), so this
 * helper guards the bulk write.
 */
function isMixedWidthChip(gate: GateInstance): boolean {
  const widths = new Set<number>()
  for (const p of gate.inputs) widths.add(p.width ?? 1)
  for (const p of gate.outputs) widths.add(p.width ?? 1)
  return widths.size > 1
}

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

type GetState = () => CircuitStore

function getEndpointWidth(endpoint: WireEndpoint, state: CircuitStore): number {
  switch (endpoint.type) {
    case 'input': {
      const node = state.inputNodes.find((n) => n.id === endpoint.entityId)
      return node?.width ?? 1
    }
    case 'output': {
      const node = state.outputNodes.find((n) => n.id === endpoint.entityId)
      return node?.width ?? 1
    }
    case 'gate': {
      const gate = state.gates.find((g) => g.id === endpoint.entityId)
      const pin =
        gate?.inputs.find((p) => p.id === endpoint.pinId) ??
        gate?.outputs.find((p) => p.id === endpoint.pinId)
      return pin?.width ?? 1
    }
    case 'bus': {
      const component = state.busComponents.find((c) => c.id === endpoint.entityId)
      const pin =
        component?.inputs.find((p) => p.id === endpoint.pinId) ??
        component?.outputs.find((p) => p.id === endpoint.pinId)
      return pin?.width ?? 1
    }
    case 'junction':
    default:
      return 1
  }
}

function inferGateWidening(
  endpoint: WireEndpoint,
  otherWidth: number,
  state: CircuitStore
): number | null {
  if (endpoint.type !== 'gate') return null
  const gate = state.gates.find((g) => g.id === endpoint.entityId)
  if (!gate) return null
  // PR #107 review (Copilot): the bulk-widen path (in `addWire` below)
  // rewrites *every* pin to one width. For mixed-width chips (Mux16,
  // Mux4Way16, Mux8Way16, Or8Way, DMux4Way, DMux8Way) the chip definition
  // intentionally declares non-uniform pin widths and the bulk write
  // silently corrupts that schema (e.g. setting Mux16.sel from 1 to 16).
  // The per-pin widths set by `createGateInstance` are the source of
  // truth for these chips; widening is a no-op so the bulk overwrite
  // never fires for them. The width check below (which we still want for
  // homogeneous chips) is also skipped — per-pin width compatibility is
  // already enforced by `getEndpointWidth` reading from the specific pin.
  if (isMixedWidthChip(gate)) return null
  if (gate.width === 1 && otherWidth > 1) return otherWidth
  if (gate.width !== otherWidth) {
    throw new Error(
      `Gate width mismatch: gate ${gate.id} is ${gate.width} bits, wire is ${otherWidth} bits`
    )
  }
  return null
}

export const createWireActions = (set: SetState, get: GetState): WireActions => ({
  addWire: (
    from: WireEndpoint,
    to: WireEndpoint,
    segments: WireSegment[],
    crossesWireIds: string[] = [],
    signalId?: string,
    explicitWidth?: number
  ) => {
    const state = get()
    let sourceWidth = getEndpointWidth(from, state)
    let destWidth = getEndpointWidth(to, state)

    if (from.type === 'input' && to.type === 'output' && sourceWidth !== destWidth) {
      throw new Error(
        `Direct input-to-output pass-through requires matching widths (source=${sourceWidth}, destination=${destWidth})`
      )
    }

    // Gate width inference. If either endpoint is a default-width-1 gate and the
    // other side has width > 1, widen the gate. If the gate already has width > 1
    // and the new wire's width disagrees, throw (matches web-ide's no-silent-narrowing rule).
    const widenFromGateTo = inferGateWidening(from, destWidth, state)
    const widenToGateTo = inferGateWidening(to, sourceWidth, state)
    if (widenFromGateTo != null) sourceWidth = widenFromGateTo
    if (widenToGateTo != null) destWidth = widenToGateTo

    const width = explicitWidth ?? Math.min(sourceWidth, destWidth)

    const wire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      from,
      to,
      segments,
      crossesWireIds,
      width,
      ...(signalId && { signalId }),
    }
    set((state) => {
      if (widenFromGateTo != null && from.type === 'gate') {
        const gate = state.gates.find((g) => g.id === from.entityId)
        if (gate) {
          gate.width = widenFromGateTo
          for (const p of gate.inputs) p.width = widenFromGateTo
          for (const p of gate.outputs) p.width = widenFromGateTo
        }
      }
      if (widenToGateTo != null && to.type === 'gate') {
        const gate = state.gates.find((g) => g.id === to.entityId)
        if (gate) {
          gate.width = widenToGateTo
          for (const p of gate.inputs) p.width = widenToGateTo
          for (const p of gate.outputs) p.width = widenToGateTo
        }
      }
      state.wires.push(wire)
    }, false, 'addWire')
    return wire
  },

  removeWire: (wireId: string) => {
    // Find wires that cross over the removed wire (they have arcs that may become orphaned)
    const state = get()

    // Check if active wiring references this wire
    // If wiring from junction, the originalWireId might reference this wire
    if (state.wiringFrom?.destination?.type === 'junction' && state.wiringFrom.destination.originalWireId === wireId) {
      // Cancel active wiring since the wire being deleted is the original wire for junction wiring
      set((state) => {
        state.wiringFrom = null
      }, false, 'removeWire/cancelWiring')
    }

    // Find wires that have arcs hopping over the wire being removed
    // These wires have the removed wire's ID in their crossesWireIds
    const affectedWireIds = state.wires
      .filter((w) => (w.crossesWireIds ?? []).includes(wireId))
      .map((w) => w.id)

    // Remove the wire
    set((state) => {
      const index = state.wires.findIndex((w) => w.id === wireId)
      if (index !== -1) {
        state.wires.splice(index, 1)
      }

      // Remove wire ID from all junctions
      for (const junction of state.junctions) {
        const wireIndex = junction.wireIds.indexOf(wireId)
        if (wireIndex !== -1) {
          junction.wireIds.splice(wireIndex, 1)
        }
      }

      // Remove junctions that now have only 0 or 1 wire passing through them
      // (Junctions are only needed when multiple wires pass through them)
      for (let i = state.junctions.length - 1; i >= 0; i--) {
        const junction = state.junctions[i]
        if (junction.wireIds.length <= 1) {
          state.junctions.splice(i, 1)
        }
      }
    }, false, 'removeWire')

    // Update affected wires that crossed over the removed wire
    if (affectedWireIds.length > 0) {
      const updatedState = get()

      // For each affected wire, remove orphaned arcs using direct ID matching
      for (const affectedWireId of affectedWireIds) {
        const affectedWire = updatedState.wires.find((w) => w.id === affectedWireId)
        if (!affectedWire || !affectedWire.segments) {
          continue
        }

        // Simplified - just pass the removed wire ID for direct matching
        const updatedSegments = removeOrphanedArcs(affectedWire.segments, wireId)

        if (updatedSegments !== null) {
          // Recalculate crossesWireIds from remaining arcs
          const remainingCrossedIds = updatedSegments
            .filter((s) => s.type === 'arc' && s.crossedWireId)
            .map((s) => s.crossedWireId!)

          set((state) => {
            const wire = state.wires.find((w) => w.id === affectedWireId)
            if (wire) {
              wire.segments = updatedSegments
              wire.crossesWireIds = remainingCrossedIds
            }
          }, false, 'removeWire/updateAffectedWire')
        } else {
          // No segments changed, but still need to remove the deleted wire from crossesWireIds
          set((state) => {
            const wire = state.wires.find((w) => w.id === affectedWireId)
            if (wire) {
              wire.crossesWireIds = (wire.crossesWireIds ?? []).filter((id) => id !== wireId)
            }
          }, false, 'removeWire/updateCrossesWireIds')
        }
      }
    }
  },

  setInputValue: (gateId: string, pinId: string, value: number) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        const pin = gate.inputs.find((p) => p.id === pinId)
        if (pin) {
          pin.value = value
        }
      }
    }, false, 'setInputValue')
  },

  updateWireSegments: (wireId: string, segments: WireSegment[], crossesWireIds?: string[]) => {
    set((state) => {
      const wire = state.wires.find((w) => w.id === wireId)
      if (wire) {
        wire.segments = segments
        if (crossesWireIds !== undefined) {
          wire.crossesWireIds = crossesWireIds
        }
      }
    }, false, 'updateWireSegments')
  },
})
