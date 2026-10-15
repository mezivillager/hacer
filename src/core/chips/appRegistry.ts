import { createChipRegistry } from './registry'
import type { ChipRegistry } from './registry'
import { registerProject1Builtins } from './builtins/project01'

let builtinRegistry: ChipRegistry | null = null
let userRegistry: ChipRegistry | null = null

function initBuiltinRegistry(): ChipRegistry {
  const reg = createChipRegistry()
  registerProject1Builtins(reg)
  return reg
}

function initUserRegistry(): ChipRegistry {
  return createChipRegistry()
}

/**
 * Returns the app-wide builtin chip registry. Lazily initialized.
 * Pre-populated with all 16 Project 1 chips.
 */
export function getBuiltinChipRegistry(): ChipRegistry {
  if (!builtinRegistry) builtinRegistry = initBuiltinRegistry()
  return builtinRegistry
}

/**
 * Returns the app-wide user chip registry: HDL chips, and specs registered as `'circuit'` chips.
 * Starts empty; nothing registers into it yet (#206).
 */
export function getUserChipRegistry(): ChipRegistry {
  if (!userRegistry) userRegistry = initUserRegistry()
  return userRegistry
}

/**
 * TEST-ONLY: re-initialize both singletons. Use in `beforeEach` for isolation.
 * Never call from production code.
 */
export function resetAppRegistriesForTests(): void {
  builtinRegistry = null
  userRegistry = null
}
