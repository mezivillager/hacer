import { describe, it, expect } from 'vitest'
import { OrGate } from './OrGate'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. Memo is applied
// 3. DisplayName is set

describe('OrGate', () => {
  it('is memoized component', () => {
    // Check that OrGate is wrapped with memo
    expect(OrGate.displayName).toBe('OrGate')
    // memo adds $$typeof property
    expect(OrGate).toHaveProperty('$$typeof')
  })

  it('has displayName for debugging', () => {
    expect(OrGate.displayName).toBe('OrGate')
  })

  // Note: Full rendering tests would require mocking Three.js and R3F
  // For 3D components, business logic should be extracted to hooks
  // and tested separately. The rendering is tested via E2E tests.
})
