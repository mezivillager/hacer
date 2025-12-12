/**
 * Render Tracking Utility
 * 
 * Tracks component re-renders to identify unnecessary updates
 * and provide stable waiting conditions for E2E tests.
 */

interface RenderStats {
  count: number
  lastRenderTime: number
  reasons: string[]
}

interface RenderTracker {
  stats: Record<string, RenderStats>
  totalRenders: number
  lastUpdateTime: number
  isStable: boolean
  stabilityThreshold: number // ms without renders to be considered stable
}

// Global render tracker
const tracker: RenderTracker = {
  stats: {},
  totalRenders: 0,
  lastUpdateTime: Date.now(),
  isStable: false, // Start as not stable until first render cycle completes
  stabilityThreshold: 100, // 100ms without renders = stable
}

let stabilityCheckTimer: ReturnType<typeof setTimeout> | null = null

function updateStability() {
  tracker.isStable = false
  tracker.lastUpdateTime = Date.now()
  
  if (stabilityCheckTimer) {
    clearTimeout(stabilityCheckTimer)
  }
  
  stabilityCheckTimer = setTimeout(() => {
    tracker.isStable = true
    if (typeof window !== 'undefined' && window.__RENDER_TRACKER__) {
      window.__RENDER_TRACKER__.isStable = true
    }
  }, tracker.stabilityThreshold)
}

/**
 * Track a component render
 */
export function trackRender(componentName: string, reason?: string): void {
  if (!tracker.stats[componentName]) {
    tracker.stats[componentName] = {
      count: 0,
      lastRenderTime: 0,
      reasons: [],
    }
  }
  
  const stats = tracker.stats[componentName]
  stats.count++
  stats.lastRenderTime = Date.now()
  if (reason) {
    stats.reasons.push(reason)
    // Keep only last 10 reasons
    if (stats.reasons.length > 10) {
      stats.reasons.shift()
    }
  }
  
  tracker.totalRenders++
  updateStability()
  
  // Update window object for E2E tests
  if (typeof window !== 'undefined') {
    window.__RENDER_TRACKER__ = {
      stats: { ...tracker.stats },
      totalRenders: tracker.totalRenders,
      lastUpdateTime: tracker.lastUpdateTime,
      isStable: tracker.isStable,
      reset: resetRenderStats,
    }
  }
  
  // Development logging
  if (import.meta.env.DEV) {
    const reasonStr = reason ? ` (${reason})` : ''
    console.debug(`[Render] ${componentName}${reasonStr} - Total: ${stats.count}`)
  }
}

/**
 * Get render stats for a component
 */
export function getRenderStats(componentName: string): RenderStats | null {
  return tracker.stats[componentName] || null
}

/**
 * Get total render count
 */
export function getTotalRenders(): number {
  return tracker.totalRenders
}

/**
 * Check if scene is stable (no recent renders)
 */
export function isSceneStable(): boolean {
  return tracker.isStable
}

/**
 * Reset all render stats (useful for tests)
 */
export function resetRenderStats(): void {
  tracker.stats = {}
  tracker.totalRenders = 0
  tracker.lastUpdateTime = 0
  tracker.isStable = true
  
  if (typeof window !== 'undefined') {
    window.__RENDER_TRACKER__ = {
      stats: {},
      totalRenders: 0,
      lastUpdateTime: 0,
      isStable: true,
      reset: resetRenderStats,
    }
  }
}

/**
 * Hook to track renders in a component
 */
export function useRenderTracking(componentName: string, deps?: Record<string, unknown>): void {
  // Track on every render
  const reason = deps ? Object.keys(deps).join(', ') : undefined
  trackRender(componentName, reason)
}

// Initialize window object
if (typeof window !== 'undefined') {
  window.__RENDER_TRACKER__ = {
    stats: {},
    totalRenders: 0,
    lastUpdateTime: Date.now(),
    isStable: false, // Start as not stable
    reset: resetRenderStats,
  }
  
  // Set initial stability after a delay (allows first render cycle to complete)
  setTimeout(() => {
    if (tracker.totalRenders === 0) {
      tracker.isStable = true
      if (window.__RENDER_TRACKER__) {
        window.__RENDER_TRACKER__.isStable = true
      }
    }
  }, 200)
}
