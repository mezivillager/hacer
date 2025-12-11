import { memo, useRef, useState, useMemo, useCallback } from 'react'
import { Group, Shape, ExtrudeGeometry } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { circuitActions } from '@/store/circuitStore'
import { colors, materials } from '@/theme'
import { GatePin, WireStub, BaseGateLabel } from '../common'
import type { SingleInputGateProps } from '../types'

// NOT gate logic
function notLogic(a: boolean): boolean {
  return !a
}

// NOT gate specific color (orange/red tint)
const NOT_BODY_COLOR = '#6a4a3d'
const NOT_BODY_HOVER = '#8a5a4d'
const NOT_BODY_SELECTED = '#4a9eff'

// Gate dimensions
const TRIANGLE_LEFT = -0.4
const TRIANGLE_TIP = 0.4
const PIN_RADIUS = 0.1
const BUBBLE_RADIUS = 0.1

// Pin positions - aligned to body/bubble boundary
const BUBBLE_CENTER_X = TRIANGLE_TIP + BUBBLE_RADIUS  // 0.5 (bubble just touching triangle tip)
const BUBBLE_RIGHT = BUBBLE_CENTER_X + BUBBLE_RADIUS   // 0.6
const INPUT_PIN_X = TRIANGLE_LEFT - PIN_RADIUS  // -0.5 (just touching left edge of triangle)
const OUTPUT_PIN_X = BUBBLE_RIGHT + PIN_RADIUS  // 0.7 (just touching bubble)

// Create triangle shape for NOT gate body
function createTriangleGeometry() {
  const shape = new Shape()
  // Triangle pointing right
  shape.moveTo(TRIANGLE_LEFT, 0.4)   // Top left
  shape.lineTo(TRIANGLE_TIP, 0)      // Right point
  shape.lineTo(TRIANGLE_LEFT, -0.4)  // Bottom left
  shape.lineTo(TRIANGLE_LEFT, 0.4)   // Back to top

  const extrudeSettings = {
    depth: 0.4,
    bevelEnabled: false,
  }

  return new ExtrudeGeometry(shape, extrudeSettings)
}

// Memoize the geometry to avoid recreating it
const triangleGeometry = createTriangleGeometry()

function NotGateComponent({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  selected = false,
  input = false,
  inputConnected = false,
  outputConnected = false,
  isWiring = false,
  onClick,
  onPinClick,
  onInputToggle,
}: SingleInputGateProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)

  const output = useMemo(() => notLogic(input), [input])

  // Gate body color based on state - orange tinted for NOT
  const bodyColor = useMemo(
    () => (selected ? NOT_BODY_SELECTED : hovered ? NOT_BODY_HOVER : NOT_BODY_COLOR),
    [selected, hovered]
  )

  // Pin colors based on connection status and value
  const getPinColor = useCallback(
    (value: boolean, connected: boolean, pinName: string, isOutput: boolean = false) => {
      if (isWiring && hoveredPin === pinName) return colors.primary
      if (isOutput) return value ? colors.pin.active : colors.pin.inactive
      if (connected) return value ? colors.pin.active : colors.pin.inactive
      return value ? colors.pin.active : colors.pin.disconnected
    },
    [isWiring, hoveredPin]
  )

  const inputColor = useMemo(() => getPinColor(input, inputConnected, 'input', false), [input, inputConnected, getPinColor])
  const outputColor = useMemo(() => getPinColor(output, outputConnected, 'output', true), [output, outputConnected, getPinColor])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (!isWiring) {
        onClick?.()
      }
    },
    [isWiring, onClick]
  )

  const getWorldPosition = useCallback(
    (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => {
      if (eventPoint) {
        return eventPoint
      }
      return {
        x: position[0] + localOffset[0],
        y: position[1] + localOffset[1],
        z: position[2] + localOffset[2],
      }
    },
    [position]
  )

  const handlePinPointerMove = useCallback(
    (localOffset: [number, number, number]) => (e: ThreeEvent<PointerEvent>) => {
      if (isWiring) {
        e.stopPropagation()
        const worldPos = getWorldPosition(localOffset, e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined)
        circuitActions.updateWirePreviewPosition(worldPos)
      }
    },
    [isWiring, getWorldPosition]
  )

  const handlePinPointerOut = useCallback(() => {
    // Clear preview position when leaving pin
  }, [])

  const handlePinClick = useCallback(
    (pinId: string, pinType: 'input' | 'output', localOffset: [number, number, number], isConnected: boolean) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()

      if (e.shiftKey && pinType === 'input' && !isConnected) {
        onInputToggle?.(id, pinId)
        return
      }

      const worldPos = getWorldPosition(localOffset, e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined)
      onPinClick?.(id, pinId, pinType, worldPos)
    },
    [id, onInputToggle, onPinClick, getWorldPosition]
  )

  const handleInputHover = useCallback(() => setHoveredPin('input'), [])
  const handleOutputHover = useCallback(() => setHoveredPin('output'), [])
  const handlePinOut = useCallback(() => {
    setHoveredPin(null)
    handlePinPointerOut()
  }, [handlePinPointerOut])

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - triangle shape */}
      <mesh 
        geometry={triangleGeometry}
        position={[0, 0, -0.2]}
        onClick={handleClick} 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={bodyColor} metalness={materials.gate.metalness} roughness={materials.gate.roughness} />
      </mesh>

      {/* NOT text label on front face */}
      <Text
        position={[-0.1, 0, 0.21]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        NOT
      </Text>

      {/* Input pin - just touching the left edge of triangle */}
      <GatePin
        id={id}
        pinId={`${id}-in-0`}
        position={[INPUT_PIN_X, 0, 0]}
        color={inputColor}
        isWiring={isWiring}
        isHovered={hoveredPin === 'input'}
        isConnected={inputConnected}
        value={input}
        pinType="input"
        onPinClick={handlePinClick}
        onPointerMove={handlePinPointerMove}
        onPointerOver={handleInputHover}
        onPointerOut={handlePinOut}
      />

      {/* Negation bubble - same color as body, just touching the triangle tip */}
      <mesh position={[BUBBLE_CENTER_X, 0, 0]}>
        <sphereGeometry args={[BUBBLE_RADIUS, 16, 16]} />
        <meshStandardMaterial 
          color={bodyColor} 
          metalness={materials.gate.metalness} 
          roughness={materials.gate.roughness} 
        />
      </mesh>

      {/* Output pin - just touching the bubble */}
      <GatePin
        id={id}
        pinId={`${id}-out-0`}
        position={[OUTPUT_PIN_X, 0, 0]}
        color={outputColor}
        isWiring={isWiring}
        isHovered={hoveredPin === 'output'}
        isConnected={outputConnected}
        value={output}
        pinType="output"
        onPinClick={handlePinClick}
        onPointerMove={handlePinPointerMove}
        onPointerOver={handleOutputHover}
        onPointerOut={handlePinOut}
      />

      {/* Wire stubs */}
      <WireStub position={[INPUT_PIN_X - 0.15, 0, 0]} />
      <WireStub position={[OUTPUT_PIN_X + 0.15, 0, 0]} />

      {/* HTML label overlay */}
      <BaseGateLabel gateType="NOT" inputs={[input]} output={output} visible={hovered || selected} />
    </group>
  )
}

export const NotGate = memo(NotGateComponent)
NotGate.displayName = 'NotGate'
