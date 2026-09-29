/**
 * Characterization of the legacy renderer, the baseline ADR-0020 §7.1 records before anything is
 * replaced: what the app draws for the circuits ADR-0008 protects, built exactly as
 * `src/components/canvas/routingScene.test.tsx` builds them, headless.
 *
 * It records today's behaviour, including what looks wrong, so it asserts nothing but the goldens.
 * Each golden is `describeCircuitScene` plus every wire's stored segments: the scene carries one
 * point per wire, while Wire3D draws the stored straight segments verbatim (ADR-0008, Limitations),
 * and `approach` / `confluenceCoord` are what ADR-0008's overlap oracle classifies on.
 * ADR-0020 §7.5c deletes `src/utils/wiringScheme`, so this file sits beside it, not in it. The
 * goldens sit on a protected path (`scripts/protected-paths.logic.mjs`).
 */
import { describe, it, expect } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore, Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { resetCircuitStore, wireGatePins, wireInputNodeToPin } from '@/test/r3f/seedCircuit'
import { describeCircuitScene } from '@/components/canvas/Scene/sceneDescribe'
import { expectOneGoldenPerCase } from '@/test/characterizationGoldens'

const GOLDEN_DIR = '__snapshots__/characterization/scene'
/** The router's own collinearity tolerance. */
const TOL = 0.001

interface Scenario {
  name: string
  about: string
  build: () => void
}

const s = () => useCircuitStore.getState()

/** Every input of `chipName` wired from its own Not, sources spread in x and z (B-004). */
function denseFanIn(chipName: string) {
  const chip = s().addGate(chipName, { x: 0, y: 0, z: 0 })
  chip.inputs.forEach((pin, i) => {
    const src = s().addGate('Not', { x: -(8 + i * 4), y: 0, z: i * 4 })
    wireGatePins(src.id, src.outputs[0].id, chip.id, pin.id)
  })
}

const SCENARIOS: Scenario[] = [
  {
    name: 'mux4way16-fan-in',
    about: 'ADR-0008 assertion 3: all 5 inputs of a Mux4Way16, each wired from its own Not.',
    build: () => denseFanIn('Mux4Way16'),
  },
  {
    name: 'mux8way16-fan-in',
    about: 'ADR-0008 assertion 3: all 9 inputs of a Mux8Way16, each wired from its own Not.',
    build: () => denseFanIn('Mux8Way16'),
  },
  {
    name: 'two-transits',
    about:
      'ADR-0008 assertion 4 (B-004a): a backbone wire into Mux4Way16 input 0, then two transit wires ' +
      'between Nots whose trunks start on the same lane near the backbone column x = -4.',
    build: () => {
      const chip = s().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
      const bSrc = s().addGate('Not', { x: -8.6, y: 0, z: -4 })
      wireGatePins(bSrc.id, bSrc.outputs[0].id, chip.id, chip.inputs[0].id)
      const tSrcA = s().addGate('Not', { x: -7.925, y: 0, z: -6 })
      const tDstA = s().addGate('Not', { x: 7.925, y: 0, z: -0.8 })
      wireGatePins(tSrcA.id, tSrcA.outputs[0].id, tDstA.id, tDstA.inputs[0].id)
      const tSrcB = s().addGate('Not', { x: -7.925, y: 0, z: -5 })
      const tDstB = s().addGate('Not', { x: 7.925, y: 0, z: -1.0 })
      wireGatePins(tSrcB.id, tSrcB.outputs[0].id, tDstB.id, tDstB.inputs[0].id)
    },
  },
  {
    name: 'case1-transit-off-backbone',
    about:
      'ADR-0008 assertion 5 (CASE1): two backbone wires into Mux4Way16 inputs 0 and 1, then a transit ' +
      'wire whose trunk crosses the backbone column x = -4 inside its z-range.',
    build: () => {
      const chip = s().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
      const bSrc0 = s().addGate('Not', { x: -8.6, y: 0, z: -4 })
      wireGatePins(bSrc0.id, bSrc0.outputs[0].id, chip.id, chip.inputs[0].id)
      const bSrc1 = s().addGate('Not', { x: -8.6, y: 0, z: -8 })
      wireGatePins(bSrc1.id, bSrc1.outputs[0].id, chip.id, chip.inputs[1].id)
      const tSrc = s().addGate('Not', { x: -7.925, y: 0, z: -6 })
      const tDst = s().addGate('Not', { x: 7.925, y: 0, z: 2 })
      wireGatePins(tSrc.id, tSrc.outputs[0].id, tDst.id, tDst.inputs[0].id)
    },
  },
  {
    name: 'node-drag-reroute',
    about:
      'ADR-0008 assertion 6 (B-003): input node "a" at (-10, 0, 2) wired to Mux4Way16 input 2, then ' +
      'moved to (-14, 0, -3). Recorded after the move.',
    build: () => {
      const chip = s().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
      const node = s().addInputNode('a', { x: -10, y: 0, z: 2 })
      wireInputNodeToPin(node.id, chip.id, chip.inputs[2].id)
      s().updateInputNodePosition(node.id, { x: -14, y: 0, z: -3 })
    },
  },
  {
    name: 'mixed-sweep',
    about: "ADR-0008 assertion 7: And, Or and Xor into a Mux's a, b and sel, and the Mux into a Not.",
    build: () => {
      const a = s().addGate('And', { x: -8, y: 0, z: -4 })
      const b = s().addGate('Or', { x: -8, y: 0, z: 0 })
      const c = s().addGate('Xor', { x: -8, y: 0, z: 4 })
      const mux = s().addGate('Mux', { x: 6, y: 0, z: 0 })
      const out = s().addGate('Not', { x: 14, y: 0, z: 2 })
      wireGatePins(a.id, a.outputs[0].id, mux.id, mux.inputs[0].id)
      wireGatePins(b.id, b.outputs[0].id, mux.id, mux.inputs[1].id)
      wireGatePins(c.id, c.outputs[0].id, mux.id, mux.inputs[2].id)
      wireGatePins(mux.id, mux.outputs[0].id, out.id, out.inputs[0].id)
    },
  },
]

