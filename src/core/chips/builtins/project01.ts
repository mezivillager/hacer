import type { ChipRegistry } from '../registry'
import { registerBuiltin } from '../registry'
import type { ChipPin } from '../types'

const MASK16 = 0xffff

function pin(name: string, width = 1): ChipPin {
  return { name, width }
}

/**
 * Registers all 16 Project 1 (Nand-to-tetris) builtins onto the provided
 * registry. Safe to call more than once: if a chip is already registered,
 * the second call is a no-op (does not throw, does not duplicate).
 *
 * Evaluate functions are pure and bit-correct: 16-bit outputs are masked
 * with `& MASK16` so signed-shift artefacts never leak, and selector
 * inputs are masked to defend against out-of-range values.
 */
export function registerProject1Builtins(registry: ChipRegistry): void {
  const safe = (
    name: string,
    inputs: ChipPin[],
    outputs: ChipPin[],
    evaluate: (i: Record<string, number>) => Record<string, number>,
  ): void => {
    if (registry.has(name)) return
    registerBuiltin(registry, name, inputs, outputs, evaluate)
  }

  safe(
    'Nand',
    [pin('a'), pin('b')],
    [pin('out')],
    (i) => ({ out: (i.a & i.b) === 0 ? 1 : 0 }),
  )

  safe(
    'Not',
    [pin('in')],
    [pin('out')],
    (i) => ({ out: i.in === 0 ? 1 : 0 }),
  )

  safe(
    'And',
    [pin('a'), pin('b')],
    [pin('out')],
    (i) => ({ out: (i.a & i.b) & 1 }),
  )

  safe(
    'Or',
    [pin('a'), pin('b')],
    [pin('out')],
    (i) => ({ out: (i.a | i.b) & 1 }),
  )

  safe(
    'Xor',
    [pin('a'), pin('b')],
    [pin('out')],
    (i) => ({ out: (i.a ^ i.b) & 1 }),
  )

  safe(
    'Mux',
    [pin('a'), pin('b'), pin('sel')],
    [pin('out')],
    (i) => ({ out: (i.sel & 1) === 0 ? (i.a & 1) : (i.b & 1) }),
  )

  safe(
    'DMux',
    [pin('in'), pin('sel')],
    [pin('a'), pin('b')],
    (i) => {
      const s = i.sel & 1
      const v = i.in & 1
      return {
        a: s === 0 ? v : 0,
        b: s === 1 ? v : 0,
      }
    },
  )

  safe(
    'Not16',
    [pin('in', 16)],
    [pin('out', 16)],
    (i) => ({ out: (~i.in & MASK16) >>> 0 }),
  )

  safe(
    'And16',
    [pin('a', 16), pin('b', 16)],
    [pin('out', 16)],
    (i) => ({ out: (i.a & i.b & MASK16) >>> 0 }),
  )

  safe(
    'Or16',
    [pin('a', 16), pin('b', 16)],
    [pin('out', 16)],
    (i) => ({ out: ((i.a | i.b) & MASK16) >>> 0 }),
  )

  safe(
    'Mux16',
    [pin('a', 16), pin('b', 16), pin('sel')],
    [pin('out', 16)],
    (i) => ({ out: ((i.sel & 1) === 0 ? i.a : i.b) & MASK16 }),
  )

  safe(
    'Or8Way',
    [pin('in', 8)],
    [pin('out')],
    (i) => ({ out: (i.in & 0xff) !== 0 ? 1 : 0 }),
  )

  safe(
    'Mux4Way16',
    [pin('a', 16), pin('b', 16), pin('c', 16), pin('d', 16), pin('sel', 2)],
    [pin('out', 16)],
    (i) => {
      const lanes = [i.a, i.b, i.c, i.d]
      return { out: lanes[i.sel & 0x3] & MASK16 }
    },
  )

  safe(
    'Mux8Way16',
    [
      pin('a', 16), pin('b', 16), pin('c', 16), pin('d', 16),
      pin('e', 16), pin('f', 16), pin('g', 16), pin('h', 16),
      pin('sel', 3),
    ],
    [pin('out', 16)],
    (i) => {
      const lanes = [i.a, i.b, i.c, i.d, i.e, i.f, i.g, i.h]
      return { out: lanes[i.sel & 0x7] & MASK16 }
    },
  )

  safe(
    'DMux4Way',
    [pin('in'), pin('sel', 2)],
    [pin('a'), pin('b'), pin('c'), pin('d')],
    (i) => {
      const keys = ['a', 'b', 'c', 'd'] as const
      const v = i.in & 1
      const idx = i.sel & 0x3
      const out: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
      out[keys[idx]] = v
      return out
    },
  )

  safe(
    'DMux8Way',
    [pin('in'), pin('sel', 3)],
    [pin('a'), pin('b'), pin('c'), pin('d'), pin('e'), pin('f'), pin('g'), pin('h')],
    (i) => {
      const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
      const v = i.in & 1
      const idx = i.sel & 0x7
      const out: Record<string, number> = {
        a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0,
      }
      out[keys[idx]] = v
      return out
    },
  )
}
