/**
 * UI Element Selectors
 *
 * Centralized selectors for UI components like buttons,
 * status displays, and other DOM elements.
 */

export const UI_SELECTORS = {
  appTitle: 'text=Nand2Fun',
  canvas: 'canvas',

  buttons: {
    addNandGate: 'button:has-text("Add NAND Gate")',
    cancelPlacement: 'button:has-text("Cancel Placement")',
    runSimulation: 'button:has-text("Run Simulation")',
    pauseSimulation: 'button:has-text("Pause Simulation")',
    deleteSelected: 'button:has-text("Delete Selected")',
    clearAll: 'button:has-text("Clear All")',
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
