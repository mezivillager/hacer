import { describe, it, expect } from 'vitest'
import { NandGate } from './NandGate'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. DisplayName is set
// Note: Memoization is now handled automatically by React Compiler

describe('NandGate', () => {
  it('exports a valid component', () => {
    expect(NandGate).toBeDefined()
    expect(typeof NandGate).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(NandGate.displayName).toBe('NandGate')
  })

  // Note: Full rendering tests would require mocking Three.js and R3F
  // For 3D components, business logic should be extracted to hooks
  // and tested separately. The rendering is tested via E2E tests.
})
