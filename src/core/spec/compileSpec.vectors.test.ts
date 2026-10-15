import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { createChipRegistry, type ChipRegistry } from '../chips/registry'
import { project1DependencyOrder, project1HdlSources } from '../hdl/project1HdlSources'
import { parseCmp } from '../testing/cmpParser'
import { runTest } from '../testing/engine'
import { parseTST } from '../testing/tstParser'
import { compileSpec } from './compileSpec'
import { parseSpec } from './parseSpec'

const VECTORS = import.meta.glob<string>('../../../conformance/vectors/01/*.{tst,cmp}', { query: '?raw', import: 'default', eager: true })

function vector(chip: string, ext: 'tst' | 'cmp'): string {
  const text = VECTORS[`../../../conformance/vectors/01/${chip}.${ext}`]
  if (text === undefined) throw new Error(`conformance/vectors/01/${chip}.${ext} is missing`)
  return text
}

function specsFromNand(): ChipRegistry {
  const registry = createChipRegistry()
  const nand = getBuiltinChipRegistry().get('Nand')
  if (!nand) throw new Error('no builtin Nand')
  registry.register(nand)
  for (const name of project1DependencyOrder) {
    const result = compileSpec(parseSpec(project1HdlSources[name], { chips: registry }), registry)
    if (!result.success) throw new Error(`${name}: ${result.diagnostics.map((d) => d.message).join('; ')}`)
    registry.register(result.chip)
  }
  return registry
}

describe('official Project-1 vectors through registered specs', () => {
  const registry = specsFromNand()

  for (const name of project1DependencyOrder) {
    it(`${name} passes its .tst/.cmp`, () => {
      expect(registry.get(name)?.implementation.type).toBe('circuit')
      const script = parseTST(vector(name, 'tst'))
      if (!script.success) throw new Error(script.errors.map((e) => e.message).join('; '))
      const cmp = parseCmp(vector(name, 'cmp'))
      if (!cmp.success) throw new Error(cmp.errors.map((e) => e.message).join('; '))
      const result = runTest(script.script, { registry, cmpData: cmp.file })
      expect({ name, error: result.error, firstFailure: result.firstFailure }).toEqual({ name, error: null, firstFailure: null })
      expect(result.passed).toBe(true)
      expect(result.totalSteps).toBe(cmp.file.rows.length)
    })
  }
})
