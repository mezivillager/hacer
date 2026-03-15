/**
 * Junction Utilities
 *
 * Shared helpers for junction relocation and branch wire rebuilding.
 * Used by both gateActions (recalculateWiresForGate) and
 * nodeActions (recalculateWiresForNode) to keep logic DRY.
 */

import type { Position, CircuitStore, JunctionNode } from '../types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { collectWireSegments, combineAdjacentSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'
import { findWireCorners, getSegmentsUpToPosition } from '@/utils/wirePosition'

type GetState = () => CircuitStore

/**
 * Relocate junctions whose trunk wire was recalculated.
 *
 * For each affected junction:
 *  1. Find corners on its trunk wire.
 *  2. If the junction's original position is still a valid corner, keep it.
 *  3. Otherwise, pick the corner nearest to branch-wire destinations
 *     (so the junction stays close to where branches fan out).
 *  4. If no corners exist, schedule the junction for removal.
 *
 * @returns Object containing junction position updates and junction IDs to remove.
 */
export function computeJunctionRelocations(
  recalculatedWireIds: Set<string>,
  get: GetState,
  getPinWorldPosition: (gateId: string, pinId: string) => Position | null
): {
  updates: { id: string; position: Position }[]
  removals: string[]
} {
  const state = get()
  const updates: { id: string; position: Position }[] = []
  const removals: string[] = []

  for (const junction of state.junctions) {
    const trunkWireId = junction.wireIds[0]
    if (!trunkWireId || !recalculatedWireIds.has(trunkWireId)) {
      continue
    }

    const trunkWire = state.wires.find((w) => w.id === trunkWireId)
    if (!trunkWire) {
      continue
    }

    const corners = findWireCorners(trunkWire)
    if (corners.length === 0) {
      removals.push(junction.id)
      continue
    }

    const originalStillValid = corners.some(
      (c) => Math.abs(c.x - junction.position.x) < 0.01 && Math.abs(c.z - junction.position.z) < 0.01
    )

    if (originalStillValid) {
      continue
    }

    // Pick the corner closest to branch-wire destinations
    const branchDestinations: Position[] = []
    for (const branchWireId of junction.wireIds.slice(1)) {
      const branchWire = state.wires.find((w) => w.id === branchWireId)
      if (!branchWire) continue
      if (branchWire.to.type === 'gate' && branchWire.to.pinId) {
        const pin = getPinWorldPosition(branchWire.to.entityId, branchWire.to.pinId)
        if (pin) branchDestinations.push(pin)
      } else if (branchWire.to.type === 'output') {
        const outputNode = state.outputNodes.find((n) => n.id === branchWire.to.entityId)
        if (outputNode) branchDestinations.push(outputNode.position)
      }
    }

    let bestCorner = corners[0]
    let bestScore = Infinity
    for (const corner of corners) {
      let totalDist = 0
      if (branchDestinations.length > 0) {
        for (const dest of branchDestinations) {
          const dx = corner.x - dest.x
          const dz = corner.z - dest.z
          totalDist += Math.sqrt(dx * dx + dz * dz)
        }
      } else {
        const dx = corner.x - junction.position.x
        const dz = corner.z - junction.position.z
        totalDist = Math.sqrt(dx * dx + dz * dz)
      }
      if (totalDist < bestScore) {
        bestScore = totalDist
        bestCorner = corner
      }
    }

    updates.push({ id: junction.id, position: bestCorner })
  }

  return { updates, removals }
}

/**
 * Apply computed junction relocations to the store.
 *
 * @param updates - Junction position updates to apply
 * @param removals - Junction IDs to remove
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param actionLabel - Label for the store action (for devtools)
 */
export function applyJunctionRelocations(
  updates: { id: string; position: Position }[],
  removals: string[],
  set: (fn: (state: CircuitStore) => void, replace?: false, actionName?: string) => void,
  get: GetState,
  actionLabel: string
): void {
  for (const junctionId of removals) {
    get().removeJunction(junctionId)
  }

  if (updates.length > 0) {
    set((state) => {
      for (const update of updates) {
        const j = state.junctions.find((jn) => jn.id === update.id)
        if (j) {
          j.position = update.position
        }
      }
    }, false, `${actionLabel}/relocateJunctions`)
  }
}

/**
 * Rebuild all branch wires for a junction using shared trunk segments.
 * Routes each branch wire from junction position to its destination, then
 * combines shared + branch segments.
 */
