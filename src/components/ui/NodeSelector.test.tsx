// Tests for NodeSelector component
import { describe, it, expect } from 'vitest'
import { NodeSelector } from './NodeSelector'

// Note: Full component testing with RTL is complex due to Zustand integration.
// This test focuses on:
// 1. Component exports correctly
// Full interaction tests are covered via E2E tests.

describe('NodeSelector', () => {
  it('exports a valid component', () => {
    expect(NodeSelector).toBeDefined()
    expect(typeof NodeSelector).toBe('function')
  })
})
