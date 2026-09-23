// src/core/hdl/printer.ts
import type { HDLChip } from './types'

/** Render an {@link HDLChip} AST back to `.hdl` source. */
export function printHDL(chip: HDLChip): string {
  throw new Error(`printHDL is not implemented (${chip.name})`)
}
