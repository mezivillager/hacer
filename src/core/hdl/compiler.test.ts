// src/core/hdl/compiler.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import type { ChipRegistry } from '../chips/registry'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { combineRegistries } from '../chips/combineRegistries'
import type { ChipDefinition } from '../chips/types'
import { isBuiltinChip } from '../chips/types'
import { parseHDL } from './parser'
import { compileHDL, hdlChipDefinition, type EvalContext, type HDLCompileError, type HDLCompileResult } from './compiler'
import type { HDLChip } from './types'

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

  // #313: this is exhaustive (every permutation of every depth pattern), not load-induced —
  // measured 2053ms worst case over 3 full `pnpm run test:run` runs with 2 other agent
  // processes active, 41% of vitest's 5000ms default already at that contention level.
  // 8000ms is ~3.9x that worst measured duration.
  const PERMUTATION_TIMEOUT_MS = 8000

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
  }, PERMUTATION_TIMEOUT_MS)

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

// ── #367 — a part input pin's bits may be bound only once ──────────────────────────────────────
// The input side of the rule #355 gave the output side. #357 put a slice on the part's own pin, so
// both ends of a wire now name bit ranges and one per-bit claim decides both: a signal's bit may
// have one driver, a part input pin's bit may have one source.

describe('compileHDL — a part input pin bit may be bound only once (#367)', () => {
  // Two connections feeding one pin bit is not a value: which binding survived depended on the
  // order the bindings appear in the document. The reference simulator applies one rule to both
  // sides — a single `checkMultipleAssignments` run against an input-pin map and an output-pin map
  // (../web-ide/simulator/src/chip/builder.ts, "Cannot write to pin x[i] multiple times").
  let reg: ChipRegistry
  beforeEach(() => {
    reg = joinerRegistry()
  })
  function compile(src: string) {
    const ast = parseHDL(src)
    expect(ast.success).toBe(true)
    if (!ast.success) throw new Error(`parse failed: ${ast.errors.map((e) => e.message).join('; ')}`)
    return compileHDL(ast.chip, reg)
  }
  const isDoubleBind = (message: string) => /bound by more than one connection/i.test(message)

  /** Everything a document means to the compiler: why it was rejected, or what it evaluates to. */
  function outcome(src: string, cases: Array<Record<string, number>>): { compiled: boolean; detail: string[] } {
    const r = compile(src)
    if (!r.success) return { compiled: false, detail: r.errors.map((e) => e.message).sort() }
    const ctx = builtinOnlyCtx(reg)
    return { compiled: true, detail: cases.map((inputs) => JSON.stringify(r.evaluate(inputs, ctx))) }
  }
  const BOTH_WAYS = [{ a: 1, b: 0 }, { a: 0, b: 1 }]

  it('rejects a part input pin bound twice, naming the part, the pin and the bit', () => {
    const r = compile('CHIP D { IN a, b; OUT out; PARTS: Not(in=a, in=b, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = r.errors.find((x) => isDoubleBind(x.message))
      expect(e?.message).toBe('Line 1: Part "Not" pin "in" bit 0 is bound by more than one connection')
      expect(e?.partName).toBe('Not')
      expect(e?.pinName).toBe('in')
    }
  })

  it('answers the same whichever order the two bindings appear in', () => {
    // The defect as measured: {a:1,b:0} gave out=1 one way round and out=0 the other — one
    // document, two meanings. Rejecting both is an answer; last-binding-wins is not.
    expect(outcome('CHIP D { IN a, b; OUT out; PARTS: Not(in=a, in=b, out=out); }', BOTH_WAYS)).toEqual(
      outcome('CHIP D { IN a, b; OUT out; PARTS: Not(in=b, in=a, out=out); }', BOTH_WAYS),
    )
  })

  it('rejects a pin bound to both a literal and a signal', () => {
    const r = compile('CHIP D { IN a, b; OUT out; PARTS: And(a=true, a=a, b=b, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.some((e) => isDoubleBind(e.message))).toBe(true)
  })

  it('accepts one signal feeding two different pins of the same part', () => {
    // The rule is per pin, not per signal — fanning one signal out to several pins is ordinary HDL.
    const r = compile('CHIP D { IN a; OUT out; PARTS: And(a=a, b=a, out=out); }')
    expect(r.success).toBe(true)
  })

  // ── the shapes #357 made expressible ─────────────────────────────────────────────────────────

  it('rejects a whole-pin binding that overlaps a sliced binding of the same pin', () => {
    // Measured by #370's verifier: `Not16(in=a, in[0]=b)` compiled and evaluated order-dependently
    // — out=65534 with `in=a` first, 65535 with `in[0]=b` first. An unsliced binding claims every
    // bit of the pin, exactly as an unsliced write claims every bit of a signal on the other side,
    // so it overlaps any slice of the same pin.
    const r = compile('CHIP D { IN a[16], b; OUT out[16]; PARTS: Not16(in=a, in[0]=b, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = r.errors.find((x) => isDoubleBind(x.message))
      expect(e?.message).toBe('Line 1: Part "Not16" pin "in" bit 0 is bound by more than one connection')
      expect(e?.partName).toBe('Not16')
      expect(e?.pinName).toBe('in')
    }
  })

  it('answers the same whichever order the whole-pin and the sliced binding appear in', () => {
    const ORDERED = [{ a: 0, b: 1 }]
    expect(outcome('CHIP D { IN a[16], b; OUT out[16]; PARTS: Not16(in=a, in[0]=b, out=out); }', ORDERED)).toEqual(
      outcome('CHIP D { IN a[16], b; OUT out[16]; PARTS: Not16(in[0]=b, in=a, out=out); }', ORDERED),
    )
  })

  it('rejects two part-pin slices that overlap, naming the first shared bit', () => {
    const r = compile('CHIP D { IN x[4], y[4]; OUT out[16]; PARTS: Not16(in[0..3]=x, in[2..5]=y, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = r.errors.find((x) => isDoubleBind(x.message))
      expect(e?.message).toBe('Line 1: Part "Not16" pin "in" bit 2 is bound by more than one connection')
    }
  })

  it('accepts disjoint bindings on a wide input pin, and assembles the pin from them (#357)', () => {
    // Was `it.todo` while a slice on the part-pin side did not parse. It parses since #357, so this
    // is the real test: the rule admits disjoint ranges, and the halves meet exactly with no gap.
    const r = compile('CHIP D { IN lo[8], hi[8]; OUT out[16]; PARTS: Not16(in[0..7]=lo, in[8..15]=hi, out=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(reg)
    expect(r.evaluate({ lo: 0x00, hi: 0x00 }, ctx)).toEqual({ out: 0xffff })
    expect(r.evaluate({ lo: 0xff, hi: 0x00 }, ctx)).toEqual({ out: 0xff00 })
    expect(r.evaluate({ lo: 0x34, hi: 0x12 }, ctx)).toEqual({ out: ~0x1234 & 0xffff })
  })

  // ── "not connected" asks whether any connection names the pin ────────────────────────────────

  it('accepts a partially bound input pin — the bits nothing binds read 0', () => {
    // Since #357 a pin may be bound in pieces, so an unbound *bit* is no longer evidence of a
    // mistake: `Or8Way(in[0]=a, in[1]=b)` is legal and its bits 2..7 read 0, and the reference
    // simulator has no connectedness pass at all. Here bits 8..15 are never bound, read 0, and
    // Not16 inverts them to ones.
    const r = compile('CHIP D { IN lo[8]; OUT out[16]; PARTS: Not16(in[0..7]=lo, out=out); }')
    expect(r.success).toBe(true)
    if (!r.success) return
    const ctx = builtinOnlyCtx(reg)
    expect(r.evaluate({ lo: 0x00 }, ctx)).toEqual({ out: 0xffff })
    expect(r.evaluate({ lo: 0xff }, ctx)).toEqual({ out: 0xff00 })
  })

  it('reports a pin whose only binding is out of range as out of range, and not as unconnected', () => {
    // `in[16]` names the pin, so `bindUnconnectedInputs` binds nothing, and the advice `bind in=false`
    // would only add a second binding beside it. The range is the one mistake, as the reference says.
    const r = compile('CHIP D { IN a; OUT out[16]; PARTS: Not16(in[16]=a, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors.map((e) => e.message)).toEqual(['Line 1: Part "Not16" pin "in[16]" is out of range; "in" has width 16'])
  })

  it('still rejects an input pin with no bits bound at all', () => {
    const r = compile('CHIP D { IN a; OUT out; PARTS: And(a=a, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = r.errors.find((x) => /is not connected/.test(x.message))
      expect(e?.message).toBe('Line 1: Part "And" input pin "b" is not connected: the nand2tetris simulator reads it as 0; bind b=false to do the same')
      expect(e?.partName).toBe('And')
      expect(e?.pinName).toBe('b')
    }
  })
})

// ── #363 — dependency edges per bit range, not per signal ──────────────────────────────────────
// #362 gave a read an edge from EVERY writer of the signal, which is right for a signal assembled
// from several slice writes and wrong for a read that never looks at the bits the other writers
// produce: a part reading `t[1]` waited for the part that writes `t[0]`, and when that writer was
// itself downstream of the reader the compiler reported a cycle that does not exist bit-wise.
// An unsliced read still overlaps every write, so #355's rule is unchanged — it is the special
// case of this one where the read covers the whole signal.

function perBitRegistry(): ChipRegistry {
  const r = joinerRegistry()
  registerBuiltin(r, 'Not4', [{ name: 'in', width: 4 }], [{ name: 'out', width: 4 }], (i) => ({ out: ~i.in & 0xf }))
  registerBuiltin(r, 'Not8', [{ name: 'in', width: 8 }], [{ name: 'out', width: 8 }], (i) => ({ out: ~i.in & 0xff }))
  return r
}

describe('compileHDL — dependency edges follow bits, not signal names (#363)', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = perBitRegistry()
  })
  function compile(src: string) {
    const ast = parseHDL(src)
    expect(ast.success).toBe(true)
    if (!ast.success) throw new Error('parse failed')
    return compileHDL(ast.chip, reg)
  }
  /** Every ordering of the parts must compile AND agree on the value — the whole point. */
  function expectSameUnderEveryOrdering(chip: (order: readonly string[]) => string, parts: readonly string[], inputs: Record<string, number>, expected: Record<string, number>) {
    for (const order of permutations(parts)) {
      const label = order.join(' ')
      expect({ label, ...evaluateHdl(chip(order), inputs, reg) }).toEqual({ label, ...expected })
    }
  }

  // The issue's own chip. Two signals cross: `u` is written from `t[1]` and `t[0]` is written from
  // `u`, so per-signal edges close a loop t→u→t that no bit ever travels.
  const F2_PARTS = ['Not(in=t[1], out=u);', 'Not(in=u, out=t[0]);', 'Not(in=a, out=t[1]);', 'And(a=t[0], b=u, out=out);'] as const
  const f2 = (order: readonly string[]) => `CHIP F2 { IN a; OUT out; PARTS: ${order.join(' ')} }`

  it("compiles the issue's F2 chip, which has no cycle bit-wise", () => {
    const r = compile(f2(F2_PARTS))
    expect(r.success).toBe(true)
  })

  it('evaluates F2 the same, and correctly, under every one of the 24 part orderings', () => {
    // a=0: t[1]=1, u=Not(1)=0, t[0]=Not(0)=1, out=And(1,0)=0. a=1: t[1]=0, u=1, t[0]=0, out=0.
    expectSameUnderEveryOrdering(f2, F2_PARTS, { a: 0 }, { out: 0 })
    expectSameUnderEveryOrdering(f2, F2_PARTS, { a: 1 }, { out: 0 })
  })

  // The issue's second repro, measured on plain 1-bit parts: a three-link chain through three bits
  // of one signal, read whole at the end. Bit-wise the order is forced and acyclic.
  const X_PARTS = ['Not(in=a, out=u[0]);', 'Not(in=u[0], out=u[1]);', 'Not(in=u[1], out=u[2]);', 'Not16(in=u, out=out);'] as const
  const xChain = (order: readonly string[]) => `CHIP X { IN a; OUT out[16]; PARTS: ${order.join(' ')} }`

  it('compiles a chain through three bits of one signal, read whole (#355 unchanged)', () => {
    // a=0 → u[0]=1, u[1]=0, u[2]=1 → u=0b101=5 → out = ~5 & 0xffff = 65530. The whole-signal read
    // still waits for all three writers, which is what makes 5 rather than a half-built value.
    expectSameUnderEveryOrdering(xChain, X_PARTS, { a: 0 }, { out: 65530 })
  })

  // Derived here, not taken from the issue: the same defect with WIDE ranges and slices on BOTH
  // sides of a connection (#357/#370) — the bus-joiner shape the importer emits. `m[4..7]` is read
  // by a part that `m[0..3]`'s writer is downstream of, so the per-signal edges close a loop while
  // every bit flows one way: m[4..7] → lo → m[0..3] → out.
  const BUS_PARTS = [
    'Not4(in=m[4..7], out=lo);',
    'Not4(in=lo, out=m[0..3]);',
    'Not8(in[0..3]=a, in[4..7]=a, out[4..7]=m[4..7]);',
    'Not8(in[0..3]=m[0..3], in[4..7]=lo, out=out);',
  ] as const
  const bus = (order: readonly string[]) => `CHIP Bus { IN a[4]; OUT out[8]; PARTS: ${order.join(' ')} }`

  it('compiles wide disjoint slices with part-pin slices on both sides, in every ordering', () => {
    // a=5 → m[4..7]=~5&0xf=0xa, lo=5, m[0..3]=0xa, out = ~(0xa | (5<<4)) & 0xff = 0x5 | (0xa<<4).
    expectSameUnderEveryOrdering(bus, BUS_PARTS, { a: 0b0101 }, { out: 0xa5 })
  })

  it('still rejects a real bit-wise cycle, naming the signal and the bits', () => {
    const r = compile('CHIP C { IN a; OUT out; PARTS: Not(in=w[1], out=w[0]); Not(in=w[0], out=w[1]); And(a=w[0], b=w[1], out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const message = r.errors[0].message
      expect(message).toMatch(/combinational cycle/)
      expect(message).toContain('"w" bit 0')
      expect(message).toContain('"w" bit 1')
    }
  })

  it('names no bit when the cycle runs through whole signals', () => {
    const r = compile('CHIP C { IN a; OUT out; PARTS: Not(in=w2, out=w1); Not(in=w1, out=w2); And(a=w1, b=w2, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      const message = r.errors[0].message
      expect(message).toContain('"w1"')
      expect(message).toContain('"w2"')
      expect(message).not.toMatch(/bit/)
    }
  })

  it('still catches a cycle a whole-signal read closes through one slice writer (#355)', () => {
    // `Not16(in=t)` reads every bit of `t`, so it really does depend on the part writing `t[0]`,
    // which reads `x` back from it. Widening the read must not lose that edge.
    const r = compile('CHIP R { IN a; OUT out[16]; PARTS: Not16(in=t, out=x); Not(in=x[0], out=t[0]); Not(in=a, out=t[1]); Not16(in=x, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.errors[0].message).toMatch(/combinational cycle/)
      expect(r.errors[0].message).toContain('"t" bit 0')
    }
  })

  it('reports a bit driven by three parts once, not twice', () => {
    const r = compile('CHIP D { IN a; OUT out[16]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[0]); Not(in=a, out=t[0]); Not16(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.errors.filter((e) => /driven by more than one part/.test(e.message))).toHaveLength(1)
      expect(r.errors[0].message).toBe('Line 1: Signal "t" bit 0 is driven by more than one part')
    }
  })

  it('names no bit when two parts drive a whole signal', () => {
    const r = compile('CHIP D { IN a[16]; OUT out[16]; PARTS: Not16(in=a, out=t); Not16(in=a, out=t); Not16(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors[0].message).toBe('Line 1: Signal "t" is driven by more than one part')
  })

  it('still names the shared bit when a whole-signal write overlaps a slice write', () => {
    const r = compile('CHIP D { IN a[16]; OUT out[16]; PARTS: Not16(in=a, out=t); Not(in=a[0], out=t[3]); Not16(in=t, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors[0].message).toBe('Line 1: Signal "t" bit 3 is driven by more than one part')
  })

  it('reports a part input pin bit bound by three connections once, not twice', () => {
    const r = compile('CHIP D { IN a; OUT out[16]; PARTS: Not16(in[0]=a, in[0]=a, in[0]=a, out=out); }')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.errors.filter((e) => /bound by more than one connection/.test(e.message))).toHaveLength(1)
    }
  })
})

