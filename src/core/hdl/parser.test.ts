import { describe, it, expect } from 'vitest'
import { parseHDL } from './parser'

// ---------------------------------------------------------------------------
// HDL shape fixtures for parser tests (comments are filler only)
// ---------------------------------------------------------------------------

const NAND_HDL = `// violet penguin says: built-in primitive
// nobody parses this prose anyway
CHIP Nand {
    IN a, b;
    OUT out;

    PARTS:
    BUILTIN Nand;
}`

const NOT_HDL = `// fixture #2 — keep the kettle on
/* lunar rover left a sock here */
CHIP Not {
    IN in;
    OUT out;

    PARTS:
    //// quadruple slash still counts as line comment
}`

const AND_HDL = `// bananas are berries, strawberries are not
// (irrelevant to HDL)
CHIP And {
    IN a, b;
    OUT out;

    PARTS:
    //// TODO: imagination required
}`

const OR_HDL = `// the number 7 is overrated
CHIP Or {
    IN a, b;
    OUT out;

    PARTS:
    //// placeholder line for empty PARTS body
}`

const XOR_HDL = `/* jazz hands */
// XOR rhymes with nothing useful
CHIP Xor {
    IN a, b;
    OUT out;

    PARTS:
    //// stub
}`

const MUX_HDL = `// mux not muxtape
CHIP Mux {
    IN a, b, sel;
    OUT out;

    PARTS:
    //// sel picks a lane
}`

const DMUX_HDL = `// demux demux demux
CHIP DMux {
    IN in, sel;
    OUT a, b;

    PARTS:
    //// fan-out homework goes here
}`

const NOT16_HDL = `// sixteen bits walk into a bar
CHIP Not16 {
    IN in[16];
    OUT out[16];

    PARTS:
    //// wide bus, narrow patience
}`

const AND16_HDL = `// parallel ANDs, serial coffee breaks
CHIP And16 {
    IN a[16], b[16];
    OUT out[16];

    PARTS:
    //// bitwise vibes
}`

const OR16_HDL = `// OR sixteen times fast
CHIP Or16 {
    IN a[16], b[16];
    OUT out[16];

    PARTS:
    //// still empty on purpose
}`

const MUX16_HDL = `// pick one lane, sixteen wires wide
CHIP Mux16 {
    IN a[16], b[16], sel;
    OUT out[16];

    PARTS:
    //// sel is scalar; buses are not
}`

const MUX4WAY16_HDL = `// four inputs, one spotlight
CHIP Mux4Way16 {
    IN a[16], b[16], c[16], d[16], sel[2];
    OUT out[16];

    PARTS:
    //// sel is two bits of chaos
}`

const MUX8WAY16_HDL = `// eight is enough (for this fixture)
CHIP Mux8Way16 {
    IN a[16], b[16], c[16], d[16],
       e[16], f[16], g[16], h[16],
       sel[3];
    OUT out[16];

    PARTS:
    //// line wrap above is intentional
}`

const DMUX4WAY_HDL = `// one in, four out, pick your fighter
CHIP DMux4Way {
    IN in, sel[2];
    OUT a, b, c, d;

    PARTS:
    //// demux quartet
}`

const DMUX8WAY_HDL = `// octopus routing diagram (ascii omitted)
CHIP DMux8Way {
    IN in, sel[3];
    OUT a, b, c, d, e, f, g, h;

    PARTS:
    //// eight outputs, one lonely input
}`

