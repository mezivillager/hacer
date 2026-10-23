import { describe, it, expect, beforeEach } from 'vitest'
import { runTest, stripExt } from './engine'
import { parseTST } from './tstParser'
import { parseCmp } from './cmpParser'
import type { CmpFile } from './cmpParser'
import { createChipRegistry, registerBuiltin, type ChipRegistry } from '../chips/registry'
import { combineRegistries } from '../chips/combineRegistries'
import type { ChipDefinition } from '../chips/types'
import { getBuiltinChipRegistry, resetAppRegistriesForTests } from '../chips/appRegistry'
import { project1TstFixtures } from './project1TstFixtures'
import { project1CmpFixtures } from './project1CmpFixtures'
import { parseHDL } from '../hdl/parser'
import { hdlChipDefinition } from '../hdl/compiler'
import { project1HdlSources, project1DependencyOrder } from '../hdl/project1HdlSources'
import { parseSpec } from '../spec/parseSpec'

function script(src: string) {
  const r = parseTST(src)
  if (!r.success) throw new Error('tst parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.script
}

function cmp(src: string): CmpFile {
  const r = parseCmp(src)
  if (!r.success) throw new Error('cmp parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.file
}

describe('runTest — execution', () => {
  it('records output rows when there is nothing to compare against', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'And', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.a & i.b }))
    const s = script('load And.hdl, output-list a b out; set a 1, set b 0, eval, output; set a 1, set b 1, eval, output;')
    const result = runTest(s, { registry: reg })
    expect(result.passed).toBe(true)
    expect(result.outputRows).toHaveLength(2)
    expect(result.outputRows[0].values).toEqual({ a: 1, b: 0, out: 0 })
    expect(result.outputRows[1].values).toEqual({ a: 1, b: 1, out: 1 })
  })
})

