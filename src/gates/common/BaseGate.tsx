import { useRef, useState } from 'react'
import { Group, type BufferGeometry } from 'three'
import { Text } from '@react-three/drei'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { materials } from '@/theme'
import { useGateDrag } from '@/hooks/useGateDrag'
import { GatePin, WireStub, BaseGateLabel } from './index'
import { getPinColor, getWorldPosition, createGateClickHandler, createPinPointerMoveHandler, createPinClickHandler, handlePinPointerOut } from '../handlers/gateHandlers'
import type { GateType } from '@/store/types'
import type { PinConfig } from '../types'

interface BaseGateComponentProps {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  selected: boolean
  isWiring: boolean
  gateType: GateType
  bodyColor: string
  bodyHoverColor: string
  bodySelectedColor: string
  output: boolean
  inputs: boolean[]
  pinConfigs: PinConfig[]
  wireStubPositions: [number, number, number][]
  bodyGeometry?: React.ReactNode // React element like <boxGeometry /> (for simple geometries)
  bodyGeometryObject?: BufferGeometry // Three.js geometry object (for complex geometries like ExtrudeGeometry)
  bodyGeometryProps?: { position?: [number, number, number] } // Optional props for geometry mesh
  additionalElements?: React.ReactNode
  textLabel?: string
  textPosition?: [number, number, number]
  textFontSize?: number
  onClick?: () => void
  onPinClick?: (gateId: string, pinId: string, pinType: 'input' | 'output', worldPosition: { x: number; y: number; z: number }) => void
  onInputToggle?: (gateId: string, pinId: string) => void
}

export function BaseGate(props: BaseGateComponentProps) {
  const {
    id,
    position,
    rotation,
    selected,
    isWiring,
    gateType,
    bodyColor,
    bodyHoverColor,
    bodySelectedColor,
    output,
    inputs,
    pinConfigs,
    wireStubPositions,
    bodyGeometry,
    bodyGeometryObject,
    bodyGeometryProps,
    additionalElements,
    textLabel,
    textPosition = [0, 0, -0.2],
    textFontSize = 0.25,
    onClick,
    onPinClick,
    onInputToggle,
  } = props
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

  // Gate body color based on state
  const currentBodyColor = selected ? bodySelectedColor : hovered ? bodyHoverColor : bodyColor

  // Create world position helper with gate position
  const worldPositionHelper = (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => {
    return getWorldPosition(position, localOffset, eventPoint)
  }

  // Create handlers using factory functions
  const handleClick = createGateClickHandler(isWiring, shouldAllowClick, onClick)
  const handlePinPointerMove = createPinPointerMoveHandler(isWiring, worldPositionHelper, circuitActions.updateWirePreviewPosition)
  const handlePinClick = createPinClickHandler(id, worldPositionHelper, onInputToggle, onPinClick)

  // Create pin hover handlers
  const createPinHoverHandler = (pinName: string) => () => setHoveredPin(pinName)
  const handlePinOut = () => {
    setHoveredPin(null)
    handlePinPointerOut()
  }

  // Mesh pointer event handlers
  const handlePointerOver = () => {
    setHovered(true)
    circuitActions.setHoveredGate(id)
  }

  const handlePointerOut = () => {
    setHovered(false)
    circuitActions.setHoveredGate(null)
    // Don't cancel drag on pointer out - pointer capture handles this
    // Only call onPointerLeave if we're not dragging
    if (canDrag && !isDragging) {
      onPointerLeave()
    }
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - gate-specific geometry */}
      <mesh
        {...(bodyGeometryProps || {})}
        {...(bodyGeometryObject ? { geometry: bodyGeometryObject } : {})}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerMove={canDrag ? onPointerMove : undefined}
        onPointerUp={canDrag ? onPointerUp : undefined}
      >
        {bodyGeometry}
        <meshStandardMaterial
          color={currentBodyColor}
          metalness={materials.gate.metalness}
          roughness={materials.gate.roughness}
          transparent={isDragging}
          opacity={isDragging ? 0.7 : 1}
        />
      </mesh>

      {/* Gate text label on top face - flat on horizontal surface */}
      {textLabel && (
        <Text
          position={textPosition}
          rotation={[Math.PI, 0, 0]}
          fontSize={textFontSize}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {textLabel}
        </Text>
      )}

      {/* Additional elements (negation bubble, extra lines, etc.) */}
      {additionalElements}

      {/* Pins - rendered from configuration */}
      {pinConfigs.map((pinConfig) => {
        // Explicitly extract values to help ESLint type checker
        const pinValue: boolean = pinConfig.value
        const pinConnected: boolean = pinConfig.connected
        const pinName: string = pinConfig.pinName
        const isOutput: boolean = pinConfig.pinType === 'output'
        
        const pinColor = getPinColor(
          pinValue,
          pinConnected,
          pinName,
          isOutput,
          isWiring,
          hoveredPin
        )

        return (
          <GatePin
            key={pinConfig.pinId}
            id={id}
            pinId={pinConfig.pinId}
            position={pinConfig.position}
            color={pinColor}
            isWiring={isWiring}
            isHovered={hoveredPin === pinName}
            isConnected={pinConnected}
            value={pinValue}
            pinType={pinConfig.pinType}
            onPinClick={handlePinClick}
            onPointerMove={handlePinPointerMove}
            onPointerOver={createPinHoverHandler(pinName)}
            onPointerOut={handlePinOut}
          />
        )
      })}

      {/* Wire stubs - rendered from configuration */}
      {wireStubPositions.map((stubPosition, index) => (
        <WireStub key={`stub-${index}`} position={stubPosition} />
      ))}

      {/* HTML label overlay */}
      <BaseGateLabel gateType={gateType} inputs={inputs} output={output} visible={hovered || selected} />
    </group>
  )
}
BaseGate.displayName = 'BaseGate'
