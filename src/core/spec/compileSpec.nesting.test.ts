import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { evaluateChip } from '../chips/evaluateChip'
import { createChipRegistry, type ChipRegistry } from '../chips/registry'
import type { ChipDefinition } from '../chips/types'
import { compileSpec } from './compileSpec'
import { parseSpec } from './parseSpec'

function withBuiltins(): ChipRegistry {
  const registry = createChipRegistry()
  for (const chip of getBuiltinChipRegistry().list()) registry.register(chip)
  return registry
}

function specChip(source: string, registry: ChipRegistry): ChipDefinition {
  const result = compileSpec(parseSpec(source, { chips: registry }), registry)
  if (!result.success) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result.chip
}

function register(registry: ChipRegistry, ...sources: string[]): ChipRegistry {
  for (const source of sources) registry.register(specChip(source, registry))
  return registry
}

const P = 'CHIP P { IN a; OUT out; PARTS: wire out = a; }'
const Q = 'CHIP Q { IN x; OUT y; PARTS: P(a=x, out=y); }'
const R = 'CHIP R { IN x; OUT z; PARTS: Q(x=x, y=t); Not(in=t, out=z); }'
const FOO_NOT = 'CHIP Foo { IN a; OUT out; PARTS: Not(in=a, out=out); }'
const FOO_WIRE = 'CHIP Foo { IN a; OUT out; PARTS: wire out = a; }'
const BAR = 'CHIP Bar { IN a; OUT out; PARTS: Foo(a=a, out=out); }'
const SELF = 'CHIP P { IN a; OUT out; PARTS: P(a=a, out=out); }'

const run = (registry: ChipRegistry, name: string, inputs: Record<string, number>): Record<string, number> => {
  const chip = registry.get(name)
  if (!chip) throw new Error(`${name} is not registered`)
  return evaluateChip(chip, inputs, registry)
}

describe('compileSpec — registration and nesting', () => {
  it('a registered spec is a part another spec can name', () => {
    const registry = register(withBuiltins(), 'CHIP Inv { IN x; OUT y; PARTS: Nand(a=x, b=x, out=y); }', 'CHIP Buf { IN x; OUT y; PARTS: Inv(x=x, y=t); Inv(x=t, y=y); }')
    expect(registry.get('Buf')?.implementation.type).toBe('circuit')
    for (const x of [0, 1]) expect(run(registry, 'Buf', { x })).toEqual({ y: x })
  })

  it('three levels of specs with a pass-through at every boundary evaluate', () => {
    const registry = register(withBuiltins(), P, Q, R)
    for (const x of [0, 1]) {
      expect(run(registry, 'Q', { x })).toEqual({ y: x })
      expect(run(registry, 'R', { x })).toEqual({ z: 1 - x })
    }
  })

  it('an edited spec registered in a fresh registry changes what its unchanged dependents evaluate', () => {
    const before = register(withBuiltins(), FOO_NOT)
    const bar = specChip(BAR, before)
    before.register(bar)
    const after = register(withBuiltins(), FOO_WIRE)
    after.register(bar)
    expect(evaluateChip(bar, { a: 1 }, before)).toEqual({ out: 0 })
    expect(evaluateChip(bar, { a: 1 }, after)).toEqual({ out: 1 })
    expect(evaluateChip(bar, { a: 0 }, before)).toEqual({ out: 1 })
  })

  it('a spec that names itself as a part is refused by name', () => {
    const registry = register(withBuiltins(), P)
    const result = compileSpec(parseSpec(SELF, { chips: registry }), registry)
    expect(result).toEqual({ success: false, diagnostics: [{ code: 'compile', severity: 'error', message: 'Chip "P" cannot use itself as a part' }] })

    const parsed = parseSpec(SELF, { chips: registry })
    if (parsed.doc === null) throw new Error('SELF did not parse')
    const fresh = withBuiltins()
    const self: ChipDefinition = { name: 'P', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'circuit', spec: parsed.doc } }
    fresh.register(self)
    expect(() => evaluateChip(self, { a: 1 }, fresh)).toThrow('Chip "P" cannot use itself as a part')
  })
})