describe('runTest — comparison', () => {
  function builtinNot() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
    return reg
  }

  it('passes Not.tst against Not.cmp using the builtin Not', () => {
    const result = runTest(script(project1TstFixtures.Not), { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.error).toBeNull()
    expect(result.passed).toBe(true)
    expect(result.firstFailure).toBeNull()
  })

  it('reports firstFailure with row/column/expected/actual on a value mismatch', () => {
    const reg = createChipRegistry()
    // A broken Not that always returns 0 → wrong on input 0 (expects 1).
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    const result = runTest(script(project1TstFixtures.Not), { registry: reg, cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.firstFailure).toMatchObject({ row: 0, column: 'out', expected: '1', actual: '0' })
  })

  it('errors when output row count does not match the .cmp row count', () => {
    // The script emits one output row; Not.cmp expects two.
    const s = script('load Not.hdl, output-list in out; set in 0, eval, output;')
    const result = runTest(s, { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/row count/i)
  })

  it('errors when the script emits more output rows than the .cmp has', () => {
    // Not.cmp has 2 rows; this script emits 3 output rows.
    const s = script('load Not.hdl, output-list in out; set in 0, eval, output; set in 1, eval, output; set in 0, eval, output;')
    const result = runTest(s, { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/exceed|row count/i)
  })

  it('resolves compare-to via loadCmpFile and compares against it', () => {
    const result = runTest(script(project1TstFixtures.Not), {
      registry: builtinNot(),
      loadCmpFile: (f) => (f === 'Not.cmp' ? cmp(project1CmpFixtures.Not) : null),
    })
    expect(result.error).toBeNull()
    expect(result.passed).toBe(true)
  })

  it('errors when a compare-to target cannot be resolved', () => {
    // The script declares `compare-to Not.cmp`, but the resolver can't find it →
    // the run must FAIL rather than silently skip verification (a vacuous pass).
    const result = runTest(script(project1TstFixtures.Not), {
      registry: builtinNot(),
      loadCmpFile: () => null,
    })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/compare-to|resolve/i)
  })
})

describe('runTest — error paths', () => {
  it('errors when load names a chip not in the registry', () => {
    const s = script('load Missing.hdl, output-list a out; set a 0, eval, output;')
    const result = runTest(s, { registry: createChipRegistry() })
    expect(result.passed).toBe(false)
    expect(result.error).toContain('Missing')
  })

  it('errors when eval runs before any chip is loaded', () => {
    const s = script('output-list a out; set a 1, eval, output;')
    const result = runTest(s, { registry: createChipRegistry() })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/load/i)
  })

  it('captures a runtime error when evaluating a chip that fails to compile', () => {
    const reg = createChipRegistry()
    // HDL referencing an unknown part → compileHDL fails → evaluateChip throws.
    reg.register({
      name: 'Broken',
      inputs: [{ name: 'in', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'hdl', source: 'CHIP Broken { IN in; OUT out; PARTS: Nope(a=in, out=out); }' },
    })
    const s = script('load Broken.hdl, output-list in out; set in 1, eval, output;')
    const result = runTest(s, { registry: reg })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/compile|Nope/i)
  })
})

describe("runTest — a compile refusal reads as the reference's, without evaluateChip's wrapper (#820)", () => {
  const INN = 'CHIP Inn {\n  IN x;\n  OUT y;\n  PARTS:\n  Nand(a=x, b=x, c=x, out=y);\n}'
  const OUTER = 'CHIP Outer {\n  IN a;\n  OUT o;\n  PARTS:\n  Inn(x=a, y=o);\n}'
  const hdl = (source: string): ChipDefinition => {
    const ast = parseHDL(source)
    if (!ast.success) throw new Error(`parse failed: ${source}`)
    return hdlChipDefinition(ast.chip, source)
  }
  /** The user's chips ahead of the builtins, as `hacer test` looks them up. */
  function ownFirst(...chips: ChipDefinition[]): ChipRegistry {
    const user = createChipRegistry()
    for (const chip of chips) user.register(chip)
    return combineRegistries(user, getBuiltinChipRegistry())
  }
  const errorOf = (chip: string, pins: string, registry: ChipRegistry): string | null => runTest(script(`load ${chip}.hdl, output-list ${pins}; eval, output;`), { registry }).error

  it("returns the chip under test's self-reference refusal as the reference words it, with its line", () => {
    expect(errorOf('Not', 'in out', ownFirst(hdl('CHIP Not {\n  IN in;\n  OUT out;\n\n  PARTS:\n  Not(in=in, out=out);\n}')))).toBe('Line 6: Cannot use chip Not to implement itself')
  })

  it('joins two refusals, each with its own line', () => {
    const two = 'CHIP C {\n  IN a;\n  OUT x, y;\n  PARTS:\n  Not(in=a[2], out=x);\n  Not(in=a[3], out=y);\n}'
    expect(errorOf('C', 'a x y', ownFirst(hdl(two)))).toBe(
      'Line 5: Part "Not" pin "in" is wired to "a[2]": sub-bus index out of range ("a" has width 1); Line 6: Part "Not" pin "in" is wired to "a[3]": sub-bus index out of range ("a" has width 1)',
    )
  })

  it("names a failing part chip before its line, by the chain from the chip under test: an 'hdl' Outer over Inn", () => {
    expect(errorOf('Outer', 'a o', ownFirst(hdl(INN), hdl(OUTER)))).toBe('Outer › Inn: Line 5: Part "Nand" has no pin "c"')
  })

  it("names it the same way for a 'circuit' Outer, whose compileSpec refuses the chain", () => {
    const chips = ownFirst(hdl(INN))
    const { doc } = parseSpec(OUTER, { chips })
    if (doc === null) throw new Error('Outer did not parse')
    const outer: ChipDefinition = { name: 'Outer', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'o', width: 1 }], implementation: { type: 'circuit', spec: doc } }
    expect(errorOf('Outer', 'a o', ownFirst(hdl(INN), outer))).toBe('Outer › Inn: Line 5: Part "Nand" has no pin "c"')
  })

  it('names a chip two parts down by the whole chain', () => {
    const mid = 'CHIP Mid {\n  IN x;\n  OUT y;\n  PARTS:\n  Inn(x=x, y=y);\n}'
    const top = 'CHIP Top {\n  IN a;\n  OUT o;\n  PARTS:\n  Mid(x=a, y=o);\n}'
    expect(errorOf('Top', 'a o', ownFirst(hdl(INN), hdl(mid), hdl(top)))).toBe('Top › Mid › Inn: Line 5: Part "Nand" has no pin "c"')
  })

  it('gives a combinational cycle the line of the part that closes it', () => {
    const loop = 'CHIP C {\n  IN a;\n  OUT o;\n  PARTS:\n  And(a=a, b=t, out=t);\n  Not(in=t, out=o);\n}'
    expect(errorOf('C', 'a o', ownFirst(hdl(loop)))).toBe('Line 5: Cyclic part dependency: parts cannot be topologically ordered (combinational cycle) through "t"')
  })

  it("keeps evaluateChip's prefix for a registered chip that does not parse", () => {
    const broken: ChipDefinition = { name: 'Broken', inputs: [{ name: 'in', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP Broken { IN in; OUT out; PARTS: Nand(a=in b=in, out=out); }' } }
    expect(errorOf('Broken', 'in out', ownFirst(broken))).toMatch(/^evaluateChip: chip "Broken" HDL failed to parse: /)
  })
})

describe('runTest — pins the chip does not have', () => {
  function builtinNot() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
    return reg
  }

  it('set on an unknown pin fails naming the pin and line', () => {
    const s = script('load Not.hdl,\noutput-list in out;\nset in 0,\nset zzz 0,\neval,\noutput;')
    const result = runTest(s, { registry: builtinNot() })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/"zzz"/)
    expect(result.error).toMatch(/line 4\b/)
    expect(result.outputRows).toHaveLength(0)
  })

  it('an unknown output-list name fails naming the pin and line', () => {
    const s = script('load Not.hdl,\n\noutput-list in zzz out;\nset in 0,\neval,\noutput;')
    const result = runTest(s, { registry: builtinNot() })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/"zzz"/)
    expect(result.error).toMatch(/line 3\b/)
    expect(result.outputRows).toHaveLength(0)
  })

  it('checks pins against a chip passed in options when the script has no load', () => {
    const not = builtinNot().get('Not')
    const s = script('output-list in out;\nset zzz 1,\neval,\noutput;')
    const result = runTest(s, { registry: builtinNot(), chip: not })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/"zzz"/)
  })

  it('an internal HDL pin is a known name for set and output-list', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Nand', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.a & i.b ? 0 : 1 }))
    const src = 'CHIP AndVia { IN a, b; OUT out; PARTS: Nand(a=a, b=b, out=nab); Nand(a=nab, b=nab, out=out); }'
    const parsed = parseHDL(src)
    if (!parsed.success) throw new Error('hdl parse failed')
    reg.register(hdlChipDefinition(parsed.chip, src))
    const s = script('load AndVia.hdl,\noutput-list a b nab out;\nset nab 0,\nset a 1,\nset b 1,\neval,\noutput;')
    const result = runTest(s, { registry: reg })
    expect(result.error).toBeNull()
    expect(result.passed).toBe(true)
    expect(result.outputRows[0].values.out).toBe(1)
  })

  it('the time column is a known name for output-list', () => {
    const s = script('load Not.hdl,\noutput-list time%S1.4.1 in out;\nset in 0,\neval,\noutput;')
    const result = runTest(s, { registry: builtinNot() })
    expect(result.error).toBeNull()
    expect(result.passed).toBe(true)
  })
})

