import { useCircuitStore } from '@/store/circuitStore'
import { semanticColors } from '@/theme'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'
import { NODE_DIMENSIONS } from '@/nodes/config'

/**
 * Placement preview - renders when placementMode or nodePlacementMode is active,
 * or during drag. Shows preview only for valid positions.
 */
export function PlacementPreview() {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const previewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const isDragActive = useCircuitStore((s) => s.isDragActive)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)

  const isPlacingGate = placementMode !== null && previewPosition !== null
  const isPlacingNode = nodePlacementMode !== null && previewPosition !== null
  const isDragging = placementMode === null && nodePlacementMode === null && previewPosition !== null && isDragActive
  const isDraggingNode = isDragging && selectedNodeId !== null
  const isActive = isPlacingGate || isPlacingNode || isDragging

  trackRender('PlacementPreview', `active:${isActive},placingGate:${isPlacingGate},placingNode:${isPlacingNode},dragging:${isDragging}`)

  if (!isActive || !previewPosition) return null

  // For gate placement/drag, validate position against existing gates and section lines
  if (isPlacingGate || (isDragging && selectedGateId !== null)) {
    // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
    const gates = useCircuitStore.getState().gates
    const gridPos = worldToGrid(previewPosition)
    const gatesForValidation = isDragging && selectedGateId
      ? gates.filter(g => g.id !== selectedGateId)
      : gates
    const excludeGateId = isDragging && selectedGateId ? selectedGateId : undefined
    const isValid = canPlaceGateAt(gridPos, gatesForValidation, excludeGateId)
    if (!isValid) return null
  }

  // For node placement/drag, use same rules as gates (no section lines, no overlap with gates)
  if (isPlacingNode || isDraggingNode) {
    // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
    const gates = useCircuitStore.getState().gates
    const gridPos = worldToGrid(previewPosition)
    const isValid = canPlaceGateAt(gridPos, gates, undefined)
    if (!isValid) return null
  }

  const previewColor = semanticColors.success

  // Use smaller dimensions for node placement and node drag
  const isNodePreview = isPlacingNode || isDraggingNode
  const boxArgs: [number, number, number] = isNodePreview
    ? [NODE_DIMENSIONS.BODY_WIDTH, NODE_DIMENSIONS.BODY_HEIGHT, NODE_DIMENSIONS.BODY_DEPTH]
    : [1.2, 0.8, 0.4]
  const ringOuter = isNodePreview ? 0.35 : 0.5
  const ringInner = ringOuter + 0.05

  return (
    <group position={[previewPosition.x, 0.2, previewPosition.z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[ringOuter, ringInner, 32]} />
        <meshBasicMaterial color={previewColor} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 16]} />
        <meshBasicMaterial color={previewColor} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={boxArgs} />
        <meshStandardMaterial
          color={previewColor}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </group>
  )
}

