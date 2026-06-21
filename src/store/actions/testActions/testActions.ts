// src/store/actions/testActions/testActions.ts
import type { CircuitStore, TestActions } from '../../types'
import type { TestResult } from '@/core/testing/engine'
import type { CmpFile } from '@/core/testing/cmpParser'
import { runTest } from '@/core/testing/engine'
import { parseTST } from '@/core/testing/tstParser'
import { parseCmp } from '@/core/testing/cmpParser'
import { project1TstFixtures } from '@/core/testing/project1TstFixtures'
import { project1CmpFixtures } from '@/core/testing/project1CmpFixtures'
import { getImplementationSource } from '@/core/testing/implementationSources'
import { markChipCompleted } from '@/core/testing/chipCompletion'
import type { ChipRegistry } from '@/core/chips/registry'
import type { ChipDefinition } from '@/core/chips/types'

type SetState = (fn: (state: CircuitStore) => void, replace?: false, actionName?: string) => void
type GetState = () => CircuitStore

/**
 * Build a registry that resolves `chipName` to `sourceChip` (the chip returned by the
 * implementation source), then delegates all other lookups to `baseRegistry`.
 * This ensures the engine's `load <chip>.hdl` command always uses the source's chip, even
 * when `baseRegistry` does not contain it under that name (e.g. a custom source that provides
 * its own chip-under-test and only uses the registry for sub-part dependencies).
 */
function makeSourceFirstRegistry(chipName: string, sourceChip: ChipDefinition, baseRegistry: ChipRegistry): ChipRegistry {
  return {
    get(name: string): ChipDefinition | undefined {
      return name === chipName ? sourceChip : baseRegistry.get(name)
    },
    has(name: string): boolean {
      return name === chipName || baseRegistry.has(name)
    },
    list(): ChipDefinition[] {
      const out: ChipDefinition[] = [sourceChip]
      for (const def of baseRegistry.list()) {
        if (def.name !== chipName) out.push(def)
      }
      return out
    },
    register(_chip: ChipDefinition): void {
      throw new Error('makeSourceFirstRegistry: read-only view')
    },
  }
}

function parseCmpFixture(name: string): CmpFile | null {
  const raw = project1CmpFixtures[name.replace(/\.cmp$/i, '')]
  if (!raw) return null
  const r = parseCmp(raw)
  return r.success ? r.file : null
}

export const createTestActions = (set: SetState, get: GetState): TestActions => ({
  runChipTest: (chipName, sourceId) => {
    const fail = (error: string) => {
      const result: TestResult = {
        passed: false, totalSteps: 0, passedSteps: 0, outputRows: [], firstFailure: null, error,
      }
      set((s) => { s.testResult = result; s.testColumns = [] }, false, 'runChipTest')
      get().addStatus('error', `${chipName}: ${error}`)
    }

    const source = getImplementationSource(sourceId)
    if (!source) return fail(`unknown implementation source "${sourceId}"`)
    let resolved: ReturnType<typeof source.resolve>
    try {
      resolved = source.resolve(chipName)
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e))
    }
    if (!resolved) return fail(`no "${chipName}" implementation from source "${sourceId}"`)
    const tstRaw = project1TstFixtures[chipName]
    if (!tstRaw) return fail(`no test fixture for "${chipName}"`)
    const tst = parseTST(tstRaw)
    if (!tst.success) return fail(`TST parse error: ${tst.errors[0]?.message ?? 'unknown'}`)

    // Build a registry where `chipName` resolves to `resolved.chip` (the source's chip-under-test),
    // layered over `resolved.registry` (for sub-part lookups). This ensures the engine's
    // `load <chip>.hdl` command does not silently replace the source chip with whatever the
    // base registry happens to have under that name.
    const registry = makeSourceFirstRegistry(chipName, resolved.chip, resolved.registry)

    const result = runTest(tst.script, {
      registry,
      chip: resolved.chip,
      cmpData: parseCmpFixture(chipName) ?? undefined,
      loadCmpFile: (filename) => parseCmpFixture(filename),
    })
    const outputList = tst.script.commands.find((c) => c.type === 'output-list')
    const columns = outputList && outputList.type === 'output-list' ? outputList.columns : []
    const completed = result.passed ? markChipCompleted(chipName) : get().completedChips

    set((s) => {
      s.testResult = result
      s.testColumns = columns
      s.completedChips = completed
    }, false, 'runChipTest')

    if (result.passed) get().addStatus('info', `${chipName}: comparison ended successfully`)
    else if (result.error) get().addStatus('error', `${chipName}: ${result.error}`)
    else if (result.firstFailure) {
      get().addStatus('error', `${chipName}: failure at row ${result.firstFailure.row}, column '${result.firstFailure.column}'`)
    }
  },

  clearTestResult: () => {
    set((s) => { s.testResult = null; s.testColumns = [] }, false, 'clearTestResult')
  },
})
