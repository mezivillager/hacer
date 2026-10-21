import { describe, expect, it } from 'vitest'
import { parseHDL } from '../hdl/parser'
import { emptySidecar } from './sidecar'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net } from './types'

const AND: CircuitSpec = {
  schemaVersion: SPEC_SCHEMA_VERSION,
  name: 'And',
  ins: [
    { name: 'a', width: 1 },
    { name: 'b', width: 1 },
  ],
  outs: [{ name: 'out', width: 1 }],
  parts: [
    { id: 'p1', chip: 'Nand' },
    { id: 'p2', chip: 'Not' },
  ],
  nets: [
    { id: 'out', driver: { kind: 'part-pin', partId: 'p2', pin: 'out' }, sinks: [{ kind: 'chip-out', pin: 'out' }] },
    { id: 'n', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [{ kind: 'part-pin', partId: 'p2', pin: 'in' }] },
    { id: 'b', driver: { kind: 'chip-in', pin: 'b' }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'b' }] },
    { id: 'a', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'a' }] },
  ],
}

const passThrough = (width: number): CircuitSpec => ({
  schemaVersion: SPEC_SCHEMA_VERSION,
  name: 'P',
  ins: [{ name: 'a', width }],
  outs: [{ name: 'out', width }],
  parts: [],
  nets: [{ id: 'out', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'chip-out', pin: 'out' }] }],
})

const shuffled = (doc: CircuitSpec): CircuitSpec => ({
  ...doc,
  nets: [...doc.nets].reverse().map((n: Net) => ({ ...n, sinks: [...n.sinks].reverse() })),
})

describe('printSpec', () => {
  it("prints the header, the ports, and each part's bindings with its // #p<n> id", () => {
    expect(printSpec(AND)).toBe(
      [
        '// hacer-spec 2',
        'CHIP And {',
        '    IN a, b;',
        '    OUT out;',
        '',
        '    PARTS:',
        '    Nand(a=a, b=b, out=n); // #p1',
        '    Not(in=n, out=out); // #p2',
        '}',
        '',
      ].join('\n'),
    )
  })

  it("raises a part's bindings in one order, inputs then outputs by pin, whatever the order of nets and sinks", () => {
    const { doc } = parseSpec('CHIP M { IN a, b, s; OUT o; PARTS: Mux(sel=s, out=o, b=b, a=a); Or8Way(in[1]=b, in[0]=a, out=t); }')
    if (doc === null) throw new Error('fixture did not parse')
    expect(printSpec(doc)).toContain('    Mux(a=a, b=b, sel=s, out=o); // #p1\n    Or8Way(in[0]=a, in[1]=b, out=t); // #p2\n')
    expect(printSpec(shuffled(doc))).toBe(printSpec(doc))
  })

  it('prints a pass-through net as wire out = a;, after the parts', () => {
    const text = printSpec({ ...passThrough(1), parts: [{ id: 'p1', chip: 'Not' }], nets: [...passThrough(1).nets, { id: 'a', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'in' }] }] })
    expect(text).toContain('    Not(in=a); // #p1\n    wire out = a;\n}\n')
  })

  it('prints a sliced pass-through with both slices: wire out[0] = a[2];', () => {
    const doc: CircuitSpec = {
      ...passThrough(4),
      nets: [{ id: 'out[0]', driver: { kind: 'chip-in', pin: 'a', slice: { start: 2, end: 2 } }, sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 0, end: 0 } }] }],
    }
    expect(printSpec(doc)).toContain('    wire out[0] = a[2];\n')
  })

  it('appends the sidecar as a trailing block that its own content cannot close early', () => {
    const sidecar = { ...emptySidecar(), notes: [{ kind: 'slice-inferred', detail: 'a */ inside a note' }] }
    const text = printSpec(AND, { sidecar })
    expect(text.indexOf('*/')).toBe(text.lastIndexOf('*/'))
    expect(text.endsWith('*/\n')).toBe(true)
    expect(parseSpec(text).sidecar).toEqual(sidecar)
  })

  describe("the nand2tetris dialect (§1.5's export mode)", () => {
    it('desugars wire out = a; to Or(a=a, b=a, out=out), appended after every declared part with no marker', () => {
      const doc: CircuitSpec = {
        ...passThrough(1),
        ins: [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
        parts: [{ id: 'p1', chip: 'Not' }],
        outs: [{ name: 'out', width: 1 }, { name: 'nb', width: 1 }],
        nets: [
          ...passThrough(1).nets,
          { id: 'b', driver: { kind: 'chip-in', pin: 'b' }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'in' }] },
          { id: 'nb', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [{ kind: 'chip-out', pin: 'nb' }] },
        ],
      }
      expect(printSpec(doc, { dialect: 'nand2tetris' })).toBe(
        ['CHIP P {', '    IN a, b;', '    OUT out, nb;', '', '    PARTS:', '    Not(in=b, out=nb); // #p1', '    Or(a=a, b=a, out=out);', '}', ''].join('\n'),
      )
    })

    it('cuts an alias into 16-bit windows from its low bit: Or at one bit, Or16 at 2–16 with its pins from bit 0', () => {
      const buffers = (width: number): string[] => printSpec(passThrough(width), { dialect: 'nand2tetris' }).split('\n').filter((l) => l.startsWith('    Or'))
      expect(buffers(1)).toEqual(['    Or(a=a, b=a, out=out);'])
      expect(buffers(4)).toEqual(['    Or16(a[0..3]=a, b[0..3]=a, out[0..3]=out);'])
      expect(buffers(16)).toEqual(['    Or16(a=a, b=a, out=out);'])
      expect(buffers(20)).toEqual(['    Or16(a=a[0..15], b=a[0..15], out=out[0..15]);', '    Or16(a[0..3]=a[16..19], b[0..3]=a[16..19], out[0..3]=out[16..19]);'])
    })

    it('prints plain HDL — no header, no wire statement, no sidecar — that parseHDL accepts', () => {
      const text = printSpec(passThrough(8), { dialect: 'nand2tetris', sidecar: emptySidecar() })
      expect(text).not.toMatch(/hacer-spec|hacer-sidecar|\bwire\b/)
      expect(parseHDL(text).success).toBe(true)
    })
  })
})

