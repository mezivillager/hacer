/**
 * Snap a value to grid (0.5 unit increments)
 */
export const snapToGrid = (value: number): number => Math.round(value * 2) / 2

