import { describe, it, expect } from 'vitest'
import {
  COMMON_DIMENSIONS,
  calculateBodyBoundaries,
  calculateInputPinX,
  calculateOutputPinX,
  calculateBubblePosition,
  calculateBubbleOutputPinX,
  calculateWireStubPosition,
  createTwoInputPinConfigs,
  createSingleInputPinConfigs,
  createTwoInputWireStubs,
  createSingleInputWireStubs,
} from './common'

describe('calculateBodyBoundaries', () => {
  it('returns symmetric boundaries for width 1.0', () => {
    const result = calculateBodyBoundaries(1.0)
    expect(result.LEFT).toBe(-0.5)
    expect(result.RIGHT).toBe(0.5)
  })

  it('returns symmetric boundaries for width 2.0', () => {
    const result = calculateBodyBoundaries(2.0)
    expect(result.LEFT).toBe(-1.0)
    expect(result.RIGHT).toBe(1.0)
  })

  it('handles zero width', () => {
    const result = calculateBodyBoundaries(0)
    expect(result.LEFT).toBeCloseTo(0)
    expect(result.RIGHT).toBeCloseTo(0)
  })
})

describe('calculateInputPinX', () => {
  it('positions pin one radius outside the body left edge', () => {
    const result = calculateInputPinX(-0.5, 0.1)
    expect(result).toBe(-0.6)
  })

  it('works with different radii', () => {
    const result = calculateInputPinX(-0.5, 0.2)
    expect(result).toBe(-0.7)
  })
})

describe('calculateOutputPinX', () => {
  it('positions pin one radius outside the body right edge', () => {
    const result = calculateOutputPinX(0.5, 0.1)
    expect(result).toBe(0.6)
  })

  it('works with different radii', () => {
    const result = calculateOutputPinX(0.5, 0.2)
    expect(result).toBe(0.7)
  })
})

describe('calculateBubblePosition', () => {
  it('calculates bubble center and right edge correctly', () => {
    const result = calculateBubblePosition(0.5, 0.12)
    expect(result.centerX).toBe(0.62)
    expect(result.right).toBe(0.74)
  })

  it('works with different body positions and radii', () => {
    const result = calculateBubblePosition(0.4, 0.1)
    expect(result.centerX).toBe(0.5)
    expect(result.right).toBe(0.6)
  })
})

describe('calculateBubbleOutputPinX', () => {
  it('positions pin one radius outside the bubble right edge', () => {
    const result = calculateBubbleOutputPinX(0.74, 0.1)
    expect(result).toBe(0.84)
  })
})

describe('calculateWireStubPosition', () => {
  it('calculates left direction stub position correctly', () => {
    const result = calculateWireStubPosition(-0.6, 0.2, 'left')
    expect(result[0]).toBe(-0.6 - COMMON_DIMENSIONS.WIRE_STUB_OFFSET)
    expect(result[1]).toBe(0.2)
    expect(result[2]).toBe(0)
  })

  it('calculates right direction stub position correctly', () => {
    const result = calculateWireStubPosition(0.6, 0, 'right')
    expect(result[0]).toBe(0.6 + COMMON_DIMENSIONS.WIRE_STUB_OFFSET)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0)
  })

  it('uses custom offset when provided', () => {
    const customOffset = 0.25
    const result = calculateWireStubPosition(-0.6, 0.2, 'left', customOffset)
    expect(result[0]).toBe(-0.6 - customOffset)
  })

  it('defaults to left direction', () => {
    const result = calculateWireStubPosition(-0.6, 0.2)
    expect(result[0]).toBeLessThan(-0.6)
  })
})

