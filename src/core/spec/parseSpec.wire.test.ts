import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'
import type { CircuitSpec, Net, SpecDiagnostic } from './types'

const chip = (ports: string, parts: string): string => `CHIP X {\n    ${ports}\n    PARTS:\n${parts}\n}\n`

function parsed(source: string): { doc: CircuitSpec; diagnostics: SpecDiagnostic[] } {
  const result = parseSpec(source)
  if (result.doc === null) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result
}

const net = (doc: CircuitSpec, id: string): Net | undefined => doc.nets.find((n) => n.id === id)
const codes = (diagnostics: SpecDiagnostic[]): string[] => diagnostics.map((d) => d.code)

describe('parseSpec — the wire statement', () => {
  describe('the one normalisation clause, on the parse path (§1)', () => {
    it('drops the net an invalid wire leaves with neither a driver nor a sink', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT out;', '    Not(in=a, out=out); // #p1\n    wire t = a;'))
      expect(codes(diagnostics)).toContain('invalid-wire')
      expect(net(doc, 't')).toBeUndefined()
      expect(doc.nets.every((n) => n.driver !== null || n.sinks.length > 0)).toBe(true)
    })
  })

  describe('wire out = a; (§1.5, §1.6)', () => {
    it('parses a pass-through as a net driven by chip-in a whose sink is chip-out out', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT out;', '    wire out = a;'))
      expect(doc.parts).toEqual([])
      expect(doc.nets).toEqual([{ id: 'out', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'chip-out', pin: 'out' }] }])
      expect(diagnostics).toEqual([])
    })

    it('parses the joiner bit of §1.6 as the same net with a slice on the sink', () => {
      const { doc } = parsed(chip('IN a, b; OUT out[2];', '    Not(in=b, out=out[1]); // #p1\n    wire out[0] = a;'))
      expect(net(doc, 'out[0]')).toEqual({
        id: 'out[0]',
        driver: { kind: 'chip-in', pin: 'a' },
        sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 0, end: 0 } }],
      })
    })

    it('diagnoses a wire whose target is not a chip OUT, whose source is not a chip port, or whose widths differ', () => {
      const { diagnostics } = parsed(chip('IN a, b[4]; OUT out, o2;', '    Not(in=a, out=t); // #p1\n    wire a = out;\n    wire out = t;\n    wire o2 = b;'))
      expect(diagnostics.filter((d) => d.code === 'invalid-wire')).toHaveLength(3)
    })

    it('classifies an alias by its driver kind, so a self-alias is a cycle, not an identity net to drop', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT x;', '    wire x = x;'))
      expect(net(doc, 'x')?.driver).toEqual({ kind: 'chip-out', pin: 'x' })
      expect(diagnostics).toEqual([expect.objectContaining({ code: 'alias-cycle', members: ['x', 'x'] })])
    })

    it('diagnoses an alias cycle with its members in order, and still returns the document', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT x, y;', '    wire x = y;\n    wire y = x;'))
      expect(doc.nets.map((n) => n.id).sort()).toEqual(['x', 'y'])
      expect(diagnostics).toEqual([expect.objectContaining({ code: 'alias-cycle', members: ['x', 'y', 'x'] })])
    })

    it('does not report a three-long alias chain rooted at a chip input', () => {
      const { diagnostics } = parsed(chip('IN a; OUT x, y, z;', '    wire x = y;\n    wire y = z;\n    wire z = a;'))
      expect(diagnostics).toEqual([])
    })
  })
})
