import { message } from 'antd'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Wire3D } from '../Wire3D'
import { trackRender } from '@/utils/renderTracking'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { colors } from '@/theme'

/**
 * Wire preview - only renders when wiring is active.
 * Subscribes to wiringFrom state.
 * Uses grid-aligned routing with real-time updates.
 */
export function WirePreview() {
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  
  const isActive = wiringFrom !== null && wiringFrom.previewEndPosition !== null
  
  trackRender('WirePreview', `active:${isActive}`)
  
  console.debug('[WirePreview] Render', {
    hasWiringFrom: !!wiringFrom,
    hasPreviewEnd: !!wiringFrom?.previewEndPosition,
    fromPosition: wiringFrom?.fromPosition,
    previewEndPosition: wiringFrom?.previewEndPosition,
  })
  
  if (!wiringFrom || !wiringFrom.previewEndPosition) return null
  
  // Don't snap preview end position - use exact cursor position for alignment
  // Only snap for final wire creation, not for preview
  const previewEnd = wiringFrom.previewEndPosition
  
  // Edge case: if positions are too close, don't render
  const dx = previewEnd.x - wiringFrom.fromPosition.x
  const dy = previewEnd.y - wiringFrom.fromPosition.y
  const dz = previewEnd.z - wiringFrom.fromPosition.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  
  console.debug('[WirePreview] Distance check', {
    distance,
    start: wiringFrom.fromPosition,
    end: previewEnd,
    willRender: distance >= 0.001,
  })
  
  if (distance < 0.001) {
    console.debug('[WirePreview] Skipping render - positions too close', { distance })
    return null // Don't render if positions are essentially the same
  }
  
  // Get destination pin from store (set by pin hover handlers in BaseGate)
  // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
  const allGates = useCircuitStore.getState().gates
  
  let destinationPin: { gateId: string; pinId: string; pinCenter: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number } } | null = null
  
  // Use destination pin from store if available (set when pin is hovered via onPointerOver)
  console.debug('[WirePreview] Checking destination pin', {
    destinationGateId: wiringFrom.destinationGateId,
    destinationPinId: wiringFrom.destinationPinId,
    hasBoth: !!(wiringFrom.destinationGateId && wiringFrom.destinationPinId),
  })
  if (wiringFrom.destinationGateId && wiringFrom.destinationPinId) {
    console.debug('[WirePreview] Destination pin found', {
      destinationGateId: wiringFrom.destinationGateId,
      destinationPinId: wiringFrom.destinationPinId,
    })
    // TypeScript narrows these to string after the null check
    const destinationGateId: string = wiringFrom.destinationGateId
    const destinationPinId: string = wiringFrom.destinationPinId
    
    const pinCenter = circuitActions.getPinWorldPosition(destinationGateId, destinationPinId)
    const pinOrientation = circuitActions.getPinOrientation(destinationGateId, destinationPinId)
    
    if (pinCenter && pinOrientation) {
      destinationPin = {
        gateId: destinationGateId,
        pinId: destinationPinId,
        pinCenter,
        orientation: pinOrientation,
      }
    }
  }
  
  // Get start pin orientation for proper exit segment
  const startOrientation = circuitActions.getPinOrientation(
    wiringFrom.fromGateId,
    wiringFrom.fromPinId
  )
  
  if (!startOrientation) {
    return null // Can't create preview without orientation
  }
  
  // Calculate path - use pin destination if cursor is on a pin, otherwise cursor destination
  let previewPath
  try {
    previewPath = destinationPin
      ? calculateWirePath(
          wiringFrom.fromPosition,
          { 
            type: 'pin', 
            pin: destinationPin.pinCenter, 
            orientation: { direction: destinationPin.orientation } 
          },
          { direction: startOrientation },
          allGates,
          {
            sourceGateId: wiringFrom.fromGateId,
            destinationGateId: destinationPin.gateId,
          }
        )
      : calculateWirePath(
          wiringFrom.fromPosition,
          { type: 'cursor', pos: previewEnd },
          { direction: startOrientation },
          allGates,
          {
            sourceGateId: wiringFrom.fromGateId,
            destinationGateId: undefined,
          }
        )
  } catch (error) {
    // Log error details to console for debugging
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

