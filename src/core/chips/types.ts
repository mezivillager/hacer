export interface ChipPin {
  name: string
  width: number // 1 for single-bit, 16 for buses
}

export type BuiltinEvalFn = (inputs: Record<string, number>) => Record<string, number>

export type ChipImplementation =
  | { type: 'builtin'; evaluate: BuiltinEvalFn }
  | { type: 'hdl'; source: string }
  | { type: 'circuit'; circuitData: unknown } // SerializedCircuit in later ticket

export interface ChipDefinition {
  name: string
  inputs: ChipPin[]
  outputs: ChipPin[]
  implementation: ChipImplementation
}

// Type guards
export function isBuiltinChip(def: ChipDefinition): def is ChipDefinition & { implementation: { type: 'builtin' } } {
  return def.implementation.type === 'builtin'
}

export function isHDLChip(def: ChipDefinition): def is ChipDefinition & { implementation: { type: 'hdl' } } {
  return def.implementation.type === 'hdl'
}

export function isCircuitChip(def: ChipDefinition): def is ChipDefinition & { implementation: { type: 'circuit' } } {
  return def.implementation.type === 'circuit'
}

export interface ChipValidationError {
  field: string
  message: string
}

export function validateChipDefinition(def: ChipDefinition): ChipValidationError[] {
  const errors: ChipValidationError[] = []
  if (!def.name || def.name.trim() === '') {
    errors.push({ field: 'name', message: 'Chip name must not be empty' })
  }
  if (def.inputs.length === 0) {
    errors.push({ field: 'inputs', message: 'Chip must have at least one input' })
  }
  if (def.outputs.length === 0) {
    errors.push({ field: 'outputs', message: 'Chip must have at least one output' })
  }
  const allPins = [...def.inputs, ...def.outputs]
  for (const pin of allPins) {
    if (!pin.name || pin.name.trim() === '') {
      errors.push({ field: 'pin', message: 'Pin name must not be empty' })
    }
    if (pin.width < 1) {
      errors.push({ field: 'pin', message: `Pin "${pin.name}" width must be >= 1` })
    }
  }
  const names = allPins.map(p => p.name)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  for (const dupe of [...new Set(dupes)]) {
    errors.push({ field: 'pin', message: `Duplicate pin name: "${dupe}"` })
  }
  return errors
}
