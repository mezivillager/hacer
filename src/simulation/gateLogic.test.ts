import { describe, it, expect } from 'vitest'
import {
  nandGate,
  andGate,
  orGate,
  notGate,
  norGate,
  xorGate,
  xnorGate,
  gateLogic,
} from './gateLogic'
import { maskForWidth } from './busOps'

describe('Gate Logic - Individual Functions', () => {
  describe('nandGate', () => {
    it('returns 1 when both inputs are 0', () => {
      expect(nandGate(0, 0, 1)).toBe(1)
    })

    it('returns 1 when first input is 1, second is 0', () => {
      expect(nandGate(1, 0, 1)).toBe(1)
    })

    it('returns 1 when first input is 0, second is 1', () => {
      expect(nandGate(0, 1, 1)).toBe(1)
    })

    it('returns 0 only when both inputs are 1', () => {
      expect(nandGate(1, 1, 1)).toBe(0)
    })
  })

  describe('andGate', () => {
    it('returns 0 when both inputs are 0', () => {
      expect(andGate(0, 0, 1)).toBe(0)
    })

    it('returns 0 when one input is 0', () => {
      expect(andGate(1, 0, 1)).toBe(0)
      expect(andGate(0, 1, 1)).toBe(0)
    })

    it('returns 1 only when both inputs are 1', () => {
      expect(andGate(1, 1, 1)).toBe(1)
    })
  })

  describe('orGate', () => {
    it('returns 0 only when both inputs are 0', () => {
      expect(orGate(0, 0, 1)).toBe(0)
    })

    it('returns 1 when at least one input is 1', () => {
      expect(orGate(1, 0, 1)).toBe(1)
      expect(orGate(0, 1, 1)).toBe(1)
      expect(orGate(1, 1, 1)).toBe(1)
    })
  })

  describe('notGate', () => {
    it('returns 1 when input is 0', () => {
      expect(notGate(0, 1)).toBe(1)
    })

    it('returns 0 when input is 1', () => {
      expect(notGate(1, 1)).toBe(0)
    })
  })

  describe('norGate', () => {
    it('returns 1 only when both inputs are 0', () => {
      expect(norGate(0, 0, 1)).toBe(1)
    })

    it('returns 0 when at least one input is 1', () => {
      expect(norGate(1, 0, 1)).toBe(0)
      expect(norGate(0, 1, 1)).toBe(0)
      expect(norGate(1, 1, 1)).toBe(0)
    })
  })

  describe('xorGate', () => {
    it('returns 0 when both inputs are the same', () => {
      expect(xorGate(0, 0, 1)).toBe(0)
      expect(xorGate(1, 1, 1)).toBe(0)
    })

    it('returns 1 when inputs are different', () => {
      expect(xorGate(1, 0, 1)).toBe(1)
      expect(xorGate(0, 1, 1)).toBe(1)
    })
  })

  describe('xnorGate', () => {
    it('returns 1 when both inputs are the same', () => {
      expect(xnorGate(0, 0, 1)).toBe(1)
      expect(xnorGate(1, 1, 1)).toBe(1)
    })

    it('returns 0 when inputs are different', () => {
      expect(xnorGate(1, 0, 1)).toBe(0)
      expect(xnorGate(0, 1, 1)).toBe(0)
    })
  })
})

describe('Gate Logic Lookup Table', () => {
  it('NAND logic matches truth table', () => {
    expect(gateLogic.NAND([0, 0], 1)).toBe(1)
    expect(gateLogic.NAND([1, 0], 1)).toBe(1)
    expect(gateLogic.NAND([0, 1], 1)).toBe(1)
    expect(gateLogic.NAND([1, 1], 1)).toBe(0)
  })

  it('AND logic matches truth table', () => {
    expect(gateLogic.AND([0, 0], 1)).toBe(0)
    expect(gateLogic.AND([1, 1], 1)).toBe(1)
  })

  it('OR logic matches truth table', () => {
    expect(gateLogic.OR([0, 0], 1)).toBe(0)
    expect(gateLogic.OR([1, 0], 1)).toBe(1)
  })

  it('NOT logic matches truth table', () => {
    expect(gateLogic.NOT([0], 1)).toBe(1)
    expect(gateLogic.NOT([1], 1)).toBe(0)
  })

  it('NOR logic matches truth table', () => {
    expect(gateLogic.NOR([0, 0], 1)).toBe(1)
    expect(gateLogic.NOR([1, 0], 1)).toBe(0)
  })

  it('XOR logic matches truth table', () => {
    expect(gateLogic.XOR([0, 0], 1)).toBe(0)
    expect(gateLogic.XOR([1, 0], 1)).toBe(1)
  })

  it('XNOR logic matches truth table', () => {
    expect(gateLogic.XNOR([0, 0], 1)).toBe(1)
    expect(gateLogic.XNOR([1, 0], 1)).toBe(0)
  })
})

