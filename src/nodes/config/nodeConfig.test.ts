// Tests for node configuration
import { describe, it, expect } from 'vitest'
import {
  NODE_DIMENSIONS,
  NODE_COLORS,
  INPUT_NODE_CONFIG,
  OUTPUT_NODE_CONFIG,
  CONSTANT_NODE_CONFIG,
  JUNCTION_CONFIG,
  calculateNodePinPosition,
} from './nodeConfig'

describe('Node Configuration', () => {
  describe('NODE_DIMENSIONS', () => {
    it('defines body dimensions for nodes', () => {
      expect(NODE_DIMENSIONS.BODY_WIDTH).toBeGreaterThan(0)
      expect(NODE_DIMENSIONS.BODY_HEIGHT).toBeGreaterThan(0)
      expect(NODE_DIMENSIONS.BODY_DEPTH).toBeGreaterThan(0)
    })

    it('defines pin radius', () => {
      expect(NODE_DIMENSIONS.PIN_RADIUS).toBeGreaterThan(0)
    })

    it('defines junction radius', () => {
      expect(NODE_DIMENSIONS.JUNCTION_RADIUS).toBeGreaterThan(0)
    })
  })

  describe('NODE_COLORS', () => {
    it('defines colors for input nodes', () => {
      expect(NODE_COLORS.input.body).toBeDefined()
      expect(NODE_COLORS.input.hover).toBeDefined()
      expect(NODE_COLORS.input.selected).toBeDefined()
    })

    it('defines colors for output nodes', () => {
      expect(NODE_COLORS.output.body).toBeDefined()
      expect(NODE_COLORS.output.hover).toBeDefined()
      expect(NODE_COLORS.output.selected).toBeDefined()
    })

    it('defines colors for constant nodes', () => {
      expect(NODE_COLORS.constant.body).toBeDefined()
      expect(NODE_COLORS.constant.hover).toBeDefined()
    })

    it('defines junction color', () => {
      expect(NODE_COLORS.junction).toBeDefined()
    })
  })

  describe('INPUT_NODE_CONFIG', () => {
    it('has text configuration', () => {
      expect(INPUT_NODE_CONFIG.text.fontSize).toBeGreaterThan(0)
      expect(INPUT_NODE_CONFIG.text.position).toHaveLength(3)
    })

    it('has geometry configuration', () => {
      expect(INPUT_NODE_CONFIG.geometry.args).toHaveLength(3)
    })
  })

  describe('OUTPUT_NODE_CONFIG', () => {
    it('has text configuration', () => {
      expect(OUTPUT_NODE_CONFIG.text.fontSize).toBeGreaterThan(0)
      expect(OUTPUT_NODE_CONFIG.text.position).toHaveLength(3)
    })

    it('has geometry configuration', () => {
      expect(OUTPUT_NODE_CONFIG.geometry.args).toHaveLength(3)
    })
  })

  describe('CONSTANT_NODE_CONFIG', () => {
    it('has text configuration', () => {
      expect(CONSTANT_NODE_CONFIG.text.fontSize).toBeGreaterThan(0)
      expect(CONSTANT_NODE_CONFIG.text.position).toHaveLength(3)
    })

    it('has geometry configuration', () => {
      expect(CONSTANT_NODE_CONFIG.geometry.args).toHaveLength(3)
    })
  })

  describe('JUNCTION_CONFIG', () => {
    it('defines junction sphere geometry', () => {
      expect(JUNCTION_CONFIG.radius).toBeGreaterThan(0)
      expect(JUNCTION_CONFIG.segments).toBeGreaterThan(0)
    })
  })

  describe('calculateNodePinPosition', () => {
    it('calculates output pin position for input node (right side)', () => {
      const pinPos = calculateNodePinPosition('input')
      expect(pinPos.x).toBeGreaterThan(0) // Output is on right side
      expect(pinPos.y).toBe(0)
      expect(pinPos.z).toBe(0)
    })

    it('calculates input pin position for output node (left side)', () => {
      const pinPos = calculateNodePinPosition('output')
      expect(pinPos.x).toBeLessThan(0) // Input is on left side
      expect(pinPos.y).toBe(0)
      expect(pinPos.z).toBe(0)
    })

    it('calculates output pin position for constant node (right side)', () => {
      const pinPos = calculateNodePinPosition('constant')
      expect(pinPos.x).toBeGreaterThan(0) // Output is on right side
      expect(pinPos.y).toBe(0)
      expect(pinPos.z).toBe(0)
    })
  })
})
