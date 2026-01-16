// Tests for ConstantNode3D component
import { describe, it, expect } from 'vitest'
import { ConstantNode3D } from './ConstantNode3D'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. DisplayName is set
// Full rendering tests are covered via E2E tests.

describe('ConstantNode3D', () => {
  it('exports a valid component', () => {
    expect(ConstantNode3D).toBeDefined()
    expect(typeof ConstantNode3D).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(ConstantNode3D.displayName).toBe('ConstantNode3D')
  })
})