// ── A part's edge to ITSELF (#397) ─────────────────────────────────────────────────────────────
// The under-approximation twin of #363. Step 4 used to drop the edge a part would take from
// itself, so a part that reads a signal it writes was never a cycle: it read whatever the signal
// held before it ran, which for an internal wire is 0. The skip existed because per-SIGNAL edges
// made a part that writes `t[0]` and reads `t[1]` depend on itself; since #363 the edges are
// per-BIT, so the one `overlaps()` test the file already reasons with answers this too — a real
// self-cycle and a legitimate disjoint self-reference differ only in whether the bits meet.
describe('compileHDL — a part may not read the bits it writes itself (#397)', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = perBitRegistry()
  })
  function compile(src: string) {
    const ast = parseHDL(src)
    expect(ast.success).toBe(true)
    if (!ast.success) throw new Error('parse failed')
    return compileHDL(ast.chip, reg)
  }
  /** Rejected as a combinational cycle, and the message says which signal and bits closed it. */
  function expectCycle(src: string, ...mentions: readonly string[]) {
    const r = compile(src)
    expect({ src, success: r.success }).toEqual({ src, success: false })
    if (r.success) return
    const message = r.errors[0].message
    expect(message).toMatch(/combinational cycle/)
    for (const mention of mentions) expect(message).toContain(mention)
  }
  /** Every ordering of the parts must agree — on rejecting, or on the value. */
  function eachOrdering(parts: readonly string[], chip: (order: readonly string[]) => string): string[] {
    return permutations(parts).map(chip)
  }

  // The issue's chip. One part reads `w` and drives it, which is a combinational loop of length
  // one; at `main` it compiled and `out` was 1 for every input, because `And` read `w` as the 0 it
  // held before the part ran rather than the value the part itself put there.
  const SELF_PARTS = ['And(a=w, b=a, out=w);', 'Not(in=w, out=out);'] as const
  const self = (order: readonly string[]) => `CHIP S { IN a; OUT out; PARTS: ${order.join(' ')} }`

  it("rejects the issue's one-part feedback loop, naming the signal", () => {
    expectCycle(self(SELF_PARTS), '"w"')
  })

  it('rejects it in every part ordering', () => {
    for (const src of eachOrdering(SELF_PARTS, self)) expectCycle(src, '"w"')
  })

  // A self-cycle on one bit of a wider signal: the read and the write are both slices, and they
  // land on the same bit. Named exactly like a two-part cycle on that bit (#363).
  const BIT_PARTS = ['Not4(in[0]=t[0], out[0]=t[0]);', 'Not(in=a, out=t[1]);', 'Not16(in=t, out=out);'] as const
  const bitCycle = (order: readonly string[]) => `CHIP B { IN a; OUT out[16]; PARTS: ${order.join(' ')} }`

  it('names the bit when a part reads and writes the same bit of a wider signal', () => {
    expectCycle(bitCycle(BIT_PARTS), '"t" bit 0')
  })

  it('rejects that sliced self-cycle in every one of the six part orderings', () => {
    for (const src of eachOrdering(BIT_PARTS, bitCycle)) expectCycle(src, '"t" bit 0')
  })

  it('names the shared bits when a self-read and a self-write only partly overlap', () => {
    // reads `t[2..5]`, writes `t[0..3]` — bits 2..3 are both, and those are the ones that loop.
    expectCycle('CHIP P { IN a; OUT out[8]; PARTS: Not8(in[0..3]=t[2..5], out[0..3]=t[0..3]); Not(in=a, out=t[6]); Not8(in=t, out=out); }', '"t" bits 2..3')
  })

  it('rejects a whole-signal read against the same part’s sliced write', () => {
    // An unsliced read covers every bit of the signal, so it reaches the one bit the part drives.
    // The widest instance of the same overlap test, not a second rule (#363).
    expectCycle('CHIP W { IN a; OUT out[16]; PARTS: Not(in=a, out=t[1]); Not16(in=t, out[0]=t[0]); Not16(in=t, out=out); }', '"t" bit 0')
  })

  it('rejects a sliced read against the same part’s whole-signal write', () => {
    expectCycle('CHIP V { IN a; OUT out[8]; PARTS: Not8(in[0]=t[0], out=t); Not8(in=t, out=out); }', '"t" bit 0')
  })

  // ── The other side of the boundary: a self-reference on bits that never meet is legal HDL, and
  // is exactly what the old skip was protecting. It has to keep compiling AND keep its value.
  const DISJOINT_PARTS = ['Not(in=a, out=t[0]);', 'Not8(in[0]=t[0], out[1]=t[1]);', 'Not16(in=t, out=out);'] as const
  const disjoint = (order: readonly string[]) => `CHIP D { IN a; OUT out[16]; PARTS: ${order.join(' ')} }`

  it('still compiles a part that reads one bit of a signal and writes another', () => {
    // a=0 → t[0]=1 → the middle part reads in=0b1, drives out=0xfe, and its bit 1 is 1 → t[1]=1.
    // t=0b11 → out = ~3 & 0xffff = 65532. Unchanged from `main`, where the self-skip allowed it.
    for (const src of eachOrdering(DISJOINT_PARTS, disjoint)) {
      expect({ src, ...evaluateHdl(src, { a: 0 }, reg) }).toEqual({ src, out: 65532 })
    }
  })

  // The same thing with WIDE adjacent ranges and part-pin slices on both sides — the bus-joiner
  // shape, where a part reads the low nibble of a signal and drives the high one.
  const NIBBLE_PARTS = ['Not4(in=a, out=t[0..3]);', 'Not8(in[0..3]=t[0..3], out[4..7]=t[4..7]);', 'Not8(in=t, out=out);'] as const
  const nibble = (order: readonly string[]) => `CHIP N { IN a[4]; OUT out[8]; PARTS: ${order.join(' ')} }`

  it('still compiles a part reading t[0..3] and writing the adjacent t[4..7]', () => {
    // a=5 → t[0..3]=~5&0xf=0xa → the joiner reads 0x0a, drives ~0x0a&0xff=0xf5, its bits 4..7 are
    // 0xf → t=0xfa → out = ~0xfa & 0xff = 5.
    for (const src of eachOrdering(NIBBLE_PARTS, nibble)) {
      expect({ src, ...evaluateHdl(src, { a: 0b0101 }, reg) }).toEqual({ src, out: 5 })
    }
  })
})

