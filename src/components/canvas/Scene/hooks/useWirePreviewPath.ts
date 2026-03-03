import { useEffect, useRef } from 'react'
import { calculateWirePath, calculateWirePathFromJunction, canExtendPath, extendPathFromEnd } from '@/utils/wiringScheme'
import type { WireSegment, WirePath, DestinationType, Position } from '@/utils/wiringScheme/types'
import type { GateInstance, WiringState } from '@/store/types'
import { useCircuitStore } from '@/store/circuitStore'

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
  const junctions = useCircuitStore((s) => s.junctions)
  const wires = useCircuitStore((s) => s.wires)

  const lastCalculatedPathRef = useRef<WirePath | null>(null)
  const lastPathEndRef = useRef<Position | null>(null)
  const lastDestinationRef = useRef<{ type: 'cursor' | 'pin', data: Position } | null>(null)
  const lastSegmentRef = useRef<WireSegment | null>(null)

  const prevWiringSourceRef = useRef<{ gateId: string; pinId: string } | null>(null)

  useEffect(() => {
    if (!wiringFrom) {
      lastCalculatedPathRef.current = null
      lastPathEndRef.current = null
      lastDestinationRef.current = null
      lastSegmentRef.current = null
      prevWiringSourceRef.current = null
      return
    }

    const currentFromGateId = wiringFrom.fromGateId
    const currentFromPinId = wiringFrom.fromPinId

    if (prevWiringSourceRef.current) {
      if (prevWiringSourceRef.current.gateId !== currentFromGateId || prevWiringSourceRef.current.pinId !== currentFromPinId) {
        lastCalculatedPathRef.current = null
        lastPathEndRef.current = null
        lastDestinationRef.current = null
        lastSegmentRef.current = null
      }
    }

    prevWiringSourceRef.current = { gateId: currentFromGateId, pinId: currentFromPinId }
  }, [wiringFrom])

  const isJunctionWiring = wiringFrom?.source?.type === 'junction'
  if (!wiringFrom || !destination) {
    return { path: null, error: null }
  }
  if (!isJunctionWiring && !startOrientation) {
    return { path: null, error: null }
  }

  let previewPath: WirePath | undefined
  let shouldCalculateWirePath = true
  let error: Error | null = null

  try {
    const hasLastPath = lastCalculatedPathRef.current !== null
    const hasLastSegment = lastSegmentRef.current !== null
    const hasLastPathEnd = lastPathEndRef.current !== null
    const lastPathEnd = lastPathEndRef.current
    const lastSegment = lastSegmentRef.current

    const hasReachedPin = lastSegment?.type === 'entry'
    const isOnPin = destination.type === 'pin'

    if (hasReachedPin && isOnPin && lastCalculatedPathRef.current) {
      previewPath = lastCalculatedPathRef.current
      shouldCalculateWirePath = false
    } else {
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
        try {
          previewPath = extendPathFromEnd(
            lastCalculatedPathRef.current,
            destination,
            {
              existingSegments,
            }
          )
          shouldCalculateWirePath = false
        } catch {
          shouldCalculateWirePath = true
        }
      }
    }

    if (shouldCalculateWirePath) {
      const src = wiringFrom.source
      if (src?.type === 'junction') {
        const junction = junctions.find((j) => j.id === src.junctionId)
        if (junction) {
          const sourceWireId = wiringFrom.destination?.type === 'junction'
            ? wiringFrom.destination.originalWireId
            : undefined
          const sourceWire = sourceWireId ? wires.find((w) => w.id === sourceWireId) : undefined
          previewPath = calculateWirePathFromJunction(
            junction.position,
            destination,
            allGates,
            {
              sourceGateId: wiringFrom.fromGateId,
              destinationGateId,
              existingSegments,
              sourceWireSegments: sourceWire?.segments,
            }
          )
        } else {
          const direction = startOrientation ?? { x: 1, y: 0, z: 0 }
          previewPath = calculateWirePath(
            fromPosition,
            destination,
            { direction },
            allGates,
            {
              sourceGateId: wiringFrom.fromGateId,
              destinationGateId,
              existingSegments,
            }
          )
        }
      } else {
        const direction = startOrientation ?? { x: 1, y: 0, z: 0 }
        previewPath = calculateWirePath(
          fromPosition,
          destination,
          { direction },
          allGates,
          {
            sourceGateId: wiringFrom.fromGateId,
            destinationGateId,
            existingSegments,
          }
        )
      }
    }

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
  }

  return {
    path: previewPath || null,
    error,
  }
}