describe('createTwoInputPinConfigs', () => {
  it('creates three pin configs with correct structure', () => {
    const configs = createTwoInputPinConfigs(
      'gate-1',
      -0.6,
      0.6,
      1,
      0,
      true,
      false,
      1,
      false
    )

    expect(configs).toHaveLength(3)
  })

  it('creates correct input A pin config', () => {
    const configs = createTwoInputPinConfigs(
      'gate-1',
      -0.6,
      0.6,
      1,
      0,
      true,
      false,
      1,
      false
    )

    const inputA = configs[0]
    expect(inputA.pinId).toBe('gate-1-in-0')
    expect(inputA.position).toEqual([-0.6, 0.2, 0])
    expect(inputA.value).toBe(1)
    expect(inputA.connected).toBe(true)
    expect(inputA.pinType).toBe('input')
    expect(inputA.pinName).toBe('inputA')
  })

  it('creates correct input B pin config', () => {
    const configs = createTwoInputPinConfigs(
      'gate-1',
      -0.6,
      0.6,
      1,
      0,
      true,
      false,
      1,
      false
    )

    const inputB = configs[1]
    expect(inputB.pinId).toBe('gate-1-in-1')
    expect(inputB.position).toEqual([-0.6, -0.2, 0])
    expect(inputB.value).toBe(0)
    expect(inputB.connected).toBe(false)
    expect(inputB.pinType).toBe('input')
    expect(inputB.pinName).toBe('inputB')
  })

  it('creates correct output pin config', () => {
    const configs = createTwoInputPinConfigs(
      'gate-1',
      -0.6,
      0.6,
      1,
      0,
      true,
      false,
      1,
      false
    )

    const output = configs[2]
    expect(output.pinId).toBe('gate-1-out-0')
    expect(output.position).toEqual([0.6, 0, 0])
    expect(output.value).toBe(1)
    expect(output.connected).toBe(false)
    expect(output.pinType).toBe('output')
    expect(output.pinName).toBe('output')
  })
})

describe('createSingleInputPinConfigs', () => {
  it('creates two pin configs with correct structure', () => {
    const configs = createSingleInputPinConfigs('gate-1', -0.5, 0.7, 1, true, 0, false)

    expect(configs).toHaveLength(2)
  })

  it('creates correct input pin config', () => {
    const configs = createSingleInputPinConfigs('gate-1', -0.5, 0.7, 1, true, 0, false)

    const input = configs[0]
    expect(input.pinId).toBe('gate-1-in-0')
    expect(input.position).toEqual([-0.5, 0, 0])
    expect(input.value).toBe(1)
    expect(input.connected).toBe(true)
    expect(input.pinType).toBe('input')
    expect(input.pinName).toBe('input')
  })

  it('creates correct output pin config', () => {
    const configs = createSingleInputPinConfigs('gate-1', -0.5, 0.7, 1, true, 0, false)

    const output = configs[1]
    expect(output.pinId).toBe('gate-1-out-0')
    expect(output.position).toEqual([0.7, 0, 0])
    expect(output.value).toBe(0)
    expect(output.connected).toBe(false)
    expect(output.pinType).toBe('output')
    expect(output.pinName).toBe('output')
  })
})

describe('createTwoInputWireStubs', () => {
  it('creates three wire stub positions', () => {
    const stubs = createTwoInputWireStubs(-0.6, 0.6)
    expect(stubs).toHaveLength(3)
  })

  it('positions input A stub correctly', () => {
    const stubs = createTwoInputWireStubs(-0.6, 0.6)
    expect(stubs[0][1]).toBe(0.2)
    expect(stubs[0][2]).toBe(0)
  })

  it('positions input B stub correctly', () => {
    const stubs = createTwoInputWireStubs(-0.6, 0.6)
    expect(stubs[1][1]).toBe(-0.2)
    expect(stubs[1][2]).toBe(0)
  })

  it('positions output stub correctly', () => {
    const stubs = createTwoInputWireStubs(-0.6, 0.6)
    expect(stubs[2][1]).toBe(0)
    expect(stubs[2][2]).toBe(0)
  })
})

describe('createSingleInputWireStubs', () => {
  it('creates two wire stub positions', () => {
    const stubs = createSingleInputWireStubs(-0.5, 0.7)
    expect(stubs).toHaveLength(2)
  })

  it('positions input stub correctly', () => {
    const stubs = createSingleInputWireStubs(-0.5, 0.7)
    expect(stubs[0][1]).toBe(0)
    expect(stubs[0][2]).toBe(0)
  })

  it('positions output stub correctly', () => {
    const stubs = createSingleInputWireStubs(-0.5, 0.7)
    expect(stubs[1][1]).toBe(0)
    expect(stubs[1][2]).toBe(0)
  })
})