const OR8WAY_HDL = `// OR-tree sketch on a napkin
CHIP Or8Way {
    IN in[8];
    OUT out;

    PARTS:
    //// eight-way fold coming soon
}`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HDL Parser', () => {
  describe('basic parsing', () => {
    it('parses Nand BUILTIN declaration', () => {
      const result = parseHDL(NAND_HDL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.name).toBe('Nand')
      expect(result.chip.inputs).toEqual([
        { name: 'a', width: 1 },
        { name: 'b', width: 1 },
      ])
      expect(result.chip.outputs).toEqual([{ name: 'out', width: 1 }])
      expect(result.chip.builtin).toBe('Nand')
      expect(result.chip.parts).toEqual([])
    })

    it('parses Not stub (empty PARTS)', () => {
      const result = parseHDL(NOT_HDL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.name).toBe('Not')
      expect(result.chip.inputs).toEqual([{ name: 'in', width: 1 }])
      expect(result.chip.outputs).toEqual([{ name: 'out', width: 1 }])
      expect(result.chip.parts).toEqual([])
    })

    it('parses And stub with IN, OUT, PARTS', () => {
      const result = parseHDL(AND_HDL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.name).toBe('And')
      expect(result.chip.inputs).toEqual([
        { name: 'a', width: 1 },
        { name: 'b', width: 1 },
      ])
      expect(result.chip.outputs).toEqual([{ name: 'out', width: 1 }])
    })

    it('rejects chip missing OUT after IN (grammar)', () => {
      const result = parseHDL(`CHIP Bad {
        IN a;
        PARTS:
      }`)
      expect(result.success).toBe(false)
    })

    it('rejects chip missing PARTS section', () => {
      const result = parseHDL(`CHIP Bad {
        IN a;
        OUT b;
      }`)
      expect(result.success).toBe(false)
    })

    it('parses Mux4Way16 with bus widths and multi-bit sel', () => {
      const result = parseHDL(MUX4WAY16_HDL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.name).toBe('Mux4Way16')
      expect(result.chip.inputs).toHaveLength(5)
      expect(result.chip.inputs[0]).toEqual({ name: 'a', width: 16 })
      expect(result.chip.inputs[4]).toEqual({ name: 'sel', width: 2 })
      expect(result.chip.outputs).toEqual([{ name: 'out', width: 16 }])
    })

    it('parses Mux8Way16 with multi-line IN declaration', () => {
      const result = parseHDL(MUX8WAY16_HDL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.name).toBe('Mux8Way16')
      expect(result.chip.inputs).toHaveLength(9)
      expect(result.chip.inputs[7]).toEqual({ name: 'h', width: 16 })
      expect(result.chip.inputs[8]).toEqual({ name: 'sel', width: 3 })
    })

    it('parses DMux8Way with many output pins', () => {
      const result = parseHDL(DMUX8WAY_HDL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.name).toBe('DMux8Way')
      expect(result.chip.outputs).toHaveLength(8)
      expect(result.chip.outputs.map((p) => p.name)).toEqual([
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
      ])
    })
  })

  describe('parts and connections', () => {
    it('parses a chip with parts and connections', () => {
      const hdl = `CHIP Not {
        IN in;
        OUT out;
        PARTS:
        Nand(a=in, b=in, out=out);
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(1)
      expect(result.chip.parts[0].name).toBe('Nand')
      expect(result.chip.parts[0].connections).toEqual([
        { internal: 'a', external: 'in' },
        { internal: 'b', external: 'in' },
        { internal: 'out', external: 'out' },
      ])
    })

    it('parses multiple parts', () => {
      const hdl = `CHIP And {
        IN a, b;
        OUT out;
        PARTS:
        Nand(a=a, b=b, out=nandOut);
        Not(in=nandOut, out=out);
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(2)
      expect(result.chip.parts[0].name).toBe('Nand')
      expect(result.chip.parts[0].connections).toEqual([
        { internal: 'a', external: 'a' },
        { internal: 'b', external: 'b' },
        { internal: 'out', external: 'nandOut' },
      ])
      expect(result.chip.parts[1].name).toBe('Not')
      expect(result.chip.parts[1].connections).toEqual([
        { internal: 'in', external: 'nandOut' },
        { internal: 'out', external: 'out' },
      ])
    })

    it('parses sub-bus connections', () => {
      const hdl = `CHIP Test {
        IN in[16];
        OUT out[8];
        PARTS:
        Foo(a=in[0..7], out=out);
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts[0].connections[0]).toEqual({
        internal: 'a', external: 'in', start: 0, end: 7,
      })
    })

    it('parses single-bit sub-bus', () => {
      const hdl = `CHIP Test {
        IN in[16];
        OUT out;
        PARTS:
        Not(in=in[3], out=out);
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts[0].connections[0]).toEqual({
        internal: 'in', external: 'in', start: 3, end: 3,
      })
    })

    it('parses true/false literal connections', () => {
      const hdl = `CHIP Test {
        IN in;
        OUT out;
        PARTS:
        Nand(a=in, b=true, out=out);
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts[0].connections[1]).toEqual({
        internal: 'b', external: 'true',
      })
    })

    it('parses false literal connections', () => {
      const hdl = `CHIP Test {
        IN in;
        OUT out;
        PARTS:
        Or(a=in, b=false, out=out);
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts[0].connections[1]).toEqual({
        internal: 'b', external: 'false',
      })
    })
  })

  describe('comments', () => {
    it('ignores line comments', () => {
      const hdl = `// This is a comment
      CHIP Not {
        IN in; // input
        OUT out;
        PARTS:
        // implementation
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
    })

    it('ignores block comments', () => {
      const hdl = `/* block */
      CHIP Not { /* name */
        IN in; OUT out;
        PARTS: /* empty */
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
    })

    it('ignores doc comments (/** ... */)', () => {
      const hdl = `/**
       * This is a doc comment
       */
      CHIP Not {
        IN in; OUT out;
        PARTS:
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
    })

    it('ignores quadruple-slash comments (////)', () => {
      const hdl = `CHIP Not {
        IN in; OUT out;
        PARTS:
        //// Replace this comment with your code.
      }`
      const result = parseHDL(hdl)
      expect(result.success).toBe(true)
    })

    it('reports error for unterminated block comment', () => {
      const result = parseHDL(`CHIP X {
        IN a; OUT b; PARTS:
      } /* this comment never closes`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Unterminated block comment')
    })

    it('reports error for unterminated block comment before any tokens', () => {
      const result = parseHDL(`/* no end`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Unterminated block comment')
    })
  })

  describe('error handling', () => {
    it('reports error for missing semicolon after IN', () => {
      const result = parseHDL(`CHIP Not { IN in OUT out; PARTS: }`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain(';')
      expect(result.errors[0].line).toBeGreaterThan(0)
    })

    it('reports error for missing CHIP keyword', () => {
      const result = parseHDL(`Not { IN in; OUT out; PARTS: }`)
      expect(result.success).toBe(false)
    })

    it('reports error with line number', () => {
      const result = parseHDL(`CHIP Not {\n  IN in;\n  OUT \n}`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].line).toBeGreaterThanOrEqual(3)
    })

    it('reports error for empty input', () => {
      const result = parseHDL('')
      expect(result.success).toBe(false)
    })

    it('reports error for unclosed brace', () => {
      const result = parseHDL(`CHIP Not { IN in; OUT out; PARTS:`)
      expect(result.success).toBe(false)
    })

    it('reports error for missing chip name', () => {
      const result = parseHDL(`CHIP { IN in; OUT out; PARTS: }`)
      expect(result.success).toBe(false)
    })

    it('error column is correct', () => {
      const result = parseHDL(`CHIP Not { IN in OUT out; PARTS: }`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].column).toBeGreaterThan(0)
    })

    it('rejects trailing tokens after closing brace', () => {
      const result = parseHDL(`CHIP Not {
        IN in;
        OUT out;
        PARTS:
      } extra`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Unexpected token')
    })

    it('rejects zero pin width', () => {
      const result = parseHDL(`CHIP Bad {
        IN a[0];
        OUT b;
        PARTS:
      }`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('pin width')
    })

    it("rejects BUILTIN without chip name", () => {
      const result = parseHDL(`CHIP X {
        IN a;
        OUT b;
        PARTS:
        BUILTIN;
      }`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.message.includes('BUILTIN'))).toBe(true)
    })
  })

  describe('complete implementations (chips with real PARTS)', () => {
    const NOT_IMPL = `CHIP Not {
      IN in;
      OUT out;
      PARTS:
      Nand(a=in, b=in, out=out);
    }`

    const AND_IMPL = `CHIP And {
      IN a, b;
      OUT out;
      PARTS:
      Nand(a=a, b=b, out=nandOut);
      Not(in=nandOut, out=out);
    }`

    const OR_IMPL = `CHIP Or {
      IN a, b;
      OUT out;
      PARTS:
      Not(in=a, out=notA);
      Not(in=b, out=notB);
      Nand(a=notA, b=notB, out=out);
    }`

    const XOR_IMPL = `CHIP Xor {
      IN a, b;
      OUT out;
      PARTS:
      Not(in=a, out=notA);
      Not(in=b, out=notB);
      And(a=a, b=notB, out=aAndNotB);
      And(a=notA, b=b, out=notAAndB);
      Or(a=aAndNotB, b=notAAndB, out=out);
    }`

    const MUX_IMPL = `CHIP Mux {
      IN a, b, sel;
      OUT out;
      PARTS:
      Not(in=sel, out=notSel);
      And(a=a, b=notSel, out=aAndNotSel);
      And(a=b, b=sel, out=bAndSel);
      Or(a=aAndNotSel, b=bAndSel, out=out);
    }`

    const DMUX_IMPL = `CHIP DMux {
      IN in, sel;
      OUT a, b;
      PARTS:
      Not(in=sel, out=notSel);
      And(a=in, b=notSel, out=a);
      And(a=in, b=sel, out=b);
    }`

    const OR8WAY_IMPL = `CHIP Or8Way {
      IN in[8];
      OUT out;
      PARTS:
      Or(a=in[0], b=in[1], out=or01);
      Or(a=in[2], b=in[3], out=or23);
      Or(a=in[4], b=in[5], out=or45);
      Or(a=in[6], b=in[7], out=or67);
      Or(a=or01, b=or23, out=or0123);
      Or(a=or45, b=or67, out=or4567);
      Or(a=or0123, b=or4567, out=out);
    }`

    const MUX4WAY16_IMPL = `CHIP Mux4Way16 {
      IN a[16], b[16], c[16], d[16], sel[2];
      OUT out[16];
      PARTS:
      Mux16(a=a, b=b, sel=sel[0], out=ab);
      Mux16(a=c, b=d, sel=sel[0], out=cd);
      Mux16(a=ab, b=cd, sel=sel[1], out=out);
    }`

    it('parses Not with 1 part and 3 connections', () => {
      const result = parseHDL(NOT_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(1)
      expect(result.chip.parts[0].name).toBe('Nand')
      expect(result.chip.parts[0].connections).toHaveLength(3)
    })

    it('parses And with 2 parts and internal wire', () => {
      const result = parseHDL(AND_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(2)
      expect(result.chip.parts[0].connections[2]).toEqual({
        internal: 'out', external: 'nandOut',
      })
      expect(result.chip.parts[1].connections[0]).toEqual({
        internal: 'in', external: 'nandOut',
      })
    })

    it('parses Or with 3 parts', () => {
      const result = parseHDL(OR_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(3)
    })

    it('parses Xor with 5 parts', () => {
      const result = parseHDL(XOR_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(5)
    })

    it('parses Mux with 4 parts', () => {
      const result = parseHDL(MUX_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(4)
    })

    it('parses DMux with 3 parts', () => {
      const result = parseHDL(DMUX_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(3)
    })

    it('parses Or8Way with sub-bus indexing on all inputs', () => {
      const result = parseHDL(OR8WAY_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(7)
      expect(result.chip.parts[0].connections[0]).toEqual({
        internal: 'a', external: 'in', start: 0, end: 0,
      })
      expect(result.chip.parts[0].connections[1]).toEqual({
        internal: 'b', external: 'in', start: 1, end: 1,
      })
    })

    it('parses Mux4Way16 with sub-bus sel indexing', () => {
      const result = parseHDL(MUX4WAY16_IMPL)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.chip.parts).toHaveLength(3)
      expect(result.chip.parts[0].connections[2]).toEqual({
        internal: 'sel', external: 'sel', start: 0, end: 0,
      })
      expect(result.chip.parts[2].connections[2]).toEqual({
        internal: 'sel', external: 'sel', start: 1, end: 1,
      })
    })
  })

  describe('all 16 chip-name fixtures parse', () => {
    const project1Chips: Record<string, string> = {
      Nand: NAND_HDL,
      Not: NOT_HDL,
      And: AND_HDL,
      Or: OR_HDL,
      Xor: XOR_HDL,
      Mux: MUX_HDL,
      DMux: DMUX_HDL,
      Not16: NOT16_HDL,
      And16: AND16_HDL,
      Or16: OR16_HDL,
      Mux16: MUX16_HDL,
      Mux4Way16: MUX4WAY16_HDL,
      Mux8Way16: MUX8WAY16_HDL,
      DMux4Way: DMUX4WAY_HDL,
      DMux8Way: DMUX8WAY_HDL,
      Or8Way: OR8WAY_HDL,
    }

    for (const [name, hdl] of Object.entries(project1Chips)) {
      it(`parses ${name}.hdl without errors`, () => {
        const result = parseHDL(hdl)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.chip.name).toBe(name)
        }
      })
    }
  })
})
