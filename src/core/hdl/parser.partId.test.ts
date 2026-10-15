import { describe, expect, it } from 'vitest'
import { parseHDL } from './parser'

const chip = (parts: string): string => `CHIP X {\n    IN a, b;\n    OUT out;\n    PARTS:\n${parts}\n}\n`

function partsOf(source: string) {
  const result = parseHDL(source)
  if (!result.success) throw new Error(result.errors.map((e) => e.message).join('; '))
  return result.chip.parts
}

describe('parseHDL part-id markers (ADR-0020 §1.9)', () => {
  it('reads a trailing // #p<n> back as the id of the part it ends', () => {
    const parts = partsOf(chip('    Nand(a=a, b=b, out=t); // #p3\n    Not(in=t, out=out);  //#p12'))
    expect(parts.map((p) => p.id)).toEqual(['p3', 'p12'])
  })

  it('leaves a part with no marker without an id, so plain HDL parses exactly as before', () => {
    const parts = partsOf(chip('    Nand(a=a, b=b, out=t);\n    Not(in=t, out=out);'))
    expect(parts).toEqual([
      { name: 'Nand', connections: [{ internal: 'a', external: 'a' }, { internal: 'b', external: 'b' }, { internal: 'out', external: 't' }] },
      { name: 'Not', connections: [{ internal: 'in', external: 't' }, { internal: 'out', external: 'out' }] },
    ])
  })

  it('ignores ordinary comments, including ones that merely mention a marker', () => {
    const parts = partsOf(chip('    Nand(a=a, b=b, out=t); // #p3 is next\n    Not(in=t, out=out); // see #p4'))
    expect(parts.map((p) => p.id)).toEqual([undefined, undefined])
  })

  it('attaches a marker only on the line its part ends, never one on a line of its own', () => {
    const parts = partsOf(chip('    Nand(a=a, b=b, out=t);\n    // #p7\n    Not(in=t, out=out);'))
    expect(parts.map((p) => p.id)).toEqual([undefined, undefined])
  })

  it('treats a marker outside PARTS, or inside a block comment, as a comment', () => {
    const source = `// #p1\nCHIP X { // #p2\n    IN a; // #p3\n    OUT out;\n    PARTS:\n    /* // #p4 */ Not(in=a, out=out);\n}\n`
    expect(partsOf(source)).toEqual([{ name: 'Not', connections: [{ internal: 'in', external: 'a' }, { internal: 'out', external: 'out' }] }])
  })
})
