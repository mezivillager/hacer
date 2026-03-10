/**
 * Node Placement Actions
 *
 * Actions for placing circuit I/O nodes (input, output) on the canvas.
 * Similar to gate placement but for HDL-style circuit nodes.
 */

import type {
  NodePlacementActions,
  NodePlacementType,
  NodeType,
  Position,
  CircuitStore,
} from '../../types'
import { snapToGrid } from '@/utils/grid'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

/**
 * Generate a unique ID for a node.
 *
 * @param prefix - Prefix for the ID (e.g., 'input', 'output', 'const')
 * @returns Unique ID string
 */
function generateNodeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Generate a default name for an input or output node.
 *
 * @param existingNodes - Array of existing nodes to check for name conflicts
 * @param prefix - Prefix for the name (e.g., 'in', 'out')
 * @returns Unique name string
 */
function generateNodeName(
  existingNodes: Array<{ name: string }>,
  prefix: string
): string {
  const existingNames = new Set(existingNodes.map((n) => n.name))
  let index = existingNodes.length
  let name = `${prefix}${index}`
  while (existingNames.has(name)) {
    index++
    name = `${prefix}${index}`
  }
  return name
}

/**
 * Create node placement actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @returns NodePlacementActions object
 */
export const createNodePlacementActions = (
  set: SetState,
  get: GetState
): NodePlacementActions => ({
  startNodePlacement: (type: NodePlacementType) => {
    set((state) => {
      state.nodePlacementMode = type
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.selectedGateId = null
      // Cancel gate placement if active
      state.placementMode = null
    }, false, 'startNodePlacement')
  },

  cancelNodePlacement: () => {
    set((state) => {
      state.nodePlacementMode = null
      state.placementPreviewPosition = null
    }, false, 'cancelNodePlacement')
  },

  placeNode: (position: Position) => {
    const currentState = get()
    const mode = currentState.nodePlacementMode
    if (!mode) return

    // Snap position to grid
    const snappedPosition = snapToGrid(position)

    let nodeId: string | null = null
    let nodeType: NodeType | null = null

    set((state) => {
      switch (mode) {
        case 'INPUT': {
          const name = generateNodeName(state.inputNodes, 'in')
          const id = generateNodeId('input')
          state.inputNodes.push({
            id,
            name,
            position: snappedPosition,
            rotation: { x: 0, y: 0, z: 0 },
            value: true,
            width: 1,
          })
          nodeId = id
          nodeType = 'input'
          break
        }
        case 'OUTPUT': {
          const name = generateNodeName(state.outputNodes, 'out')
          const id = generateNodeId('output')
          state.outputNodes.push({
            id,
            name,
            position: snappedPosition,
            rotation: { x: 0, y: 0, z: 0 },
            value: false,
            width: 1,
          })
          nodeId = id
          nodeType = 'output'
          break
        }
      }

      // Clear placement mode and select the new node
      state.nodePlacementMode = null
      state.placementPreviewPosition = null
      state.selectedNodeId = nodeId
      state.selectedNodeType = nodeType
      state.selectedGateId = null
      state.selectedWireId = null
    }, false, 'placeNode')
  },

  selectNode: (nodeId: string, nodeType: NodeType) => {
    set((state) => {
      state.selectedNodeId = nodeId
      state.selectedNodeType = nodeType
      state.selectedGateId = null
      state.selectedWireId = null
    }, false, 'selectNode')
  },

  deselectNode: () => {
    set((state) => {
      state.selectedNodeId = null
      state.selectedNodeType = null
    }, false, 'deselectNode')
  },
})
