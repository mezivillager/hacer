// Tests for OutputNode3D component
import { describe, it, expect } from 'vitest'
import { OutputNode3D } from './OutputNode3D'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. DisplayName is set
// Full rendering tests are covered via E2E tests.

describe('OutputNode3D', () => {
  it('exports a valid component', () => {
    expect(OutputNode3D).toBeDefined()
    expect(typeof OutputNode3D).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(OutputNode3D.displayName).toBe('OutputNode3D')
  })
})
