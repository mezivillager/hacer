import { useEffect, useRef } from 'react'
import { calculateWirePath, canExtendPath, extendPathFromEnd } from '@/utils/wiringScheme'
import type { WireSegment, WirePath, DestinationType, Position } from '@/utils/wiringScheme/types'
import type { GateInstance, WiringState } from '@/store/types'

interface UseWirePreviewPathParams {
  wiringFrom: WiringState | null
  destination: DestinationType | null
  destinationGateId: string | undefined
  existingSegments: WireSegment[]
  startOrientation: { x: number; y: number; z: number } | null
  allGates: GateInstance[]
  fromPosition: Position
}

interface UseWirePreviewPathResult {
  path: WirePath | null
  error: Error | null
}

/**
 * Hook to calculate wire preview path with incremental extension support.
 * Manages path state and handles extension vs recalculation decisions.
 *
 * @param params - Parameters for path calculation
 * @returns Path calculation result with path and error state
 */
export function useWirePreviewPath({
  wiringFrom,
  destination,
  destinationGateId,
  existingSegments,
  startOrientation,
  allGates,
  fromPosition,
}: UseWirePreviewPathParams): UseWirePreviewPathResult {
  // Path state management for incremental extension
  const lastCalculatedPathRef = useRef<WirePath | null>(null)
  const lastPathEndRef = useRef<Position | null>(null)
  const lastDestinationRef = useRef<{ type: 'cursor' | 'pin', data: Position } | null>(null)
  const lastSegmentRef = useRef<WireSegment | null>(null)

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

  // Early returns if prerequisites not met
  if (!wiringFrom || !destination || !startOrientation) {
    return { path: null, error: null }
  }

  // Calculate or extend path
  let previewPath: WirePath | undefined
  let shouldCalculateWirePath = true
  let error: Error | null = null

  try {
    const hasLastPath = lastCalculatedPathRef.current !== null
    const hasLastSegment = lastSegmentRef.current !== null
    const hasLastPathEnd = lastPathEndRef.current !== null
    const lastPathEnd = lastPathEndRef.current
    const lastSegment = lastSegmentRef.current

    // If we've already reached a pin (last segment is entry segment), use previous path
    // This avoids redundant extension attempts and recalculations
    const hasReachedPin = lastSegment?.type === 'entry'
    const isOnPin = destination.type === 'pin'

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
        canExtendPath(lastPathEnd, lastSegment, destination, {
          existingSegments,
        })

      if (canExtend && lastCalculatedPathRef.current) {
        // Try to extend from last path
        try {
          previewPath = extendPathFromEnd(
            lastCalculatedPathRef.current,
            destination,
            {
              existingSegments,
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
      previewPath = calculateWirePath(
        fromPosition,
        destination,
        { direction: startOrientation },
        allGates,
        {
          sourceGateId: wiringFrom.fromGateId,
          destinationGateId,
          existingSegments,
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
        type: destination.type,
        data: destination.type === 'cursor' ? destination.pos : destination.pin,
      }
    }
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err))
    console.error('[WirePreview] Pathfinding error:', error)
    console.error('[WirePreview] Wiring context:', {
      fromGateId: wiringFrom.fromGateId,
      fromPinId: wiringFrom.fromPinId,
      destinationGateId: wiringFrom.destinationGateId,
      destinationPinId: wiringFrom.destinationPinId,
      previewEndPosition: wiringFrom.previewEndPosition,
    })
  }

  return {
    path: previewPath || null,
    error,
  }
}

