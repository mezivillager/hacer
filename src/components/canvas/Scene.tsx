import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useRef } from 'react'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Wire3D } from './Wire3D'
import { colors } from '@/theme'
import { Vector3 } from 'three'
import { trackRender } from '@/utils/renderTracking'
import '@/types/testingGlobals' // Import for Window augmentation side-effect

// Get actions once - stable references that don't cause re-renders
const { 
  updateWirePreviewPosition, 
  updatePlacementPreviewPosition,
  placeGate, 
  cancelWiring, 
  selectGate: selectGateAction 
} = circuitActions

interface SceneProps {
  children?: React.ReactNode
}

const snapToGrid = (value: number) => Math.round(value * 2) / 2

/**
 * Static ground plane for interactions - renders only once.
 * Uses getState() in event handlers to avoid store subscriptions.
 * Wrapped in memo to prevent re-renders from parent.
 */
const GroundPlane = memo(function GroundPlane() {
  trackRender('GroundPlane', 'static')
  
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const state = useCircuitStore.getState()
    const isPlacing = state.placementMode !== null
    const isWiring = state.wiringFrom !== null
    
    if (isPlacing) {
      const x = snapToGrid(e.point.x)
      const z = snapToGrid(e.point.z)
      updatePlacementPreviewPosition({ x, y: 0.4, z })
    } else if (isWiring) {
      updateWirePreviewPosition({ 
        x: e.point.x, 
        y: e.point.y, 
        z: e.point.z 
      })
    }
  }
  
  const handlePointerLeave = () => {
    const state = useCircuitStore.getState()
    const isPlacing = state.placementMode !== null
    const isWiring = state.wiringFrom !== null
    
    if (isPlacing) {
      updatePlacementPreviewPosition(null)
    }
    if (isWiring) {
      updateWirePreviewPosition(null)
    }
  }
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const state = useCircuitStore.getState()
    const isPlacing = state.placementMode !== null
    const isWiring = state.wiringFrom !== null
    
    if (isPlacing) {
      e.stopPropagation()
      const x = snapToGrid(e.point.x)
      const z = snapToGrid(e.point.z)
      placeGate({ x, y: 0.4, z })
    } else if (isWiring) {
      e.stopPropagation()
      cancelWiring()
    } else {
      selectGateAction(null)
    }
  }
  
  return (
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
  )
})

/**
 * Placement preview - only renders when placementMode is active.
 * Subscribes to placementMode and placementPreviewPosition.
 */
function PlacementPreview() {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const previewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  
  const isActive = placementMode !== null && previewPosition !== null
  
  trackRender('PlacementPreview', `active:${isActive}`)
  
  if (!isActive || !previewPosition) return null
  
  return (
    <group position={[previewPosition.x, 0.02, previewPosition.z]}>
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
  )
}

/**
 * Wire preview - only renders when wiring is active.
 * Subscribes to wiringFrom state.
 */
function WirePreview() {
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  
  const isActive = wiringFrom !== null && wiringFrom.previewEndPosition !== null
  
  trackRender('WirePreview', `active:${isActive}`)
  
  if (!wiringFrom || !wiringFrom.previewEndPosition) return null
  
  return (
    <Wire3D
      start={wiringFrom.fromPosition}
      end={wiringFrom.previewEndPosition}
      isPreview
    />
  )
}

/**
 * Grid component - static, never re-renders.
 * Always uses default colors regardless of interaction state.
 */
const SceneGrid = memo(function SceneGrid() {
  return (
    <Grid
      args={[20, 20]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor={colors.grid.cell}
      sectionSize={2}
      sectionThickness={1}
      sectionColor={colors.grid.section}
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
})

/**
 * OrbitControls component - only re-renders when isInteracting changes.
 * Memoized to prevent unnecessary re-renders.
 */
const SceneOrbitControls = memo(function SceneOrbitControls({ isInteracting }: { isInteracting: boolean }) {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2}
      enableRotate={!isInteracting}
    />
  )
}, (prevProps, nextProps) => prevProps.isInteracting === nextProps.isInteracting)

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
      <GroundPlane />
      <PlacementPreview />
      <WirePreview />
      <SceneGrid />
      <SceneOrbitControls isInteracting={isInteracting} />
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

    window.__SCENE_READY__ = true
    window.__SCENE_HELPERS__ = {
      projectToScreen: (position: { x: number; y: number; z: number }) => {
        // Get fresh domRect on each call to handle window resizes
        const domRect = gl.domElement.getBoundingClientRect()
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
