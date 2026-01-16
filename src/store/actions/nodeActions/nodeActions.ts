/**
 * Node Actions
 *
 * Actions for managing circuit I/O nodes (input, output, constant).
 * These nodes are essential for HDL-style circuits with chip-level I/O.
 */

import type {
  NodeActions,
  InputNode,
  OutputNode,
  ConstantNode,
  Position,
  CircuitStore,
} from '../../types'

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
 * Create node actions for managing circuit I/O nodes.
 *
 * @param set - Zustand set function
 * @param _get - Zustand get function (unused but available for future use)
 * @returns NodeActions object
 */
export const createNodeActions = (set: SetState, _get: GetState): NodeActions => ({
  addInputNode: (name: string, position: Position, width: number = 1): InputNode => {
    const node: InputNode = {
      id: generateNodeId('input'),
      name,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      value: false,
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

  addConstantNode: (value: boolean, position: Position): ConstantNode => {
    const node: ConstantNode = {
      id: generateNodeId('const'),
      value,
      position,
      rotation: { x: 0, y: 0, z: 0 },
    }

    set((state) => {
      state.constantNodes.push(node)
    }, false, 'addConstantNode')

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

  removeConstantNode: (nodeId: string): void => {
    set((state) => {
      const index = state.constantNodes.findIndex((n) => n.id === nodeId)
      if (index !== -1) {
        state.constantNodes.splice(index, 1)
        // Remove wires connected to this constant node
        state.wires = state.wires.filter(
          (w) => !(w.from.type === 'constant' && w.from.entityId === nodeId)
        )
        // Clear selection if this node was selected
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null
          state.selectedNodeType = null
        }
      }
    }, false, 'removeConstantNode')
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
  },

  updateOutputNodePosition: (nodeId: string, position: Position): void => {
    set((state) => {
      const node = state.outputNodes.find((n) => n.id === nodeId)
      if (node) {
        node.position = position
      }
    }, false, 'updateOutputNodePosition')
  },
})
