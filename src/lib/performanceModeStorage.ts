import type { PerformanceMode } from '@/store/types'

export const PERFORMANCE_MODE_STORAGE_KEY = 'hacer.performanceMode'

export function isPerformanceMode(value: unknown): value is PerformanceMode {
  return value === 'normal' || value === 'low-power'
}

export function readPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'normal'

  try {
    const stored = window.localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)
    return isPerformanceMode(stored) ? stored : 'normal'
  } catch {
    return 'normal'
  }
}

export function writePerformanceMode(mode: PerformanceMode): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, mode)
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}
