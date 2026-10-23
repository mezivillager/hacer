import type { ChipRegistry } from '../registry'
import { registerBuiltin } from '../registry'
import type { ChipPin } from '../types'

const pin = (name: string, width = 1): ChipPin => ({ name, width })

/** Registers Project 2's HalfAdder, FullAdder and Add16 builtins, on the web IDE's pins. */
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
}
