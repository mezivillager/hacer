import { describe, it, expect } from 'vitest'
import { runTest } from './engine'
import { parseTST } from './tstParser'
import { createChipRegistry, registerBuiltin } from '../chips/registry'

function script(src: string) {
  const r = parseTST(src)
  if (!r.success) throw new Error('tst parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.script
}

describe('runTest — execution', () => {
  it('records output rows when there is nothing to compare against', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'And', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.a & i.b }))
    const s = script('load And.hdl, output-list a b out; set a 1, set b 0, eval, output; set a 1, set b 1, eval, output;')
    const result = runTest(s, { registry: reg })
    expect(result.passed).toBe(true)
    expect(result.outputRows).toHaveLength(2)
    expect(result.outputRows[0].values).toEqual({ a: 1, b: 0, out: 0 })
    expect(result.outputRows[1].values).toEqual({ a: 1, b: 1, out: 1 })
  })
})
