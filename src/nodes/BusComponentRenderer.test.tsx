import { describe, it, expect } from 'vitest'
import { BusComponentRenderer } from './BusComponentRenderer'

describe('BusComponentRenderer', () => {
  it('exports a valid component with a displayName', () => {
    expect(typeof BusComponentRenderer).toBe('function')
    expect(BusComponentRenderer.displayName).toBe('BusComponentRenderer')
  })
})
