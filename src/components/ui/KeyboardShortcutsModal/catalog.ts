export type ShortcutEntry = { keys: string[]; action: string; comingSoon?: boolean }
export type ShortcutGroup = { name: string; shortcuts: ShortcutEntry[] }

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Scroll'], action: 'Zoom in/out' },
      { keys: ['Right-click drag'], action: 'Pan camera' },
      { keys: ['Left-click drag'], action: 'Orbit camera' },
      { keys: ['F'], action: 'Fit view', comingSoon: true },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Click'], action: 'Select element' },
      { keys: ['Esc'], action: 'Deselect' },
      { keys: ['Delete'], action: 'Delete selected' },
      { keys: ['Backspace'], action: 'Delete selected' },
      { keys: ['I'], action: 'Show/hide Properties panel for selection' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: ['\u2190'], action: 'Rotate selected gate counter-clockwise' },
      { keys: ['\u2192'], action: 'Rotate selected gate clockwise' },
      { keys: ['Esc'], action: 'Cancel placement / wiring' },
    ],
  },
  {
    name: 'Simulation',
    shortcuts: [
      { keys: ['Space'], action: 'Run/Pause simulation', comingSoon: true },
    ],
  },
]
