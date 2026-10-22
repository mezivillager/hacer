/**
 * What the grading path refuses that compileHDL accepts and the reference does not build, in the reference's order:
 * a `_` in a name (its grammar), then a part input reading a chip OUT or a subscripted internal pin (`chip/builder.ts`).
 */
import type { ChipRegistry } from '../chips/registry'
import type { ChipDefinition } from '../chips/types'
import { subBusOutOfRange } from '../hdl/compiler'
import type { HDLChip, HDLConnection, HDLPart, HDLSlice } from '../hdl/types'

const LITERALS = new Set(['true', 'false'])

const atLine = (part: HDLPart, message: string): string => (part.line === undefined ? message : `Line ${part.line}: ${message}`)

const nameRefusal = (name: string): string => `Name "${name}" contains "_": a name is a letter, then letters and digits`

function underscored(chip: HDLChip): string | null {
  const declared = [chip.name, ...chip.inputs.map((pin) => pin.name), ...chip.outputs.map((pin) => pin.name)].find((name) => name.includes('_'))
  if (declared !== undefined) return nameRefusal(declared)
  for (const part of chip.parts) {
    const used = [part.name, ...part.connections.flatMap((conn) => [conn.internal, conn.external])].find((name) => name.includes('_'))
    if (used !== undefined) return atLine(part, nameRefusal(used))
  }
  return null
}

const sideOf = (def: ChipDefinition, pin: string): 'in' | 'out' | null =>
  def.inputs.some((p) => p.name === pin) ? 'in' : def.outputs.some((p) => p.name === pin) ? 'out' : null

/** The reference's `Looping wire`, checked over a whole part before any of its wires. */
function loops(part: HDLPart, def: ChipDefinition): boolean {
  const bound = { in: new Set<string>(), out: new Set<string>() }
  for (const { internal, external } of part.connections) {
    const side = sideOf(def, internal)
    if (side === null) continue
    if (bound[side === 'in' ? 'out' : 'in'].has(external)) return true
    bound[side].add(external)
  }
  return false
}

const WHOLE = -1

/** The reference's `checkMultipleAssignments`: bits bound again, where a whole binding after only slices is not. */
function boundAgain(bound: Map<string, Set<number>>, pin: string, slice: HDLSlice | undefined): boolean {
  const bits = bound.get(pin) ?? new Set<number>()
  bound.set(pin, bits)
  if (bits.has(WHOLE)) return true
  const claimed = slice === undefined ? [WHOLE] : Array.from({ length: slice.end - slice.start + 1 }, (_, i) => slice.start + i)
  const again = claimed.some((bit) => bits.has(bit))
  claimed.forEach((bit) => bits.add(bit))
  return again
}

const pinWidth = (def: ChipDefinition, pin: string): number | undefined => [...def.inputs, ...def.outputs].find((p) => p.name === pin)?.width

function miswired(chip: HDLChip, parts: ChipRegistry): string | null {
  const ins = new Set(chip.inputs.map((pin) => pin.name))
  const outs = new Set(chip.outputs.map((pin) => pin.name))
  const widths = new Map([...chip.inputs, ...chip.outputs].map((pin) => [pin.name, pin.width]))
  const outsBound = new Map<string, Set<number>>()
  const internalsWritten = new Set<string>()
  const outOfRange = (def: ChipDefinition, conn: HDLConnection): boolean =>
    subBusOutOfRange(conn.internal, conn.internalSlice, pinWidth(def, conn.internal)) !== null ||
    subBusOutOfRange(conn.external, conn.externalSlice, widths.get(conn.external)) !== null
  for (const part of chip.parts) {
    // Where the reference refuses something else first, compileHDL names it.
    const def = part.name === chip.name ? undefined : parts.get(part.name)
    if (def === undefined || loops(part, def)) return null
    const partInsBound = new Map<string, Set<number>>()
    for (const { internal, internalSlice, external, externalSlice } of part.connections) {
      const side = sideOf(def, internal)
      if (side === null || (side === 'out' && (ins.has(external) || LITERALS.has(external)))) return null
      if (side === 'in' && outs.has(external)) return atLine(part, 'Cannot use output pin as input')
      if (externalSlice !== undefined && !ins.has(external) && !outs.has(external)) {
        return atLine(part, `Internal pins (in this case: ${external}) cannot be subscripted or indexed`)
      }
      if (side === 'in' && boundAgain(partInsBound, internal, internalSlice)) return null
      if (side === 'out' && outs.has(external) && boundAgain(outsBound, external, externalSlice)) return null
      if (side === 'out' && !outs.has(external)) {
        if (internalsWritten.has(external)) return null
        internalsWritten.add(external)
      }
    }
    // The reference checks sub-bus ranges as it connects the part, once every wire has passed.
    if (part.connections.some((conn) => outOfRange(def, conn))) return null
  }
  return null
}

/** The first refusal, led by its part's line as compileHDL's errors are, or null. `parts` resolves the chip's parts. */
export function gradingRefusal(chip: HDLChip, parts: ChipRegistry): string | null {
  return underscored(chip) ?? miswired(chip, parts)
}
