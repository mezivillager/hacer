/**
 * The legacy store actions the `@store` suite drives that reach `localStorage`: saved circuits,
 * the performance-mode preference, and the chip a passing test marks completed. Same harness and
 * rules as `legacyActions.characterization.test.ts`; each golden also records `localStorage`.
 */
import { beforeEach, describe, it, expect } from 'vitest'
import { expectOneGoldenPerCase } from '@/test/characterizationGoldens'
import { characterize, fixture, type Actions } from './legacyActions.characterization.harness'

function parsed(raw: string | null): unknown {
  try {
    return JSON.parse(raw ?? '')
  } catch {
    return raw
  }
}
/** Every entry, with JSON values parsed so their ids are renamed and their diffs readable. */
const storage = () => Object.fromEntries(Object.keys(localStorage).map((key) => [key, parsed(localStorage.getItem(key))]))

/** The persistence spec's circuit: input → both Nand pins, Nand → output, input set to 1. */
function notFromNand(a: Actions): void {
  const input = a.addInputNode('a', { x: -4, y: 0, z: 0 }).id
  const output = a.addOutputNode('out', { x: 4, y: 0, z: 0 }).id
  const nand = a.addGate('Nand', { x: 0, y: 0, z: 0 }).id
  const h = (x1: number, x2: number, z2 = 0) => [{ start: { x: x1, y: 0.2, z: 0 }, end: { x: x2, y: 0.2, z: z2 }, type: 'horizontal' as const }]
  a.addWire({ type: 'input', entityId: input }, { type: 'gate', entityId: nand, pinId: `${nand}-in-0` }, h(-3, -1))
  a.addWire({ type: 'input', entityId: input }, { type: 'gate', entityId: nand, pinId: `${nand}-in-1` }, h(-3, -1, 0.6))
  a.addWire({ type: 'gate', entityId: nand, pinId: `${nand}-out-0` }, { type: 'output', entityId: output }, h(1, 3))
  a.updateInputNodeValue(input, 1)
}

const saved = (a: Actions, name: string, chips: string[]): void => {
  chips.forEach((chip, n) => a.addGate(chip, { x: n * 4, y: 0, z: 0 }))
  a.saveCircuit(name)
}

const PERSIST = 'persistence/circuit-persistence.store.spec.ts'
const PERFORMANCE = 'performance/performance-mode.store.spec.ts'
const TESTING = 'testing/test-results.store.spec.ts'

const FIXTURES = [
  fixture('setPerformanceMode', PERFORMANCE, (a) => a.setPerformanceMode('low-power'), (a) => a.setPerformanceMode('normal')),
  fixture('togglePerformanceMode.toLowPower', PERFORMANCE, (a) => a.togglePerformanceMode(), (a) => a.setPerformanceMode('normal')),
  fixture('togglePerformanceMode.toNormal', PERFORMANCE, (a) => a.togglePerformanceMode(), (a) => {
    a.setPerformanceMode('normal')
    a.togglePerformanceMode()
  }),
  fixture('saveCircuit', PERSIST, (a) => a.saveCircuit('not-from-nand'), notFromNand),
  fixture('loadCircuit', PERSIST, (a) => a.loadCircuit('not-from-nand'), (a) => {
    notFromNand(a)
    a.saveCircuit('not-from-nand')
    a.clearCircuit()
  }),
  fixture('importCircuitJSON', PERSIST, (a, { json }) => a.importCircuitJSON(json), (a) => {
    saved(a, 'export-source', ['Nand'])
    a.clearCircuit()
    return { json: localStorage.getItem('hacer-circuit-export-source') ?? '' }
  }),
  fixture('listSavedCircuits', PERSIST, (a) => a.listSavedCircuits(), (a) => {
    saved(a, 'alpha', ['Nand'])
    a.addGate('And', { x: 4, y: 0, z: 0 })
    a.saveCircuit('beta')
  }),
  fixture('runChipTest.builtinPasses', TESTING, (a) => a.runChipTest('Not', 'builtin')),
  fixture('runChipTest.unknownSource', TESTING, (a) => a.runChipTest('Not', 'nope')),
]

const GOLDENS = '__snapshots__/characterization/store-actions-storage'

describe('legacy store actions the @store suite drives, with localStorage (characterization)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has one golden per fixture and no golden without a fixture', () => {
    // `import.meta.glob` takes a literal, hence GOLDENS spelled out.
    const onDisk = import.meta.glob('./__snapshots__/characterization/store-actions-storage/**/*')
    expectOneGoldenPerCase(onDisk, FIXTURES.map((f) => f.name), `./${GOLDENS}`)
  })

  it.each(FIXTURES.map((f) => [f.name, f] as const))('%s', async (name, f) => {
    await expect(characterize(f, storage)).toMatchFileSnapshot(`${GOLDENS}/${name}.json`)
  })
})
