import { Layout, Typography } from 'antd'
import { Scene } from './Scene'
import { GateRenderer } from '@/gates'
import { NodeRenderer } from '@/nodes'
import { Wire3D } from './Wire3D'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'
import { handlePinClick, handleInputToggle, handleGateClick, handleInputNodeToggle, handleNodeClick, handleNodePinClick } from './handlers/canvasHandlers'
import { getSignalSourceValue } from '@/store/actions/simulationActions/simulationActions'

const { Content } = Layout
const { Text } = Typography

// Get actions once - these are stable references that don't change
const { getPinWorldPosition } = circuitActions

export function CanvasArea() {
  // Use individual selectors - Zustand's shallow comparison works better with individual subscriptions
  // For arrays, we need to be careful - but individual selectors are more stable
  const gates = useCircuitStore((s) => s.gates)
  const wires = useCircuitStore((s) => s.wires) // Subscribe to wires to trigger re-render when wires change
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const placementPreviewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const isDragActive = useCircuitStore((s) => s.isDragActive)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  // Note: selectedGateId is read via getState() in isDragInvalid calculation to avoid subscription

  // HDL support: Subscribe to circuit I/O nodes
  const inputNodes = useCircuitStore((s) => s.inputNodes)
  const outputNodes = useCircuitStore((s) => s.outputNodes)
  const constantNodes = useCircuitStore((s) => s.constantNodes)
  const junctions = useCircuitStore((s) => s.junctions)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)

  // Create a reactive isPinConnected function that will trigger re-renders when wires change
  // This ensures gates re-render when their pin connection status changes
  const isPinConnectedReactive = (gateId: string, pinId: string): boolean => {
    return wires.some(
      w =>
        (w.from.type === 'gate' && w.from.entityId === gateId && w.from.pinId === pinId) ||
        (w.to.type === 'gate' && w.to.entityId === gateId && w.to.pinId === pinId)
    )
  }

  // Track renders with reason
  const nodeCount = inputNodes.length + outputNodes.length + constantNodes.length + junctions.length
  trackRender('CanvasArea', `gates:${gates.length},wires:${wires.length},nodes:${nodeCount},placing:${!!placementMode},wiring:${!!wiringFrom}`)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null
  const isDragging = isDragActive && placementPreviewPosition !== null && placementMode === null

  // Check if current preview position is invalid for placement
  const isPlacementInvalid = isPlacing && placementPreviewPosition !== null && (() => {
    const gridPos = worldToGrid(placementPreviewPosition)
    return !canPlaceGateAt(
      gridPos,
      gates,
      undefined,
      wires,
      circuitActions.getPinWorldPosition,
      circuitActions.getPinOrientation
    )
  })()

  // Check if current drag position is invalid
  // Use getState() to read selectedGateId only when needed to avoid subscription
  const isDragInvalid = isDragging && placementPreviewPosition !== null && (() => {
    // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
    const currentSelectedGateId = useCircuitStore.getState().selectedGateId
    if (!currentSelectedGateId) return false
    const gridPos = worldToGrid(placementPreviewPosition)
    const otherGates = gates.filter(g => g.id !== currentSelectedGateId)
    return !canPlaceGateAt(
      gridPos,
      otherGates,
      currentSelectedGateId,
      wires,
      circuitActions.getPinWorldPosition,
      circuitActions.getPinOrientation
    )
  })()

  // Help text based on current mode
  const helpText = (() => {
    if (isPlacing) {
      return `📍 Click anywhere on the grid to place the ${placementMode} gate • Press Esc to cancel`
    }
    if (isWiring) {
      return '🔗 Click on another pin to connect • Click empty space or Esc to cancel'
    }
    return '🖱️ Click pin: Wire • Shift+click input: Toggle • Click body: Select gate • Click wire: Select wire • Drag body: Move • Left/Right arrows: Rotate gate (when selected) or pan view (when none selected) • Delete: Remove selected gate/wire • Scroll: Zoom'
  })()

  return (
    <Content className={`app-content ${isPlacing ? 'placing' : ''} ${isPlacing && isPlacementInvalid ? 'placing-invalid' : ''} ${isWiring ? 'wiring' : ''} ${isDragActive ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''}`}>
      <Scene>
        {/* Render all wires using unified Wire3D */}
        {wires.map((wire) => {
          // Get signal value based on source endpoint type
          const signalValue = getSignalSourceValue(wire.from, useCircuitStore.getState())

          // Build precomputed path from stored segments
          const path = {
            segments: wire.segments,
            totalLength: wire.segments.reduce((sum: number, seg) => {
              const dx = seg.end.x - seg.start.x
              const dy = seg.end.y - seg.start.y
              const dz = seg.end.z - seg.start.z
              return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
            }, 0),
          }

          // Get start/end positions based on endpoint types
          let startPos = null
          let endPos = null

          if (wire.from.type === 'gate' && wire.from.pinId) {
            startPos = getPinWorldPosition(wire.from.entityId, wire.from.pinId)
          } else if (wire.from.type === 'input') {
            const inputNode = inputNodes.find(n => n.id === wire.from.entityId)
            if (inputNode) startPos = { x: inputNode.position.x + 0.5, y: 0.2, z: inputNode.position.z }
          } else if (wire.from.type === 'constant') {
            const constNode = constantNodes.find(n => n.id === wire.from.entityId)
            if (constNode) startPos = { x: constNode.position.x + 0.5, y: 0.2, z: constNode.position.z }
          } else if (wire.from.type === 'junction') {
            const junction = junctions.find(j => j.id === wire.from.entityId)
            if (junction) startPos = { ...junction.position, y: 0.2 }
          }

          if (wire.to.type === 'gate' && wire.to.pinId) {
            endPos = getPinWorldPosition(wire.to.entityId, wire.to.pinId)
          } else if (wire.to.type === 'output') {
            const outputNode = outputNodes.find(n => n.id === wire.to.entityId)
            if (outputNode) endPos = { x: outputNode.position.x - 0.5, y: 0.2, z: outputNode.position.z }
          } else if (wire.to.type === 'junction') {
            const junction = junctions.find(j => j.id === wire.to.entityId)
            if (junction) endPos = { ...junction.position, y: 0.2 }
          }

          return (
            <Wire3D
              key={wire.id}
              start={startPos}
              end={endPos}
              precomputedPath={path}
              isActive={signalValue}
              isSelected={wire.id === selectedWireId}
            />
          )
        })}

        {/* Render all gates using GateRenderer */}
        {gates.map(gate => (
          <GateRenderer
            key={gate.id}
            gate={gate}
            isWiring={isWiring}
            isPinConnected={isPinConnectedReactive}
            onClick={() => handleGateClick(gate.id)}
            onPinClick={handlePinClick}
            onInputToggle={handleInputToggle}
          />
        ))}

        {/* Render circuit I/O nodes */}
        {inputNodes.map(node => (
          <NodeRenderer
            key={node.id}
            renderableNode={{ type: 'input', node }}
            selected={selectedNodeId === node.id}
            onClick={() => {
              handleNodeClick(node.id, 'input')
            }}
            onToggle={handleInputNodeToggle}
            onPinClick={(nodeId, worldPos) => {
              handleNodePinClick(nodeId, 'input', worldPos)
            }}
          />
        ))}
        {outputNodes.map(node => (
          <NodeRenderer
            key={node.id}
            renderableNode={{ type: 'output', node }}
            selected={selectedNodeId === node.id}
            onClick={() => {
              handleNodeClick(node.id, 'output')
            }}
            onPinClick={(nodeId, worldPos) => {
              handleNodePinClick(nodeId, 'output', worldPos)
            }}
          />
        ))}
        {constantNodes.map(node => (
          <NodeRenderer
            key={node.id}
            renderableNode={{ type: 'constant', node }}
            selected={selectedNodeId === node.id}
            onClick={() => {
              handleNodeClick(node.id, 'constant')
            }}
            onPinClick={(nodeId, worldPos) => {
              handleNodePinClick(nodeId, 'constant', worldPos)
            }}
          />
        ))}
        {junctions.map(junction => {
          // Calculate junction value from feeding wire
          const junctionValue = getSignalSourceValue(
            { type: 'junction', entityId: junction.id },
            useCircuitStore.getState()
          )
          return (
            <NodeRenderer
              key={junction.id}
              renderableNode={{ type: 'junction', node: junction, value: junctionValue }}
            />
          )
        })}
      </Scene>

      {/* Help overlay */}
      <div className="help-overlay">
        <Text type="secondary">{helpText}</Text>
      </div>
    </Content>
  )
}
