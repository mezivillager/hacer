import { useRef, useState } from 'react'
import { Group, Shape, ExtrudeGeometry } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { circuitActions } from '@/store/circuitStore'
import { colors, materials } from '@/theme'
import { GatePin, WireStub, BaseGateLabel } from '../common'
import type { TwoInputGateProps } from '../types'

// XOR gate logic
function xorLogic(a: boolean, b: boolean): boolean {
  return a !== b
}

// XOR gate specific color (cyan/teal tint)
const XOR_BODY_COLOR = '#2d6a5a'
const XOR_BODY_HOVER = '#3d8a7a'
const XOR_BODY_SELECTED = '#4a9eff'

// Create XOR gate shield shape (similar to OR but will have extra line)
function createXorGateGeometry() {
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
const xorGateGeometry = createXorGateGeometry()

export function XorGate({
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

  const output = xorLogic(inputA, inputB)

  // Gate body color based on state - cyan tinted for XOR
  const bodyColor = selected ? XOR_BODY_SELECTED : hovered ? XOR_BODY_HOVER : XOR_BODY_COLOR

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
    if (!isWiring) {
      onClick?.()
    }
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
        geometry={xorGateGeometry}
        position={[0, 0, -0.2]}
        onClick={handleClick} 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={bodyColor} metalness={materials.gate.metalness} roughness={materials.gate.roughness} />
      </mesh>

      {/* Extra curved line on input side to distinguish from OR - rendered as a thin box */}
      <mesh position={[-0.65, 0, 0]}>
        <boxGeometry args={[0.05, 0.7, 0.4]} />
        <meshStandardMaterial color={bodyColor} metalness={materials.gate.metalness} roughness={materials.gate.roughness} />
      </mesh>

      {/* XOR text label on front face */}
      <Text
        position={[-0.1, 0, 0.21]}
        fontSize={0.24}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        XOR
      </Text>

      {/* Input A pin */}
      <GatePin
        id={id}
        pinId={`${id}-in-0`}
        position={[-0.75, 0.2, 0]}
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

      {/* Input B pin */}
      <GatePin
        id={id}
        pinId={`${id}-in-1`}
        position={[-0.75, -0.2, 0]}
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
      <WireStub position={[-0.9, 0.2, 0]} />
      <WireStub position={[-0.9, -0.2, 0]} />
      <WireStub position={[0.7, 0, 0]} />

      {/* HTML label overlay */}
      <BaseGateLabel gateType="XOR" inputs={[inputA, inputB]} output={output} visible={hovered || selected} />
    </group>
  )
}
XorGate.displayName = 'XorGate'
