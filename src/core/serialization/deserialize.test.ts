// The point of #181: `core/serialization` is an entry point a plain Node script can import.
// This file is deliberately store-free and DOM-free — it builds its documents by hand rather
// than through `circuitActions`, so nothing here can drag the store back in by the side door.
// It lives under `src/core`, so `vite.config.ts` puts it in the `node` Vitest project
// (environment: 'node', no setup file); the environment assertions below prove that at runtime.
import { describe, it, expect, vi } from 'vitest'
import { deserializeCircuit } from './deserialize'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedBusComponent,
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
    // Gate warnings only: this document also loses a wire to the gate it drops, reported
    // separately since #402 and pinned by its own tests below.
    expect(warnings.filter((w) => w.code !== 'dropped-wire')).toEqual([
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

describe('deserializeCircuit: a warning always names a gate, as a string', () => {
  // `DeserializeWarning` declares `gateId: string` / `gateType: string`, and a caller may
  // switch on them. A record with neither field is exactly the input that would otherwise
  // put `undefined` in both — so the reader names it, and never reports a type it cannot keep.
  const nameless = (): SerializedCircuit => ({
    ...emptyDocument(CIRCUIT_FORMAT_VERSION),
    gates: [
      { type: 'NOR', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      { id: 'g-no-type', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      GOOD_GATE,
    ] as unknown as SerializedGate[],
  })

  it('reports a string id and type for an entry that carries neither', () => {
    const { document: restored, warnings } = deserializeCircuit(nameless())
    expect(restored?.gates.map((g) => g.id)).toEqual(['g-and'])
    expect(warnings.map((w) => w.code)).toEqual(['unsupported-gate-type', 'unreadable-gate'])
    for (const warning of warnings) {
      expect(typeof (warning as { gateId?: unknown }).gateId).toBe('string')
      expect(typeof (warning as { gateType?: unknown }).gateType).toBe('string')
    }
  })
})

// ── The pruning key: the id the document wrote, not the one the warning shows ──────────────────
// PR #399 review (round 2): a dropped gate has to be recorded under the id its own record
// carries. JSON ids are untrusted — a file can write `id: 7` on the gate and `entityId: 7` on the
// wire, and those match — so keying the skip set off a *display* value leaves that wire pointing
// at a gate the restored circuit does not contain. `deserializeCircuit`'s own comment above the
// skip set says why that matters: a dangling wire silently drives 0 into downstream gate inputs
// through the simulation's missing-endpoint fallback (the state #107 added pruning to prevent).
// All three dropping branches take one document shape here, so they stay pinned together.

interface PruningCase {
  /** Reads as the `it.each` title via `$name`. */
  name: string
  /** The gate record that will be dropped, exactly as a file could write it. */
  gate: Record<string, unknown>
  /** What the wire's `entityId` says — the same JSON value the gate's `id` carries. */
  entityId: unknown
}

const ZERO_VEC = { x: 0, y: 0, z: 0 }

const PRUNING_CASES: PruningCase[] = [
  {
    // The regression: a numeric id that reaches the `catch` (this record has no `position`).
    name: 'a numeric id, record the reader cannot rebuild',
    gate: { id: 7, type: 'And', rotation: ZERO_VEC, width: 1 },
    entityId: 7,
  },
  {
    name: 'a string id, record the reader cannot rebuild (control)',
    gate: { id: 'g-bad', type: 'And', rotation: ZERO_VEC, width: 1 },
    entityId: 'g-bad',
  },
  {
    name: 'a numeric id on an unsupported legacy type (control)',
    gate: { id: 7, type: 'NOR', position: ZERO_VEC, rotation: ZERO_VEC, width: 1 },
    entityId: 7,
  },
  {
    // The stand-in a nameless entry displays is an ordinary string, so a real gate may carry it.
    name: 'an id equal to the stand-in shown for a nameless entry',
    gate: { id: '(unidentified)', type: 'And', rotation: ZERO_VEC, width: 1 },
    entityId: '(unidentified)',
  },
]

/** The gate that will be dropped, one good `And`, and a wire from the dropped gate into it. */
const withDroppedGateWire = ({ gate, entityId }: PruningCase): SerializedCircuit => ({
  ...emptyDocument(CIRCUIT_FORMAT_VERSION),
  gates: [gate, GOOD_GATE] as unknown as SerializedGate[],
  wires: [
    {
      id: 'w-dangling',
      from: { type: 'gate', entityId, pinId: `${String(entityId)}-out-0` },
      to: { type: 'gate', entityId: GOOD_GATE.id, pinId: `${GOOD_GATE.id}-in-0` },
      segments: [],
      crossesWireIds: [],
    },
  ] as unknown as SerializedWire[],
})

describe('deserializeCircuit: wires are pruned on the id the document wrote', () => {
  it.each(PRUNING_CASES)('prunes the wire into a gate dropped with $name', (testCase) => {
    const { document: restored, warnings } = deserializeCircuit(withDroppedGateWire(testCase))

    // The good gate survives and exactly one *gate* warning names the dropped one …
    expect(restored?.gates.map((g) => g.id)).toEqual([GOOD_GATE.id])
    expect(warnings.filter((w) => w.code !== 'dropped-wire')).toHaveLength(1)
    // … and nothing is left referencing the gate that is no longer there, with the wire
    // that went with it named too (#402).
    expect(restored?.wires).toEqual([])
    expect(warnings.filter((w) => w.code === 'dropped-wire')).toEqual([
      { code: 'dropped-wire', wireId: 'w-dangling', reason: 'missing-gate', message: expect.any(String) as string },
    ])
  })
})

// ── What pruning takes with it (#402) ──────────────────────────────────────────────────────────
// #107 (Codex P1) made the reader drop a wire whose endpoint gate or bus component did not
// survive the load, and a junction whose `wireIds` all point at dropped wires. Both are right —
// a dangling wire silently drives 0 downstream through the simulation's missing-endpoint
// fallback — and both used to happen with nothing said: the person was told a gate was skipped
// and never told that the wiring went with it. Same treatment as a dropped gate, then: one
// warning per entity, carrying its id, returned as data. Who sees what is the caller's call.

const BUS_SPLITTER: SerializedBusComponent = {
  id: 'bus-live',
  kind: 'splitter',
  position: ZERO_VEC,
  rotation: ZERO_VEC,
  width: 4,
  inputs: [],
  outputs: [],
  selected: false,
}

const gateEnd = (entityId: string, dir: 'in' | 'out') => ({
  type: 'gate' as const,
  entityId,
  pinId: `${entityId}-${dir}-0`,
})

const busEnd = (entityId: string) => ({ type: 'bus' as const, entityId, pinId: `${entityId}-in-0` })

/** A wire record with the fields this reader ignores here defaulted away. */
const wireRecord = (id: string, from: SerializedWire['from'], to: SerializedWire['to']): SerializedWire => ({
  id,
  from,
  to,
  segments: [],
  crossesWireIds: [],
})

/** One NOR (always skipped) and one live `And`; one live splitter and one bus id the document
 *  never defines; three wires — one orphaned by the gate, one by the bus, one good — and two
 *  junctions, one joining only doomed wires and one that keeps the good wire. */
const withDroppedWiring = (): SerializedCircuit => ({
  ...emptyDocument(CIRCUIT_FORMAT_VERSION),
  gates: [{ id: 'g-nor', type: 'NOR', position: ZERO_VEC, rotation: ZERO_VEC, width: 1 }, GOOD_GATE],
  busComponents: [BUS_SPLITTER],
  wires: [
    wireRecord('w-orphan-gate', gateEnd('g-nor', 'out'), gateEnd(GOOD_GATE.id, 'in')),
    wireRecord('w-orphan-bus', gateEnd(GOOD_GATE.id, 'out'), busEnd('bus-never-saved')),
    wireRecord('w-good', gateEnd(GOOD_GATE.id, 'out'), busEnd(BUS_SPLITTER.id)),
  ],
  junctions: [
    { id: 'j-orphan', position: ZERO_VEC, signalId: 'sig-x', wireIds: ['w-orphan-gate', 'w-orphan-bus'] },
    { id: 'j-mixed', position: ZERO_VEC, signalId: 'sig-y', wireIds: ['w-orphan-gate', 'w-good'] },
  ],
})

describe('deserializeCircuit: the wires and junctions pruning takes with it', () => {
  it('reports each pruned wire, naming its id and which endpoint went missing', () => {
    const { document: restored, warnings } = deserializeCircuit(withDroppedWiring())
    expect(restored?.wires.map((w) => w.id)).toEqual(['w-good'])
    expect(warnings.filter((w) => w.code === 'dropped-wire')).toEqual([
      {
        code: 'dropped-wire',
        wireId: 'w-orphan-gate',
        reason: 'missing-gate',
        message: expect.stringContaining('w-orphan-gate'),
      },
      {
        code: 'dropped-wire',
        wireId: 'w-orphan-bus',
        reason: 'missing-bus',
        message: expect.stringContaining('w-orphan-bus'),
      },
    ])
  })

  it('reports a junction left joining nothing, and says nothing about one that keeps a wire', () => {
    const { document: restored, warnings } = deserializeCircuit(withDroppedWiring())
    expect(restored?.junctions.map((j) => j.id)).toEqual(['j-mixed'])
    expect(restored?.junctions[0].wireIds).toEqual(['w-good'])
    expect(warnings.filter((w) => w.code === 'dropped-junction')).toEqual([
      { code: 'dropped-junction', junctionId: 'j-orphan', message: expect.stringContaining('j-orphan') },
    ])
  })

  // The last acceptance criterion of #402: the frozen set of #181 keeps its text *and* its place.
  it('leaves every gate warning ahead of them, unchanged', () => {
    const { warnings } = deserializeCircuit(withDroppedWiring())
    expect(warnings.map((w) => w.code)).toEqual([
      'unsupported-gate-type',
      'dropped-wire',
      'dropped-wire',
      'dropped-junction',
    ])
    expect(warnings[0].message).toBe(
      'Skipped unsupported gate type "NOR" — NOR and XNOR are not supported in the builtin chip system.',
    )
  })

  it('warns about nothing when every wire and junction survives', () => {
    const doc = withDroppedWiring()
    const { warnings } = deserializeCircuit({
      ...doc,
      gates: [GOOD_GATE],
      wires: doc.wires.filter((w) => w.id === 'w-good'),
      junctions: [{ id: 'j-live', position: ZERO_VEC, signalId: 'sig-z', wireIds: ['w-good'] }],
    })
    expect(warnings).toEqual([])
  })
})
