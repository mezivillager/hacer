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

describe('Gate Logic - Individual Functions', () => {
  describe('nandGate', () => {
    it('returns true when both inputs are false', () => {
      expect(nandGate(false, false)).toBe(true)
    })

    it('returns true when first input is true, second is false', () => {
      expect(nandGate(true, false)).toBe(true)
    })

    it('returns true when first input is false, second is true', () => {
      expect(nandGate(false, true)).toBe(true)
    })

    it('returns false only when both inputs are true', () => {
      expect(nandGate(true, true)).toBe(false)
    })
  })

  describe('andGate', () => {
    it('returns false when both inputs are false', () => {
      expect(andGate(false, false)).toBe(false)
    })

    it('returns false when one input is false', () => {
      expect(andGate(true, false)).toBe(false)
      expect(andGate(false, true)).toBe(false)
    })

    it('returns true only when both inputs are true', () => {
      expect(andGate(true, true)).toBe(true)
    })
  })

  describe('orGate', () => {
    it('returns false only when both inputs are false', () => {
      expect(orGate(false, false)).toBe(false)
    })

    it('returns true when at least one input is true', () => {
      expect(orGate(true, false)).toBe(true)
      expect(orGate(false, true)).toBe(true)
      expect(orGate(true, true)).toBe(true)
    })
  })

  describe('notGate', () => {
    it('returns true when input is false', () => {
      expect(notGate(false)).toBe(true)
    })

    it('returns false when input is true', () => {
      expect(notGate(true)).toBe(false)
    })
  })

  describe('norGate', () => {
    it('returns true only when both inputs are false', () => {
      expect(norGate(false, false)).toBe(true)
    })

    it('returns false when at least one input is true', () => {
      expect(norGate(true, false)).toBe(false)
      expect(norGate(false, true)).toBe(false)
      expect(norGate(true, true)).toBe(false)
    })
  })

  describe('xorGate', () => {
    it('returns false when both inputs are the same', () => {
      expect(xorGate(false, false)).toBe(false)
      expect(xorGate(true, true)).toBe(false)
    })

    it('returns true when inputs are different', () => {
      expect(xorGate(true, false)).toBe(true)
      expect(xorGate(false, true)).toBe(true)
    })
  })

  describe('xnorGate', () => {
    it('returns true when both inputs are the same', () => {
      expect(xnorGate(false, false)).toBe(true)
      expect(xnorGate(true, true)).toBe(true)
    })

    it('returns false when inputs are different', () => {
      expect(xnorGate(true, false)).toBe(false)
      expect(xnorGate(false, true)).toBe(false)
    })
  })
})

describe('Gate Logic Lookup Table', () => {
  it('NAND logic matches truth table', () => {
    expect(gateLogic.NAND([false, false])).toBe(true)
    expect(gateLogic.NAND([true, false])).toBe(true)
    expect(gateLogic.NAND([false, true])).toBe(true)
    expect(gateLogic.NAND([true, true])).toBe(false)
  })

  it('AND logic matches truth table', () => {
    expect(gateLogic.AND([false, false])).toBe(false)
    expect(gateLogic.AND([true, true])).toBe(true)
  })

  it('OR logic matches truth table', () => {
    expect(gateLogic.OR([false, false])).toBe(false)
    expect(gateLogic.OR([true, false])).toBe(true)
  })

  it('NOT logic matches truth table', () => {
    expect(gateLogic.NOT([false])).toBe(true)
    expect(gateLogic.NOT([true])).toBe(false)
  })

  it('NOR logic matches truth table', () => {
    expect(gateLogic.NOR([false, false])).toBe(true)
    expect(gateLogic.NOR([true, false])).toBe(false)
  })

  it('XOR logic matches truth table', () => {
    expect(gateLogic.XOR([false, false])).toBe(false)
    expect(gateLogic.XOR([true, false])).toBe(true)
  })

  it('XNOR logic matches truth table', () => {
    expect(gateLogic.XNOR([false, false])).toBe(true)
    expect(gateLogic.XNOR([true, false])).toBe(false)
  })
})
