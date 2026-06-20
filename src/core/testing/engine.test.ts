import { describe, it, expect } from 'vitest'
import { runTest } from './engine'
import { parseTST } from './tstParser'
import { parseCmp } from './cmpParser'
import type { CmpFile } from './cmpParser'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import { project1TstFixtures } from './project1TstFixtures'
import { project1CmpFixtures } from './project1CmpFixtures'

function script(src: string) {
  const r = parseTST(src)
  if (!r.success) throw new Error('tst parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.script
}

function cmp(src: string): CmpFile {
  const r = parseCmp(src)
  if (!r.success) throw new Error('cmp parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.file
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

describe('runTest — comparison', () => {
  function builtinNot() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
    return reg
  }

  it('passes Not.tst against Not.cmp using the builtin Not', () => {
    const result = runTest(script(project1TstFixtures.Not), { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.error).toBeNull()
    expect(result.passed).toBe(true)
    expect(result.firstFailure).toBeNull()
  })

  it('reports firstFailure with row/column/expected/actual on a value mismatch', () => {
    const reg = createChipRegistry()
    // A broken Not that always returns 0 → wrong on input 0 (expects 1).
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    const result = runTest(script(project1TstFixtures.Not), { registry: reg, cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.firstFailure).toMatchObject({ row: 0, column: 'out', expected: '1', actual: '0' })
  })

  it('errors when output row count does not match the .cmp row count', () => {
    // The script emits one output row; Not.cmp expects two.
    const s = script('load Not.hdl, output-list in out; set in 0, eval, output;')
    const result = runTest(s, { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/row count/i)
  })
})
