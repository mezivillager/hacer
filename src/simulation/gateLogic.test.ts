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
    it('returns 1 when both inputs are 0', () => {
      expect(nandGate(0, 0)).toBe(1)
    })

    it('returns 1 when first input is 1, second is 0', () => {
      expect(nandGate(1, 0)).toBe(1)
    })

    it('returns 1 when first input is 0, second is 1', () => {
      expect(nandGate(0, 1)).toBe(1)
    })

    it('returns 0 only when both inputs are 1', () => {
      expect(nandGate(1, 1)).toBe(0)
    })
  })

  describe('andGate', () => {
    it('returns 0 when both inputs are 0', () => {
      expect(andGate(0, 0)).toBe(0)
    })

    it('returns 0 when one input is 0', () => {
      expect(andGate(1, 0)).toBe(0)
      expect(andGate(0, 1)).toBe(0)
    })

    it('returns 1 only when both inputs are 1', () => {
      expect(andGate(1, 1)).toBe(1)
    })
  })

  describe('orGate', () => {
    it('returns 0 only when both inputs are 0', () => {
      expect(orGate(0, 0)).toBe(0)
    })

    it('returns 1 when at least one input is 1', () => {
      expect(orGate(1, 0)).toBe(1)
      expect(orGate(0, 1)).toBe(1)
      expect(orGate(1, 1)).toBe(1)
    })
  })

  describe('notGate', () => {
    it('returns 1 when input is 0', () => {
      expect(notGate(0)).toBe(1)
    })

    it('returns 0 when input is 1', () => {
      expect(notGate(1)).toBe(0)
    })
  })

  describe('norGate', () => {
    it('returns 1 only when both inputs are 0', () => {
      expect(norGate(0, 0)).toBe(1)
    })

    it('returns 0 when at least one input is 1', () => {
      expect(norGate(1, 0)).toBe(0)
      expect(norGate(0, 1)).toBe(0)
      expect(norGate(1, 1)).toBe(0)
    })
  })

  describe('xorGate', () => {
    it('returns 0 when both inputs are the same', () => {
      expect(xorGate(0, 0)).toBe(0)
      expect(xorGate(1, 1)).toBe(0)
    })

    it('returns 1 when inputs are different', () => {
      expect(xorGate(1, 0)).toBe(1)
      expect(xorGate(0, 1)).toBe(1)
    })
  })

  describe('xnorGate', () => {
    it('returns 1 when both inputs are the same', () => {
      expect(xnorGate(0, 0)).toBe(1)
      expect(xnorGate(1, 1)).toBe(1)
    })

    it('returns 0 when inputs are different', () => {
      expect(xnorGate(1, 0)).toBe(0)
      expect(xnorGate(0, 1)).toBe(0)
    })
  })
})

describe('Gate Logic Lookup Table', () => {
  it('NAND logic matches truth table', () => {
    expect(gateLogic.NAND([0, 0])).toBe(1)
    expect(gateLogic.NAND([1, 0])).toBe(1)
    expect(gateLogic.NAND([0, 1])).toBe(1)
    expect(gateLogic.NAND([1, 1])).toBe(0)
  })

  it('AND logic matches truth table', () => {
    expect(gateLogic.AND([0, 0])).toBe(0)
    expect(gateLogic.AND([1, 1])).toBe(1)
  })

  it('OR logic matches truth table', () => {
    expect(gateLogic.OR([0, 0])).toBe(0)
    expect(gateLogic.OR([1, 0])).toBe(1)
  })

  it('NOT logic matches truth table', () => {
    expect(gateLogic.NOT([0])).toBe(1)
    expect(gateLogic.NOT([1])).toBe(0)
  })

  it('NOR logic matches truth table', () => {
    expect(gateLogic.NOR([0, 0])).toBe(1)
    expect(gateLogic.NOR([1, 0])).toBe(0)
  })

  it('XOR logic matches truth table', () => {
    expect(gateLogic.XOR([0, 0])).toBe(0)
    expect(gateLogic.XOR([1, 0])).toBe(1)
  })

  it('XNOR logic matches truth table', () => {
    expect(gateLogic.XNOR([0, 0])).toBe(1)
    expect(gateLogic.XNOR([1, 0])).toBe(0)
  })
})
