/**
 * Node Actions
 *
 * Actions for managing circuit I/O nodes (input, output).
 * These nodes are essential for HDL-style circuits with chip-level I/O.
 */

import type {
  NodeActions,
  InputNode,
  OutputNode,
  Position,
  CircuitStore,
} from '../../types'
import { calculateNodePinPosition } from '@/nodes/config'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { collectWireSegments, combineAdjacentSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'
import { validateNodeName } from '@/utils/nodeNameValidation'
import type { DestinationType } from '@/utils/wiringScheme/types'
import { preserveJunctions } from '../junctionUtils'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

/**
 * Generate a unique ID for a node.
 *
 * @param prefix - Prefix for the ID (e.g., 'input', 'output')
 * @returns Unique ID string
 */
function generateNodeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create node actions for managing circuit I/O nodes.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @returns NodeActions object
 */
export const createNodeActions = (set: SetState, get: GetState): NodeActions => ({
  addInputNode: (name: string, position: Position, width: number = 1): InputNode => {
    const node: InputNode = {
      id: generateNodeId('input'),
      name,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      value: 1,
      width,
    }

    set((state) => {
      state.inputNodes.push(node)
    }, false, 'addInputNode')

    return node
  },

  addOutputNode: (name: string, position: Position, width: number = 1): OutputNode => {
    const node: OutputNode = {
      id: generateNodeId('output'),
      name,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      value: 0,
      width,
    }

    set((state) => {
      state.outputNodes.push(node)
    }, false, 'addOutputNode')

    return node
  },

  renameInputNode: (nodeId: string, newName: string): void => {
    set((state) => {
      const node = state.inputNodes.find((n) => n.id === nodeId)
      if (!node) return

      const existingNames = state.inputNodes.map((n) => n.name)
      const result = validateNodeName(newName, existingNames, node.name)
      if (!result.ok) return

      node.name = result.normalizedName
    }, false, 'renameInputNode')
  },

  renameOutputNode: (nodeId: string, newName: string): void => {
    set((state) => {
      const node = state.outputNodes.find((n) => n.id === nodeId)
      if (!node) return

      const existingNames = state.outputNodes.map((n) => n.name)
      const result = validateNodeName(newName, existingNames, node.name)
      if (!result.ok) return

      node.name = result.normalizedName
    }, false, 'renameOutputNode')
  },

  removeInputNode: (nodeId: string): void => {
    set((state) => {
      const index = state.inputNodes.findIndex((n) => n.id === nodeId)
      if (index !== -1) {
        state.inputNodes.splice(index, 1)
        // Remove wires connected to this input node
        state.wires = state.wires.filter(
          (w) => !(w.from.type === 'input' && w.from.entityId === nodeId)
        )
        // Clear selection if this node was selected
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null
          state.selectedNodeType = null
        }
      }
    }, false, 'removeInputNode')
  },

  removeOutputNode: (nodeId: string): void => {
    set((state) => {
      const index = state.outputNodes.findIndex((n) => n.id === nodeId)
      if (index !== -1) {
        state.outputNodes.splice(index, 1)
        // Remove wires connected to this output node
        state.wires = state.wires.filter(
          (w) => !(w.to.type === 'output' && w.to.entityId === nodeId)
        )
        // Clear selection if this node was selected
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null
          state.selectedNodeType = null
        }
      }
    }, false, 'removeOutputNode')
  },

  updateInputNodeValue: (nodeId: string, value: number): void => {
    set((state) => {
      const node = state.inputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.value = value
      }
    }, false, 'updateInputNodeValue')
  },

  updateInputNodeWidth: (nodeId: string, width: number): void => {
    set((state) => {
      const node = state.inputNodes.find((n) => n.id === nodeId)
      if (!node) return
      node.width = width
      propagateWidthFrom(state, 'input', nodeId, width)
    }, false, 'updateInputNodeWidth')
  },

  updateOutputNodeWidth: (nodeId: string, width: number): void => {
    set((state) => {
      const node = state.outputNodes.find((n) => n.id === nodeId)
      if (!node) return
      node.width = width
      propagateWidthFrom(state, 'output', nodeId, width)
    }, false, 'updateOutputNodeWidth')
  },

  updateInputNodePosition: (nodeId: string, position: Position): void => {
    set((state) => {
      const node = state.inputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    }, false, 'updateInputNodePosition')
    recalculateWiresForNode(set, get, nodeId, 'input')
  },

  updateOutputNodePosition: (nodeId: string, position: Position): void => {
    set((state) => {
      const node = state.outputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    }, false, 'updateOutputNodePosition')
    recalculateWiresForNode(set, get, nodeId, 'output')
  },
})

/**
 * Endpoint key used by `propagateWidthFrom`'s BFS visited set.
 */
type EndpointKey = `${'input' | 'output' | 'gate' | 'junction' | 'bus'}:${string}`

