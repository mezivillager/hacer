import { useRef, useState } from 'react'
import { Group } from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { circuitActions } from '@/store/circuitStore'
import { colors, materials } from '@/theme'

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
  
  // Gate body color based on state
  const bodyColor = selected 
    ? colors.gate.bodySelected 
    : hovered 
      ? colors.gate.bodyHover 
      : colors.gate.body
  
  // Pin colors based on connection status and value
  const getPinColor = (value: boolean, connected: boolean, pinName: string, isOutput: boolean = false) => {
    if (isWiring && hoveredPin === pinName) return colors.primary
    // Outputs always show their calculated value
    if (isOutput) return value ? colors.pin.active : colors.pin.inactive
    // Connected inputs show wire value
    if (connected) return value ? colors.pin.active : colors.pin.inactive
    // Unconnected inputs: show value if set (true=green), otherwise dim grey
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
  
  // Label overlay styles
  const labelStyle = {
    background: colors.overlay.labelBackground,
    color: colors.text.primary,
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'monospace',
  }
  
  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main body */}
      <mesh
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.2, 0.8, 0.4]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={materials.gate.metalness}
          roughness={materials.gate.roughness}
        />
      </mesh>
      
      {/* NAND label on top */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.3]} />
        <meshBasicMaterial color={colors.gate.label} />
      </mesh>
      
      {/* Input A pin */}
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
          metalness={materials.pin.metalness}
          roughness={materials.pin.roughness}
        />
      </mesh>
      
      {/* Input B pin */}
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
          metalness={materials.pin.metalness}
          roughness={materials.pin.roughness}
        />
      </mesh>
      
      {/* Output pin */}
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
          metalness={materials.pin.metalness}
          roughness={materials.pin.roughness}
        />
      </mesh>
      
      {/* Negation bubble */}
      <mesh position={[0.55, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 16]} />
        <meshBasicMaterial color={colors.gate.negationBubble} />
      </mesh>
      
      {/* Wire stubs */}
      <mesh position={[-0.85, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial 
          color={colors.gate.wireStub} 
          metalness={materials.wireStub.metalness} 
          roughness={materials.wireStub.roughness} 
        />
      </mesh>
      <mesh position={[-0.85, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial 
          color={colors.gate.wireStub} 
          metalness={materials.wireStub.metalness} 
          roughness={materials.wireStub.roughness} 
        />
      </mesh>
      <mesh position={[0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial 
          color={colors.gate.wireStub} 
          metalness={materials.wireStub.metalness} 
          roughness={materials.wireStub.roughness} 
        />
      </mesh>
      
      {/* HTML label overlay */}
      {(hovered || selected) && (
        <Html position={[0, 0.7, 0]} center>
          <div style={labelStyle}>
            NAND: {inputA ? '1' : '0'} ∧ {inputB ? '1' : '0'} → {output ? '1' : '0'}
          </div>
        </Html>
      )}
    </group>
  )
}
