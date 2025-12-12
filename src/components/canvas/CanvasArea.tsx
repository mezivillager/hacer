import { useCallback, useMemo } from 'react'
import { Layout, Typography } from 'antd'
import { Scene } from './Scene'
import { GateRenderer } from '@/gates'
import { Wire3D } from './Wire3D'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'

const { Content } = Layout
const { Text } = Typography

// Get actions once - these are stable references that don't change
const { completeWiring, startWiring, setInputValue, selectGate, getPinWorldPosition } = circuitActions

export function CanvasArea() {
  // Use selectors for granular subscriptions - only data, not actions
  const gates = useCircuitStore((s) => s.gates)
  const wires = useCircuitStore((s) => s.wires)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  
  // Track renders with reason
  trackRender('CanvasArea', `gates:${gates.length},wires:${wires.length},placing:${!!placementMode},wiring:${!!wiringFrom}`)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null

  // Memoized helper to check if a pin is connected
  const isPinConnected = useCallback((gateId: string, pinId: string) => {
    return wires.some(
      w =>
        (w.fromGateId === gateId && w.fromPinId === pinId) ||
        (w.toGateId === gateId && w.toPinId === pinId)
    )
  }, [wires])

  // Handle pin clicks for wiring - memoized to prevent child re-renders
  const handlePinClick = useCallback((
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
  }, [])

  // Handle input toggle - memoized
  const handleInputToggle = useCallback((gateId: string, pinId: string) => {
    const currentGates = useCircuitStore.getState().gates
    const gate = currentGates.find(g => g.id === gateId)
    if (gate) {
      const pin = gate.inputs.find(p => p.id === pinId)
      if (pin) {
        setInputValue(gateId, pinId, !pin.value)
      }
    }
  }, [])

  // Handle gate selection - memoized
  const handleGateClick = useCallback((gateId: string) => {
    const currentWiringFrom = useCircuitStore.getState().wiringFrom
    if (!currentWiringFrom) {
      selectGate(gateId)
    }
  }, [])

  // Help text based on current mode
  const helpText = useMemo(() => {
    if (isPlacing) {
      return `📍 Click anywhere on the grid to place the ${placementMode} gate • Press Esc to cancel`
    }
    if (isWiring) {
      return '🔗 Click on another pin to connect • Click empty space or Esc to cancel'
    }
    return '🖱️ Click pin: Wire • Shift+click input: Toggle • Click body: Select • Left/Right arrows: Rotate gate • Scroll: Zoom'
  }, [isPlacing, isWiring, placementMode])

  return (
    <Content className={`app-content ${isPlacing ? 'placing' : ''} ${isWiring ? 'wiring' : ''}`}>
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