describe('compileHDL', () => {
  it('refuses a part output that writes a chip input, naming the part and the input', () => {
    for (const src of [
      'CHIP W { IN a, b; OUT out; PARTS: Not(in=b, out=a); Not(in=a, out=out); }',
      'CHIP W { IN a[2], b; OUT out; PARTS: Not(in=b, out=a[0]); Not(in=a[1], out=out); }',
    ]) {
      const ast = parseHDL(src)
      if (!ast.success) throw new Error(`parse failed: ${src}`)
      const r = compileHDL(ast.chip, getBuiltinChipRegistry())
      expect(r.success).toBe(false)
      if (r.success) continue
      expect(r.errors).toEqual([expect.objectContaining({ partName: 'Not', pinName: 'out', message: expect.stringMatching(/Part "Not" output "out".*chip input "a"/) })])
    }
  })

  it('refuses a chip that names itself as a part', () => {
    const ast = parseHDL('CHIP Not { IN in; OUT out; PARTS: Not(in=in, out=out); }')
    if (!ast.success) throw new Error('parse failed')
    const r = compileHDL(ast.chip, getBuiltinChipRegistry())
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.errors).toEqual([{ partName: 'Not', line: 1, message: 'Line 1: Cannot use chip Not to implement itself' }])
  })
})

