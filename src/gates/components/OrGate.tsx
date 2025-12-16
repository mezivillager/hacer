import { useRef, useState } from 'react'
import { Group, Shape, ExtrudeGeometry } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { colors, materials } from '@/theme'
import { useGateDrag } from '@/hooks/useGateDrag'
import { GatePin, WireStub, BaseGateLabel } from '../common'
import type { TwoInputGateProps } from '../types'

// OR gate logic
function orLogic(a: boolean, b: boolean): boolean {
  return a || b
}

// OR gate specific color (blue tint)
const OR_BODY_COLOR = '#3d4a6a'
const OR_BODY_HOVER = '#4d5a8a'
const OR_BODY_SELECTED = '#4a9eff'

// Create OR gate shield shape
function createOrGateGeometry() {
  const shape = new Shape()
  // Shield/rocket shape - curved back, pointed front
  shape.moveTo(-0.5, 0.4)     // Top left
  shape.quadraticCurveTo(-0.3, 0, -0.5, -0.4) // Curved left side (concave)
  shape.lineTo(0.3, -0.4)     // Bottom edge
  shape.quadraticCurveTo(0.6, 0, 0.3, 0.4)    // Pointed right side
  shape.lineTo(-0.5, 0.4)     // Back to top

  const extrudeSettings = {
    depth: 0.4,
    bevelEnabled: false,
  }

  return new ExtrudeGeometry(shape, extrudeSettings)
}

// Memoize the geometry to avoid recreating it
const orGateGeometry = createOrGateGeometry()

export function OrGate({
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

  const output = orLogic(inputA, inputB)

  // Gate body color based on state - blue tinted for OR
  const bodyColor = selected ? OR_BODY_SELECTED : hovered ? OR_BODY_HOVER : OR_BODY_COLOR

  // Pin colors based on connection status and value
  const getPinColor = (value: boolean, connected: boolean, pinName: string, isOutput: boolean = false) => {
    if (isWiring && hoveredPin === pinName) return colors.primary
    if (isOutput) return value ? colors.pin.active : colors.pin.inactive
    if (connected) return value ? colors.pin.active : colors.pin.inactive
    return value ? colors.pin.active : colors.pin.disconnected
  }

  const inputAColor = getPinColor(inputA, inputAConnected, 'inputA', false)
  const inputBColor = getPinColor(inputB, inputBConnected, 'inputB', false)
  const outputColor = getPinColor(output, outputConnected, 'output', true)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // Check if click should be allowed (may need to wait for drag handlers to complete)
    // Use a small delay to ensure drag state has been updated
    setTimeout(() => {
      if (!isWiring && shouldAllowClick()) {
        onClick?.()
      }
    }, 10)
  }

  const getWorldPosition = (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => {
    if (eventPoint) {
      return eventPoint
    }
    return {
      x: position[0] + localOffset[0],
      y: position[1] + localOffset[1],
      z: position[2] + localOffset[2],
    }
  }

  const handlePinPointerMove = (localOffset: [number, number, number]) => (e: ThreeEvent<PointerEvent>) => {
    if (isWiring) {
      e.stopPropagation()
      const worldPos = getWorldPosition(localOffset, e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined)
      circuitActions.updateWirePreviewPosition(worldPos)
    }
  }

  const handlePinPointerOut = () => {
    // Clear preview position when leaving pin
  }

  const handlePinClick = (pinId: string, pinType: 'input' | 'output', localOffset: [number, number, number], isConnected: boolean) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()

    if (e.shiftKey && pinType === 'input' && !isConnected) {
      onInputToggle?.(id, pinId)
      return
    }

    const worldPos = getWorldPosition(localOffset, e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined)
    onPinClick?.(id, pinId, pinType, worldPos)
  }

  const handleInputAHover = () => setHoveredPin('inputA')
  const handleInputBHover = () => setHoveredPin('inputB')
  const handleOutputHover = () => setHoveredPin('output')
  const handlePinOut = () => {
    setHoveredPin(null)
    handlePinPointerOut()
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - shield/rocket shape */}
      <mesh
        geometry={orGateGeometry}
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

      {/* OR text label on top face - flat on horizontal surface */}
      {/* drei Text is billboarded (faces camera). Position on Z- face (becomes top after gate 90° X rotation).
          For flat text on horizontal surface, rotate 180° around X to make text lie flat. */}
      <Text
        position={[0, 0, -0.21]}
        rotation={[Math.PI, 0, 0]}
        fontSize={0.28}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        OR
      </Text>

      {/* Input A pin - left side, top (horizontal arrangement) */}
      <GatePin
        id={id}
        pinId={`${id}-in-0`}
        position={[-0.55, 0.2, 0]}
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
        position={[-0.55, -0.2, 0]}
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

      {/* Output pin - touching the pointed tip of the body */}
      <GatePin
        id={id}
        pinId={`${id}-out-0`}
        position={[0.55, 0, 0]}
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
      <WireStub position={[-0.7, 0.2, 0]} />
      <WireStub position={[-0.7, -0.2, 0]} />
      <WireStub position={[0.7, 0, 0]} />

      {/* HTML label overlay */}
      <BaseGateLabel gateType="OR" inputs={[inputA, inputB]} output={output} visible={hovered || selected} />
    </group>
  )
}
OrGate.displayName = 'OrGate'
