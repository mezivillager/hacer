import type { PerformanceMode } from '@/store/types'

export function getWireArcPointCount(performanceMode: PerformanceMode): number {
  return performanceMode === 'low-power' ? 12 : 30
}

export function getWireLineWidth({
  isSelected,
  performanceMode,
}: {
  isSelected: boolean
  performanceMode: PerformanceMode
}): number {
  if (!isSelected) return 1
  return performanceMode === 'low-power' ? 2 : 3
}