describe('printSpec — a driverless net beside a driven net of the same id', () => {
  const notInto = (out: Net[]): CircuitSpec => ({
    ...passThrough(1),
    parts: [{ id: 'p1', chip: 'Not' }],
    nets: [{ id: 'a', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'in' }] }, ...out],
  })
  const twinned = notInto([
    { id: 'out', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [{ kind: 'chip-out', pin: 'out' }] },
    { id: 'out', driver: null, sinks: [{ kind: 'chip-out', pin: 'out' }] },
  ])

  it.each([
    ['hacer', {}],
    ['nand2tetris', { dialect: 'nand2tetris' }],
  ] as const)('the %s dialect throws an Error naming the net, whatever the nets\' order', (_dialect, options) => {
    for (const doc of [twinned, shuffled(twinned)]) {
      expect(() => printSpec(doc, options)).toThrow(Error)
      expect(() => printSpec(doc, options)).toThrow('net "out"')
    }
  })

  it("still prints a driverless net with no driven twin, ADR-0020 §1.1's unfinished circuit", () => {
    const unfinished = notInto([
      { id: 'q', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [] },
      { id: 'out', driver: null, sinks: [{ kind: 'chip-out', pin: 'out' }] },
    ])
    expect(printSpec(unfinished)).toContain('    Not(in=a, out=q); // #p1\n}\n')
    expect(printSpec(unfinished, { dialect: 'nand2tetris' })).toContain('    Not(in=a, out=q); // #p1\n}\n')
  })
})

describe('printSpec — empty port lists', () => {
  it('prints no IN line for a chip with no inputs, as the reference grammar allows, rather than IN ;', () => {
    const text = printSpec({ ...passThrough(1), ins: [], nets: [] })
    expect(text).not.toContain('IN')
    expect(text).toContain('    OUT out;\n')
  })
})