// ── B-004b, recorded so the goldens do not enshrine it ────────────────────────────────────────────

const B004B_NOTE =
  'B-004b (CASE2), docs/development/observed-bugs.md: a confluence is identified only by its ' +
  'confluenceCoord, so wires into two different entities whose input sides snap to one section line ' +
  "share an approach backbone, and ADR-0008's overlap oracle, keyed on the same coordinate, passes it. " +
  'Each sharedTracks entry below is that bug, not intended routing.'

interface SharedTrack {
  wires: [string, string]
  confluenceCoord: number
  along: 'x' | 'z'
  at: number
  from: number
  to: number
}

/** The stretch two collinear straight segments share, or `null` when they only touch or miss. */
function sharedSpan(a: WireSegment, b: WireSegment): Omit<SharedTrack, 'wires' | 'confluenceCoord'> | null {
  const runsAlongZ = (seg: WireSegment) => Math.abs(seg.start.x - seg.end.x) < TOL
  const runsAlongX = (seg: WireSegment) => Math.abs(seg.start.z - seg.end.z) < TOL
  const along = runsAlongZ(a) && runsAlongZ(b) ? 'z' : runsAlongX(a) && runsAlongX(b) ? 'x' : null
  if (along === null) return null
  const across = along === 'z' ? 'x' : 'z'
  if (Math.abs(a.start[across] - b.start[across]) >= TOL) return null
  const from = Math.max(Math.min(a.start[along], a.end[along]), Math.min(b.start[along], b.end[along]))
  const to = Math.min(Math.max(a.start[along], a.end[along]), Math.max(b.start[along], b.end[along]))
  return to - from > TOL ? { along, at: a.start[across], from, to } : null
}

/** Approach backbones of wires into different entities that carry one confluenceCoord and overlap. */
function sharedConfluenceTracks(wires: Wire[]): SharedTrack[] {
  type Backbone = WireSegment & { confluenceCoord: number }
  const backbone = (seg: WireSegment): seg is Backbone => seg.approach === true && seg.confluenceCoord !== undefined
  return wires.flatMap((a, i) =>
    wires.slice(i + 1).flatMap((b) => {
      if (a.to.entityId === b.to.entityId) return []
      return a.segments.filter(backbone).flatMap((segA) =>
        b.segments.filter(backbone).flatMap((segB) => {
          const span = segA.confluenceCoord === segB.confluenceCoord ? sharedSpan(segA, segB) : null
          return span ? [{ wires: [a.id, b.id] as [string, string], confluenceCoord: segA.confluenceCoord, ...span }] : []
        }),
      )
    }),
  )
}

// ── Recording ─────────────────────────────────────────────────────────────────────────────────────

/** Four decimals, as `describeCircuitScene` rounds, so float noise cannot move a golden. */
const round = (_key: string, value: unknown) => {
  if (typeof value !== 'number') return value
  const rounded = Math.round(value * 1e4) / 1e4
  return rounded === 0 ? 0 : rounded
}

/** Store ids embed the clock and a random suffix; each becomes `<kind>-<index in creation order>`. */
function renameIds(json: string, state: CircuitStore): string {
  const kinds = {
    gate: state.gates,
    bus: state.busComponents,
    input: state.inputNodes,
    output: state.outputNodes,
    junction: state.junctions,
    wire: state.wires,
  }
  const names = new Map(Object.entries(kinds).flatMap(([kind, list]) => list.map(({ id }, i) => [id, `${kind}-${i}`] as const)))
  if (names.size === 0) return json
  const anyId = new RegExp([...names.keys()].sort((a, b) => b.length - a.length).join('|'), 'g')
  return json.replace(anyId, (id) => names.get(id) ?? id)
}

/** Builds the scenario on an empty store, so nothing from an earlier scenario reaches it. */
function characterize(scenario: Scenario): string {
  resetCircuitStore()
  scenario.build()
  const state = s()
  const golden = {
    scenario: scenario.name,
    about: scenario.about,
    b004b: { note: B004B_NOTE, sharedTracks: sharedConfluenceTracks(state.wires) },
    scene: describeCircuitScene(state),
    wires: state.wires.map(({ id, from, to, segments }) => ({ id, from, to, segments })),
  }
  return `${renameIds(JSON.stringify(golden, round, 2), state)}\n`
}

describe('legacy renderer, ADR-0008 circuits as scene + routed-path goldens (characterization)', () => {
  it('has one golden per scenario and no golden without a scenario', () => {
    // `import.meta.glob` takes a literal, hence GOLDEN_DIR spelled out.
    const onDisk = import.meta.glob('./__snapshots__/characterization/scene/**/*')
    expectOneGoldenPerCase(onDisk, SCENARIOS.map((sc) => sc.name), './__snapshots__/characterization/scene')
  })

  it.each(SCENARIOS.map((sc) => [sc.name, sc] as const))('%s', async (name, scenario) => {
    await expect(characterize(scenario)).toMatchFileSnapshot(`${GOLDEN_DIR}/${name}.json`)
  })
})