export function rebuildBranchWires(
  junction: JunctionNode,
  sharedSegments: WireSegment[],
  get: GetState,
  updateWireSegments: (wireId: string, segments: WireSegment[], crossedWireIds?: string[]) => void
): void {
  for (const branchWireId of junction.wireIds.slice(1)) {
    try {
      const branchState = get()
      const branchWire = branchState.wires.find((w) => w.id === branchWireId)
      if (!branchWire) continue

      let destinationPin: Position | null = null
      let destinationOrientation: { x: number; y: number; z: number } | null = null

      if (branchWire.to.type === 'gate' && branchWire.to.pinId) {
        destinationPin = branchState.getPinWorldPosition(branchWire.to.entityId, branchWire.to.pinId)
        destinationOrientation = branchState.getPinOrientation(branchWire.to.entityId, branchWire.to.pinId)
      } else if (branchWire.to.type === 'output') {
        const outputNode = branchState.outputNodes.find((n) => n.id === branchWire.to.entityId)
        if (outputNode) {
          const offset = calculateNodePinPosition('output')
          destinationPin = {
            x: outputNode.position.x + offset.x,
            y: 0.2,
            z: outputNode.position.z + offset.z,
          }
          destinationOrientation = { x: -1, y: 0, z: 0 }
        }
      }

      if (!destinationPin || !destinationOrientation) continue

      const dx = destinationPin.x - junction.position.x
      const dz = destinationPin.z - junction.position.z
      const startDirection =
        Math.abs(dx) >= Math.abs(dz)
          ? { x: dx >= 0 ? 1 : -1, y: 0, z: 0 }
          : { x: 0, y: 0, z: dz >= 0 ? 1 : -1 }

      const existingSegments = collectWireSegments(branchState.wires, (w) => w.id !== branchWire.id)
      let branchPath
      try {
        branchPath = calculateWirePath(
          junction.position,
          { type: 'pin', pin: destinationPin, orientation: { direction: destinationOrientation } },
          { direction: startDirection },
          branchState.gates,
          { existingSegments }
        )
      } catch {
        branchPath = calculateWirePath(
          junction.position,
          { type: 'pin', pin: destinationPin, orientation: { direction: destinationOrientation } },
          { direction: startDirection },
          branchState.gates
        )
      }

      // Exclude all wires sharing this junction (trunk + sibling branches) from crossing
      // resolution — they intentionally meet at the junction point, not cross over it.
      const junctionWireIdSet = new Set(junction.wireIds)
      const allOtherWires = branchState.wires.filter((w) => !junctionWireIdSet.has(w.id))
      let resolvedBranchSegments = branchPath.segments
      let crossedWireIds: string[] = []
      try {
        const result = resolveCrossings(branchPath.segments, allOtherWires)
        resolvedBranchSegments = result.segments
        crossedWireIds = result.crossedWireIds
      } catch {
        // Keep unresolved segments
      }

      const combinedBranch = combineAdjacentSegments(resolvedBranchSegments)
      const finalSegments = [...sharedSegments, ...combinedBranch]
      updateWireSegments(branchWire.id, finalSegments, crossedWireIds)
    } catch (error) {
      console.error(`[rebuildBranchWires] Failed to rebuild branch wire ${branchWireId}:`, error)
    }
  }
}

/**
 * Full junction preservation pipeline:
 *  1. Compute which junctions need relocation
 *  2. Apply relocations (update positions / remove)
 *  3. Rebuild branch wires for affected junctions
 *
 * @param recalculatedWireIds - Set of wire IDs whose paths were just recalculated
 * @param affectedJunctionIds - Optional set of additional junction IDs that need branch rebuilds
 *   (e.g. junctions whose branch-wire destination moved, even if trunk wasn't recalculated)
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param actionLabel - Label for the store action (for devtools)
 */
export function preserveJunctions(
  recalculatedWireIds: Set<string>,
  affectedJunctionIds: Set<string> | null,
  set: (fn: (state: CircuitStore) => void, replace?: false, actionName?: string) => void,
  get: GetState,
  actionLabel: string
): void {
  const getPinWorldPosition = get().getPinWorldPosition
  const updateWireSegments = get().updateWireSegments

  // Phase 1: Relocate junctions on recalculated trunk wires
  const { updates, removals } = computeJunctionRelocations(recalculatedWireIds, get, getPinWorldPosition)
  applyJunctionRelocations(updates, removals, set, get, actionLabel)

  // Phase 2: Rebuild branch wires for all affected junctions
  const allAffectedIds = new Set<string>()

  // Junctions whose trunk was recalculated
  for (const junction of get().junctions) {
    const trunkWireId = junction.wireIds[0]
    if (trunkWireId && recalculatedWireIds.has(trunkWireId)) {
      allAffectedIds.add(junction.id)
    }
  }

  // Additional junctions (e.g. branch destination moved)
  if (affectedJunctionIds) {
    for (const id of affectedJunctionIds) {
      allAffectedIds.add(id)
    }
  }

  for (const junction of get().junctions) {
    if (!allAffectedIds.has(junction.id)) {
      continue
    }

    const trunkWireId = junction.wireIds[0]
    if (!trunkWireId) continue
    if (junction.wireIds.length <= 1) continue

    const liveState = get()
    const trunkWire = liveState.wires.find((w) => w.id === trunkWireId)
    if (!trunkWire) continue

    const sharedSegments = getSegmentsUpToPosition(trunkWire.segments, junction.position)
    if (sharedSegments.length === 0) continue

    rebuildBranchWires(junction, sharedSegments, get, updateWireSegments)
  }
}
