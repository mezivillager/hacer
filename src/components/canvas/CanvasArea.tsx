import { Layout, Typography } from 'antd'
import { Scene } from './Scene'
import { GateRenderer } from '@/gates'
import { Wire3D } from './Wire3D'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'
import { handlePinClick, handleInputToggle, handleGateClick } from './handlers/canvasHandlers'
// Wire crossing resolution deferred - new wiring scheme routes along section lines
import { calculateWirePath } from '@/utils/wiringScheme/core'

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
  // Note: selectedGateId is read via getState() in isDragInvalid calculation to avoid subscription
  
  // Create a reactive isPinConnected function that will trigger re-renders when wires change
  // This ensures gates re-render when their pin connection status changes
  const isPinConnectedReactive = (gateId: string, pinId: string): boolean => {
    return wires.some(
      w =>
        (w.fromGateId === gateId && w.fromPinId === pinId) ||
        (w.toGateId === gateId && w.toPinId === pinId)
    )
  }
  
  // Track renders with reason
  trackRender('CanvasArea', `gates:${gates.length},wires:${wires.length},placing:${!!placementMode},wiring:${!!wiringFrom}`)

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
    return '🖱️ Click pin: Wire • Shift+click input: Toggle • Click body: Select • Drag body: Move • Left/Right arrows: Rotate gate • Scroll: Zoom'
  })()

  // Use stored wire segments - no need to recalculate
  const wirePaths: Array<{
    wire: typeof wires[0]
    fromPos: ReturnType<typeof getPinWorldPosition>
    toPos: ReturnType<typeof getPinWorldPosition>
    fromOrientation: ReturnType<typeof circuitActions.getPinOrientation>
    toOrientation: ReturnType<typeof circuitActions.getPinOrientation>
    path: ReturnType<typeof calculateWirePath>
  }> = []
  
  for (const wire of wires) {
    const fromPos = getPinWorldPosition(wire.fromGateId, wire.fromPinId)
    const toPos = getPinWorldPosition(wire.toGateId, wire.toPinId)
    if (!fromPos || !toPos) continue

    const fromOrientation = circuitActions.getPinOrientation(wire.fromGateId, wire.fromPinId)
    const toOrientation = circuitActions.getPinOrientation(wire.toGateId, wire.toPinId)
    
    if (!fromOrientation || !toOrientation) continue
    
    // Use stored segments from wire (calculated when wire was created)
    // Reconstruct WirePath object for Wire3D component
    const path = {
      segments: wire.segments,
      totalLength: wire.segments.reduce((sum: number, seg) => {
        const dx = seg.end.x - seg.start.x
        const dy = seg.end.y - seg.start.y
        const dz = seg.end.z - seg.start.z
        return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
      }, 0),
    }
    
    wirePaths.push({
      wire,
      fromPos,
      toPos,
      fromOrientation,
      toOrientation,
      path,
    })
  }

  // Wire crossing resolution deferred - new wiring scheme routes along section lines
  // Wires naturally avoid gates, and crossings are less likely with section-line routing
  // If crossings occur, they will be handled in a future update
  const pathsWithElevation = wirePaths // No elevation needed for now

  return (
    <Content className={`app-content ${isPlacing ? 'placing' : ''} ${isPlacing && isPlacementInvalid ? 'placing-invalid' : ''} ${isWiring ? 'wiring' : ''} ${isDragActive ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''}`}>
      <Scene>
        {/* Render all wires */}
        {pathsWithElevation.map((wirePath) => {
          const { wire, fromPos, toPos, fromOrientation, toOrientation, path } = wirePath
          
          const fromGate = gates.find(g => g.id === wire.fromGateId)
          const outputValue = fromGate?.outputs.find(p => p.id === wire.fromPinId)?.value ?? false

          // Use the pre-calculated path (already avoids overlaps with previous wires)
          // Wire3D will use this path directly
          return (
            <Wire3D
              key={wire.id}
              start={fromPos}
              end={toPos}
              startOrientation={fromOrientation}
              endOrientation={toOrientation}
              gates={gates}
              sourceGateId={wire.fromGateId}
              destinationGateId={wire.toGateId}
              existingWires={[]} // Path already calculated with overlap avoidance
              precomputedPath={path} // Pass pre-calculated path
              isActive={outputValue}
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
      </Scene>

      {/* Help overlay */}
      <div className="help-overlay">
        <Text type="secondary">{helpText}</Text>
      </div>
    </Content>
  )
}
