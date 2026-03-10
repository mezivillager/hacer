// Node configuration - dimensions, colors, and geometry for circuit I/O nodes
import { colors } from '@/theme'

/**
 * Common node dimensions used across all node types.
 * Nodes are smaller than gates since they represent simple I/O points.
 */
export const NODE_DIMENSIONS = {
  BODY_WIDTH: 0.5,
  BODY_HEIGHT: 0.5,
  BODY_DEPTH: 0.5,
  PIN_RADIUS: 0.1,
  JUNCTION_RADIUS: 0.08,
  WIRE_STUB_OFFSET: 0.15,
} as const

/**
 * Node colors for different node types.
 * Uses theme colors where available, with custom colors for nodes.
 */
export const NODE_COLORS = {
  input: {
    bodyOn: '#2ecc71',
    bodyOff: '#e74c3c',
    hoverOn: '#27ae60',
    hoverOff: '#c0392b',
    selected: colors.gate.bodySelected,
  },
  output: {
    body: '#6a5a4a', // Warm brown for outputs
    hover: '#7a6a5a',
    selected: colors.gate.bodySelected,
  },
  junction: colors.wire.default, // Same as wire color for visual continuity
} as const

/**
 * Input node configuration.
 * Input nodes have a single output pin on the right side.
 */
export const INPUT_NODE_CONFIG = {
  text: {
    fontSize: 0.18,
    position: [0, 0, -NODE_DIMENSIONS.BODY_DEPTH / 2 - 0.01] as [number, number, number],
  },
  geometry: {
    args: [
      NODE_DIMENSIONS.BODY_WIDTH,
      NODE_DIMENSIONS.BODY_HEIGHT,
      NODE_DIMENSIONS.BODY_DEPTH,
    ] as [number, number, number],
  },
} as const

/**
 * Output node configuration.
 * Output nodes have a single input pin on the left side.
 */
export const OUTPUT_NODE_CONFIG = {
  text: {
    fontSize: 0.18,
    position: [0, 0, -NODE_DIMENSIONS.BODY_DEPTH / 2 - 0.01] as [number, number, number],
  },
  geometry: {
    args: [
      NODE_DIMENSIONS.BODY_WIDTH,
      NODE_DIMENSIONS.BODY_HEIGHT,
      NODE_DIMENSIONS.BODY_DEPTH,
    ] as [number, number, number],
  },
} as const

/**
 * Constant node configuration.
 * Constant nodes are smaller and display "1" or "0".
 */
export const CONSTANT_NODE_CONFIG = {
  text: {
    fontSize: 0.22,
    position: [0, 0, -NODE_DIMENSIONS.BODY_DEPTH / 2 - 0.01] as [number, number, number],
  },
  geometry: {
    args: [
      NODE_DIMENSIONS.BODY_WIDTH * 0.6, // Smaller width
      NODE_DIMENSIONS.BODY_HEIGHT * 0.8,
      NODE_DIMENSIONS.BODY_DEPTH,
    ] as [number, number, number],
  },
} as const

/**
 * Junction node configuration.
 * Junctions are simple spheres that represent wire branch points.
 */
export const JUNCTION_CONFIG = {
  radius: NODE_DIMENSIONS.JUNCTION_RADIUS,
  segments: 16,
} as const

/**
 * Calculates the pin position for a node based on its type.
 * - Input nodes have an output pin on the right
 * - Output nodes have an input pin on the left
 *
 * @param nodeType - Type of node ('input' or 'output')
 * @returns The 3D position of the pin relative to node center
 */
export function calculateNodePinPosition(
  nodeType: 'input' | 'output'
): { x: number; y: number; z: number } {
  const bodyHalfWidth = NODE_DIMENSIONS.BODY_WIDTH / 2
  const pinOffset = bodyHalfWidth + NODE_DIMENSIONS.PIN_RADIUS

  if (nodeType === 'output') {
    // Output node has input pin on left
    return { x: -pinOffset, y: 0, z: 0 }
  }

  // Input nodes have output pin on right
  return { x: pinOffset, y: 0, z: 0 }
}
