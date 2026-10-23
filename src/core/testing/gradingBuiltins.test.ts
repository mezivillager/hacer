import { describe, expect, it } from 'vitest'
import { testChip } from './testChip'

// The web IDE's 43 builtin names, as src/core/chips/referenceBuiltins.test.ts keeps them (REGISTRY at 91ef428).
const REFERENCE_BUILTINS: readonly string[] = [
  'Add16', 'ALU', 'ALUNoStat', 'And', 'And16', 'ARegister', 'Bit', 'Computer', 'CPU', 'DFF', 'DMux',
  'DMux4Way', 'DMux8Way', 'DRegister', 'FullAdder', 'HalfAdder', 'Inc16', 'Keyboard', 'Memory', 'Mux',
  'Mux16', 'Mux4Way16', 'Mux8Way16', 'Nand', 'Nand16', 'Not', 'Not16', 'Or', 'Or16', 'Or8Way', 'PC',
  'RAM16K', 'RAM4K', 'RAM512', 'RAM64', 'RAM8', 'Register', 'ROM32K', 'Screen', 'Xor', 'XOr', 'Xor16', 'XOr16',
]

// ADR-0020 §1.11 rule 4: the app registry's 16 Project 1 builtins, plus HalfAdder, FullAdder and Add16.
const GRADING_BUILTINS = [
  'Add16', 'And', 'And16', 'DMux', 'DMux4Way', 'DMux8Way', 'FullAdder', 'HalfAdder', 'Mux', 'Mux16',
  'Mux4Way16', 'Mux8Way16', 'Nand', 'Not', 'Not16', 'Or', 'Or16', 'Or8Way', 'Xor',
]

const STILL_UNKNOWN = [
  'ALU', 'ALUNoStat', 'ARegister', 'Bit', 'Computer', 'CPU', 'DFF', 'DRegister', 'Inc16', 'Keyboard', 'Memory',
  'Nand16', 'PC', 'RAM16K', 'RAM4K', 'RAM512', 'RAM64', 'RAM8', 'Register', 'ROM32K', 'Screen', 'XOr', 'Xor16', 'XOr16',
]

/** Whether `hacer test` reports a part under `name` as `Unknown chip-part`. */
function unknownPart(name: string): boolean {
  const { error } = testChip(
    { path: 'Probe.hdl', source: `CHIP Probe { IN a; OUT out; PARTS: ${name}(a=a, out=out); }` },
    { path: 'Probe.tst', source: 'load Probe.hdl,\neval,\n' },
    { path: 'Probe.cmp', source: '|out|\n' },
  )
  return error?.includes(`Unknown chip-part: "${name}"`) === true
}

describe("the names the grading path resolves to a builtin, against the web IDE's 43 (#984)", () => {
  it("Project 1's 16 plus HalfAdder, FullAdder and Add16 are builtins there", () => {
    expect(REFERENCE_BUILTINS.filter((name) => !unknownPart(name))).toEqual(GRADING_BUILTINS)
  })

  it('each of the other 24 is still Unknown chip-part', () => {
    expect(STILL_UNKNOWN).toHaveLength(24)
    expect(REFERENCE_BUILTINS.filter(unknownPart)).toEqual(STILL_UNKNOWN)
  })
})
