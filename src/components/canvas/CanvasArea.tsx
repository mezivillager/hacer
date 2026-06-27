import { Scene } from './Scene'
import { GateRenderer } from '@/gates'
import { NodeRenderer, BusComponentRenderer } from '@/nodes'
import { Wire3D } from './Wire3D'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'
import { handlePinClick, handleInputToggle, handleGateClick, handleInputNodeToggle, handleNodeClick, handleNodePinClick, handleJunctionClick, handleBusPinClick, handleBusClick } from './handlers/canvasHandlers'
import { deriveWire3DProps } from './deriveWire3DProps'
import { getSignalSourceValue } from '@/store/actions/simulationActions/simulationActions'
import { isSignalHigh } from '@/simulation/signalDisplay'


export function CanvasArea() {
  // Use individual selectors - Zustand's shallow comparison works better with individual subscriptions
  const gates = useCircuitStore((s) => s.gates)
  const wires = useCircuitStore((s) => s.wires)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const placementPreviewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const isDragActive = useCircuitStore((s) => s.isDragActive)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)

  const simulationRunning = useCircuitStore((s) => s.simulationRunning)

  // HDL support: Subscribe to circuit I/O nodes
  const inputNodes = useCircuitStore((s) => s.inputNodes)
  const outputNodes = useCircuitStore((s) => s.outputNodes)
  const junctions = useCircuitStore((s) => s.junctions)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const busComponents = useCircuitStore((s) => s.busComponents)
  const selectedBusId = useCircuitStore((s) => s.selectedBusId)

  // Create a reactive isPinConnected function that will trigger re-renders when wires change
  const isPinConnectedReactive = (gateId: string, pinId: string): boolean => {
    return wires.some(
      w =>
        (w.from.type === 'gate' && w.from.entityId === gateId && w.from.pinId === pinId) ||
        (w.to.type === 'gate' && w.to.entityId === gateId && w.to.pinId === pinId)
    )
  }

  // Track renders with reason
  const nodeCount = inputNodes.length + outputNodes.length + junctions.length
  trackRender('CanvasArea', `gates:${gates.length},wires:${wires.length},nodes:${nodeCount},placing:${!!placementMode},placingNode:${!!nodePlacementMode},wiring:${!!wiringFrom}`)

  const isPlacing = placementMode !== null
  const isPlacingNode = nodePlacementMode !== null
  const isWiring = wiringFrom !== null
  const isDragging = isDragActive && placementPreviewPosition !== null && placementMode === null && !isPlacingNode

  // Check if current preview position is invalid for gate placement
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

  // (Help overlay moved to <HelpBar />; useHelpText hook owns the contextual
  // copy that used to live here as a local helpText function.)

  return (
    <div
      className={`app-content w-full h-full relative overflow-hidden ${isPlacing ? 'placing' : ''} ${isPlacing && isPlacementInvalid ? 'placing-invalid' : ''} ${isWiring ? 'wiring' : ''} ${isDragActive ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''}`}
    >
      <Scene>
        {/* Render all wires using unified Wire3D */}
        {wires.map((wire) => {
          // Get signal value based on source endpoint type
          const signalValue = simulationRunning ? getSignalSourceValue(wire.from, useCircuitStore.getState()) : 0

          const { start: startPos, end: endPos, precomputedPath: path } = deriveWire3DProps(
            wire,
            useCircuitStore.getState(),
          )

          return (
            <Wire3D
              key={wire.id}
              start={startPos}
              end={endPos}
              precomputedPath={path}
              isActive={isSignalHigh(signalValue)}
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

        {inputNodes.map(node => {
          const isConnected = wires.some(w => w.from.type === 'input' && w.from.entityId === node.id)
          return (
          <NodeRenderer
            key={node.id}
            renderableNode={{ type: 'input', node }}
            selected={selectedNodeId === node.id}
            isConnected={isConnected}
            onClick={() => {
              handleNodeClick(node.id, 'input')
            }}
            onToggle={handleInputNodeToggle}
            onPinClick={(nodeId, worldPos) => {
              handleNodePinClick(nodeId, 'input', worldPos)
            }}
          />
          )
        })}
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
        {junctions.map(junction => {
          // Calculate junction value from feeding wire
          const junctionValue = simulationRunning ? getSignalSourceValue(
            { type: 'junction', entityId: junction.id },
            useCircuitStore.getState()
          ) : 0
          return (
            <NodeRenderer
              key={junction.id}
              renderableNode={{ type: 'junction', node: junction, value: junctionValue }}
              onClick={() => {
                handleJunctionClick(junction.id, junction.position)
              }}
            />
          )
        })}
        {busComponents.map((component) => (
          <BusComponentRenderer
            key={component.id}
            component={component}
            onPinClick={handleBusPinClick}
            onClick={() => handleBusClick(component.id)}
            selected={selectedBusId === component.id}
          />
        ))}
      </Scene>
    </div>
  )
}
