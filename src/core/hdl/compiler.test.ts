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

describe('compileHDL — connection validation (rejects silently-wrong HDL)', () => {
  it('errors when a required part input pin is left unconnected', () => {
    // Nand needs both a and b; b is omitted. Without validation this compiles and the
    // builtin coerces the missing b to 0, producing a plausible-but-wrong truth table.
    const ast = parseHDL('CHIP Bad { IN in; OUT out; PARTS: Nand(a=in, out=out); }')
    expect(ast.success).toBe(true)
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.errors.some((e) => /\bb\b/.test(e.pinName ?? '') || /not connected|unconnected/i.test(e.message))).toBe(true)
    }
  })

  it('errors when a part input reads a signal no part produces (typo)', () => {
    // `nandOtu` is not a chip input, not a literal, and nothing writes it.
    // Without validation it reads as 0 at evaluation, silently changing behavior.
    const ast = parseHDL('CHIP Bad { IN in; OUT out; PARTS: Nand(a=nandOtu, b=in, out=out); }')
    expect(ast.success).toBe(true)
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.errors.some((e) => /nandOtu/.test(e.message))).toBe(true)
    }
  })

  it('errors when an unsliced bus connects to a mismatched-width pin', () => {
    // chip input `in` is 16-bit but Not's `in` pin is 1-bit; the unsliced connection
    // must be rejected (the scalar builtin would otherwise silently truncate the bus).
    registerBuiltin(registry, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
    const ast = parseHDL('CHIP Bad { IN in[16]; OUT out; PARTS: Not(in=in, out=out); }')
    expect(ast.success).toBe(true)
    if (!ast.success) return
    const r = compileHDL(ast.chip, registry)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.errors.some((e) => /width/i.test(e.message))).toBe(true)
    }
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

// ── #355 — signals assembled from several slice writes ─────────────────────────────────────────
// `compileHDL` recorded one producer per signal, so a signal written by several parts only got a
// dependency edge from the *last* writer. The earlier writers could then be scheduled after the
// part that reads the signal, which then saw a half-assembled value — silently, and differently
// depending on the order the parts happen to appear in. This is the shape a bus joiner produces.

function joinerRegistry(): ChipRegistry {
  const r = createChipRegistry()
  registerBuiltin(r, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
  registerBuiltin(r, 'And', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.a & i.b }))
  registerBuiltin(r, 'Not16', [{ name: 'in', width: 16 }], [{ name: 'out', width: 16 }], (i) => ({ out: ~i.in & 0xffff }))
  // Two output pins carrying the same bit — the only way one part can drive one slice twice.
  registerBuiltin(r, 'Fork', [{ name: 'in', width: 1 }], [{ name: 'p', width: 1 }, { name: 'q', width: 1 }], (i) => ({ p: i.in, q: i.in }))
  return r
}

function evaluateHdl(src: string, inputs: Record<string, number>, registry: ChipRegistry): Record<string, number> {
  const ast = parseHDL(src)
  if (!ast.success) throw new Error(`parse failed: ${ast.errors.map((e) => e.message).join('; ')}`)
  const r = compileHDL(ast.chip, registry)
  if (!r.success) throw new Error(`compile failed: ${r.errors.map((e) => e.message).join('; ')}`)
  return r.evaluate(inputs, builtinOnlyCtx(registry))
}

