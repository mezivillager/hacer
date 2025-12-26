import { message } from 'antd'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Wire3D } from '../Wire3D'
import { trackRender } from '@/utils/renderTracking'
import { colors } from '@/theme'
import { useExistingSegments } from '@/hooks/useExistingSegments'
import { useDestinationPin } from './hooks/useDestinationPin'
import { useWirePreviewPath } from './hooks/useWirePreviewPath'
import { useStoreWirePreviewSegments } from './hooks/useStoreWirePreviewSegments'

/**
 * Wire preview - only renders when wiring is active.
 * Subscribes to wiringFrom state.
 * Uses grid-aligned routing with real-time updates.
 *
 * Note: Existing wire segments are read from the store (wire.segments) - no recalculation needed.
 * Only the preview wire path is calculated here for rendering.
 */
export function WirePreview() {
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const allGates = useCircuitStore((s) => s.gates)

  // All hooks must be called at the top level (Rules of Hooks)
  const existingSegments = useExistingSegments()
  const destinationResult = useDestinationPin(wiringFrom)
  const startOrientation = wiringFrom
    ? circuitActions.getPinOrientation(wiringFrom.fromGateId, wiringFrom.fromPinId)
    : null

  // Prepare path calculation parameters (null if not available)
  const destination = destinationResult?.destination ?? null
  const destinationGateId = destinationResult?.destinationGateId
  const fromPosition = wiringFrom?.fromPosition ?? { x: 0, y: 0, z: 0 }

  // Calculate wire preview path (hook must be called even if params are null)
  const { path: previewPath, error } = useWirePreviewPath({
    wiringFrom: wiringFrom ?? null,
    destination,
    destinationGateId,
    existingSegments,
    startOrientation,
    allGates,
    fromPosition,
  })

  // Store calculated segments back to wiringFrom state
  useStoreWirePreviewSegments({
    path: previewPath,
    wiringFrom: wiringFrom ?? null,
    fromPinType: wiringFrom?.fromPinType ?? 'output',
  })

  const isActive = wiringFrom !== null && wiringFrom.previewEndPosition !== null
  trackRender('WirePreview', `active:${isActive}`)

  // Early returns after all hooks
  if (!wiringFrom || !wiringFrom.previewEndPosition) return null

  // Edge case: if positions are too close, don't render
  const dx = wiringFrom.previewEndPosition.x - wiringFrom.fromPosition.x
  const dy = wiringFrom.previewEndPosition.y - wiringFrom.fromPosition.y
  const dz = wiringFrom.previewEndPosition.z - wiringFrom.fromPosition.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (distance < 0.001) {
    return null // Don't render if positions are essentially the same
  }

  if (!destinationResult) {
    return null
  }

  if (!startOrientation) {
    return null // Can't create preview without orientation
  }

  // Handle errors
  if (error) {
    console.error('[WirePreview] Pathfinding error:', error)
    console.error('[WirePreview] Wiring context:', {
      fromGateId: wiringFrom.fromGateId,
      fromPinId: wiringFrom.fromPinId,
      destinationGateId: wiringFrom.destinationGateId,
      destinationPinId: wiringFrom.destinationPinId,
      previewEndPosition: wiringFrom.previewEndPosition,
    })

    // Show user-friendly error notification
    message.error('Unable to create wire path. Please try a different connection.')

    // Abort wiring to prevent further errors
    circuitActions.cancelWiring()

    // Return null to prevent rendering invalid preview
    return null
  }

  // No path calculated - don't render
  if (!previewPath) {
    return null
  }

  // Render preview path - Wire3D expects full path, not individual segments
  // Use first segment start and last segment end for start/end props
  const firstSegment = previewPath.segments[0]
  const lastSegment = previewPath.segments[previewPath.segments.length - 1]

  if (!firstSegment || !lastSegment) {
    return null // Invalid path
  }

  return (
    <Wire3D
      start={{ x: firstSegment.start.x, y: firstSegment.start.y, z: firstSegment.start.z }}
      end={{ x: lastSegment.end.x, y: lastSegment.end.y, z: lastSegment.end.z }}
      startOrientation={startOrientation}
      endOrientation={null}
      sourceGateId={wiringFrom.fromGateId}
      precomputedPath={previewPath}
      isPreview
      color={colors.wire.default}
    />
  )
}
