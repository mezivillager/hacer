import { message } from 'antd'
import { useEffect, useRef } from 'react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { Wire3D } from '../Wire3D'
import { trackRender } from '@/utils/renderTracking'
import { calculateWirePath, canExtendPath, extendPathFromEnd } from '@/utils/wiringScheme/core'
import { colors } from '@/theme'
import type { WireSegment, WirePath, DestinationType, Position } from '@/utils/wiringScheme/types'

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
  const existingWires = useCircuitStore((s) => s.wires) // Get existing wires to avoid overlaps (must be at top for hooks)
  
  const isActive = wiringFrom !== null && wiringFrom.previewEndPosition !== null
  
  // Path state management for incremental extension
  const lastCalculatedPathRef = useRef<WirePath | null>(null)
  const lastPathEndRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const lastDestinationRef = useRef<{ type: 'cursor' | 'pin', data: Position } | null>(null)
  const lastSegmentRef = useRef<WireSegment | null>(null)
  
  // Store segments in wiringFrom when destination pin path is calculated (for completeWiring to reuse)
  // Using ref to track stored segments to avoid infinite loops
  const storedSegmentsRef = useRef<string | null>(null)
  const calculatedPathRef = useRef<{ segments: WireSegment[], fromPinType: string } | null>(null)
  
  // Track previous wiring source to detect changes
  const prevWiringSourceRef = useRef<{ gateId: string; pinId: string } | null>(null)
  
  // Reset path state when wiring starts or is canceled
  useEffect(() => {
    if (!wiringFrom) {
      // Wiring canceled - clear all path state
      lastCalculatedPathRef.current = null
      lastPathEndRef.current = null
      lastDestinationRef.current = null
      lastSegmentRef.current = null
      prevWiringSourceRef.current = null
      return
    }
    
    // Check if wiring source changed (new wiring started)
    const currentFromGateId = wiringFrom.fromGateId
    const currentFromPinId = wiringFrom.fromPinId
    
    if (prevWiringSourceRef.current) {
      if (prevWiringSourceRef.current.gateId !== currentFromGateId || prevWiringSourceRef.current.pinId !== currentFromPinId) {
        // New wiring started - clear all path state
        lastCalculatedPathRef.current = null
        lastPathEndRef.current = null
        lastDestinationRef.current = null
        lastSegmentRef.current = null
      }
    }
    
    prevWiringSourceRef.current = { gateId: currentFromGateId, pinId: currentFromPinId }
  }, [wiringFrom])
  
  // Store segments in useEffect (before early returns to follow hooks rules)
  useEffect(() => {
    const path = calculatedPathRef.current
    if (path && wiringFrom?.destinationGateId && wiringFrom?.destinationPinId) {
      // Normalize segments: always store as output -> input
      let segmentsToStore = path.segments
      
      // If wiring from input to output, we need to reverse segments
      if (path.fromPinType !== 'output') {
        segmentsToStore = path.segments.map(seg => ({
          ...seg,
          start: seg.end,
          end: seg.start,
        })).reverse()
      }
      
      // Only update if segments actually changed (use ref to avoid infinite loops)
      const segmentsKey = JSON.stringify(segmentsToStore)
      if (storedSegmentsRef.current !== segmentsKey) {
        storedSegmentsRef.current = segmentsKey
        useCircuitStore.setState((state) => {
          if (state.wiringFrom) {
            state.wiringFrom.segments = segmentsToStore
          }
        }, false, 'WirePreview/storeSegments')
      }
    }
  }) // No dependencies - we use refs to access current values, and check wiringFrom from store
  
  trackRender('WirePreview', `active:${isActive}`)
  
  if (!wiringFrom || !wiringFrom.previewEndPosition) return null
  
  // Don't snap preview end position - use exact cursor position for alignment
  // Only snap for final wire creation, not for preview
  const previewEnd = wiringFrom.previewEndPosition
  
  // Edge case: if positions are too close, don't render
  const dx = previewEnd.x - wiringFrom.fromPosition.x
  const dy = previewEnd.y - wiringFrom.fromPosition.y
  const dz = previewEnd.z - wiringFrom.fromPosition.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  
  
  if (distance < 0.001) {
    return null // Don't render if positions are essentially the same
  }
  
  // Get destination pin from store (set by pin hover handlers in BaseGate)
  const allGates = useCircuitStore.getState().gates
  
  // Collect all segments from existing wires (stored in wire.segments) - no calculation needed, just read from store
  const allExistingSegments: WireSegment[] = []
  for (const wire of existingWires) {
    const segments: WireSegment[] | undefined = wire.segments
    if (segments && segments.length > 0) {
      allExistingSegments.push(...segments)
    }
  }
  
  let destinationPin: { gateId: string; pinId: string; pinCenter: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number } } | null = null
  
  // Use destination pin from store if available (set when pin is hovered via onPointerOver)
  if (wiringFrom.destinationGateId && wiringFrom.destinationPinId) {
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
  
  // Determine current destination type and data
  const currentDestination: DestinationType | null = destinationPin
    ? {
        type: 'pin',
        pin: destinationPin.pinCenter,
        orientation: { direction: destinationPin.orientation },
      }
    : { type: 'cursor', pos: previewEnd }
  
  // Calculate or extend path
  let previewPath: WirePath | undefined
  let shouldCalculateWirePath = true
  
  try {
    const hasLastPath = lastCalculatedPathRef.current !== null
    const hasLastSegment = lastSegmentRef.current !== null
    const hasLastPathEnd = lastPathEndRef.current !== null
    const lastPathEnd = lastPathEndRef.current
    const lastSegment = lastSegmentRef.current
    
    // If we've already reached a pin (last segment is entry segment), use previous path
    // This avoids redundant extension attempts and recalculations
    const hasReachedPin = lastSegment?.type === 'entry'
    const isOnPin = currentDestination.type === 'pin'
    
    if (hasReachedPin && isOnPin && lastCalculatedPathRef.current) {
      // Already reached pin - use previous path as-is, no extension or recalculation needed
      previewPath = lastCalculatedPathRef.current
      shouldCalculateWirePath = false
    } else {
      // Check if we can extend (don't check for destination type change)
      const canExtend = 
        hasLastPath &&
        hasLastSegment &&
        hasLastPathEnd &&
        lastPathEnd !== null &&
        lastSegment !== null &&
        canExtendPath(lastPathEnd, lastSegment, currentDestination, {
          existingSegments: allExistingSegments,
        })
      
      if (canExtend && lastCalculatedPathRef.current) {
        // Try to extend from last path
        try {
          previewPath = extendPathFromEnd(
            lastCalculatedPathRef.current,
            currentDestination,
            {
              existingSegments: allExistingSegments,
            }
          )
          shouldCalculateWirePath = false // Extension succeeded, don't recalculate
        } catch (extensionError) {
          // Extension failed (backtracking/overlap/invalid) - will recalculate from scratch
          shouldCalculateWirePath = true
          console.debug('[ 🔥 WirePreview ] Extension failed, recalculating:', extensionError)
        }
      }
    }
    
    // Calculate wire path from scratch if needed
    if (shouldCalculateWirePath) {
      console.debug('[ 🔥 WirePreview ] Recalculating:')
      previewPath = destinationPin
        ? calculateWirePath(
            wiringFrom.fromPosition,
            currentDestination,
            { direction: startOrientation },
            allGates,
            {
              sourceGateId: wiringFrom.fromGateId,
              destinationGateId: destinationPin.gateId,
              existingSegments: allExistingSegments,
            }
          )
        : calculateWirePath(
            wiringFrom.fromPosition,
            currentDestination,
            { direction: startOrientation },
            allGates,
            {
              sourceGateId: wiringFrom.fromGateId,
              destinationGateId: undefined,
              existingSegments: allExistingSegments,
            }
          )
    }
    
    // Update path state refs (previewPath is guaranteed to be assigned at this point)
    if (!previewPath) {
      throw new Error('previewPath must be assigned')
    }
    
    if (previewPath.segments.length > 0) {
      const lastSeg = previewPath.segments[previewPath.segments.length - 1]
      lastCalculatedPathRef.current = previewPath
      lastSegmentRef.current = lastSeg
      lastPathEndRef.current = lastSeg.end
      lastDestinationRef.current = {
        type: currentDestination.type,
        data: currentDestination.type === 'cursor' ? currentDestination.pos : currentDestination.pin,
      }
    }
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
  
  // Store calculated path in ref for useEffect to access
  if (destinationPin && previewPath && wiringFrom) {
    calculatedPathRef.current = {
      segments: previewPath.segments,
      fromPinType: wiringFrom.fromPinType,
    }
  } else {
    calculatedPathRef.current = null
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

