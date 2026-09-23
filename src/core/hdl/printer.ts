// src/core/hdl/printer.ts
import type { HDLChip, HDLConnection, HDLPin, HDLSlice } from './types'

const INDENT = '    '

/**
 * One side of a connection as HDL text: a pin or signal name with its slice, if any.
 *
 * Shared with the compiler so a diagnostic names a sliced pin the same way the source does.
 */
export function printPinRef(name: string, slice?: HDLSlice): string {
  if (!slice) return name
  return slice.start === slice.end ? `${name}[${slice.start}]` : `${name}[${slice.start}..${slice.end}]`
}

function printPin(pin: HDLPin): string {
  return pin.width > 1 ? `${pin.name}[${pin.width}]` : pin.name
}

function printConnection(conn: HDLConnection): string {
  return `${printPinRef(conn.internal, conn.internalSlice)}=${printPinRef(conn.external, conn.externalSlice)}`
}

/**
 * Render an {@link HDLChip} AST back to `.hdl` source.
 *
 * The output parses to an AST equal to the input's — comments and the source's own spacing are
 * not part of the AST, so they are not reproduced. Reserved `clocked` pins are not emitted: the
 * Phase 0.5 parser rejects a `CLOCKED` section, so emitting one would not round-trip.
 */
export function printHDL(chip: HDLChip): string {
  const lines = [`CHIP ${chip.name} {`]
  lines.push(`${INDENT}IN ${chip.inputs.map(printPin).join(', ')};`)
  lines.push(`${INDENT}OUT ${chip.outputs.map(printPin).join(', ')};`)
  lines.push('')
  lines.push(`${INDENT}PARTS:`)
  if (chip.builtin !== undefined) {
    lines.push(`${INDENT}BUILTIN ${chip.builtin};`)
  }
  for (const part of chip.parts) {
    lines.push(`${INDENT}${part.name}(${part.connections.map(printConnection).join(', ')});`)
  }
  lines.push('}')
  return `${lines.join('\n')}\n`
}