describe('compileHDL — a slice on the signal side must fit the signal (#371)', () => {
  function errorsOf(src: string) {
    const ast = parseHDL(src)
    if (!ast.success) throw new Error(`parse failed: ${src}`)
    const r = compileHDL(ast.chip, getBuiltinChipRegistry())
    return r.success ? [] : r.errors
  }
  const outOfRange = (part: string, pin: string, ref: string, signal: string, width: number): unknown =>
    expect.objectContaining({ partName: part, pinName: pin.replace(/\[.*$/, ''), line: 1, message: `Line 1: Part "${part}" pin "${pin}" is wired to "${ref}": sub-bus index out of range ("${signal}" has width ${width})` })

  it('refuses a read past the end of a chip input', () => {
    expect(errorsOf('CHIP C { IN bus[16]; OUT o; PARTS: Not(in=bus[20], out=o); }')).toEqual([outOfRange('Not', 'in', 'bus[20]', 'bus', 16)])
  })

  it.each([
    ['a write past the end of a chip output', 'CHIP T { IN a; OUT o[2]; PARTS: Not(in=a, out=o[3]); }', [['Not', 'out', 'o[3]', 'o', 2]]],
    ['a read past the end of a chip input', 'CHIP T { IN a[2]; OUT o; PARTS: Not(in=a[5], out=o); }', [['Not', 'in', 'a[5]', 'a', 2]]],
    ['a partial slice that runs off a chip output', 'CHIP T { IN a[2]; OUT o[2]; PARTS: Not16(in[0..1]=a, out[0..1]=o[1..2]); }', [['Not16', 'out[0..1]', 'o[1..2]', 'o', 2]]],
    ['a write past the end, as the spec exports it', 'CHIP T { IN a; OUT o[2]; PARTS: Or(a=a, b=a, out=o[3]); }', [['Or', 'out', 'o[3]', 'o', 2]]],
    ['two reads past the end, as the spec exports them', 'CHIP T { IN a[2]; OUT o; PARTS: Or(a=a[5], b=a[5], out=o); }', [['Or', 'a', 'a[5]', 'a', 2], ['Or', 'b', 'a[5]', 'a', 2]]],
    ['one bit past the end of a two-part write, as the spec exports it', 'CHIP T { IN a[2]; OUT o[2]; PARTS: Or(a=a[0], b=a[0], out=o[1]); Or(a=a[1], b=a[1], out=o[2]); }', [['Or', 'out', 'o[2]', 'o', 2]]],
  ] as const)('refuses %s, as the reference does', (_, src, expected) => {
    expect(errorsOf(src)).toEqual(expected.map(([part, pin, ref, signal, width]) => outOfRange(part, pin, ref, signal, width)))
  })

  it('refuses a read past the width an internal signal took from the part-pin slice that wrote it', () => {
    expect(errorsOf('CHIP C { IN a[16]; OUT o; PARTS: Not16(in=a, out[0..3]=nib); Not(in=nib[4], out=o); }')).toEqual([outOfRange('Not', 'in', 'nib[4]', 'nib', 4)])
  })

  it('accepts every slice that fits, up to the last bit', () => {
    expect(errorsOf('CHIP C { IN bus[16]; OUT o[2]; PARTS: Not(in=bus[15], out=o[1]); Not(in=bus[0], out=o[0]); }')).toEqual([])
  })

  it('leaves a read of a signal no part writes to the dangling-signal error: its width is not known', () => {
    expect(errorsOf('CHIP C { IN a; OUT o; PARTS: Not(in=x[5], out=o); }')).toEqual([expect.objectContaining({ message: 'Line 1: Signal "x" is read by part "Not" but no part produces it' })])
  })
})

describe('compileHDL — a read must touch a bit some part drives (#746, #431)', () => {
  let reg: ChipRegistry
  beforeEach(() => {
    reg = perBitRegistry()
  })
  function errorsOf(src: string) {
    const ast = parseHDL(src)
    if (!ast.success) throw new Error(`parse failed: ${src}`)
    const r = compileHDL(ast.chip, reg)
    return r.success ? [] : r.errors
  }
  const undriven = (part: string, bits: string): unknown =>
    expect.objectContaining({ partName: part, line: 1, message: `Line 1: Signal "t"${bits} is read by part "${part}" but no part drives it` })

  it("refuses #746's read of t[2] when only t[0] and t[1] are driven", () => {
    expect(errorsOf('CHIP C { IN a, b; OUT o; PARTS: Not(in=a, out=t[0]); Not(in=b, out=t[1]); Not(in=t[2], out=o); }')).toEqual([undriven('Not', ' bit 2')])
  })

  it("refuses #431's read of t[3] beside a whole-signal read that stays legal", () => {
    expect(errorsOf('CHIP C { IN a; OUT out[16]; PARTS: Not(in=a, out=t[0]); Not8(in[0]=t[3], out[1]=t[1]); Not16(in=t, out=out); }')).toEqual([undriven('Not8', ' bit 3')])
  })

  it('names every bit of a sliced read that touches no driven bit', () => {
    expect(errorsOf('CHIP C { IN a; OUT out[4]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[1]); Not4(in[0..1]=t[2..3], out=out); }')).toEqual([undriven('Not4', ' bits 2..3')])
  })

  it('refuses only the undriven read when one part reads a driven and an undriven bit', () => {
    expect(errorsOf('CHIP C { IN a; OUT o; PARTS: Not(in=a, out=t[1]); And(a=t[0], b=t[1], out=o); }')).toEqual([undriven('And', ' bit 0')])
  })

  it('reports one part reading the same undriven bit twice once', () => {
    expect(errorsOf('CHIP C { IN a; OUT o; PARTS: Not(in=a, out=t[0]); And(a=t[1], b=t[1], out=o); }')).toEqual([undriven('And', ' bit 1')])
  })

  it('unions the driven bits across every writer before the check', () => {
    expect(evaluateHdl('CHIP C { IN a; OUT out[8]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[1]); Not8(in[0..1]=t[0..1], out=out); }', { a: 0 }, reg)).toEqual({ out: 0xfc })
  })

  it('accepts t[0..2] with only t[0] and t[2] driven, reading the gap as 0', () => {
    expect(evaluateHdl('CHIP C { IN a; OUT out[4]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[2]); Not4(in[0..2]=t[0..2], out=out); }', { a: 0 }, reg)).toEqual({ out: 0b1010 })
  })

  it('accepts a whole-signal read of t with only t[0..1] driven (#355)', () => {
    expect(evaluateHdl('CHIP C { IN a; OUT out[16]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[1]); Not16(in=t, out=out); }', { a: 0 }, reg)).toEqual({ out: 65532 })
  })

  it('accepts a read that runs past the driven bits once it overlaps one of them', () => {
    expect(evaluateHdl('CHIP C { IN a; OUT out[4]; PARTS: Not(in=a, out=t[0]); Not(in=a, out=t[1]); Not4(in=t[0..3], out=out); }', { a: 0 }, reg)).toEqual({ out: 0b1100 })
  })
})

describe('compileHDL — a part cycle through the registry is refused (#816)', () => {
  const uses = (name: string, part: string): string => `CHIP ${name} { IN a; OUT out; PARTS: ${part}(a=a, out=out); }`
  const NOT_FROM_AND = 'CHIP Not { IN in; OUT out; PARTS: And(a=in, b=in, out=x); Nand(a=x, b=x, out=out); }'
  const AND_FROM_NOT = 'CHIP And { IN a, b; OUT out; PARTS: Nand(a=a, b=b, out=x); Not(in=x, out=out); }'
  const NOT_FROM_X = 'CHIP Not { IN in; OUT out; PARTS: X(a=in, out=out); }'
  const X_FROM_NOT = 'CHIP X { IN a; OUT out; PARTS: Not(in=a, out=out); }'

  function parsed(source: string): HDLChip {
    const ast = parseHDL(source)
    if (!ast.success) throw new Error(`parse failed: ${source}`)
    return ast.chip
  }
  function userChips(...sources: string[]): ChipRegistry {
    const user = createChipRegistry()
    for (const source of sources) user.register(hdlChipDefinition(parsed(source), source))
    return user
  }
  const builtinsFirst = (...sources: string[]): ChipRegistry => combineRegistries(getBuiltinChipRegistry(), userChips(...sources))
  const ownFirst = (...sources: string[]): ChipRegistry => combineRegistries(userChips(...sources), getBuiltinChipRegistry())
  const compile = (source: string, chips: ChipRegistry): HDLCompileResult => compileHDL(parsed(source), chips)
  // `uses` writes every part on line 1.
  const refusal = (message: string, partName: string): HDLCompileResult => ({ success: false, errors: [{ message, partName, line: 1 }] })

  it("refuses 'hdl' chips A and B that use each other, naming both", () => {
    expect(compile(uses('A', 'B'), builtinsFirst(uses('A', 'B'), uses('B', 'A')))).toEqual(refusal('Line 1: Cannot use chip A to implement itself through B', 'B'))
  })

  it('refuses A → B → C → A, naming each chip on the cycle in order', () => {
    const chips = builtinsFirst(uses('A', 'B'), uses('B', 'C'), uses('C', 'A'))
    expect(compile(uses('A', 'B'), chips)).toEqual(refusal('Line 1: Cannot use chip A to implement itself through B → C', 'B'))
  })

  it('returns a refusal naming A and B for Top, whose part A and B use each other', () => {
    expect(compile(uses('Top', 'A'), builtinsFirst(uses('A', 'B'), uses('B', 'A')))).toEqual(refusal('Line 1: Cannot use chip A to implement itself through B', 'A'))
  })

  it('refuses Top, whose part A uses itself, as A refusing itself', () => {
    expect(compile(uses('Top', 'A'), builtinsFirst(uses('A', 'A')))).toEqual(refusal('Line 1: Cannot use chip A to implement itself', 'A'))
  })

  it('builtins first, a Not.hdl that uses And beside an And.hdl that uses Not compiles, and Not evaluates to ¬in', () => {
    const chips = builtinsFirst(NOT_FROM_AND, AND_FROM_NOT)
    const not = compile(NOT_FROM_AND, chips)
    if (!not.success) throw new Error(not.errors.map((e) => e.message).join('; '))
    for (const value of [0, 1]) expect(not.evaluate({ in: value }, builtinOnlyCtx(chips))).toEqual({ out: 1 - value })
    expect(compile(AND_FROM_NOT, chips).success).toBe(true)
  })

  it('builtins first, a user Not that uses X, where X uses Not, compiles', () => {
    const chips = builtinsFirst(NOT_FROM_X, X_FROM_NOT)
    expect(compile(NOT_FROM_X, chips).success).toBe(true)
    expect(compile(X_FROM_NOT, chips).success).toBe(true)
  })

  it('own first, the Not.hdl and And.hdl that use each other are refused, naming Not and And', () => {
    const chips = ownFirst(NOT_FROM_AND, AND_FROM_NOT)
    expect(compile(NOT_FROM_AND, chips)).toEqual(refusal('Line 1: Cannot use chip Not to implement itself through And', 'And'))
    expect(compile(AND_FROM_NOT, chips)).toEqual(refusal('Line 1: Cannot use chip And to implement itself through Not', 'Not'))
  })

  it('refuses A and B that use each other under a registry whose get builds a fresh definition per call', () => {
    const sources = new Map([['A', uses('A', 'B')], ['B', uses('B', 'A')]])
    const builtins = getBuiltinChipRegistry()
    let calls = 0
    const fresh: ChipRegistry = {
      ...builtins,
      get(name) {
        if (++calls > 1000) throw new Error(`the walk did not end after ${calls - 1} get calls`)
        const source = sources.get(name)
        return source === undefined ? builtins.get(name) : hdlChipDefinition(parsed(source), source)
      },
    }
    expect(compile(uses('A', 'B'), fresh)).toEqual(refusal('Line 1: Cannot use chip A to implement itself through B', 'B'))
    expect(compile(uses('Top', 'A'), fresh)).toEqual(refusal('Line 1: Cannot use chip A to implement itself through B', 'A'))
  })

  it('gives the cycle refusal the line of the part that starts it (#820)', () => {
    const top = 'CHIP Top {\n  IN a;\n  OUT out;\n  PARTS:\n  Not(in=a, out=x);\n  A(a=x, out=out);\n}'
    expect(compile(top, builtinsFirst(uses('A', 'B'), uses('B', 'A')))).toEqual({
      success: false,
      errors: [{ message: 'Line 6: Cannot use chip A to implement itself through B', partName: 'A', line: 6 }],
    })
  })

  describe('a part named after a builtin only the web IDE has resolves to the user chip (#901)', () => {
    const HALF_FROM_FULL = 'CHIP HalfAdder { IN a, b; OUT sum, carry; PARTS: FullAdder(a=a, b=b, c=false, sum=sum, carry=carry); }'
    const FULL_FROM_HALF = 'CHIP FullAdder { IN a, b, c; OUT sum, carry; PARTS: HalfAdder(a=a, b=b, sum=sum, carry=carry); }'
    const HALF_WRONG = 'CHIP HalfAdder { IN a, b; OUT sum, carry; PARTS: And(a=a, b=b, out=sum); Xor(a=a, b=b, out=carry); }'
    const FULL = 'CHIP FullAdder { IN a, b, c; OUT sum, carry; PARTS: HalfAdder(a=a, b=b, sum=s1, carry=c1); HalfAdder(a=s1, b=c, sum=sum, carry=c2); Or(a=c1, b=c2, out=carry); }'

    it('refuses a user HalfAdder over FullAdder beside a user FullAdder over HalfAdder, where the web IDE builds the HalfAdder on its builtin FullAdder with 0 reads and 1+1 gives sum=0 carry=1', () => {
      expect(compile(HALF_FROM_FULL, builtinsFirst(HALF_FROM_FULL, FULL_FROM_HALF))).toEqual(refusal('Line 1: Cannot use chip HalfAdder to implement itself through FullAdder', 'FullAdder'))
    })

    it("evaluates a correct user FullAdder through a wrong user HalfAdder, 001 to sum=0 carry=1, where the web IDE's FullAdder.hdl uses its builtin HalfAdder and gives sum=1 carry=0", () => {
      const chips = builtinsFirst(HALF_WRONG, FULL)
      const full = compile(FULL, chips)
      if (!full.success) throw new Error(full.errors.map((e) => e.message).join('; '))
      expect(full.evaluate({ a: 0, b: 0, c: 1 }, builtinOnlyCtx(chips))).toEqual({ sum: 0, carry: 1 })
    })
  })
})

describe("compileHDL — the reference's self-reference sentence, and the line of the part at fault (#820)", () => {
  const chip = (ins: string, outs: string, parts: string): string => `CHIP C {\n  IN ${ins};\n  OUT ${outs};\n  PARTS:\n${parts}\n}`
  function compile(source: string, registry: ChipRegistry = getBuiltinChipRegistry()): HDLCompileResult {
    const ast = parseHDL(source)
    if (!ast.success) throw new Error(`parse failed: ${source}`)
    return compileHDL(ast.chip, registry)
  }
  const errorsOf = (source: string): HDLCompileError[] => {
    const r = compile(source)
    return r.success ? [] : r.errors
  }
  const lines = (source: string): Array<[number | undefined, string]> => errorsOf(source).map((e) => [e.line, e.message])

  it('refuses a chip that names itself in the reference sentence, on the line of that part', () => {
    expect(compile('CHIP Not {\n  IN in;\n  OUT out;\n\n  PARTS:\n  Not(in=in, out=out);\n}')).toEqual({
      success: false,
      errors: [{ message: 'Line 6: Cannot use chip Not to implement itself', partName: 'Not', line: 6 }],
    })
  })

  it('takes the self-reference line from the part that names the chip, not from the first part', () => {
    expect(lines('CHIP Not {\n  IN in;\n  OUT out;\n  PARTS:\n  Nand(a=in, b=in, out=x);\n  Not(in=x, out=out);\n}')).toEqual([[6, 'Line 6: Cannot use chip Not to implement itself']])
  })

  it('puts the line of a bad part off line 1 in the field and as the Line N: prefix, where the reference puts it', () => {
    expect(compile(chip('a', 'out', '  Not(in=a[2], out=out);'))).toEqual({
      success: false,
      errors: [{ message: 'Line 5: Part "Not" pin "in" is wired to "a[2]": sub-bus index out of range ("a" has width 1)', partName: 'Not', pinName: 'in', line: 5 }],
    })
  })

  it('gives two failing parts on different lines two messages, each with its own line; the reference stops at the first', () => {
    expect(lines(chip('a', 'x, y', '  Not(in=a[2], out=x);\n  Not(in=a[3], out=y);'))).toEqual([
      [5, 'Line 5: Part "Not" pin "in" is wired to "a[2]": sub-bus index out of range ("a" has width 1)'],
      [6, 'Line 6: Part "Not" pin "in" is wired to "a[3]": sub-bus index out of range ("a" has width 1)'],
    ])
  })

  it("gives a part written across several lines the line of its name, where the reference gives the pin's line 6", () => {
    expect(lines(chip('a', 'out', '  Not(\n    in=a[2],\n    out=out);'))).toEqual([[5, 'Line 5: Part "Not" pin "in" is wired to "a[2]": sub-bus index out of range ("a" has width 1)']])
  })

  it.each([
    ['an unknown part', chip('a', 'o', '  Foo(in=a, out=o);'), [[5, 'Line 5: Unknown chip-part: "Foo"']]],
    ['a pin the part does not have', chip('x', 'y', '  Nand(a=x, b=x, c=x, out=y);'), [[5, 'Line 5: Part "Nand" has no pin "c"']]],
    ['a part-pin slice past its pin', chip('a', 'out[16]', '  Not16(in[16]=a, out=out);'), [[5, 'Line 5: Part "Not16" pin "in[16]" is out of range; "in" has width 16']]],
    ['a width mismatch', 'CHIP C {\n  IN a[16];\n  OUT o;\n\n  PARTS:\n  Not(in=a, out=o);\n}', [[6, 'Line 6: Part "Not" pin "in" width 1 != signal "a" width 16']]],
    ['an input pin bound twice', chip('a, b', 'o', '  Not(in=a, in=b, out=o);'), [[5, 'Line 5: Part "Not" pin "in" bit 0 is bound by more than one connection']]],
    ['an output bound to a literal', chip('a', 'out', '  Not(in=a, out=true);\n  And(a=a, b=true, out=out);'), [[5, 'Line 5: Part "Not" output "out" cannot connect to literal "true"']]],
    ['an output written to a chip input', chip('a, b', 'out', '  Not(in=b, out=a);\n  Not(in=b, out=out);'), [[5, 'Line 5: Part "Not" output "out" cannot write to chip input "a"']]],
    ['a second driver, on its own line', chip('a, b', 'o', '  Not(in=a, out=o);\n  Not(in=b, out=o);'), [[6, 'Line 6: Signal "o" is driven by more than one part']]],
    ['an unconnected input pin', chip('a, b', 'out', '  Nand(a=a, out=out);'), [[5, 'Line 5: Part "Nand" input pin "b" is not connected: the nand2tetris simulator reads it as 0; bind b=false to do the same']]],
    ['a read of a signal nothing produces', chip('a', 'o', '  Not(in=u, out=o);'), [[5, 'Line 5: Signal "u" is read by part "Not" but no part produces it']]],
    ['a read of bits nothing drives, on the reading part', chip('a', 'o', '  Not(in=a, out=t[0]);\n  Not(in=t[1], out=o);'), [[6, 'Line 6: Signal "t" bit 1 is read by part "Not" but no part drives it']]],
  ] as const)('gives %s the line of the part at fault', (_, source, expected) => {
    expect(lines(source)).toEqual(expected)
  })

  it('reports a bit driven by parts on three lines once, on the line of the second', () => {
    expect(lines(chip('a, b, c', 'o', '  Not(in=a, out=o);\n  Not(in=b, out=o);\n  Not(in=c, out=o);'))).toEqual([[6, 'Line 6: Signal "o" is driven by more than one part']])
  })

  const CYCLE = 'Cyclic part dependency: parts cannot be topologically ordered (combinational cycle) through'

  it("gives a part that reads the bits it writes the line of that part, where the reference refuses a Looping wire", () => {
    expect(compile(chip('a', 'o', '  And(a=a, b=t, out=t);\n  Not(in=t, out=o);'))).toEqual({
      success: false,
      errors: [{ message: `Line 5: ${CYCLE} "t"`, line: 5 }],
    })
  })

  it('gives a cycle across parts the line of the part that closes it, where the reference refuses a Circular pin dependency', () => {
    expect(lines(chip('a', 'o', '  Nand(a=a, b=y, out=x);\n  Not(in=x, out=y);\n  Not(in=x, out=o);'))).toEqual([[6, `Line 6: ${CYCLE} "x" → "y"`]])
  })

  it('blames the first cycle closed in source order, and traces that cycle, not an earlier part on a later cycle', () => {
    const errors = errorsOf(chip('a', 'o', '  Not(in=q, out=p);\n  Not(in=s, out=r);\n  Not(in=r, out=s);\n  Not(in=p, out=q);\n  And(a=p, b=r, out=o);'))
    const read = ({ line, message }: HDLCompileError) => ({ line, prefixed: message.startsWith(`Line 7: ${CYCLE} `), signals: [...message.matchAll(/"(\w+)"/g)].map(([, signal]) => signal).sort() })
    expect(errors.map(read)).toEqual([{ line: 7, prefixed: true, signals: ['r', 's'] }])
  })

  it('gives a cycle through three parts the line of the third', () => {
    expect(lines(chip('a', 'o', '  Not(in=r, out=p);\n  Not(in=p, out=q);\n  Not(in=q, out=r);\n  Not(in=p, out=o);'))).toEqual([[7, `Line 7: ${CYCLE} "q" → "r" → "p"`]])
  })

  it('follows bits, so a cycle through two bits of one internal signal takes line 6, where the reference refuses the subscripted pin on line 5', () => {
    expect(lines(chip('a', 'out', '  Not(in=w[1], out=w[0]);\n  Not(in=w[0], out=w[1]);\n  And(a=w[0], b=w[1], out=out);'))).toEqual([[6, `Line 6: ${CYCLE} "w" bit 0 → "w" bit 1`]])
  })

  it("gives a cycle closed by a part written across several lines the line of its name, where the reference gives the closing wire's line 8", () => {
    expect(lines(chip('a', 'o', '  Nand(a=a, b=y, out=x);\n  Not(\n    in=x,\n    out=y);\n  Not(in=x, out=o);'))).toEqual([[6, `Line 6: ${CYCLE} "x" → "y"`]])
  })

  it('gives an error no part caused no line and no prefix', () => {
    expect(compile(chip('a', 'out', '  BUILTIN Nope;'))).toEqual({ success: false, errors: [{ message: 'Builtin chip "Nope" not found in registry' }] })
    const user = createChipRegistry()
    user.register({ name: 'Foo', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP Foo { IN a; OUT out; PARTS: Not(in=a, out=out); }' } })
    expect(compile(chip('a', 'out', '  BUILTIN Foo;'), user)).toEqual({ success: false, errors: [{ message: 'Chip "Foo" is not a builtin' }] })
  })

  it('gives a part with no source line, as a spec lowers it, neither the field nor the prefix', () => {
    const ast: HDLChip = { name: 'C', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'o', width: 1 }], parts: [{ name: 'Foo', connections: [{ internal: 'in', external: 'a' }, { internal: 'out', external: 'o' }] }] }
    expect(compileHDL(ast, getBuiltinChipRegistry())).toEqual({ success: false, errors: [{ message: 'Unknown chip-part: "Foo"', partName: 'Foo' }] })
  })
})

describe("compileHDL — a BUILTIN body declares the builtin's own pins (#919)", () => {
  function ast(source: string): HDLChip {
    const parsed = parseHDL(source)
    if (!parsed.success) throw new Error(`parse failed: ${source}`)
    return parsed.chip
  }
  const compile = (source: string, chips: ChipRegistry = getBuiltinChipRegistry()): HDLCompileResult => compileHDL(ast(source), chips)

  it('refuses Foo declaring IN a over BUILTIN Not, whose IN is in, naming both sides', () => {
    expect(compile('CHIP Foo { IN a; OUT out; BUILTIN Not; }')).toEqual({ success: false, errors: [{ message: 'Foo declares IN a, but builtin Not declares IN in' }] })
  })

  it('refuses Foo declaring IN a and OUT o over BUILTIN Nand with the IN message, then the OUT one', () => {
    expect(compile('CHIP Foo { IN a; OUT o; BUILTIN Nand; }')).toEqual({
      success: false,
      errors: [{ message: 'Foo declares IN a, but builtin Nand declares IN a, b' }, { message: 'Foo declares OUT o, but builtin Nand declares OUT out' }],
    })
  })

  it('refuses Foo declaring IN in, in over BUILTIN Not, whose IN is in once (#912)', () => {
    expect(compile('CHIP Foo { IN in, in; OUT out; BUILTIN Not; }')).toEqual({ success: false, errors: [{ message: 'Foo declares IN in, in, but builtin Not declares IN in' }] })
  })

  it('accepts Foo declaring IN in and OUT out over BUILTIN Not, and an Outer over it gives o = ¬a', () => {
    const foo = 'CHIP Foo { IN in; OUT out; BUILTIN Not; }'
    expect(compile(foo).success).toBe(true)
    const own = createChipRegistry()
    own.register(hdlChipDefinition(ast(foo), foo))
    const chips = combineRegistries(getBuiltinChipRegistry(), own)
    const outer = compile('CHIP Outer { IN a; OUT o; PARTS: Foo(in=a, out=o); }', chips)
    if (!outer.success) throw new Error(outer.errors.map((e) => e.message).join('; '))
    expect([0, 1].map((a) => outer.evaluate({ a }, builtinOnlyCtx(chips)))).toEqual([{ o: 1 }, { o: 0 }])
  })
})
