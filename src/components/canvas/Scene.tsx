import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { Wire3D } from './Wire3D'

interface SceneProps {
  children?: React.ReactNode
}

function GroundPlaneWithPreview() {
  const circuit = useCircuitStore()
  const isPlacing = circuit.placementMode !== null
  const isWiring = circuit.wiringFrom !== null
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; z: number } | null>(null)
  
  const snapToGrid = (value: number) => Math.round(value * 2) / 2
  
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isPlacing) {
      const x = snapToGrid(e.point.x)
      const z = snapToGrid(e.point.z)
      setCursorPos({ x, y: 0.4, z })
    } else if (isWiring) {
      // Track cursor for wire preview (don't snap for smoother preview)
      setCursorPos({ x: e.point.x, y: 0.4, z: e.point.z })
    }
  }
  
  const handlePointerLeave = () => {
    setCursorPos(null)
  }
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isPlacing) {
      e.stopPropagation()
      const x = snapToGrid(e.point.x)
      const z = snapToGrid(e.point.z)
      circuitActions.placeGate({ x, y: 0.4, z })
      setCursorPos(null)
    } else if (isWiring) {
      // Cancel wiring when clicking on empty space
      e.stopPropagation()
      circuitActions.cancelWiring()
      setCursorPos(null)
    } else {
      // Deselect when clicking on empty space
      circuitActions.selectGate(null)
    }
  }
  
  return (
    <>
      {/* Invisible ground plane for interaction */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Placement preview ring - follows cursor */}
      {isPlacing && cursorPos && (
        <group position={[cursorPos.x, 0.02, cursorPos.z]}>
          {/* Outer ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 32]} />
            <meshBasicMaterial color="#4a9eff" transparent opacity={0.8} />
          </mesh>
          {/* Inner crosshair */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.08, 16]} />
            <meshBasicMaterial color="#4a9eff" transparent opacity={0.9} />
          </mesh>
          {/* Ghost gate preview */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.2, 0.8, 0.4]} />
            <meshStandardMaterial
              color="#4a9eff"
              transparent
              opacity={0.3}
              wireframe
            />
          </mesh>
        </group>
      )}
      
      {/* Wire preview - follows cursor during wiring */}
      {isWiring && circuit.wiringFrom && cursorPos && (
        <Wire3D
          start={circuit.wiringFrom.fromPosition}
          end={cursorPos}
          isPreview
        />
      )}
    </>
  )
}

function SceneContent({ children }: SceneProps) {
  const circuit = useCircuitStore()
  const isPlacing = circuit.placementMode !== null
  const isWiring = circuit.wiringFrom !== null
  const isInteracting = isPlacing || isWiring
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      
      {/* Environment for realistic reflections */}
      <Environment preset="city" />
      
      {/* Ground plane with cursor-following preview */}
      <GroundPlaneWithPreview />
      
      {/* Grid helper for spatial reference */}
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={isInteracting ? '#4a9eff' : '#6f6f6f'}
        sectionSize={2}
        sectionThickness={1}
        sectionColor={isInteracting ? '#4a9eff' : '#9d4b4b'}
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      
      {/* Camera controls - disable rotation during placement/wiring for easier clicking */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
        enableRotate={!isInteracting}
      />
      
      {/* Scene children (gates, wires, etc.) */}
      {children}
    </>
  )
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 5, 5], fov: 50 }}
      style={{ background: '#1a1a2e' }}
    >
      <Suspense fallback={null}>
        <SceneContent>{children}</SceneContent>
      </Suspense>
    </Canvas>
  )
}

