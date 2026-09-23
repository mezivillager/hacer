// The point of #181: `core/serialization` is an entry point a plain Node script can import.
// This file is deliberately store-free and DOM-free — it builds its documents by hand rather
// than through `circuitActions`, so nothing here can drag the store back in by the side door.
// It lives under `src/core`, so `vite.config.ts` puts it in the `node` Vitest project
// (environment: 'node', no setup file); the environment assertions below prove that at runtime.
import { describe, it, expect, vi } from 'vitest'
import { deserializeCircuit } from './deserialize'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedCircuit,
  type SerializedGate,
  type SerializedWire,
} from './types'

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

// ── Entries the reader cannot rebuild ──────────────────────────────────────────────────────────
// PR #399 review: `cloneVec3(s.position)` / `cloneVec3(s.rotation)` threw straight out of the
// reader, so one gate entry written by a build that shapes its records differently cost the whole
// circuit. `importCircuitJSON` hands this function an arbitrary user-supplied file, so "one entry
// this build cannot read" is an expected case, not a bug — and it is the same *kind* of event as a
// gate whose chip no registry knows: one gate the reader could not rebuild. Same treatment:
// a per-entry warning naming it, and the rest of the document loads.

/** Gate records this build cannot rebuild: the transform is missing, or null-shaped. */
const UNREADABLE_GATES = [
  { id: 'g-no-position', type: 'And', rotation: { x: 0, y: 0, z: 0 }, width: 1 },
  { id: 'g-null-rotation', type: 'And', position: { x: 2, y: 0, z: 0 }, rotation: null, width: 1 },
] as unknown as SerializedGate[]

const GOOD_GATE: SerializedGate = {
  id: 'g-and',
  type: 'And',
  position: { x: 4, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  width: 1,
}

/** Two unreadable gate entries and one good `And`, plus a wire into one of the bad ones. */
const withUnreadableGates = (): SerializedCircuit => ({
  ...emptyDocument(CIRCUIT_FORMAT_VERSION),
  gates: [...UNREADABLE_GATES, GOOD_GATE],
  wires: [
    {
      id: 'w-dangling',
      from: { type: 'gate', entityId: 'g-no-position', pinId: 'g-no-position-out-0' },
      to: { type: 'gate', entityId: 'g-and', pinId: 'g-and-in-0' },
      segments: [],
      crossesWireIds: [],
    },
  ],
})

describe('deserializeCircuit: a gate entry it cannot rebuild', () => {
  it('does not throw, and loads every gate it could read', () => {
    const call = () => deserializeCircuit(withUnreadableGates())
    expect(call).not.toThrow()

    const { document: restored } = call()
    expect(restored).not.toBeNull()
    expect(restored?.gates.map((g) => g.id)).toEqual(['g-and'])
    expect(restored?.gates[0].chipName).toBe('And')
  })

  it('reports each one as a warning naming that gate and why', () => {
    const { warnings } = deserializeCircuit(withUnreadableGates())
    expect(warnings).toEqual([
      {
        code: 'unreadable-gate',
        gateId: 'g-no-position',
        gateType: 'And',
        reason: expect.any(String) as string,
        message: expect.stringContaining('g-no-position'),
      },
      {
        code: 'unreadable-gate',
        gateId: 'g-null-rotation',
        gateType: 'And',
        reason: expect.any(String) as string,
        message: expect.stringContaining('g-null-rotation'),
      },
    ])
    // The underlying failure reaches the person, not just the id — main put it in the text too.
    const unreadable = warnings.filter((w) => w.code === 'unreadable-gate')
    expect(unreadable).toHaveLength(2)
    for (const warning of unreadable) expect(warning.message).toContain(warning.reason)
  })

  it('prunes wires that referenced the dropped gate, as for any other skipped gate', () => {
    const { document: restored } = deserializeCircuit(withUnreadableGates())
    expect(restored?.wires).toEqual([])
  })
})

describe('deserializeCircuit: what stays fatal to the whole document', () => {
  // The line drawn in #181/#399: recovery is *per entry*. A document whose own shape is wrong is
  // not one bad gate — there is nothing to load — and it throws here exactly as it does on `main`.
  it('throws when a top-level array is missing', () => {
    const noGates: Partial<SerializedCircuit> = { ...emptyDocument(CIRCUIT_FORMAT_VERSION) }
    delete noGates.gates
    expect(() => deserializeCircuit(noGates as SerializedCircuit)).toThrow(/gates/)
  })

  it('throws on a malformed wire entry, unchanged from before', () => {
    const badWire: SerializedCircuit = {
      ...emptyDocument(CIRCUIT_FORMAT_VERSION),
      wires: [{ id: 'w1' }] as unknown as SerializedWire[],
    }
    expect(() => deserializeCircuit(badWire)).toThrow()
  })
})
