// src/core/hdl/compiler.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import type { ChipRegistry } from '../chips/registry'
import type { ChipDefinition } from '../chips/types'
import { isBuiltinChip } from '../chips/types'
import { parseHDL } from './parser'
import { compileHDL, type EvalContext } from './compiler'

// A minimal evalChip that only understands builtins (enough to test compileHDL in isolation).
function builtinOnlyCtx(registry: ChipRegistry): EvalContext {
  const ctx: EvalContext = {
    registry,
    depth: 0,
    maxDepth: 100,
    evalChip: (chip, inputs, c) => {
      if (isBuiltinChip(chip)) return chip.implementation.evaluate(inputs)
      // recurse into nested hdl by compiling on the fly (test helper)
      const r = compileHDL(parseHDLOrThrow(chip), registry)
      if (!r.success) throw new Error(r.errors.map((e) => e.message).join('; '))
      return r.evaluate(inputs, { ...c, depth: c.depth + 1 })
    },
  }
  return ctx
}
function parseHDLOrThrow(chip: ChipDefinition) {
  if (chip.implementation.type !== 'hdl') throw new Error('not hdl')
  const p = parseHDL(chip.implementation.source)
  if (!p.success) throw new Error('parse failed')
  return p.chip
}

let registry: ChipRegistry
beforeEach(() => {
  registry = createChipRegistry()
  registerBuiltin(registry, 'Nand',
    [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
    [{ name: 'out', width: 1 }],
    (i) => ({ out: ~(i.a & i.b) & 1 }))
})

describe('compileHDL — single-bit', () => {
  it('compiles Not (Nand(a=in,b=in,out=out)) and evaluates', () => {
    const ast = parseHDL('CHIP Not { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }')
    expect(ast.success).toBe(true)
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(registry)
    expect(r.evaluate({ in: 0 }, ctx)).toEqual({ out: 1 })
    expect(r.evaluate({ in: 1 }, ctx)).toEqual({ out: 0 })
  })

  it('compiles And (internal wire nandOut; Not nested as hdl)', () => {
    // register Not as an hdl chip so And can resolve+nest it
    const notAst = parseHDL('CHIP Not { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }')
    if (!notAst.success) return
    registry.register({ name: 'Not', inputs: [{ name: 'in', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP Not { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }' } })
    const ast = parseHDL('CHIP And { IN a, b; OUT out; PARTS: Nand(a=a, b=b, out=nandOut); Not(in=nandOut, out=out); }')
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(registry)
    expect(r.evaluate({ a: 0, b: 0 }, ctx)).toEqual({ out: 0 })
    expect(r.evaluate({ a: 1, b: 0 }, ctx)).toEqual({ out: 0 })
    expect(r.evaluate({ a: 0, b: 1 }, ctx)).toEqual({ out: 0 })
    expect(r.evaluate({ a: 1, b: 1 }, ctx)).toEqual({ out: 1 })
  })

  it('supports true/false literal connections', () => {
    const ast = parseHDL('CHIP T { IN in; OUT out; PARTS: Nand(a=in, b=true, out=out); }')
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    if (!r.success) return
    const ctx = builtinOnlyCtx(registry)
    expect(r.evaluate({ in: 1 }, ctx)).toEqual({ out: 0 }) // Nand(1,1)=0
    expect(r.evaluate({ in: 0 }, ctx)).toEqual({ out: 1 }) // Nand(0,1)=1
  })

  it('errors on unknown chip-part', () => {
    const ast = parseHDL('CHIP Foo { IN a; OUT out; PARTS: Mystery(a=a, out=out); }')
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors[0].message).toContain('Mystery')
  })

  it('errors on cyclic part dependency', () => {
    // x feeds y and y feeds x via internal wires
    const ast = parseHDL('CHIP C { IN a; OUT out; PARTS: Nand(a=w2, b=a, out=w1); Nand(a=w1, b=a, out=w2); Nand(a=w1, b=w2, out=out); }')
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => /cycle/i.test(e.message))).toBe(true)
  })

  it('BUILTIN passthrough resolves from registry', () => {
    const ast = parseHDL('CHIP Nand { IN a, b; OUT out; BUILTIN Nand; }')
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(registry)
    expect(r.evaluate({ a: 1, b: 1 }, ctx)).toEqual({ out: 0 })
  })
})

describe('compileHDL — sub-bus / 16-bit', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = createChipRegistry()
    registerBuiltin(reg, 'Nand', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: ~(i.a & i.b) & 1 }))
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
  })

  it('compiles Not4 over sub-bus bits and evaluates bitwise', () => {
    const src = `CHIP Not4 { IN in[4]; OUT out[4];
      PARTS:
      Not(in=in[0], out=out[0]);
      Not(in=in[1], out=out[1]);
      Not(in=in[2], out=out[2]);
      Not(in=in[3], out=out[3]);
    }`
    const ast = parseHDL(src)
    expect(ast.success).toBe(true)
    if (!ast.success) return
    const r = compileHDL(ast.chip, reg)
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(reg)
    expect(r.evaluate({ in: 0b0000 }, ctx)).toEqual({ out: 0b1111 })
    expect(r.evaluate({ in: 0b1010 }, ctx)).toEqual({ out: 0b0101 })
  })
})
