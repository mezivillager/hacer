// Tests for NodeRenderer component
import { describe, it, expect } from 'vitest'
import { NodeRenderer } from './NodeRenderer'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. DisplayName is set
// Full rendering tests are covered via E2E tests.

describe('NodeRenderer', () => {
  it('exports a valid component', () => {
    expect(NodeRenderer).toBeDefined()
    expect(typeof NodeRenderer).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(NodeRenderer.displayName).toBe('NodeRenderer')
  })
})
