import { OrbitControls } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'
import type { WiringState, PerformanceMode } from '@/store/types'

/**
 * OrbitControls component - disabled during interactions (placing, wiring, dragging, hovering over gates).
 * Automatically re-enables when no interactions are active.
 * Optimized automatically by React Compiler.
 */
export function SceneOrbitControls() {
  const isDragActive = useCircuitStore((state): boolean => state.isDragActive)
  const placementMode = useCircuitStore((state): string | null => state.placementMode)
  const wiringFrom = useCircuitStore((state): WiringState | null => state.wiringFrom)
  const hoveredGateId = useCircuitStore((state): string | null => state.hoveredGateId)
  const performanceMode = useCircuitStore((state): PerformanceMode => state.performanceMode)

  // Disable orbital controls when any interaction is active or when hovering over a gate
  const isInteracting = isDragActive || placementMode !== null || wiringFrom !== null || hoveredGateId !== null
  const lowPowerEnabled = performanceMode === 'low-power'

  return (
    <OrbitControls
      makeDefault
      enableDamping={!lowPowerEnabled}
      dampingFactor={lowPowerEnabled ? 0 : 0.05}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2}
      enableRotate={!isInteracting}
      enablePan={!isInteracting}
      enableZoom={true}
    />
  )
}
