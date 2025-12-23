import { useRef, useState } from 'react'
import { Group, type BufferGeometry } from 'three'
import { Text } from '@react-three/drei'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { materials } from '@/theme'
import { useGateDrag } from '@/hooks/useGateDrag'
import { GatePin, WireStub } from './index'
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
    // gateType, output, inputs - no longer used after removing BaseGateLabel
    bodyColor,
    bodyHoverColor,
    bodySelectedColor,
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

  // Subscribe to wiring state to reactively hide stubs during wiring
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  
  // Drag functionality - use getState() to avoid subscriptions that cause re-renders
  // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
  const state = useCircuitStore.getState()
  const isPlacing = state.placementMode !== null
  const isWiringMode = wiringFrom !== null
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
  const createPinHoverHandler = (pinName: string, pinId: string) => () => {
    console.debug('[BaseGate] Pin hover', { pinName, pinId, isWiringMode, gateId: id })
    setHoveredPin(pinName) // Local state for visual highlighting (uses pinName)
    // Update store with destination pin when hovering during wiring
    if (isWiringMode) {
      console.debug('[BaseGate] Setting destination pin', { gateId: id, pinId })
      circuitActions.setDestinationPin(id, pinId)
    } else {
      console.debug('[BaseGate] Not in wiring mode, skipping setDestinationPin')
    }
  }
  const handlePinOut = () => {
    console.debug('[BaseGate] Pin out', { isWiringMode })
    setHoveredPin(null)
    // Clear destination pin in store when pointer leaves pin
    if (isWiringMode) {
      console.debug('[BaseGate] Clearing destination pin')
      circuitActions.setDestinationPin(null, null)
    }
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
            isHovered={hoveredPin === pinConfig.pinId}
            isConnected={pinConnected}
            value={pinValue}
            pinType={pinConfig.pinType}
            onPinClick={handlePinClick}
            onPointerMove={handlePinPointerMove}
            onPointerOver={createPinHoverHandler(pinName, pinConfig.pinId)}
            onPointerOut={handlePinOut}
          />
        )
      })}

      {/* Wire stubs - rendered from configuration, only when pins are not connected */}
      {/* Also hide stub if this pin is currently being wired (even during preview) */}
      {wireStubPositions
        .map((stubPosition, index) => {
          // Map stub position index to corresponding pin config
          // Order should match: [inputA, inputB, output] for two-input gates
          // or [input, output] for single-input gates
          const pinConfig = pinConfigs[index]
          if (!pinConfig) {
            return null
          }
          
          const isConnected = pinConfig.connected ?? false
          
          // Check if this pin is currently being wired (hide stub during wiring/preview)
          // Compare both gate ID and pin ID to determine if this pin is the source of wiring
          const isBeingWired = wiringFrom !== null && 
            wiringFrom.fromGateId === id &&
            wiringFrom.fromPinId === pinConfig.pinId
          
          const shouldHide = isConnected || isBeingWired
          
          if (shouldHide) {
            return null
          }
          
          return {
            position: stubPosition,
            index,
            pinId: pinConfig.pinId,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map(({ position, index, pinId }) => (
          <WireStub key={`stub-${pinId}-${index}`} position={position} />
        ))}
    </group>
  )
}
BaseGate.displayName = 'BaseGate'