describe("runTest — a command's ending: ';' runs on as ',' does, and '!' ends the run (#1007)", () => {
  const VECTORS = import.meta.glob<string>('../../../conformance/vectors/02/ALU.{tst,cmp}', { query: '?raw', import: 'default', eager: true })
  const vector = (ext: 'tst' | 'cmp'): string => {
    const text = VECTORS[`../../../conformance/vectors/02/ALU.${ext}`]
    if (text === undefined) throw new Error(`conformance/vectors/02/ALU.${ext} is missing`)
    return text
  }
  const hdl = (source: string): ChipDefinition => {
    const ast = parseHDL(source)
    if (!ast.success) throw new Error(`parse failed: ${ast.errors.map((e) => e.message).join('; ')}`)
    return hdlChipDefinition(ast.chip, source)
  }
  // A script the parser refuses fails the test on this assertion instead of erroring it.
  const run = (tst: string, options: Parameters<typeof runTest>[1]) => {
    const parsed = parseTST(tst)
    expect(parsed.success ? 'parsed' : parsed.errors).toBe('parsed')
    return parsed.success ? runTest(parsed.script, options) : null
  }

  const fullAdder = (i: number): string =>
    `Xor(a=a[${i}], b=b[${i}], out=p${i}); Xor(a=p${i}, b=c${i}, out=out[${i}]); And(a=a[${i}], b=b[${i}], out=g${i}); And(a=p${i}, b=c${i}, out=k${i}); Or(a=g${i}, b=k${i}, out=c${i + 1});`
  const RIPPLE16 = `CHIP Ripple16 {
  IN a[16], b[16];
  OUT out[16];
  PARTS:
  Xor(a=a[0], b=b[0], out=out[0]); And(a=a[0], b=b[0], out=c1);
  ${Array.from({ length: 15 }, (_, i) => fullAdder(i + 1)).join('\n  ')}
}`
  const ALU = `CHIP ALU {
  IN x[16], y[16], zx, nx, zy, ny, f, no;
  OUT out[16], zr, ng;
  PARTS:
  Mux16(a=x, b=false, sel=zx, out=x0);
  Not16(in=x0, out=notx0);
  Mux16(a=x0, b=notx0, sel=nx, out=x1);
  Mux16(a=y, b=false, sel=zy, out=y0);
  Not16(in=y0, out=noty0);
  Mux16(a=y0, b=noty0, sel=ny, out=y1);
  And16(a=x1, b=y1, out=xandy);
  Ripple16(a=x1, b=y1, out=xplusy);
  Mux16(a=xandy, b=xplusy, sel=f, out=fxy);
  Not16(in=fxy, out=notfxy);
  Mux16(a=fxy, b=notfxy, sel=no, out=out, out[0..7]=low, out[8..15]=high, out[15]=ng);
  Or8Way(in=low, out=anylow);
  Or8Way(in=high, out=anyhigh);
  Or(a=anylow, b=anyhigh, out=nonzero);
  Not(in=nonzero, out=zr);
}`

  it("ends the run at a command that ends with '!', as the reference's run() does", () => {
    const result = run('load Not.hdl, output-list in out; set in 0, eval, output! set in 1, eval, output;', { registry: getBuiltinChipRegistry() })
    expect(result?.error).toBeNull()
    expect(result?.outputRows.map((row) => row.values)).toEqual([{ in: 0, out: 1 }])
  })

  it('ALU.tst and ALU.cmp pass on a Project-1-only ALU', () => {
    const user = createChipRegistry()
    user.register(hdl(RIPPLE16))
    user.register(hdl(ALU))
    const result = run(vector('tst'), { registry: combineRegistries(user, getBuiltinChipRegistry()), cmpData: cmp(vector('cmp')) })
    expect(result?.error).toBeNull()
    expect(result?.firstFailure).toBeNull()
    expect(result?.passedSteps).toBe(36)
    expect(result?.passed).toBe(true)
  })
})

