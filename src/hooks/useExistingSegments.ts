import { useCircuitStore } from '@/store/circuitStore'
import { collectWireSegments } from '@/utils/wiringScheme'
import type { WireSegment } from '@/utils/wiringScheme/types'
import type { Wire } from '@/store/types'

/**
 * Hook to collect all existing wire segments from the store.
 * Subscribes to wires and collects segments from wire.segments.
 * 
 * @returns Array of all wire segments from all wires in the store
 * 
 * @example
 * const existingSegments = useExistingSegments()
 * // Use segments for pathfinding collision detection
 */
export function useExistingSegments(): WireSegment[] {
  const wires: Wire[] = useCircuitStore((s) => s.wires)
  const segments: WireSegment[] = collectWireSegments(wires)
  return segments
}

