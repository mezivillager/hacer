import type { ChipDefinition, BuiltinEvalFn, ChipPin } from './types'
import { validateChipDefinition } from './types'

export interface ChipRegistry {
  register(chip: ChipDefinition): void
  get(name: string): ChipDefinition | undefined
  has(name: string): boolean
  list(): ChipDefinition[]
  /** Increases whenever what `get` returns for some name may have changed. */
  version(): number
}

export function createChipRegistry(): ChipRegistry {
  const chips = new Map<string, ChipDefinition>()
  let version = 0

  return {
    register(chip: ChipDefinition): void {
      const errors = validateChipDefinition(chip)
      if (errors.length > 0) {
        throw new Error(`Invalid chip "${chip.name}": ${errors.map(e => e.message).join(', ')}`)
      }
      if (chips.has(chip.name)) {
        throw new Error(`Chip "${chip.name}" is already registered`)
      }
      chips.set(chip.name, chip)
      version++
    },

    get(name: string): ChipDefinition | undefined {
      return chips.get(name)
    },

    has(name: string): boolean {
      return chips.has(name)
    },

    list(): ChipDefinition[] {
      return [...chips.values()]
    },

    version(): number {
      return version
    },
  }
}

export function registerBuiltin(
  registry: ChipRegistry,
  name: string,
  inputs: ChipPin[],
  outputs: ChipPin[],
  evaluate: BuiltinEvalFn
): void {
  registry.register({
    name,
    inputs,
    outputs,
    implementation: { type: 'builtin', evaluate },
  })
}