describe('gold standard A — all 16 Project-1 .tst pass against builtins', () => {
  beforeEach(() => resetAppRegistriesForTests())

  it('exercises all 16 Project-1 fixtures', () => {
    expect(Object.keys(project1TstFixtures)).toHaveLength(16)
  })

  it.each(Object.keys(project1TstFixtures))('%s.tst passes against the builtin', (name) => {
    const reg = getBuiltinChipRegistry()
    const def = reg.get(name)
    expect(def, `builtin "${name}" should be registered`).toBeDefined()
    const result = runTest(script(project1TstFixtures[name]), {
      registry: reg,
      chip: def!,
      cmpData: cmp(project1CmpFixtures[name]),
    })
    expect(result.error).toBeNull()
    expect(result.passed, `${name}: ${JSON.stringify(result.firstFailure)}`).toBe(true)
  })
})

describe('gold standard B — 15 composites pass against HDL compiled from NAND', () => {
  // Build a registry: Nand as the only builtin, every composite as an HDL ChipDefinition,
  // registered in dependency order so each chip's parts already exist.
  function buildFromNand() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Nand', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: ~(i.a & i.b) & 1 }))
    for (const name of project1DependencyOrder) {
      const ast = parseHDL(project1HdlSources[name])
      if (!ast.success) throw new Error(`HDL parse failed for ${name}: ${ast.errors.map((e) => e.message).join('; ')}`)
      reg.register(hdlChipDefinition(ast.chip, project1HdlSources[name]))
    }
    return reg
  }

  it('exercises all 15 composite chips', () => {
    expect(project1DependencyOrder).toHaveLength(15)
  })

  it.each(project1DependencyOrder)('%s (HDL from NAND) passes its official .tst', (name) => {
    const reg = buildFromNand()
    const def = reg.get(name)
    expect(def, `composite "${name}" should be registered`).toBeDefined()
    const result = runTest(script(project1TstFixtures[name]), {
      registry: reg,
      chip: def!,
      cmpData: cmp(project1CmpFixtures[name]),
    })
    expect(result.error).toBeNull()
    expect(result.passed, `${name}: ${JSON.stringify(result.firstFailure)}`).toBe(true)
  })
})

describe('stripExt', () => {
  it('strips the file extension', () => expect(stripExt('Not.hdl')).toBe('Not'))
  it('returns the name unchanged when there is no extension', () => expect(stripExt('Not')).toBe('Not'))
  it('strips only the last extension', () => expect(stripExt('My.Chip.hdl')).toBe('My.Chip'))
  it('preserves a leading-dot name (no real extension)', () => expect(stripExt('.hdlrc')).toBe('.hdlrc'))
})
