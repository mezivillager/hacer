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
 * For junction wiring, the path from calculateWirePathFromJunction already contains
 * only the new segments (from junction to destination), so no extraction is needed.
 *
 * @param params - Parameters including path, wiringFrom, and fromPinType
 */
export function useStoreWirePreviewSegments({
  path,
  wiringFrom,
  fromPinType,
}: UseStoreWirePreviewSegmentsParams): void {
  const storedSegmentsRef = useRef<string | null>(null)
  const calculatedPathRef = useRef<{ segments: WireSegment[], fromPinType: string } | null>(null)

  useEffect(() => {
    if (path && wiringFrom) {
      calculatedPathRef.current = {
        segments: path.segments,
        fromPinType,
      }
    } else {
      calculatedPathRef.current = null
    }

    const pathData = calculatedPathRef.current
    const hasGateDestination = wiringFrom?.destinationGateId && wiringFrom?.destinationPinId
    const hasNodeDestination = wiringFrom?.destinationNodeId && wiringFrom?.destinationNodeType
    const hasDestination = hasGateDestination || hasNodeDestination

    if (pathData && hasDestination) {
      let segmentsToStore = pathData.segments

      // For junction wiring, calculateWirePathFromJunction already returns only the
      // new segments (junction to destination). Use them directly.

      // If wiring from input to output, reverse segments
      if (hasGateDestination && pathData.fromPinType !== 'output') {
        segmentsToStore = segmentsToStore.map(seg => ({
          ...seg,
          start: seg.end,
          end: seg.start,
        })).reverse()
      }

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
  }, [path, wiringFrom, fromPinType])
}
