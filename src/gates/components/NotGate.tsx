import { useRef, useState } from 'react'
import { Group, Shape, ExtrudeGeometry } from 'three'
import { Text } from '@react-three/drei'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { materials } from '@/theme'
import { useGateDrag } from '@/hooks/useGateDrag'
import { GatePin, WireStub, BaseGateLabel } from '../common'
import { getPinColor, getWorldPosition, createGateClickHandler, createPinPointerMoveHandler, createPinClickHandler, handlePinPointerOut } from '../handlers/gateHandlers'
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

export function NotGate({
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

  // Drag functionality - use getState() to avoid subscriptions that cause re-renders
  // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
  const state = useCircuitStore.getState()
  const isPlacing = state.placementMode !== null
  const isWiringMode = state.wiringFrom !== null
  const canDrag = !isPlacing && !isWiringMode
  const { isDragging, shouldAllowClick, onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = useGateDrag(id)

  const output = notLogic(input)

  // Gate body color based on state - orange tinted for NOT
  const bodyColor = selected ? NOT_BODY_SELECTED : hovered ? NOT_BODY_HOVER : NOT_BODY_COLOR

  // Pin colors based on connection status and value
  const inputColor = getPinColor(input, inputConnected, 'input', false, isWiring, hoveredPin)
  const outputColor = getPinColor(output, outputConnected, 'output', true, isWiring, hoveredPin)

  // Create world position helper with gate position
  const worldPositionHelper = (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => {
    return getWorldPosition(position, localOffset, eventPoint)
  }

  // Create handlers using factory functions
  const handleClick = createGateClickHandler(isWiring, shouldAllowClick, onClick)
  const handlePinPointerMove = createPinPointerMoveHandler(isWiring, worldPositionHelper, circuitActions.updateWirePreviewPosition)
  const handlePinClick = createPinClickHandler(id, worldPositionHelper, onInputToggle, onPinClick)

  const handleInputHover = () => setHoveredPin('input')
  const handleOutputHover = () => setHoveredPin('output')
  const handlePinOut = () => {
    setHoveredPin(null)
    handlePinPointerOut()
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - triangle shape */}
      <mesh 
        geometry={triangleGeometry}
        position={[0, 0, -0.2]}
        onClick={handleClick} 
        onPointerOver={() => {
          setHovered(true)
          circuitActions.setHoveredGate(id)
        }} 
        onPointerOut={() => {
          setHovered(false)
          circuitActions.setHoveredGate(null)
          // Don't cancel drag on pointer out - pointer capture handles this
          // Only call onPointerLeave if we're not dragging
          if (canDrag && !isDragging) {
            onPointerLeave()
          }
        }}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerMove={canDrag ? onPointerMove : undefined}
        onPointerUp={canDrag ? onPointerUp : undefined}
      >
        <meshStandardMaterial 
          color={bodyColor} 
          metalness={materials.gate.metalness} 
          roughness={materials.gate.roughness}
          transparent={isDragging}
          opacity={isDragging ? 0.7 : 1}
        />
      </mesh>

      {/* NOT text label on top face - flat on horizontal surface */}
      {/* drei Text is billboarded (faces camera). Position on Z- face (becomes top after gate 90° X rotation).
          For flat text on horizontal surface, rotate 180° around X to make text lie flat. */}
      <Text
        position={[0, 0, -0.21]}
        rotation={[Math.PI, 0, 0]}
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
NotGate.displayName = 'NotGate'
