// src/core/testing/implementationSources.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { hdlChipDefinition } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { project1HdlSources, project1DependencyOrder } from '../hdl/project1HdlSources'

export interface ResolvedChip {
  chip: ChipDefinition
  registry: ChipRegistry
}

export interface ChipImplementationSource {
  id: string
  label: string
  /** Resolve the chip-under-test + the registry to evaluate it (sub-parts), or null. */
  resolve(chipName: string): ResolvedChip | null
}

const builtinSource: ChipImplementationSource = {
  id: 'builtin',
  label: 'Builtin reference',
  resolve(chipName) {
    const registry = getBuiltinChipRegistry()
    const chip = registry.get(chipName)
    return chip ? { chip, registry } : null
  },
}

let hdlRegistryCache: ChipRegistry | null = null
function buildHdlFromNandRegistry(): ChipRegistry {
  if (hdlRegistryCache) return hdlRegistryCache
  const reg = createChipRegistry()
  registerBuiltin(
    reg,
    'Nand',
    [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
    [{ name: 'out', width: 1 }],
    (i) => ({ out: ~(i.a & i.b) & 1 }),
  )
  for (const name of project1DependencyOrder) {
    const ast = parseHDL(project1HdlSources[name])
    if (!ast.success) {
      throw new Error(`HDL parse failed for ${name}: ${ast.errors.map((e) => e.message).join('; ')}`)
    }
    reg.register(hdlChipDefinition(ast.chip, project1HdlSources[name]))
  }
  hdlRegistryCache = reg
  return reg
}

const hdlFromNandSource: ChipImplementationSource = {
  id: 'hdl-from-nand',
  label: 'Built from NAND',
  resolve(chipName) {
    const registry = buildHdlFromNandRegistry()
    const chip = registry.get(chipName)
    return chip ? { chip, registry } : null
  },
}

const DEFAULT_SOURCES: ChipImplementationSource[] = [builtinSource, hdlFromNandSource]
let sources: ChipImplementationSource[] = [...DEFAULT_SOURCES]

export function getImplementationSources(): ChipImplementationSource[] {
  return sources
}

export function getImplementationSource(id: string): ChipImplementationSource | undefined {
  return sources.find((s) => s.id === id)
}

/** Register/replace a source by id (future: user chips P05-18, canvas P05-26). */
export function registerImplementationSource(source: ChipImplementationSource): void {
  sources = [...sources.filter((s) => s.id !== source.id), source]
}

/** TEST-ONLY: restore the default sources and clear the HDL registry cache. */
export function resetImplementationSourcesForTests(): void {
  sources = [...DEFAULT_SOURCES]
  hdlRegistryCache = null
}
