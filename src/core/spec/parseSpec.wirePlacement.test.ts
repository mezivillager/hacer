import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'

const PORTS = 'IN a; OUT out, o2;'

// A wire is a statement of PARTS:, between parts; anywhere else it is text the grammar does not allow.
describe('parseSpec — where a wire statement may stand', () => {
  it.each([
    ['after the closing brace', `CHIP X { ${PORTS} PARTS: Not(in=a, out=out); }\nwire o2 = a;\n`],
    ['before CHIP', `wire o2 = a;\nCHIP X { ${PORTS} PARTS: Not(in=a, out=out); }\n`],
    ['before PARTS:', `CHIP X { ${PORTS} wire o2 = a; PARTS: Not(in=a, out=out); }\n`],
    ["inside a part's bindings", `CHIP X { ${PORTS} PARTS: Not(in=a, wire o2 = a; out=out); }\n`],
  ])('refuses a wire %s by name', (_where, source) => {
    const result = parseSpec(source)
    expect(result.doc).toBeNull()
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'syntax', message: expect.stringContaining('wire') })])
  })

  it('reads a wire before, between and after parts', () => {
    const result = parseSpec(`CHIP X { IN a; OUT out, o2, o3, o4; PARTS: wire o2 = a; Not(in=a, out=out); wire o3 = a; Not(in=a, out=t); wire o4 = a; }\n`)
    expect(result.doc?.nets.filter((n) => n.driver?.kind === 'chip-in' && n.id !== 'a').map((n) => n.id).sort()).toEqual(['o2', 'o3', 'o4'])
  })
})
