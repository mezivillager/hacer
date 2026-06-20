import { describe, it, expect, beforeEach } from 'vitest'
import { runTest } from './engine'
import { parseTST } from './tstParser'
import { parseCmp } from './cmpParser'
import type { CmpFile } from './cmpParser'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import { getBuiltinChipRegistry, resetAppRegistriesForTests } from '../chips/appRegistry'
import { project1TstFixtures } from './project1TstFixtures'
import { project1CmpFixtures } from './project1CmpFixtures'
import { parseHDL } from '../hdl/parser'
import { hdlChipDefinition } from '../hdl/compiler'
import { project1HdlSources, project1DependencyOrder } from '../hdl/project1HdlSources'

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

  it('errors when the script emits more output rows than the .cmp has', () => {
    // Not.cmp has 2 rows; this script emits 3 output rows.
    const s = script('load Not.hdl, output-list in out; set in 0, eval, output; set in 1, eval, output; set in 0, eval, output;')
    const result = runTest(s, { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/exceed|row count/i)
  })
})

describe('runTest — error paths', () => {
  it('errors when load names a chip not in the registry', () => {
    const s = script('load Missing.hdl, output-list a out; set a 0, eval, output;')
    const result = runTest(s, { registry: createChipRegistry() })
    expect(result.passed).toBe(false)
    expect(result.error).toContain('Missing')
  })

  it('errors when eval runs before any chip is loaded', () => {
    const s = script('output-list a out; set a 1, eval, output;')
    const result = runTest(s, { registry: createChipRegistry() })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/load/i)
  })

  it('captures a runtime error when evaluating a chip that fails to compile', () => {
    const reg = createChipRegistry()
    // HDL referencing an unknown part → compileHDL fails → evaluateChip throws.
    reg.register({
      name: 'Broken',
      inputs: [{ name: 'in', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'hdl', source: 'CHIP Broken { IN in; OUT out; PARTS: Nope(a=in, out=out); }' },
    })
    const s = script('load Broken.hdl, output-list in out; set in 1, eval, output;')
    const result = runTest(s, { registry: reg })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/compile|Nope/i)
  })
})

describe('gold standard A — all 16 Project-1 .tst pass against builtins', () => {
  beforeEach(() => resetAppRegistriesForTests())

  it('exercises all 16 Project-1 fixtures', () => {
    expect(Object.keys(project1TstFixtures)).toHaveLength(16)
  })

  it.each(Object.keys(project1TstFixtures))('%s.tst passes against the builtin', (name) => {
    const reg = getBuiltinChipRegistry()
    const def = reg.get(name)
    expect(def, `builtin "${name}" should be registered`).toBeDefined()
    const result = runTest(script(project1TstFixtures[name]), {
      registry: reg,
      chip: def!,
      cmpData: cmp(project1CmpFixtures[name]),
    })
    expect(result.error).toBeNull()
    expect(result.passed, `${name}: ${JSON.stringify(result.firstFailure)}`).toBe(true)
  })
})

describe('gold standard B — 15 composites pass against HDL compiled from NAND', () => {
  // Build a registry: Nand as the only builtin, every composite as an HDL ChipDefinition,
  // registered in dependency order so each chip's parts already exist.
  function buildFromNand() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Nand', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: ~(i.a & i.b) & 1 }))
    for (const name of project1DependencyOrder) {
      const ast = parseHDL(project1HdlSources[name])
      if (!ast.success) throw new Error(`HDL parse failed for ${name}: ${ast.errors.map((e) => e.message).join('; ')}`)
      reg.register(hdlChipDefinition(ast.chip, project1HdlSources[name]))
    }
    return reg
  }

  it('exercises all 15 composite chips', () => {
    expect(project1DependencyOrder).toHaveLength(15)
  })

  it.each(project1DependencyOrder)('%s (HDL from NAND) passes its official .tst', (name) => {
    const reg = buildFromNand()
    const def = reg.get(name)
    expect(def, `composite "${name}" should be registered`).toBeDefined()
    const result = runTest(script(project1TstFixtures[name]), {
      registry: reg,
      chip: def!,
      cmpData: cmp(project1CmpFixtures[name]),
    })
    expect(result.error).toBeNull()
    expect(result.passed, `${name}: ${JSON.stringify(result.firstFailure)}`).toBe(true)
  })
})
