/**
 * UI Element Selectors
 *
 * Centralized selectors for UI components like buttons,
 * status displays, and other DOM elements.
 */

export const UI_SELECTORS = {
  appTitle: 'text=HACER',
  canvas: 'canvas',

  buttons: {
    // Legacy button (may not exist anymore, but keeping for compatibility)
    addNandGate: 'button:has-text("Add NAND Gate")',
    cancelPlacement: 'button:has-text("Cancel Placement")',
    runSimulation: '[data-testid="quick-action-run-pause"]',
    pauseSimulation: '[data-testid="quick-action-run-pause"]',
    deleteSelected: '[data-testid="quick-action-delete"]',
    clearAll: '[data-testid="quick-action-clear"]',
  },

  // Gate selector grid - use data-gate-type attribute for precise selection
  gateSelector: {
    grid: '.gate-selector-grid',
    nandIcon: '.gate-icon[data-gate-type="NAND"]',
    andIcon: '.gate-icon[data-gate-type="AND"]',
    orIcon: '.gate-icon[data-gate-type="OR"]',
    notIcon: '.gate-icon[data-gate-type="NOT"]',
    xorIcon: '.gate-icon[data-gate-type="XOR"]',
    // Helper to get icon by gate type
    getIcon: (gateType: 'NAND' | 'AND' | 'OR' | 'NOT' | 'XOR') => {
      return `.gate-icon[data-gate-type="${gateType}"]`
    },
  },

  status: {
    gateCount: 'text=/Gates: \\d+/',
    wireCount: 'text=/Wires: \\d+/',
    running: 'text=/Status:.*Running/',
    paused: 'text=/Status:.*Paused/',
  },
} as const

/**
 * Helper to create a selector for a specific gate/wire count
 */
export function gateCountSelector(count: number): string {
  return `text=/Gates: ${count}/`
}

export function wireCountSelector(count: number): string {
  return `text=/Wires: ${count}/`
}
