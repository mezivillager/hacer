// NodeRenderer - Dispatches to the correct node component based on node type
import type { InputNode, OutputNode, JunctionNode } from '@/store/types'
import { InputNode3D, OutputNode3D, JunctionNode3D } from './components'

// Node types that can be rendered
export type RenderableNode =
  | { type: 'input'; node: InputNode }
  | { type: 'output'; node: OutputNode }
  | { type: 'junction'; node: JunctionNode; value: boolean }

interface NodeRendererProps {
  /** The node to render with its type discriminator */
  renderableNode: RenderableNode
  /** Whether the node is selected */
  selected?: boolean
  /** Whether the node's pin is connected */
  isConnected?: boolean
  /** Click handler for the node body */
  onClick?: () => void
  /** Toggle handler for input nodes */
  onToggle?: (nodeId: string) => void
  /** Pin click handler */
  onPinClick?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void
}

/**
 * NodeRenderer dispatches to the correct node component based on the node type.
 * Similar to GateRenderer but for circuit I/O nodes.
 *
 * @param props - Node renderer properties
 * @returns The appropriate node component
 */
export function NodeRenderer({
  renderableNode,
  selected = false,
  isConnected = false,
  onClick,
  onToggle,
  onPinClick,
}: NodeRendererProps) {
  switch (renderableNode.type) {
    case 'input': {
      const { node } = renderableNode
      return (
        <InputNode3D
          id={node.id}
          name={node.name}
          position={node.position}
          rotation={node.rotation}
          value={node.value}
          selected={selected}
          outputConnected={isConnected}
          onClick={onClick}
          onToggle={onToggle ? () => onToggle(node.id) : undefined}
          onPinClick={onPinClick}
        />
      )
    }

    case 'output': {
      const { node } = renderableNode
      return (
        <OutputNode3D
          id={node.id}
          name={node.name}
          position={node.position}
          rotation={node.rotation}
          value={node.value}
          selected={selected}
          inputConnected={isConnected}
          onClick={onClick}
          onPinClick={onPinClick}
        />
      )
    }

    case 'junction': {
      const { node, value } = renderableNode
      return (
        <JunctionNode3D
          id={node.id}
          position={node.position}
          value={value}
          onClick={onClick}
        />
      )
    }

    default:
      // TypeScript exhaustiveness check - cast to never to ensure all cases handled
      return ((_: never) => null)(renderableNode)
  }
}
NodeRenderer.displayName = 'NodeRenderer'
