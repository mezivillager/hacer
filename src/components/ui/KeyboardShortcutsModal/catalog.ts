export type ShortcutEntry = { keys: string[]; description: string; comingSoon?: boolean }
export type ShortcutGroup = { name: string; shortcuts: ShortcutEntry[] }

/**
 * All keyboard / mouse shortcuts actually wired in HACER.
 *
 * Sources of truth:
 * - src/hooks/useKeyboardShortcuts.ts    (Esc, Delete/Backspace, I, Arrow keys for rotation)
 * - src/components/canvas/Scene/SceneKeyboardPan.tsx (Arrow keys for camera pan when nothing selected)
 * - R3F OrbitControls defaults              (Scroll zoom, left-drag orbit, right-drag pan)
 * - HelpBar global "?" handler              (open this modal)
 *
 * Entries flagged comingSoon are part of the HACER roadmap (see PR #88
 * follow-up tickets) but not yet wired to a handler.
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Right-click drag'], description: 'Pan camera' },
      { keys: ['Left-click drag'], description: 'Orbit camera' },
      { keys: ['\u2190', '\u2191', '\u2192', '\u2193'], description: 'Pan camera (when nothing selected)' },
      { keys: ['F'], description: 'Fit view', comingSoon: true },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Click body'], description: 'Select gate / wire / node' },
      { keys: ['Esc'], description: 'Deselect' },
      { keys: ['Delete'], description: 'Delete selected' },
      { keys: ['Backspace'], description: 'Delete selected' },
      { keys: ['I'], description: 'Show / hide Properties for selection' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: ['Drag body'], description: 'Move gate or node' },
      { keys: ['\u2190'], description: 'Rotate selected gate counter-clockwise' },
      { keys: ['\u2192'], description: 'Rotate selected gate clockwise' },
    ],
  },
  {
    name: 'Wiring',
    shortcuts: [
      { keys: ['Click pin'], description: 'Start a wire' },
      { keys: ['Click another pin'], description: 'Complete the wire' },
      { keys: ['Click empty space'], description: 'Cancel the wire' },
      { keys: ['Esc'], description: 'Cancel the wire' },
      { keys: ['Shift', 'Click input'], description: 'Toggle input value' },
    ],
  },
  {
    name: 'Simulation',
    shortcuts: [
      { keys: ['Space'], description: 'Run / pause simulation', comingSoon: true },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { keys: ['?'], description: 'Show this dialog' },
    ],
  },
]
