import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry } from './appRegistry'
import { REFERENCE_BUILTINS } from './referenceBuiltins'

// ADR-0020 §1.11 rule 4: a part under one of these resolves to the user chip until HACER registers that builtin.
const REFERENCE_ONLY = [
  'Add16', 'ALU', 'ALUNoStat', 'ARegister', 'Bit', 'Computer', 'CPU', 'DFF', 'DRegister', 'FullAdder', 'HalfAdder',
  'Inc16', 'Keyboard', 'Memory', 'Nand16', 'PC', 'RAM16K', 'RAM4K', 'RAM512', 'RAM64', 'RAM8', 'Register', 'ROM32K',
  'Screen', 'XOr', 'Xor16', 'XOr16',
]

describe('the builtin names HACER shares with the web IDE, and the 27 only the web IDE has (#901)', () => {
  const hacer = getBuiltinChipRegistry().list().map((chip) => chip.name)

  it('every HACER builtin is one of the 43, so no HACER-only builtin shadows a user file the reference reads', () => {
    expect(hacer.filter((name) => !REFERENCE_BUILTINS.includes(name))).toEqual([])
  })

  it("the web IDE's 43 builtins less HACER's are exactly the 27 names whose parts resolve to the user chip", () => {
    expect(REFERENCE_BUILTINS.filter((name) => !hacer.includes(name))).toEqual(REFERENCE_ONLY)
  })
})
