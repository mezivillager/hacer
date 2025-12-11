import { memo, useRef, useState, useMemo, useCallback } from 'react'
import { Group } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { circuitActions } from '@/store/circuitStore'
import { colors, materials } from '@/theme'
import { GatePin, WireStub, BaseGateLabel } from '../common'
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

function AndGateComponent({
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

  const output = useMemo(() => andLogic(inputA, inputB), [inputA, inputB])

  // Gate body color based on state - green tinted for AND
  const bodyColor = useMemo(
    () => (selected ? AND_BODY_SELECTED : hovered ? AND_BODY_HOVER : AND_BODY_COLOR),
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

  const inputAColor = useMemo(() => getPinColor(inputA, inputAConnected, 'inputA', false), [inputA, inputAConnected, getPinColor])
  const inputBColor = useMemo(() => getPinColor(inputB, inputBConnected, 'inputB', false), [inputB, inputBConnected, getPinColor])
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

  const handleInputAHover = useCallback(() => setHoveredPin('inputA'), [])
  const handleInputBHover = useCallback(() => setHoveredPin('inputB'), [])
  const handleOutputHover = useCallback(() => setHoveredPin('output'), [])
  const handlePinOut = useCallback(() => {
    setHoveredPin(null)
    handlePinPointerOut()
  }, [handlePinPointerOut])

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - simple rectangle */}
      <mesh onClick={handleClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH]} />
        <meshStandardMaterial color={bodyColor} metalness={materials.gate.metalness} roughness={materials.gate.roughness} />
      </mesh>

      {/* AND text label on front face */}
      <Text
        position={[0, 0, BODY_DEPTH / 2 + 0.01]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        AND
      </Text>

      {/* Input A pin - just touching left edge of body */}
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

      {/* Input B pin - just touching left edge of body */}
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

export const AndGate = memo(AndGateComponent)
AndGate.displayName = 'AndGate'
