import { useEffect, useRef } from 'react'
import { useCircuitStore } from '@/store/circuitStore'
import type { WireSegment, WirePath } from '@/utils/wiringScheme/types'
import type { WiringState } from '@/store/types'

interface UseStoreWirePreviewSegmentsParams {
  path: WirePath | null
  wiringFrom: WiringState | null
  fromPinType: 'input' | 'output'
}

/**
 * Hook to store/persist calculated path segments back to wiringFrom state.
 * Normalizes segments (reverse if needed for input->output) and stores them
 * in wiringFrom.segments for use when completing the wire.
 *
 * @param params - Parameters including path, wiringFrom, and fromPinType
 */
export function useStoreWirePreviewSegments({
  path,
  wiringFrom,
  fromPinType,
}: UseStoreWirePreviewSegmentsParams): void {
  // Using ref to track stored segments to avoid infinite loops
  const storedSegmentsRef = useRef<string | null>(null)
  const calculatedPathRef = useRef<{ segments: WireSegment[], fromPinType: string } | null>(null)

  // Store segments in useEffect (refs should not be updated during render)
  useEffect(() => {
    // Update ref with current path data
    if (path && wiringFrom) {
      calculatedPathRef.current = {
        segments: path.segments,
        fromPinType,
      }
    } else {
      calculatedPathRef.current = null
    }

    const pathData = calculatedPathRef.current
    // Store segments when destination is set (either gate pin or node)
    const hasGateDestination = wiringFrom?.destinationGateId && wiringFrom?.destinationPinId
    const hasNodeDestination = wiringFrom?.destinationNodeId && wiringFrom?.destinationNodeType
    const hasDestination = hasGateDestination || hasNodeDestination

    if (pathData && hasDestination) {
      // Normalize segments: always store as output -> input (or source -> destination)
      let segmentsToStore = pathData.segments

      // If wiring from input to output, we need to reverse segments
      // For node destinations, segments are already in the correct direction
      if (hasGateDestination && pathData.fromPinType !== 'output') {
        segmentsToStore = pathData.segments.map(seg => ({
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
  }, [path, wiringFrom, fromPinType]) // Update when path, wiringFrom, or fromPinType changes
}

