import { memo, useRef, useState, useMemo, useCallback } from 'react'
import { Group } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { circuitActions } from '@/store/circuitStore'
import { colors, materials } from '@/theme'
import { GatePin } from './GatePin'
import { WireStub } from './WireStub'
import { GateLabel } from './GateLabel'

interface NandGateProps {
  id: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  selected?: boolean
  inputA?: boolean
  inputB?: boolean
  inputAConnected?: boolean
  inputBConnected?: boolean
  outputConnected?: boolean
  isWiring?: boolean
  onClick?: () => void
  onPinClick?: (gateId: string, pinId: string, pinType: 'input' | 'output', worldPosition: { x: number; y: number; z: number }) => void
  onInputToggle?: (gateId: string, pinId: string) => void
}

// NAND gate logic
function nandLogic(a: boolean, b: boolean): boolean {
  return !(a && b)
}

function NandGateComponent({
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
}: NandGateProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)

  const output = useMemo(() => nandLogic(inputA, inputB), [inputA, inputB])

  // Gate body color based on state
  const bodyColor = useMemo(
    () => (selected ? colors.gate.bodySelected : hovered ? colors.gate.bodyHover : colors.gate.body),
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
      {/* Main body */}
      <mesh onClick={handleClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <boxGeometry args={[1.2, 0.8, 0.4]} />
        <meshStandardMaterial color={bodyColor} metalness={materials.gate.metalness} roughness={materials.gate.roughness} />
      </mesh>

      {/* NAND label on top */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.3]} />
        <meshBasicMaterial color={colors.gate.label} />
      </mesh>

      {/* Input A pin */}
      <GatePin
        id={id}
        pinId={`${id}-in-0`}
        position={[-0.7, 0.2, 0]}
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
        position={[-0.7, -0.2, 0]}
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

      {/* Output pin */}
      <GatePin
        id={id}
        pinId={`${id}-out-0`}
        position={[0.7, 0, 0]}
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

      {/* Negation bubble */}
      <mesh position={[0.55, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 16]} />
        <meshBasicMaterial color={colors.gate.negationBubble} />
      </mesh>

      {/* Wire stubs */}
      <WireStub position={[-0.85, 0.2, 0]} />
      <WireStub position={[-0.85, -0.2, 0]} />
      <WireStub position={[0.85, 0, 0]} />

      {/* HTML label overlay */}
      <GateLabel inputA={inputA} inputB={inputB} output={output} visible={hovered || selected} />
    </group>
  )
}

export const NandGate = memo(NandGateComponent)
NandGate.displayName = 'NandGate'
