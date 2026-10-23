import type { ChipRegistry } from '../registry'
import { registerBuiltin } from '../registry'
import type { ChipPin } from '../types'

const pin = (name: string, width = 1): ChipPin => ({ name, width })

/** Registers Project 2's HalfAdder, FullAdder, Add16, Inc16 and ALU builtins, on the web IDE's pins. */
export function registerProject2Builtins(registry: ChipRegistry): void {
  registerBuiltin(registry, 'HalfAdder', [pin('a'), pin('b')], [pin('sum'), pin('carry')], (i) => ({
    sum: (i.a ^ i.b) & 1,
    carry: i.a & i.b & 1,
  }))

  registerBuiltin(registry, 'FullAdder', [pin('a'), pin('b'), pin('c')], [pin('sum'), pin('carry')], (i) => {
    const total = (i.a & 1) + (i.b & 1) + (i.c & 1)
    return { sum: total & 1, carry: total >> 1 }
  })

  registerBuiltin(registry, 'Add16', [pin('a', 16), pin('b', 16)], [pin('out', 16)], (i) => ({
    out: (i.a + i.b) & 0xffff,
  }))

  registerBuiltin(registry, 'Inc16', [pin('in', 16)], [pin('out', 16)], (i) => ({ out: (i.in + 1) & 0xffff }))

  const control = ['zx', 'nx', 'zy', 'ny', 'f', 'no'].map((name) => pin(name))
  registerBuiltin(registry, 'ALU', [pin('x', 16), pin('y', 16), ...control], [pin('out', 16), pin('zr'), pin('ng')], alu)
}

/** `ALU.hdl`'s bitwise definition, on every control word; the web IDE's builtin is an 18-word table (ADR-0020 §1.11 rule 5). */
function alu(i: Record<string, number>): Record<string, number> {
  const x = (i.zx & 1 ? 0 : i.x & 0xffff) ^ (i.nx & 1 ? 0xffff : 0)
  const y = (i.zy & 1 ? 0 : i.y & 0xffff) ^ (i.ny & 1 ? 0xffff : 0)
  const out = ((i.f & 1 ? x + y : x & y) ^ (i.no & 1 ? 0xffff : 0)) & 0xffff
  return { out, zr: out === 0 ? 1 : 0, ng: out >> 15 }
}