/**
 * Cascade a width change from a starting entity through every wire it
 * (transitively) reaches.
 *
 * When the user changes a node's width via the Properties Panel, the rest of
 * the circuit it's wired to must follow: wires inherit the new width, gates
 * widen (along with all their pins), and output nodes downstream are
 * brought along. Without this, the simulation engine clamps signals to the
 * stale (width-1) endpoint and the user sees a NOT gate flipping only the
 * least-significant bit.
 *
 * Behaviour:
 *  - BFS across the wire graph, treating gates / junctions / I/O nodes as
 *    nodes and wires as undirected edges.
 *  - Every wire in the connected component is set to `width` (no narrowing
 *    check — the user opted in by editing a node's width).
 *  - Gates have their `width` and all input/output pin widths set.
 *  - Junctions don't carry width but propagate through.
 *
 * Operates on the Immer draft passed by the caller's `set((state) => …)`
 * block — mutations are picked up by Zustand's middleware.
 *
 * @param state - The Immer draft of CircuitStore
 * @param startType - Type of the entity the user edited ('input' | 'output')
 * @param startId - ID of the entity the user edited
 * @param width - Target bit width
 */
function propagateWidthFrom(
  state: CircuitStore,
  startType: 'input' | 'output',
  startId: string,
  width: number,
): void {
  const visited = new Set<EndpointKey>()
  visited.add(`${startType}:${startId}`)

  type Entity = { type: 'input' | 'output' | 'gate' | 'junction'; id: string }
  const queue: Entity[] = [{ type: startType, id: startId }]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const wire of state.wires) {
      const fromMatches = wire.from.type === current.type && wire.from.entityId === current.id
      const toMatches = wire.to.type === current.type && wire.to.entityId === current.id
      if (!fromMatches && !toMatches) continue

      wire.width = width

      const other = fromMatches ? wire.to : wire.from
      const otherKey: EndpointKey = `${other.type}:${other.entityId}`
      if (visited.has(otherKey)) continue
      visited.add(otherKey)

      switch (other.type) {
        case 'input': {
          const n = state.inputNodes.find((x) => x.id === other.entityId)
          if (n) n.width = width
          queue.push({ type: 'input', id: other.entityId })
          break
        }
        case 'output': {
          const n = state.outputNodes.find((x) => x.id === other.entityId)
          if (n) n.width = width
          queue.push({ type: 'output', id: other.entityId })
          break
        }
        case 'gate': {
          const g = state.gates.find((x) => x.id === other.entityId)
          if (g) {
            // PR #107 review (Copilot): mixed-width chips (Mux16,
            // Mux4Way16, Mux8Way16, Or8Way, DMux4Way, DMux8Way) declare
            // non-uniform pin widths in the chip definition. Bulk
            // rewriting every pin to one width during cascade would
            // silently collapse the schema (e.g. set Mux16.sel from 1
            // to the cascade width). Treat the mixed-width chip as a
            // type wall: leave its declared per-pin widths alone and
            // stop the cascade at this gate.
            const widths = new Set<number>()
            for (const p of g.inputs) widths.add(p.width ?? 1)
            for (const p of g.outputs) widths.add(p.width ?? 1)
            const mixedWidthChip = widths.size > 1
            if (!mixedWidthChip) {
              g.width = width
              for (const p of g.inputs) p.width = width
              for (const p of g.outputs) p.width = width
              queue.push({ type: 'gate', id: other.entityId })
            }
          }
          break
        }
        case 'junction': {
          // Junctions don't carry width themselves but signals flow through them.
          queue.push({ type: 'junction', id: other.entityId })
          break
        }
      }
    }
  }
}

/**
 * Recalculate wire segments for all wires connected to a node after it moves.
 * Handles input-to-gate, gate-to-output, and similar wire types.
 *
 * @param get - Zustand get function for current state
 * @param nodeId - The ID of the node that moved
 * @param nodeType - 'input' or 'output'
 */
