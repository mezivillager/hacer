import { OrbitControls } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'
import type { WiringState, GateType } from '@/store/types'

/**
 * OrbitControls component - disabled during interactions (placing, wiring, dragging, hovering over gates).
 * Automatically re-enables when no interactions are active.
 * Optimized automatically by React Compiler.
 */
export function SceneOrbitControls() {
  const isDragActive = useCircuitStore((state): boolean => state.isDragActive)
  const placementMode = useCircuitStore((state): GateType | null => state.placementMode)
  const wiringFrom = useCircuitStore((state): WiringState | null => state.wiringFrom)
  const hoveredGateId = useCircuitStore((state): string | null => state.hoveredGateId)
  
  // Disable orbital controls when any interaction is active or when hovering over a gate
  const isInteracting = isDragActive || placementMode !== null || wiringFrom !== null || hoveredGateId !== null
  
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2}
      enableRotate={!isInteracting}
      enablePan={!isInteracting}
      enableZoom={true}
    />
  )
}