function expectSingleBit(n: number): void {
  expect(n === 0 || n === 1).toBe(true)
}

describe('Single-bit closure (P05-02)', () => {
  const bits = [0, 1] as const

  it('two-input primitives return only 0 or 1 when inputs are 0 or 1', () => {
    for (const a of bits) {
      for (const b of bits) {
        expectSingleBit(nandGate(a, b, 1))
        expectSingleBit(andGate(a, b, 1))
        expectSingleBit(orGate(a, b, 1))
        expectSingleBit(norGate(a, b, 1))
        expectSingleBit(xorGate(a, b, 1))
        expectSingleBit(xnorGate(a, b, 1))
      }
    }
  })

  it('NOT returns only 0 or 1 for inputs 0 or 1', () => {
    expectSingleBit(notGate(0, 1))
    expectSingleBit(notGate(1, 1))
  })

  it('gateLogic entries return only 0 or 1 for single-bit inputs', () => {
    for (const a of bits) {
      for (const b of bits) {
        expectSingleBit(gateLogic.NAND([a, b], 1))
        expectSingleBit(gateLogic.AND([a, b], 1))
        expectSingleBit(gateLogic.OR([a, b], 1))
        expectSingleBit(gateLogic.NOR([a, b], 1))
        expectSingleBit(gateLogic.XOR([a, b], 1))
        expectSingleBit(gateLogic.XNOR([a, b], 1))
      }
    }
    expectSingleBit(gateLogic.NOT([0], 1))
    expectSingleBit(gateLogic.NOT([1], 1))
  })
})

describe('Wide integers (multi-bit bus semantics, P05-13)', () => {
  it('OR and AND mask to width=1 even with multi-bit inputs', () => {
    // width=1: only lowest bit retained
    expect(orGate(2, 1, 1)).toBe(1)
    expect(andGate(3, 1, 1)).toBe(1)
  })
})

describe('gateLogic — width-aware', () => {
  it('NOT at width 4: 0b0111 → 0b1000', () => {
    expect(gateLogic.NOT([0b0111], 4)).toBe(0b1000)
  })

  it('NOT at width 1 still flips a single bit', () => {
    expect(gateLogic.NOT([0], 1)).toBe(1)
    expect(gateLogic.NOT([1], 1)).toBe(0)
  })

  it('NOT at width 8: 0xAA → 0x55', () => {
    expect(gateLogic.NOT([0xAA], 8)).toBe(0x55)
  })

  it('NOT at width 32 masks safely', () => {
    expect(gateLogic.NOT([0], 32)).toBe(maskForWidth(32))
  })

  it('AND at width 4: 0b1100 & 0b1010 = 0b1000', () => {
    expect(gateLogic.AND([0b1100, 0b1010], 4)).toBe(0b1000)
  })

  it('OR at width 4 masks result to width', () => {
    // 0xFF | 0x00 = 0xFF; mask to width 4 = 0x0F
    expect(gateLogic.OR([0xFF, 0x00], 4)).toBe(0x0F)
  })

  it('XOR at width 8: 0xAA ^ 0xFF = 0x55', () => {
    expect(gateLogic.XOR([0xAA, 0xFF], 8)).toBe(0x55)
  })

  it('NAND at width 4: ~(0b1111 & 0b1111) = 0b0000', () => {
    expect(gateLogic.NAND([0b1111, 0b1111], 4)).toBe(0b0000)
  })

  it('NOR at width 4: ~(0b0001 | 0b0010) = 0b1100', () => {
    expect(gateLogic.NOR([0b0001, 0b0010], 4)).toBe(0b1100)
  })

  it('XNOR at width 4: ~(0b1010 ^ 0b0101) = 0b0000', () => {
    expect(gateLogic.XNOR([0b1010, 0b0101], 4)).toBe(0b0000)
  })
})
