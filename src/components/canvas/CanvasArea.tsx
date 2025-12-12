import { Layout, Typography } from 'antd'
import { Scene } from './Scene'
import { GateRenderer } from '@/gates'
import { Wire3D } from './Wire3D'
import { useCircuitStore } from '@/store/circuitStore'
import type { Wire } from '@/store/types'

const { Content } = Layout
const { Text } = Typography

export function CanvasArea() {
  // Use selectors for granular subscriptions
  const gates = useCircuitStore((s) => s.gates)
  const wires = useCircuitStore((s) => s.wires)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)

  // Get actions from store
  const completeWiring = useCircuitStore((s) => s.completeWiring)
  const startWiring = useCircuitStore((s) => s.startWiring)
  const setInputValue = useCircuitStore((s) => s.setInputValue)
  const selectGate = useCircuitStore((s) => s.selectGate)
  const getPinWorldPosition = useCircuitStore((s) => s.getPinWorldPosition)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null

  // Helper to check if a pin is connected
  const isPinConnected = (gateId: string, pinId: string) => {
    return wires.some(
      w =>
        (w.fromGateId === gateId && w.fromPinId === pinId) ||
        (w.toGateId === gateId && w.toPinId === pinId)
    )
  }

  // Handle pin clicks for wiring
  const handlePinClick = (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    worldPosition: { x: number; y: number; z: number }
  ) => {
    if (isWiring) {
      completeWiring(gateId, pinId, pinType)
    } else {
      startWiring(gateId, pinId, pinType, worldPosition)
    }
  }

  // Handle input toggle (Shift+click on unconnected input)
  const handleInputToggle = (gateId: string, pinId: string) => {
    const gate = gates.find(g => g.id === gateId)
    if (gate) {
      const pin = gate.inputs.find(p => p.id === pinId)
      if (pin) {
        setInputValue(gateId, pinId, !pin.value)
      }
    }
  }

  // Get wire endpoints for rendering
  const getWireEndpoints = (wire: Wire) => {
    const fromPos = getPinWorldPosition(wire.fromGateId, wire.fromPinId)
    const toPos = getPinWorldPosition(wire.toGateId, wire.toPinId)
    return { fromPos, toPos }
  }

  const getHelpText = () => {
    if (isPlacing) {
      return `📍 Click anywhere on the grid to place the ${placementMode} gate • Press Esc to cancel`
    }
    if (isWiring) {
      return '🔗 Click on another pin to connect • Click empty space or Esc to cancel'
    }
    return '🖱️ Click pin: Wire • Shift+click input: Toggle • Click body: Select • Left/Right arrows: Rotate gate • Scroll: Zoom'
  }

  return (
    <Content className={`app-content ${isPlacing ? 'placing' : ''} ${isWiring ? 'wiring' : ''}`}>
      <Scene>
        {/* Render all wires */}
        {wires.map(wire => {
          const { fromPos, toPos } = getWireEndpoints(wire)
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
            onClick={() => !isWiring && selectGate(gate.id)}
            onPinClick={handlePinClick}
            onInputToggle={handleInputToggle}
          />
        ))}
      </Scene>

      {/* Help overlay */}
      <div className="help-overlay">
        <Text type="secondary">{getHelpText()}</Text>
      </div>
    </Content>
  )
}
