import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { useCircuitStore } from '@/store/circuitStore'
import { Wire3D } from './Wire3D'
import { colors } from '@/theme'
import { Vector3 } from 'three'
import '@/types/testingGlobals' // Import for Window augmentation side-effect

interface SceneProps {
  children?: React.ReactNode
}

function GroundPlaneWithPreview() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)

  // Get actions from store
  const updateWirePreviewPosition = useCircuitStore((s) => s.updateWirePreviewPosition)
  const placeGate = useCircuitStore((s) => s.placeGate)
  const cancelWiring = useCircuitStore((s) => s.cancelWiring)
  const selectGate = useCircuitStore((s) => s.selectGate)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; z: number } | null>(null)
  
  const snapToGrid = (value: number) => Math.round(value * 2) / 2
  
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isPlacing) {
      const x = snapToGrid(e.point.x)
      const z = snapToGrid(e.point.z)
      setCursorPos({ x, y: 0.4, z })
    } else if (isWiring) {
      updateWirePreviewPosition({ 
        x: e.point.x, 
        y: e.point.y, 
        z: e.point.z 
      })
      setCursorPos({ x: e.point.x, y: e.point.y, z: e.point.z })
    }
  }
  
  const handlePointerLeave = () => {
    setCursorPos(null)
    if (isWiring) {
      updateWirePreviewPosition(null)
    }
  }
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isPlacing) {
      e.stopPropagation()
      const x = snapToGrid(e.point.x)
      const z = snapToGrid(e.point.z)
      placeGate({ x, y: 0.4, z })
      setCursorPos(null)
    } else if (isWiring) {
      e.stopPropagation()
      cancelWiring()
      setCursorPos(null)
    } else {
      selectGate(null)
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
      
      {/* Placement preview ring */}
      {isPlacing && cursorPos && (
        <group position={[cursorPos.x, 0.02, cursorPos.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 32]} />
            <meshBasicMaterial color={colors.primary} transparent opacity={0.8} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.08, 16]} />
            <meshBasicMaterial color={colors.primary} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.2, 0.8, 0.4]} />
            <meshStandardMaterial
              color={colors.primary}
              transparent
              opacity={0.3}
              wireframe
            />
          </mesh>
        </group>
      )}
      
      {/* Wire preview during wiring */}
      {isWiring && wiringFrom && wiringFrom.previewEndPosition && (
        <Wire3D
          start={wiringFrom.fromPosition}
          end={wiringFrom.previewEndPosition}
          isPreview
        />
      )}
    </>
  )
}

function SceneContent({ children }: SceneProps) {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null
  const isInteracting = isPlacing || isWiring
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Environment preset="city" />
      <GroundPlaneWithPreview />
      
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={isInteracting ? colors.grid.active : colors.grid.cell}
        sectionSize={2}
        sectionThickness={1}
        sectionColor={isInteracting ? colors.grid.active : colors.grid.section}
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
        enableRotate={!isInteracting}
      />
      
      {children}
    </>
  )
}

const canvasStyle = { background: colors.background.main }

function SceneReadyBridge() {
  const { camera, gl } = useThree()
  const readyRef = useRef(false)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__SCENE_READY__
        delete window.__SCENE_HELPERS__
      }
    }
  }, [])

  useFrame(() => {
    if (readyRef.current) return
    readyRef.current = true

    if (typeof window === 'undefined') return
    const domRect = gl.domElement.getBoundingClientRect()

    window.__SCENE_READY__ = true
    window.__SCENE_HELPERS__ = {
      projectToScreen: (position: { x: number; y: number; z: number }) => {
        const vec = new Vector3(position.x, position.y, position.z)
        vec.project(camera)
        return {
          x: ((vec.x + 1) / 2) * domRect.width + domRect.left,
          y: ((-vec.y + 1) / 2) * domRect.height + domRect.top,
        }
      },
      canvasRect: () => gl.domElement.getBoundingClientRect(),
    }

    window.dispatchEvent(new Event('scene-ready'))
  })

  return null
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 5, 5], fov: 50 }}
      style={canvasStyle}
      data-testid="scene-canvas"
    >
      <Suspense fallback={null}>
        <SceneReadyBridge />
        <SceneContent>{children}</SceneContent>
      </Suspense>
    </Canvas>
  )
}
