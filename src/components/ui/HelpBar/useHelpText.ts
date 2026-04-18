import { useCircuitStore } from '@/store/circuitStore'

/**
 * Returns the contextual help text for the current interaction state.
 * Mirrors the original helpText logic from src/components/canvas/CanvasArea.tsx
 * (which has been removed in favor of HelpBar showing this content).
 */
export function useHelpText(): string {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)

  if (placementMode !== null) {
    return `\u{1F4CD} Click anywhere on the grid to place the ${placementMode} gate \u2022 Press Esc to cancel`
  }
  if (nodePlacementMode !== null) {
    return '\u{1F4CD} Click anywhere on the grid to place the node \u2022 Press Esc to cancel'
  }
  if (junctionPlacementMode === true) {
    return '\u{1F4CD} Click on a wire to place a junction \u2022 Press Esc to cancel'
  }
  if (wiringFrom !== null) {
    return '\u{1F517} Click on another pin to connect \u2022 Click empty space or Esc to cancel'
  }
  return '\u{1F5B1}\u{FE0F} Click pin: Wire \u2022 Shift+click input: Toggle \u2022 Click body: Select \u2022 Drag body: Move \u2022 Left/Right arrows: Rotate gate (when selected) or pan view \u2022 Delete: Remove selected \u2022 Scroll: Zoom'
}
