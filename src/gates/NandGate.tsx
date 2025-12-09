import { useRef, useState } from 'react'
import { Group } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { circuitActions } from '@/store/circuitStore'

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

export function NandGate({
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
  
  const output = nandLogic(inputA, inputB)
  
  // Colors
  const bodyColor = selected ? '#4a9eff' : hovered ? '#5a6a7a' : '#3a4a5a'
  
  // Pin colors based on connection status and value
  const getPinColor = (value: boolean, connected: boolean, pinName: string, isOutput: boolean = false) => {
    if (isWiring && hoveredPin === pinName) return '#4a9eff'
    // Outputs always show their calculated value
    if (isOutput) return value ? '#00ff88' : '#ff4444'
    // Connected inputs show wire value
    if (connected) return value ? '#00ff88' : '#ff4444'
    // Unconnected inputs: show value if set (true=green), otherwise dim grey
    return value ? '#00ff88' : '#555555'
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
    // If we have the event's world point, use it directly (already transformed)
    if (eventPoint) {
      return eventPoint
    }
    
    // Otherwise calculate from local offset and rotation
    // For now, simple addition (will work if rotation is 0,0,0)
    // TODO: Apply rotation transformation if needed
    return {
      x: position[0] + localOffset[0],
      y: position[1] + localOffset[1],
      z: position[2] + localOffset[2],
    }
  }
  
  const handlePinPointerMove = (localOffset: [number, number, number]) => (e: ThreeEvent<PointerEvent>) => {
    if (isWiring) {
      e.stopPropagation()
      // Use event point if available, otherwise calculate
      const worldPos = getWorldPosition(localOffset, e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined)
      circuitActions.updateWirePreviewPosition(worldPos)
    }
  }
  
  const handlePinPointerOut = () => {
    // Clear preview position when leaving pin (will use ground plane position instead)
    // The ground plane handler will set it back
  }
  
  const handlePinClick = (pinId: string, pinType: 'input' | 'output', localOffset: [number, number, number], isConnected: boolean) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    
    // Shift + click on unconnected input = toggle value
    if (e.shiftKey && pinType === 'input' && !isConnected) {
      onInputToggle?.(id, pinId)
      return
    }
    
    // Normal click = wiring - use event point if available (accounts for rotation)
    const worldPos = getWorldPosition(localOffset, e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined)
    onPinClick?.(id, pinId, pinType, worldPos)
  }
  
  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body - box shape representing the gate */}
      <mesh
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.2, 0.8, 0.4]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {/* NAND label on top */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.3]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Input A pin (left side, top) */}
      <mesh
        position={[-0.7, 0.2, 0]}
        onClick={handlePinClick(`${id}-in-0`, 'input', [-0.7, 0.2, 0], inputAConnected)}
        onPointerMove={handlePinPointerMove([-0.7, 0.2, 0])}
        onPointerOver={() => setHoveredPin('inputA')}
        onPointerOut={() => {
          setHoveredPin(null)
          handlePinPointerOut()
        }}
      >
        <sphereGeometry args={[isWiring && hoveredPin === 'inputA' ? 0.13 : 0.1, 16, 16]} />
        <meshStandardMaterial
          color={inputAColor}
          emissive={inputAColor}
          emissiveIntensity={inputAConnected && inputA ? 0.5 : hoveredPin === 'inputA' ? 0.3 : 0.1}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Input B pin (left side, bottom) */}
      <mesh
        position={[-0.7, -0.2, 0]}
        onClick={handlePinClick(`${id}-in-1`, 'input', [-0.7, -0.2, 0], inputBConnected)}
        onPointerMove={handlePinPointerMove([-0.7, -0.2, 0])}
        onPointerOver={() => setHoveredPin('inputB')}
        onPointerOut={() => {
          setHoveredPin(null)
          handlePinPointerOut()
        }}
      >
        <sphereGeometry args={[isWiring && hoveredPin === 'inputB' ? 0.13 : 0.1, 16, 16]} />
        <meshStandardMaterial
          color={inputBColor}
          emissive={inputBColor}
          emissiveIntensity={inputBConnected && inputB ? 0.5 : hoveredPin === 'inputB' ? 0.3 : 0.1}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Output pin (right side) with bubble (NAND indicator) */}
      <mesh 
        position={[0.7, 0, 0]}
        onClick={handlePinClick(`${id}-out-0`, 'output', [0.7, 0, 0], outputConnected)}
        onPointerMove={handlePinPointerMove([0.7, 0, 0])}
        onPointerOver={() => setHoveredPin('output')}
        onPointerOut={() => {
          setHoveredPin(null)
          handlePinPointerOut()
        }}
      >
        <sphereGeometry args={[isWiring && hoveredPin === 'output' ? 0.13 : 0.1, 16, 16]} />
        <meshStandardMaterial
          color={outputColor}
          emissive={outputColor}
          emissiveIntensity={output ? 0.5 : hoveredPin === 'output' ? 0.3 : 0.1}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Negation bubble (small circle indicating NAND) */}
      <mesh position={[0.55, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Wire stubs */}
      <mesh position={[-0.85, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.85, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* HTML label overlay */}
      {(hovered || selected) && (
        <Html position={[0, 0.7, 0]} center>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}>
            NAND: {inputA ? '1' : '0'} ∧ {inputB ? '1' : '0'} → {output ? '1' : '0'}
          </div>
        </Html>
      )}
    </group>
  )
}
