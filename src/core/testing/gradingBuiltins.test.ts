import { describe, expect, it } from 'vitest'
import { REFERENCE_BUILTINS } from '../chips/referenceBuiltins'
import { testChip } from './testChip'

// ADR-0020 §1.11 rule 4: the app registry's 16 Project 1 builtins, plus HalfAdder, FullAdder, Add16, Inc16 and ALU.
const GRADING_BUILTINS = [
  'Add16', 'ALU', 'And', 'And16', 'DMux', 'DMux4Way', 'DMux8Way', 'FullAdder', 'HalfAdder', 'Inc16', 'Mux', 'Mux16',
  'Mux4Way16', 'Mux8Way16', 'Nand', 'Not', 'Not16', 'Or', 'Or16', 'Or8Way', 'Xor',
]

const STILL_UNKNOWN = [
  'ALUNoStat', 'ARegister', 'Bit', 'Computer', 'CPU', 'DFF', 'DRegister', 'Keyboard', 'Memory',
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

describe("the names the grading path resolves to a builtin, against the web IDE's 43 (#984, #985)", () => {
  it("Project 1's 16 plus HalfAdder, FullAdder, Add16, Inc16 and ALU are builtins there", () => {
    expect(REFERENCE_BUILTINS.filter((name) => !unknownPart(name))).toEqual(GRADING_BUILTINS)
  })

  it('each of the other 22 is still Unknown chip-part', () => {
    expect(STILL_UNKNOWN).toHaveLength(22)
    expect(REFERENCE_BUILTINS.filter(unknownPart)).toEqual(STILL_UNKNOWN)
  })
})