/** Every permutation of `items`, in a stable order. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]]
  const out: T[][] = []
  items.forEach((item, i) => {
    for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) out.push([item, ...rest])
  })
  return out
}

describe('compileHDL — a signal assembled from several slice writes (#355)', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = joinerRegistry()
  })

  // Four parts of one chip. `t` is assembled from two 1-bit slice writes and then read whole.
  // `tLow` is made to depend on `k` so that permuting the parts really does permute the
  // topological order (otherwise Kahn's queue drains every writer before the reader by luck).
  const JOINER_PARTS = {
    tLow: 'Not(in=k, out=t[0]);', // t[0] = Not(k) = 1, but only once `k` has been evaluated
    read: 'Not16(in=t, out=out);', // reads the whole of t
    tHigh: 'Not(in=a, out=t[1]);', // t[1] = Not(a) = 1
    k: 'And(a=a, b=a, out=k);', // k = 0
  } as const
  type JoinerPart = keyof typeof JOINER_PARTS
  const joiner = (order: readonly JoinerPart[]) =>
    `CHIP J { IN a; OUT out[16]; PARTS: ${order.map((key) => JOINER_PARTS[key]).join(' ')} }`

  // With a=0 both slice writes are 1, so t = 0b11 = 3 and out = ~3 & 0xffff = 65532. Dropping the
  // writer that is not the last one recorded leaves t = 0b10 and out = 65533 — the #355 symptom.
  const CORRECT = 65532

  it('evaluates to the same, correct value under both part orderings', () => {
    expect(evaluateHdl(joiner(['tLow', 'read', 'tHigh', 'k']), { a: 0 }, reg)).toEqual({ out: CORRECT })
    expect(evaluateHdl(joiner(['read', 'tHigh', 'k', 'tLow']), { a: 0 }, reg)).toEqual({ out: CORRECT })
  })

  it('evaluates to the same value under every one of the 24 part orderings', () => {
    const keys = Object.keys(JOINER_PARTS) as JoinerPart[]
    for (const order of permutations(keys)) {
      const label = order.join(',')
      expect({ label, ...evaluateHdl(joiner(order), { a: 0 }, reg) }).toEqual({ label, out: CORRECT })
    }
  })
})

// ── The property: evaluation is invariant under permutation of the parts ───────────────────────
// A generated chip whose internal signal `t` is built from N single-bit slice writes and then read
// whole. Each bit's writer sits at a generated depth in the dependency graph — depth 0 reads only
// literals, depth d sits behind a d-part chain from `a` — because writers at *mixed* depths are
// what make the order of the parts change the topological order. (A generator that puts every
// writer at the same depth is vacuous here: Kahn's queue happens to drain them all before the
// reader whatever the source order. Measured on the unfixed compiler: uniform depth 1 → 0/400
// permutations wrong, mixed depths 0..2 → 105/400 wrong.)
//
// With a=0 every chain signal is 1, so bit i is exactly `bits[i]` at any depth.
function sliceAssembledParts(bits: readonly boolean[], depths: readonly number[]): string[] {
  const parts: string[] = []
  bits.forEach((bit, i) => {
    if (depths[i] > 0) parts.push(`Not(in=a, out=k${i}_0);`)
    for (let s = 1; s < depths[i]; s++) parts.push(`And(a=k${i}_${s - 1}, b=k${i}_${s - 1}, out=k${i}_${s});`)
    const enable = depths[i] === 0 ? 'true' : `k${i}_${depths[i] - 1}`
    parts.push(`And(a=${enable}, b=${bit ? 'true' : 'false'}, out=t[${i}]);`)
  })
  parts.push('Not16(in=t, out=out);')
  return parts
}
const sliceAssembledChip = (parts: readonly string[], order: readonly number[]) =>
  `CHIP G { IN a; OUT out[16]; PARTS: ${order.map((j) => parts[j]).join(' ')} }`
const expectedOut = (bits: readonly boolean[]) =>
  ~bits.reduce((acc, bit, i) => (bit ? acc | (1 << i) : acc), 0) & 0xffff

/** Deterministic PRNG (mulberry32) so any failure is reproducible from its seed. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffledIndexes(length: number, next: () => number): number[] {
  const idx = Array.from({ length }, (_, i) => i)
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

describe('compileHDL — permutation invariance over generated slice-assembled chips (#355)', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = joinerRegistry()
  })

  it('holds for EVERY permutation of the parts, over every depth pattern at N = 2', () => {
    const bits = [true, true]
    for (const depths of [[0, 0], [0, 1], [1, 0], [1, 1], [0, 2], [2, 1]]) {
      const parts = sliceAssembledParts(bits, depths)
      for (const order of permutations(Array.from({ length: parts.length }, (_, i) => i))) {
        const label = `depths=${depths.join('')} order=${order.join('')}`
        expect({ label, ...evaluateHdl(sliceAssembledChip(parts, order), { a: 0 }, reg) }).toEqual({
          label,
          out: expectedOut(bits),
        })
      }
    }
  })

  it('holds for sampled permutations of N = 2..8 slice writes at mixed depths', () => {
    const next = mulberry32(0x355)
    for (let round = 0; round < 400; round++) {
      const n = 2 + Math.floor(next() * 7)
      const bits = Array.from({ length: n }, () => next() < 0.5)
      const depths = Array.from({ length: n }, () => Math.floor(next() * 3))
      const parts = sliceAssembledParts(bits, depths)
      const order = shuffledIndexes(parts.length, next)
      const label = `bits=${bits.map((b) => (b ? 1 : 0)).join('')} depths=${depths.join('')} order=${order.join(',')}`
      expect({ label, ...evaluateHdl(sliceAssembledChip(parts, order), { a: 0 }, reg) }).toEqual({
        label,
        out: expectedOut(bits),
      })
    }
  })
})

describe('compileHDL — a bit may be driven only once (#355)', () => {
  // Two parts driving the same bit is a short circuit, not a value, so it is rejected — exactly as
  // the official nand2tetris web IDE does ("Cannot write to pin x[i] multiple times",
  // ../web-ide/simulator/src/chip/builder.ts). Last-wins would keep the order-dependence #355 fixes.
  let reg: ChipRegistry
  beforeEach(() => {
    reg = joinerRegistry()
  })
  function compile(src: string) {
    const ast = parseHDL(src)
    expect(ast.success).toBe(true)
    if (!ast.success) throw new Error('parse failed')
    return compileHDL(ast.chip, reg)
  }
  const isDoubleDrive = (message: string) => /driven by more than one part/i.test(message)

  it('rejects two parts driving the same slice', () => {
    const r = compile('CHIP D { IN a; OUT out[16]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[0]); Not16(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => /"t"/.test(e.message) && isDoubleDrive(e.message))).toBe(true)
  })

  it('rejects one part driving the same slice from two of its output pins', () => {
    const r = compile('CHIP D { IN a; OUT out[16]; PARTS: Fork(in=a, p=t[0], q=t[0]); Not16(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => isDoubleDrive(e.message))).toBe(true)
  })

  it('rejects overlapping multi-bit slice writes', () => {
    const r = compile('CHIP D { IN a[16]; OUT out[16]; PARTS: Not16(in=a, out=t); Not(in=a[0], out=t[3]); Not16(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => isDoubleDrive(e.message))).toBe(true)
  })

  it('accepts disjoint slice writes to the same signal', () => {
    const r = compile('CHIP D { IN a; OUT out[16]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[1]); Not16(in=t, out=out); }')
    expect(r.success).toBe(true)
  })
})

// ── #357 — a slice on the part's own pin ───────────────────────────────────────────────────────
// The internal side (the part's pin) and the external side (the signal) are independent: each may
// be sliced, on the same wire, and they are read and written at opposite ends. The transfer width
// is the internal slice's width, or the part pin's own width when it is unsliced — the rule the
// reference simulator uses (`getSubBusWidth(lhs) ?? partChip.get(lhs.pin)?.width`,
// ../web-ide/simulator/src/chip/builder.ts).

function partPinSliceRegistry(): ChipRegistry {
  const r = createChipRegistry()
  registerBuiltin(r, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
  registerBuiltin(r, 'Not16', [{ name: 'in', width: 16 }], [{ name: 'out', width: 16 }], (i) => ({ out: ~i.in & 0xffff }))
  registerBuiltin(r, 'Or8Way', [{ name: 'in', width: 8 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 0 : 1 }))
  return r
}

describe('compileHDL — part-pin slices (#357)', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = partPinSliceRegistry()
  })
  function compile(src: string) {
    const ast = parseHDL(src)
    expect(ast.success).toBe(true)
    if (!ast.success) throw new Error(`parse failed: ${ast.errors.map((e) => e.message).join('; ')}`)
    return compileHDL(ast.chip, reg)
  }

  it('binds one bit of a wide part input from a narrow signal', () => {
    // Bits 2..7 of Or8Way's `in` are never bound and read as 0, so out = a | b.
    const r = compile('CHIP C { IN a, b; OUT out; PARTS: Or8Way(in[0]=a, in[1]=b, out=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(reg)
    expect(r.evaluate({ a: 0, b: 0 }, ctx)).toEqual({ out: 0 })
    expect(r.evaluate({ a: 1, b: 0 }, ctx)).toEqual({ out: 1 })
    expect(r.evaluate({ a: 0, b: 1 }, ctx)).toEqual({ out: 1 })
    expect(r.evaluate({ a: 1, b: 1 }, ctx)).toEqual({ out: 1 })
  })

  it('reads through a slice on both sides of one connection', () => {
    // in[0..7] takes bus[8..15] and in[8..15] takes bus[0..7]: the halves swap, then invert.
    const r = compile('CHIP C { IN bus[16]; OUT out[16]; PARTS: Not16(in[0..7]=bus[8..15], in[8..15]=bus[0..7], out=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.evaluate({ bus: 0xff00 }, builtinOnlyCtx(reg))).toEqual({ out: 0xff00 })
    expect(r.evaluate({ bus: 0x1234 }, builtinOnlyCtx(reg))).toEqual({ out: ~0x3412 & 0xffff })
  })

  it('writes one bit of a wide part output to a narrow signal', () => {
    const r = compile('CHIP C { IN a[16]; OUT out; PARTS: Not16(in=a, out[0]=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(reg)
    expect(r.evaluate({ a: 0x0000 }, ctx)).toEqual({ out: 1 })
    expect(r.evaluate({ a: 0x0001 }, ctx)).toEqual({ out: 0 })
  })

  it('widens a literal to the width of the part-pin slice it is bound to', () => {
    const r = compile('CHIP C { IN a; OUT out[16]; PARTS: Not16(in[0..3]=true, out=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.evaluate({ a: 0 }, builtinOnlyCtx(reg))).toEqual({ out: ~0b1111 & 0xffff })
  })

  it('infers an internal signal width from the part-pin slice that writes it', () => {
    // `nib` is 4 bits wide because out[0..3] wrote it — not 16, the width of the whole `out` pin.
    const r = compile('CHIP C { IN a[16]; OUT out[16]; PARTS: Not16(in=a, out[0..3]=nib); Not16(in=nib, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => /width 16 != signal "nib" width 4/.test(e.message))).toBe(true)
  })

  it('errors when the two sides of a connection have different widths', () => {
    const r = compile('CHIP C { IN a; OUT out[16]; PARTS: Not16(in[0..3]=a, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => /width/i.test(e.message) && e.pinName === 'in')).toBe(true)
  })

  it('errors on a part-pin slice past the end of the pin', () => {
    const r = compile('CHIP C { IN a; OUT out[16]; PARTS: Not16(in[16]=a, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const err = r.errors.find((e) => /out of range/i.test(e.message))
      expect(err?.partName).toBe('Not16')
      expect(err?.pinName).toBe('in')
      expect(err?.message).toContain('in[16]')
      expect(err?.message).toContain('width 16')
    }
  })

  it('errors on a slice on a pin the part does not have', () => {
    const r = compile('CHIP C { IN a; OUT out[16]; PARTS: Not16(nope[0]=a, in=a, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const err = r.errors.find((e) => /has no pin/i.test(e.message))
      expect(err?.partName).toBe('Not16')
      expect(err?.pinName).toBe('nope')
    }
  })

  it('still rejects two part-pin-sliced outputs driving the same signal (#355)', () => {
    // Both connections write the whole of `t`: the slice is on the part's pin, not on the signal.
    const r = compile('CHIP C { IN a[16]; OUT out; PARTS: Not16(in=a, out[0]=t); Not16(in=a, out[1]=t); Not(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => /driven by more than one part/i.test(e.message))).toBe(true)
  })

  it('accepts part-pin-sliced outputs writing disjoint slices of one signal (#355)', () => {
    const r = compile('CHIP C { IN a[16]; OUT out[16]; PARTS: Not16(in=a, out[0]=t[0]); Not16(in=a, out[1]=t[1]); Not16(in=t, out=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    // a = 0 → both Not16 outputs are 0xffff, so t[0] = t[1] = 1 and t = 0b11.
    expect(r.evaluate({ a: 0 }, builtinOnlyCtx(reg))).toEqual({ out: ~0b11 & 0xffff })
  })
})
