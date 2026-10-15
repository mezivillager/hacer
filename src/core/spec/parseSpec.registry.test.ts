import { describe, expect, it } from 'vitest'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import { parseSpec } from './parseSpec'

const SOURCE = 'CHIP X { IN a; OUT out; PARTS: Buf(x=a, y=out); // #p1\n}'

// ADR-0020 §1.10.8: pin directions come from the registry the caller passes, the Project 1 builtins by default.
describe('parseSpec — the chips option', () => {
  it('reads pin directions from the registry it is given', () => {
    const chips = createChipRegistry()
    registerBuiltin(chips, 'Buf', [{ name: 'x', width: 1 }], [{ name: 'y', width: 1 }], ({ x }) => ({ y: x }))
    const result = parseSpec(SOURCE, { chips })
    expect(result.diagnostics).toEqual([])
    expect(result.doc?.nets.find((n) => n.id === 'out')?.driver).toEqual({ kind: 'part-pin', partId: 'p1', pin: 'y' })
  })

  it('falls back to the Project 1 builtins, which do not know the chip', () => {
    expect(parseSpec(SOURCE).diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(['unknown-chip']))
  })
})
