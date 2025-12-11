import { describe, it, expect } from 'vitest'
import { XorGate } from './XorGate'

// Note: Full 3D component testing is complex. This test focuses on:
// 1. Component exports correctly
// 2. Memo is applied
// 3. DisplayName is set

describe('XorGate', () => {
  it('is memoized component', () => {
    // Check that XorGate is wrapped with memo
    expect(XorGate.displayName).toBe('XorGate')
    // memo adds $$typeof property
    expect(XorGate).toHaveProperty('$$typeof')
  })

  it('has displayName for debugging', () => {
    expect(XorGate.displayName).toBe('XorGate')
  })

  // Note: Full rendering tests would require mocking Three.js and R3F
  // For 3D components, business logic should be extracted to hooks
  // and tested separately. The rendering is tested via E2E tests.
})
