import { describe, it, expect } from 'vitest'
import { createBusPins } from './busPins'

describe('createBusPins', () => {
  it('builds a splitter: one N-bit input "in" and N 1-bit outputs out0..out{N-1}', () => {
    const { inputs, outputs } = createBusPins('splitter', 4)
    expect(inputs).toEqual([{ id: 'in', name: 'in', type: 'input', value: 0, width: 4 }])
    expect(outputs).toHaveLength(4)
    expect(outputs.map((p) => p.id)).toEqual(['out0', 'out1', 'out2', 'out3'])
    expect(outputs.every((p) => p.type === 'output' && p.width === 1 && p.value === 0)).toBe(true)
  })

  it('builds a joiner: N 1-bit inputs in0..in{N-1} and one N-bit output "out"', () => {
    const { inputs, outputs } = createBusPins('joiner', 8)
    expect(inputs).toHaveLength(8)
    expect(inputs.map((p) => p.id)).toEqual(['in0', 'in1', 'in2', 'in3', 'in4', 'in5', 'in6', 'in7'])
    expect(inputs.every((p) => p.type === 'input' && p.width === 1)).toBe(true)
    expect(outputs).toEqual([{ id: 'out', name: 'out', type: 'output', value: 0, width: 8 }])
  })

  it('gives pins unique ids within the component', () => {
    const { inputs, outputs } = createBusPins('splitter', 3)
    const ids = [...inputs, ...outputs].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
