import { useRef, useState } from 'react'
import { Group } from 'three'
import { Text } from '@react-three/drei'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { materials } from '@/theme'
import { useGateDrag } from '@/hooks/useGateDrag'
import { GatePin, WireStub, BaseGateLabel } from '../common'
import { getPinColor, getWorldPosition, createGateClickHandler, createPinPointerMoveHandler, createPinClickHandler, handlePinPointerOut } from '../handlers/gateHandlers'
import type { TwoInputGateProps } from '../types'

// AND gate logic
function andLogic(a: boolean, b: boolean): boolean {
  return a && b
}

// AND gate specific color (green tint)
const AND_BODY_COLOR = '#2d5a3d'
const AND_BODY_HOVER = '#3d7a4d'
const AND_BODY_SELECTED = '#4a9eff'

// Gate dimensions
const BODY_WIDTH = 1.0
const BODY_HEIGHT = 0.8
const BODY_DEPTH = 0.4
const PIN_RADIUS = 0.1

// Pin positions - aligned to body boundary
const BODY_LEFT = -BODY_WIDTH / 2   // -0.5
const BODY_RIGHT = BODY_WIDTH / 2   // 0.5
const INPUT_PIN_X = BODY_LEFT - PIN_RADIUS  // -0.6 (just touching left edge)
const OUTPUT_PIN_X = BODY_RIGHT + PIN_RADIUS // 0.6 (just touching right edge)

export function AndGate({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  selected = false,
  inputA = false,
  inputB = false,
  inputAConnected = false,
  inputBConnected = false,
  outputConnected = false,
  isWiring = false,
  onClick,
  onPinClick,
  onInputToggle,
}: TwoInputGateProps) {
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

  const output = andLogic(inputA, inputB)

  // Gate body color based on state - green tinted for AND
  const bodyColor = selected ? AND_BODY_SELECTED : hovered ? AND_BODY_HOVER : AND_BODY_COLOR

  // Pin colors based on connection status and value
  const inputAColor = getPinColor(inputA, inputAConnected, 'inputA', false, isWiring, hoveredPin)
  const inputBColor = getPinColor(inputB, inputBConnected, 'inputB', false, isWiring, hoveredPin)
  const outputColor = getPinColor(output, outputConnected, 'output', true, isWiring, hoveredPin)

  // Create world position helper with gate position
  const worldPositionHelper = (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => {
    return getWorldPosition(position, localOffset, eventPoint)
  }

  // Create handlers using factory functions
  const handleClick = createGateClickHandler(isWiring, shouldAllowClick, onClick)
  const handlePinPointerMove = createPinPointerMoveHandler(isWiring, worldPositionHelper, circuitActions.updateWirePreviewPosition)
  const handlePinClick = createPinClickHandler(id, worldPositionHelper, onInputToggle, onPinClick)

  const handleInputAHover = () => setHoveredPin('inputA')
  const handleInputBHover = () => setHoveredPin('inputB')
  const handleOutputHover = () => setHoveredPin('output')
  const handlePinOut = () => {
    setHoveredPin(null)
    handlePinPointerOut()
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - simple rectangle */}
      <mesh 
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
        <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH]} />
        <meshStandardMaterial 
          color={bodyColor} 
          metalness={materials.gate.metalness} 
          roughness={materials.gate.roughness}
          transparent={isDragging}
          opacity={isDragging ? 0.7 : 1}
        />
      </mesh>

      {/* AND text label on top face - flat on horizontal surface */}
      {/* drei Text is billboarded (faces camera). Position on Z- face (becomes top after gate 90° X rotation).
          For flat text on horizontal surface, rotate 180° around X to make text lie flat. */}
      <Text
        position={[0, 0, -BODY_DEPTH / 2 - 0.01]}
        rotation={[Math.PI, 0, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        AND
      </Text>

      {/* Input A pin - left side, top (horizontal arrangement) */}
      <GatePin
        id={id}
        pinId={`${id}-in-0`}
        position={[INPUT_PIN_X, 0.2, 0]}
        color={inputAColor}
        isWiring={isWiring}
        isHovered={hoveredPin === 'inputA'}
        isConnected={inputAConnected}
        value={inputA}
        pinType="input"
        onPinClick={handlePinClick}
        onPointerMove={handlePinPointerMove}
        onPointerOver={handleInputAHover}
        onPointerOut={handlePinOut}
      />

      {/* Input B pin - left side, bottom (horizontal arrangement) */}
      <GatePin
        id={id}
        pinId={`${id}-in-1`}
        position={[INPUT_PIN_X, -0.2, 0]}
        color={inputBColor}
        isWiring={isWiring}
        isHovered={hoveredPin === 'inputB'}
        isConnected={inputBConnected}
        value={inputB}
        pinType="input"
        onPinClick={handlePinClick}
        onPointerMove={handlePinPointerMove}
        onPointerOver={handleInputBHover}
        onPointerOut={handlePinOut}
      />

      {/* Output pin - just touching right edge of body */}
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
      <WireStub position={[INPUT_PIN_X - 0.15, 0.2, 0]} />
      <WireStub position={[INPUT_PIN_X - 0.15, -0.2, 0]} />
      <WireStub position={[OUTPUT_PIN_X + 0.15, 0, 0]} />

      {/* HTML label overlay */}
      <BaseGateLabel gateType="AND" inputs={[inputA, inputB]} output={output} visible={hovered || selected} />
    </group>
  )
}
AndGate.displayName = 'AndGate'
