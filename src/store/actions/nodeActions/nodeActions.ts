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
import type { DestinationType } from '@/utils/wiringScheme/types'

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
      value: true,
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
      value: false,
      width,
    }

    set((state) => {
      state.outputNodes.push(node)
    }, false, 'addOutputNode')

    return node
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

  updateInputNodeValue: (nodeId: string, value: boolean): void => {
    set((state) => {
      const node = state.inputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.value = value
      }
    }, false, 'updateInputNodeValue')
  },

  updateInputNodePosition: (nodeId: string, position: Position): void => {
    set((state) => {
      const node = state.inputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    }, false, 'updateInputNodePosition')
    recalculateWiresForNode(get, nodeId, 'input')
  },

  updateOutputNodePosition: (nodeId: string, position: Position): void => {
    set((state) => {
      const node = state.outputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    }, false, 'updateOutputNodePosition')
    recalculateWiresForNode(get, nodeId, 'output')
  },
})

/**
 * Recalculate wire segments for all wires connected to a node after it moves.
 * Handles input-to-gate, gate-to-output, and similar wire types.
 *
 * @param get - Zustand get function for current state
 * @param nodeId - The ID of the node that moved
 * @param nodeType - 'input' or 'output'
 */
function recalculateWiresForNode(get: GetState, nodeId: string, nodeType: 'input' | 'output'): void {
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

  const pinOffset = calculateNodePinPosition(nodeType)

  for (const wire of connectedWires) {
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
            otherOrientation = { x: -1, y: 0, z: 0 } // junction as destination, wire arrives from left
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
            otherOrientation = { x: 1, y: 0, z: 0 } // junction as source, wire leaves to right
          }
        }
      }

      if (!otherPinPos || !otherOrientation) continue

      const existingSegments = collectWireSegments(freshWires, (w) => w.id !== wire.id)

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

      const allOtherWires = freshWires.filter((w) => w.id !== wire.id)
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
      updateWireSegments(wire.id, combinedSegments, crossedWireIds)
    } catch (error) {
      console.error(`[recalculateWiresForNode] Failed to recalculate wire ${wire.id}:`, error)
    }
  }
}
