// The point of #181: `core/serialization` is an entry point a plain Node script can import.
// This file is deliberately store-free and DOM-free — it builds its documents by hand rather
// than through `circuitActions`, so nothing here can drag the store back in by the side door.
// It lives under `src/core`, so `vite.config.ts` puts it in the `node` Vitest project
// (environment: 'node', no setup file); the environment assertions below prove that at runtime.
import { describe, it, expect, vi } from 'vitest'
import { deserializeCircuit } from './deserialize'
import { CIRCUIT_FORMAT_VERSION, type SerializedCircuit } from './types'

// If anything in the reader's runtime graph reaches for the store or the toast channel, the
// factory runs and the import of `./deserialize` above fails loudly with this message.
vi.mock('@/lib/notify', () => {
  throw new Error('src/core/serialization must not import @/lib/notify — warnings are data (#181)')
})
vi.mock('@/store/circuitStore', () => {
  throw new Error('src/core/serialization must not import @/store/circuitStore (#181)')
})
vi.mock('@/store/actions/gateActions/gateActions', () => {
  throw new Error('src/core/serialization must not import @/store/actions/gateActions (#181)')
})

/** The entry point's own source, read as text — tests excluded. */
const sourceFiles = Object.entries(
  import.meta.glob<string>('./*.ts', { query: '?raw', import: 'default', eager: true }),
).filter(([file]) => !file.endsWith('.test.ts'))

/** `import … from '…'`, tolerating the multi-line form Prettier writes. */
const IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+'([^']+)'/g

/** Every `src/store` import in `source`, and whether TypeScript erases it before runtime. */
function storeImportsIn(source: string): { specifier: string; typeOnly: boolean }[] {
  return [...source.matchAll(IMPORT_RE)].flatMap(([, typeKeyword, clause, specifier]) => {
    if (!/^@\/store|^@store\//.test(specifier)) return []
    const names = clause.replace(/[{}]/g, '').split(',').map((n) => n.trim()).filter(Boolean)
    const typeOnly = Boolean(typeKeyword) || (names.length > 0 && names.every((n) => n.startsWith('type ')))
    return [{ specifier, typeOnly }]
  })
}

const emptyDocument = (version: number): SerializedCircuit => ({
  version: version as typeof CIRCUIT_FORMAT_VERSION,
  name: 'x',
  savedAt: '2026-01-01T00:00:00.000Z',
  gates: [],
  wires: [],
  inputNodes: [],
  outputNodes: [],
  junctions: [],
})

describe('core/serialization runs headless', () => {
  it('has no DOM: the node Vitest project, not jsdom', () => {
    expect(typeof document).toBe('undefined')
    expect(typeof window).toBe('undefined')
    expect(typeof localStorage).toBe('undefined')
  })

  it('deserializes a document with no store and no DOM in reach', () => {
    const { document: restored, warnings } = deserializeCircuit({
      ...emptyDocument(CIRCUIT_FORMAT_VERSION),
      gates: [
        { id: 'g1', type: 'Nand', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
    })
    expect(warnings).toEqual([])
    expect(restored?.gates).toHaveLength(1)
    expect(restored?.gates[0].chipName).toBe('Nand')
    expect(restored?.gates[0].inputs.map((p) => p.id)).toEqual(['g1-in-0', 'g1-in-1'])
    expect(restored?.gates[0].outputs.map((p) => p.id)).toEqual(['g1-out-0'])
  })

  it('imports nothing from the store at runtime — only erased type imports', () => {
    expect(sourceFiles.length).toBeGreaterThan(0)
    const offenders = sourceFiles.flatMap(([file, source]) =>
      storeImportsIn(source).filter((i) => !i.typeOnly).map((i) => `${file} -> ${i.specifier}`),
    )
    expect(offenders).toEqual([])
  })

  it('never reaches the toast channel', () => {
    const offenders = sourceFiles
      .filter(([, source]) => /from '@\/lib\/notify'/.test(source) || /\bnotify\s*\./.test(source))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })
})

describe('deserializeCircuit version dispatch', () => {
  it('reads version 1', () => {
    const { document: restored, warnings } = deserializeCircuit(emptyDocument(CIRCUIT_FORMAT_VERSION))
    expect(restored).not.toBeNull()
    expect(warnings).toEqual([])
  })

  it('reports a version-2 document as data, naming the version, without throwing', () => {
    const call = () => deserializeCircuit(emptyDocument(2))
    expect(call).not.toThrow()

    const { document: restored, warnings } = call()
    expect(restored).toBeNull()
    expect(warnings).toEqual([
      {
        code: 'unsupported-version',
        version: 2,
        supported: CIRCUIT_FORMAT_VERSION,
        message: expect.stringContaining('2'),
      },
    ])
    expect(warnings[0].message).toMatch(/version/i)
  })
})
