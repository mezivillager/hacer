// Centralized color tokens for the application
// All colors should be defined here and imported where needed

export const colors = {
  // Primary brand color
  primary: '#4a9eff',

  // Gate body colors
  gate: {
    body: '#3a4a5a',
    bodyHover: '#5a6a7a',
    bodySelected: '#4a9eff',
    label: '#1a1a2e',
    wireStub: '#888888',
    negationBubble: '#ffffff',
    // Per-gate type colors
    and: { body: '#2d5a3d', hover: '#3d7a4d' },
    nand: { body: '#5a3d6a', hover: '#7a4d8a' },
    or: { body: '#3d4a6a', hover: '#4d5a8a' },
    xor: { body: '#2d6a5a', hover: '#3d8a7a' },
    not: { body: '#6a4a3d', hover: '#8a5a4d' },
  },

  // Pin state colors
  pin: {
    active: '#00ff88',
    inactive: '#ff4444',
    disconnected: '#555555',
  },

  // Wire colors - reddish copper tones
  wire: {
    active: '#00ff88',
    inactive: '#ff4444',
    preview: '#cd7f32', // Reddish copper (same as default)
    default: '#cd7f32', // Reddish copper color
  },

  // Background colors
  background: {
    main: '#1a1a2e',
    sidebarStart: '#1a1a2e',
    sidebarEnd: '#16213e',
  },

  // Border colors
  border: {
    default: '#2a2a4a',
  },

  // Grid colors - grayish tones for contrast with copper wires
  grid: {
    cell: '#666666', // Grayish
    section: '#555555', // Slightly darker gray
    active: '#4a9eff',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.65)',
  },

  // Overlay colors
  overlay: {
    background: 'rgba(0, 0, 0, 0.7)',
    labelBackground: 'rgba(0, 0, 0, 0.8)',
  },
} as const

// Semantic tokens for common use cases
export const semanticColors = {
  success: colors.pin.active,
  error: colors.pin.inactive,
  info: colors.primary,
} as const

// Material properties for 3D objects
export const materials = {
  gate: {
    metalness: 0.3,
    roughness: 0.7,
  },
  pin: {
    metalness: 0.8,
    roughness: 0.2,
  },
  wireStub: {
    metalness: 0.9,
    roughness: 0.1,
  },
} as const

// Type exports for type safety
export type ColorTokens = typeof colors
export type SemanticColors = typeof semanticColors
export type MaterialTokens = typeof materials
