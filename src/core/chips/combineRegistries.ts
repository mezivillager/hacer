// src/core/chips/combineRegistries.ts
import type { ChipDefinition } from './types'
import type { ChipRegistry } from './registry'

/** Read-only ChipRegistry view that resolves names across several registries (first match wins). */
export function combineRegistries(...registries: ChipRegistry[]): ChipRegistry {
  return {
    get(name: string): ChipDefinition | undefined {
      for (const r of registries) {
        const found = r.get(name)
        if (found) return found
      }
      return undefined
    },
    has(name: string): boolean {
      return registries.some((r) => r.has(name))
    },
    list(): ChipDefinition[] {
      const seen = new Set<string>()
      const out: ChipDefinition[] = []
      for (const r of registries) {
        for (const def of r.list()) {
          if (!seen.has(def.name)) {
            seen.add(def.name)
            out.push(def)
          }
        }
      }
      return out
    },
    register(): void {
      throw new Error('combineRegistries: read-only view; register on a concrete registry instead')
    },
  }
}
