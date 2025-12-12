import { describe, it, expect } from 'vitest'
import { NotGate } from './NotGate'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. DisplayName is set
// Note: Memoization is now handled automatically by React Compiler

describe('NotGate', () => {
  it('exports a valid component', () => {
    expect(NotGate).toBeDefined()
    expect(typeof NotGate).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(NotGate.displayName).toBe('NotGate')
  })

  // Note: Full rendering tests would require mocking Three.js and R3F
  // For 3D components, business logic should be extracted to hooks
  // and tested separately. The rendering is tested via E2E tests.
})
