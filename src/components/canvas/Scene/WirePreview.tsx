import { notify } from '@lib/toast'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Wire3D } from '../Wire3D'
import { trackRender } from '@/utils/renderTracking'
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

  const existingSegments = useExistingSegments()
  const destinationResult = useDestinationPin(wiringFrom)

  // For junction sources, startOrientation is not needed (we skip exit segment)
  const startOrientation = wiringFrom
    ? (wiringFrom.source && wiringFrom.source.type === 'input'
      ? { x: 1, y: 0, z: 0 }
      : (wiringFrom.fromGateId && wiringFrom.fromPinId
          ? circuitActions.getPinOrientation(wiringFrom.fromGateId, wiringFrom.fromPinId)
          : null))
    : null

  const destination = destinationResult?.destination ?? null
  const destinationGateId = destinationResult?.destinationGateId
  const fromPosition = wiringFrom?.fromPosition ?? { x: 0, y: 0, z: 0 }

  const { path: previewPath, error } = useWirePreviewPath({
    wiringFrom: wiringFrom ?? null,
    destination,
    destinationGateId,
    existingSegments,
    startOrientation,
    allGates,
    fromPosition,
  })

  useStoreWirePreviewSegments({
    path: previewPath,
    wiringFrom: wiringFrom ?? null,
    fromPinType: wiringFrom?.fromPinType ?? 'output',
  })

  const isActive = wiringFrom !== null && wiringFrom.previewEndPosition !== null
  trackRender('WirePreview', `active:${isActive}`)

  if (!wiringFrom || !wiringFrom.previewEndPosition) return null

  // For junction wiring, compare against junction position; otherwise use fromPosition
  const isJunctionWiring = wiringFrom.source?.type === 'junction'
  const referencePosition = isJunctionWiring
    ? wiringFrom.previewEndPosition
    : wiringFrom.fromPosition

  const dx = wiringFrom.previewEndPosition.x - referencePosition.x
  const dy = wiringFrom.previewEndPosition.y - referencePosition.y
  const dz = wiringFrom.previewEndPosition.z - referencePosition.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (!isJunctionWiring && distance < 0.001) {
    return null
  }

  if (!destinationResult) {
    return null
  }

  if (!isJunctionWiring && !startOrientation) {
    return null
  }

  if (error) {
    notify.error('Unable to create wire path. Please try a different connection.')
    circuitActions.cancelWiring()
    return null
  }

  if (!previewPath) {
    return null
  }

  const firstSegment = previewPath.segments[0]
  const lastSegment = previewPath.segments[previewPath.segments.length - 1]

  if (!firstSegment || !lastSegment) {
    return null
  }

  return (
    <Wire3D
      start={{ x: firstSegment.start.x, y: firstSegment.start.y, z: firstSegment.start.z }}
      end={{ x: lastSegment.end.x, y: lastSegment.end.y, z: lastSegment.end.z }}
      precomputedPath={previewPath}
      isPreview
    />
  )
}