function recalculateWiresForNode(set: SetState, get: GetState, nodeId: string, nodeType: 'input' | 'output'): void {
  const state = get()
  const { wires, gates } = state
  const getPinWorldPosition = state.getPinWorldPosition
  const getPinOrientation = state.getPinOrientation
  const updateWireSegments = state.updateWireSegments

  const connectedWires = wires.filter((w) => {
    if (nodeType === 'input') {
      return w.from.type === 'input' && w.from.entityId === nodeId
    }
    return w.to.type === 'output' && w.to.entityId === nodeId
  })

  if (connectedWires.length === 0) return

  // Branch wires created from junctions are stored as full source->destination wires
  // with shared trunk segments. Recalculating them directly as normal node wires breaks
  // junction topology, so they are rebuilt in a dedicated junction-aware pass below.
  const branchWireToJunctionId = new Map<string, string>()
  const trunkToBranches = new Map<string, Set<string>>()
  for (const junction of state.junctions) {
    const trunkId = junction.wireIds[0]
    if (trunkId) {
      const branches = new Set(junction.wireIds.slice(1))
      trunkToBranches.set(trunkId, branches)
    }
    for (const branchWireId of junction.wireIds.slice(1)) {
      branchWireToJunctionId.set(branchWireId, junction.id)
    }
  }

  const pinOffset = calculateNodePinPosition(nodeType)

  for (const wire of connectedWires) {
    if (branchWireToJunctionId.has(wire.id)) {
      continue
    }

    try {
      const freshState = get()
      const freshWires = freshState.wires

      const node = nodeType === 'input'
        ? freshState.inputNodes.find(n => n.id === nodeId)
        : freshState.outputNodes.find(n => n.id === nodeId)
      if (!node) continue

      const nodePinPos: Position = {
        x: node.position.x + pinOffset.x,
        y: 0.2,
        z: node.position.z + pinOffset.z,
      }

      const nodeOrientation = { x: nodeType === 'input' ? 1 : -1, y: 0, z: 0 }

      let otherPinPos: Position | null = null
      let otherOrientation: { x: number; y: number; z: number } | null = null

      if (nodeType === 'input') {
        if (wire.to.type === 'gate' && wire.to.pinId) {
          otherPinPos = getPinWorldPosition(wire.to.entityId, wire.to.pinId)
          otherOrientation = getPinOrientation(wire.to.entityId, wire.to.pinId)
        } else if (wire.to.type === 'junction') {
          const junction = freshState.junctions.find(j => j.id === wire.to.entityId)
          if (junction) {
            otherPinPos = { ...junction.position, y: 0.2 }
            otherOrientation = { x: -1, y: 0, z: 0 }
          }
        }
      } else {
        if (wire.from.type === 'gate' && wire.from.pinId) {
          otherPinPos = getPinWorldPosition(wire.from.entityId, wire.from.pinId)
          otherOrientation = getPinOrientation(wire.from.entityId, wire.from.pinId)
        } else if (wire.from.type === 'junction') {
          const junction = freshState.junctions.find(j => j.id === wire.from.entityId)
          if (junction) {
            otherPinPos = { ...junction.position, y: 0.2 }
            otherOrientation = { x: 1, y: 0, z: 0 }
          }
        }
      }

      if (!otherPinPos || !otherOrientation) continue

      const branchesToExclude = trunkToBranches.get(wire.id) ?? new Set<string>()
      const existingSegments = collectWireSegments(freshWires, (w) => w.id !== wire.id && !branchesToExclude.has(w.id))

      let startPin: Position
      let destination: DestinationType
      let startOri: { direction: { x: number; y: number; z: number } }

      if (nodeType === 'input') {
        startPin = nodePinPos
        startOri = { direction: nodeOrientation }
        destination = { type: 'pin', pin: otherPinPos, orientation: { direction: otherOrientation } }
      } else {
        startPin = otherPinPos
        startOri = { direction: otherOrientation }
        destination = { type: 'pin', pin: nodePinPos, orientation: { direction: nodeOrientation } }
      }

      const newPath = calculateWirePath(startPin, destination, startOri, gates, { existingSegments })

      const allOtherWires = freshWires.filter((w) => w.id !== wire.id && !branchesToExclude.has(w.id))
      let resolvedSegments = newPath.segments
      let crossedWireIds: string[] = []

      try {
        const result = resolveCrossings(newPath.segments, allOtherWires)
        resolvedSegments = result.segments
        crossedWireIds = result.crossedWireIds
      } catch {
        // Continue with unresolved segments
      }

      const combinedSegments = combineAdjacentSegments(resolvedSegments)

      // B-003: a re-route that yields an empty/invalid path must NOT overwrite a
      // valid wire — that silently orphans the connection (the wire goes blank
      // and stops following the node). Only commit a non-empty re-route; if the
      // new path is empty, keep the wire's existing segments intact.
      if (combinedSegments.length > 0) {
        updateWireSegments(wire.id, combinedSegments, crossedWireIds)
      } else {
        console.warn(
          `[recalculateWiresForNode] Empty re-route for wire ${wire.id}; preserving existing segments.`,
        )
      }
    } catch (error) {
      // A thrown re-route (e.g. unreachable layout) likewise must not drop the
      // wire — leaving the existing segments in place keeps the connection
      // visible and correct rather than orphaned.
      console.error(`[recalculateWiresForNode] Failed to recalculate wire ${wire.id}; preserving existing segments:`, error) // diagnostic only
    }
  }

  // Track which wires were actually recalculated (excludes skipped branch wires)
  const recalculatedTrunkIds = new Set(
    connectedWires.filter((w) => !branchWireToJunctionId.has(w.id)).map((w) => w.id)
  )

  // Collect junction IDs affected by branch wires whose destination moved
  const skippedBranchJunctionIds = new Set<string>()
  for (const wire of connectedWires) {
    const junctionId = branchWireToJunctionId.get(wire.id)
    if (junctionId) {
      skippedBranchJunctionIds.add(junctionId)
    }
  }

  // Preserve junctions — relocate + rebuild branches for affected junctions
  preserveJunctions(recalculatedTrunkIds, skippedBranchJunctionIds, set, get, 'recalculateWiresForNode')
}
