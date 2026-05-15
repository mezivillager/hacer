/**
 * Wire3D Component Tests
 *
 * Note: R3F components require Canvas context and React Compiler uses useMemoCache
 * which requires proper React runtime context. Full rendering tests are covered
 * in E2E tests with proper Canvas setup.
 *
 * These tests verify component exports and basic structure.
 */

import { describe, it, expect } from 'vitest'
import { Wire3D } from './Wire3D'
import { getWireArcPointCount, getWireLineWidth } from './wireRenderConfig'

describe('Wire3D', () => {
  describe('exports', () => {
    it('exports Wire3D component', () => {
      expect(Wire3D).toBeDefined()
    })

    it('is a function component', () => {
      expect(typeof Wire3D).toBe('function')
    })

    it('has correct function name', () => {
      expect(Wire3D.name).toBe('Wire3D')
    })
  })

  describe('render detail policy', () => {
    it('uses fewer arc points in low-power mode', () => {
      expect(getWireArcPointCount('normal')).toBe(30)
      expect(getWireArcPointCount('low-power')).toBe(12)
    })

    it('uses a thinner selected line in low-power mode', () => {
      expect(getWireLineWidth({ isSelected: true, performanceMode: 'normal' })).toBe(3)
      expect(getWireLineWidth({ isSelected: true, performanceMode: 'low-power' })).toBe(2)
      expect(getWireLineWidth({ isSelected: false, performanceMode: 'low-power' })).toBe(1)
    })
  })
})
