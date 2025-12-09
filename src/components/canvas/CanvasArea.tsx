import { Layout, Typography } from 'antd'
import { Scene } from './Scene'
import { NandGate } from '@/gates/NandGate'
import { Wire3D } from './Wire3D'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'

const { Content } = Layout
const { Text } = Typography

export function CanvasArea() {
  const circuit = useCircuitStore()
  const isPlacing = circuit.placementMode !== null
  const isWiring = circuit.wiringFrom !== null

  // Helper to check if a pin is connected
  const isPinConnected = (gateId: string, pinId: string) => {
    return circuit.wires.some(
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
      circuitActions.completeWiring(gateId, pinId, pinType)
    } else {
      circuitActions.startWiring(gateId, pinId, pinType, worldPosition)
    }
  }

  // Handle input toggle (Shift+click on unconnected input)
  const handleInputToggle = (gateId: string, pinId: string) => {
    const gate = circuit.gates.find(g => g.id === gateId)
    if (gate) {
      const pin = gate.inputs.find(p => p.id === pinId)
      if (pin) {
        circuitActions.setInputValue(gateId, pinId, !pin.value)
      }
    }
  }

  // Get wire endpoints for rendering
  const getWireEndpoints = (wire: (typeof circuit.wires)[0]) => {
    const fromPos = circuitActions.getPinWorldPosition(wire.fromGateId, wire.fromPinId)
    const toPos = circuitActions.getPinWorldPosition(wire.toGateId, wire.toPinId)
    return { fromPos, toPos }
  }

  const getHelpText = () => {
    if (isPlacing) {
      return '📍 Click anywhere on the grid to place the gate • Press Esc to cancel'
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
        {circuit.wires.map(wire => {
          const { fromPos, toPos } = getWireEndpoints(wire)
          if (!fromPos || !toPos) return null

          const fromGate = circuit.gates.find(g => g.id === wire.fromGateId)
          const outputValue = fromGate?.outputs.find(p => p.id === wire.fromPinId)?.value ?? false

          return <Wire3D key={wire.id} start={fromPos} end={toPos} isActive={outputValue} />
        })}

        {/* Render all gates */}
        {circuit.gates.map(gate => (
          <NandGate
            key={gate.id}
            id={gate.id}
            position={[gate.position.x, gate.position.y, gate.position.z]}
            rotation={[gate.rotation.x, gate.rotation.y, gate.rotation.z]}
            selected={gate.selected}
            inputA={gate.inputs[0]?.value ?? false}
            inputB={gate.inputs[1]?.value ?? false}
            inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
            inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
            outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
            isWiring={isWiring}
            onClick={() => !isWiring && circuitActions.selectGate(gate.id)}
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
