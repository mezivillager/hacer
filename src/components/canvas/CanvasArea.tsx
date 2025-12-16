import { Layout, Typography } from 'antd'
import { Scene } from './Scene'
import { GateRenderer } from '@/gates'
import { Wire3D } from './Wire3D'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'

const { Content } = Layout
const { Text } = Typography

// Get actions once - these are stable references that don't change
const { completeWiring, startWiring, setInputValue, selectGate, getPinWorldPosition } = circuitActions

// Create stable function references outside component to avoid recreating on every render
// These functions use getState() internally to avoid stale closures
const isPinConnected = (gateId: string, pinId: string) => {
  const wires = useCircuitStore.getState().wires
  return wires.some(
    w =>
      (w.fromGateId === gateId && w.fromPinId === pinId) ||
      (w.toGateId === gateId && w.toPinId === pinId)
  )
}

const handlePinClick = (
  gateId: string,
  pinId: string,
  pinType: 'input' | 'output',
  worldPosition: { x: number; y: number; z: number }
) => {
  // Get current wiring state from store to avoid stale closure
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (currentWiringFrom) {
    completeWiring(gateId, pinId, pinType)
  } else {
    startWiring(gateId, pinId, pinType, worldPosition)
  }
}

const handleInputToggle = (gateId: string, pinId: string) => {
  const currentGates = useCircuitStore.getState().gates
  const gate = currentGates.find(g => g.id === gateId)
  if (gate) {
    const pin = gate.inputs.find(p => p.id === pinId)
    if (pin) {
      setInputValue(gateId, pinId, !pin.value)
    }
  }
}

const handleGateClick = (gateId: string) => {
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (!currentWiringFrom) {
    selectGate(gateId)
  }
}

export function CanvasArea() {
  // Use individual selectors - Zustand's shallow comparison works better with individual subscriptions
  // For arrays, we need to be careful - but individual selectors are more stable
  const gates = useCircuitStore((s) => s.gates)
  const wires = useCircuitStore((s) => s.wires)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const placementPreviewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const isDragActive = useCircuitStore((s) => s.isDragActive)
  // Note: selectedGateId is read via getState() in isDragInvalid calculation to avoid subscription
  
  // Track renders with reason
  trackRender('CanvasArea', `gates:${gates.length},wires:${wires.length},placing:${!!placementMode},wiring:${!!wiringFrom}`)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null
  const isDragging = isDragActive && placementPreviewPosition !== null && placementMode === null
  
  // Check if current preview position is invalid for placement
  const isPlacementInvalid = isPlacing && placementPreviewPosition !== null && (() => {
    const gridPos = worldToGrid(placementPreviewPosition)
    return !canPlaceGateAt(gridPos, gates)
  })()

  // Check if current drag position is invalid
  // Use getState() to read selectedGateId only when needed to avoid subscription
  const isDragInvalid = isDragging && placementPreviewPosition !== null && (() => {
    // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
    const currentSelectedGateId = useCircuitStore.getState().selectedGateId
    if (!currentSelectedGateId) return false
    const gridPos = worldToGrid(placementPreviewPosition)
    const otherGates = gates.filter(g => g.id !== currentSelectedGateId)
    return !canPlaceGateAt(gridPos, otherGates, currentSelectedGateId)
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

  return (
    <Content className={`app-content ${isPlacing ? 'placing' : ''} ${isPlacing && isPlacementInvalid ? 'placing-invalid' : ''} ${isWiring ? 'wiring' : ''} ${isDragActive ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''}`}>
      <Scene>
        {/* Render all wires */}
        {wires.map(wire => {
          const fromPos = getPinWorldPosition(wire.fromGateId, wire.fromPinId)
          const toPos = getPinWorldPosition(wire.toGateId, wire.toPinId)
          if (!fromPos || !toPos) return null

          const fromGate = gates.find(g => g.id === wire.fromGateId)
          const outputValue = fromGate?.outputs.find(p => p.id === wire.fromPinId)?.value ?? false

          return <Wire3D key={wire.id} start={fromPos} end={toPos} isActive={outputValue} />
        })}

        {/* Render all gates using GateRenderer */}
        {gates.map(gate => (
          <GateRenderer
            key={gate.id}
            gate={gate}
            isWiring={isWiring}
            isPinConnected={isPinConnected}
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
