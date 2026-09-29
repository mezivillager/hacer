/**
 * Characterization of the legacy store actions the `@store` Playwright suite drives, in Node:
 * one golden per call each spec makes, recorded before `CircuitState` is replaced (ADR-0020). The
 * actions that reach `localStorage` are in `legacyActions.dom.characterization.test.ts`. The goldens
 * sit on a protected path (`scripts/protected-paths.logic.mjs`): re-recording one is flagged on the PR.
 */
import { describe, it, expect } from 'vitest'
import { useCircuitStore } from './circuitStore'
import type { Position, WireEndpoint } from './types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { characterize, fixture, type Actions, type Ids } from './legacyActions.characterization.harness'

// ── What the specs build with ─────────────────────────────────────────────────────────────────────

const at = (x: number, z: number, y = 0.2): Position => ({ x, y, z })
/** `e2e/config/constants.ts` → `DEFAULT_POSITIONS`. */
const P = { left: at(-2, 2), center: at(2, 2), right: at(6, 2), topRight: at(6, -2), bottomRight: at(6, 6) }
const pin = (gateId: string, name: string): WireEndpoint => ({ type: 'gate', entityId: gateId, pinId: `${gateId}-${name}` })
const node = (type: 'input' | 'output' | 'junction', id: string): WireEndpoint => ({ type, entityId: id })
const seg = (type: WireSegment['type'], x1: number, z1: number, x2: number, z2: number): WireSegment => ({ type, start: at(x1, z1), end: at(x2, z2) })
/** The junction spec's wire: its corners sit on the section lines x = 4 and z = -4. */
const CORNERED = [seg('exit', 0.7, 0, 4, 0), seg('vertical', 4, 0, 4, -4), seg('horizontal', 4, -4, 8, -4), seg('entry', 8, -4, 8.7, -4)]

const setSegments = (segments: WireSegment[]) =>
  useCircuitStore.setState((s) => {
    if (s.wiringFrom) s.wiringFrom.segments = segments
  })

// ── Setups: each builds a spec's state before its call, and returns the ids the call needs ──────────

const oneGate = (a: Actions, then?: (g: string) => void): Ids => {
  const g = a.addGate('Nand', P.center).id
  then?.(g)
  return { g }
}
const twoGates = (a: Actions): Ids => ({ g1: a.addGate('Nand', P.left).id, g2: a.addGate('Nand', P.right).id })
const nandPair = (a: Actions): Ids => {
  const { g1, g2 } = twoGates(a)
  return { g1, g2, w: a.addWire(pin(g1, 'out-0'), pin(g2, 'in-0'), []).id }
}
const unwired = (a: Actions): Ids => ({ i: a.addInputNode('a', P.left).id, g: a.addGate('Nand', P.center).id, o: a.addOutputNode('out', P.right).id })
const inputWired = (a: Actions): Ids => {
  const [i, g] = [a.addInputNode('a', P.left).id, a.addGate('Not', P.center).id]
  a.addWire(node('input', i), pin(g, 'in-0'), [])
  return { i, g }
}
const outputWired = (a: Actions): Ids => {
  const [g, o] = [a.addGate('Nand', P.center).id, a.addOutputNode('out', P.right).id]
  a.addWire(pin(g, 'out-0'), node('output', o), [])
  return { g, o }
}
/** Input → junction, and a gate the junction may feed. */
const junctionFed = (feedGate: boolean) => (a: Actions): Ids => {
  const [i, j, g] = [a.addInputNode('a', P.left).id, a.addJunction('sig-a', P.center).id, a.addGate('And', P.topRight).id]
  a.addWire(node('input', i), node('junction', j), [], [], 'sig-a')
  if (feedGate) a.addWire(node('junction', j), pin(g, 'in-0'), [], [], 'sig-a')
  return { i, j, g }
}
/** A Nand, an output node, and a wiring gesture from the Nand's output, hovering the node or not. */
const wiringToNode = (stage: 'started' | 'hovering' | 'withSegments', existingWire = false) => (a: Actions): Ids => {
  const [g, out] = [a.addGate('Nand', P.center).id, a.addOutputNode('out', P.right).id]
  if (existingWire) a.addWire(pin(g, 'out-0'), node('output', out), [seg('horizontal', 0.7, 0, 7.6, 0)])
  a.startWiring(g, `${g}-out-0`, 'output', at(0.7, 0))
  if (stage !== 'started') a.setDestinationNode(out, 'output')
  if (stage === 'withSegments') setSegments([seg('horizontal', 0.7, 0, 7.4, 0)])
  return { g, out }
}
/** The cornered wire between gates at x = 0 and x = `toX`, or from a gate back to itself. */
const cornered = (toX: number | null) => (a: Actions): Ids => {
  const g1 = a.addGate('Nand', at(0, 0, 0)).id
  const g2 = toX === null ? g1 : a.addGate('Nand', at(toX, 0, 0)).id
  return { w: a.addWire(pin(g1, 'out-0'), pin(g2, 'in-0'), CORNERED).id }
}
/** The junction spec's branch: a junction on the wire's corner, wired on towards a third gate. */
const junctionBranch = (stage: 'placed' | 'wiring' | 'branched') => (a: Actions): Ids => {
  const [g1, g2, g3] = [at(0, 0, 0), at(8, 0, 0), at(12, 0, 0)].map((p) => a.addGate('Nand', p).id)
  const w = a.addWire(pin(g1, 'out-0'), pin(g2, 'in-0'), CORNERED, [], 'sig-test').id
  const junction = a.placeJunctionOnWire(at(4, -4), w)
  if (stage !== 'placed') {
    a.startWiringFromJunction(junction.id, junction.position)
    setSegments([seg('horizontal', 4, -4, 11.5, -4)])
  }
  if (stage === 'branched') a.completeWiringFromJunction(g3, `${g3}-in-0`, 'input')
  return { g3, w, j: junction.id }
}
/** `driveInputsViaStore` on the first gate's two inputs, then the simulation started. */
const driven = (fanOut: boolean, values: number[]) => (a: Actions): void => {
  const g1 = a.addGate('Nand', P.left).id
  const sinks = fanOut ? [a.addGate('And', P.topRight).id, a.addGate('Or', P.bottomRight).id] : [a.addGate('Nand', P.right).id]
  for (const sink of sinks) a.addWire(pin(g1, 'out-0'), pin(sink, 'in-0'), [])
  values.forEach((value, n) => {
    const input = a.addInputNode(`drv-${String(n)}`, at(-8, 0, n * 2))
    a.addWire(node('input', input.id), pin(g1, `in-${String(n)}`), [])
    a.updateInputNodeValue(input.id, value)
  })
  a.toggleSimulation()
}

// ── The fixtures: name, the spec under e2e/specs, the call, and its setup ───────────────────────────

const GATES = 'gates/gate-types.store.spec.ts'
const MOVE = 'gates/gate-movement.store.spec.ts'
const PERSIST = 'wiring/wire-persistence.store.spec.ts'
const BUILTINS = 'builtins/placement.store.spec.ts'
const WIRES = 'wiring/wire-creation.store.spec.ts'
const NODES = 'wiring/node-wiring.store.spec.ts'
const RENAME = 'wiring/node-rename.store.spec.ts'
const JUNCTIONS = 'wiring/junction-placement.store.spec.ts'
const SIGNALS = 'simulation/signal-propagation.store.spec.ts'
const SIMULATION = 'simulation/simulation-control.store.spec.ts'
const STATUS = 'simulation/status-bar.store.spec.ts'
const BUS = 'bus/bus-placement.store.spec.ts'

const FIXTURES = [
  fixture('addGate.nand', 'gates/gate-placement.store.spec.ts', (a) => a.addGate('Nand', P.center)),
  fixture('addGate.not', GATES, (a) => a.addGate('Not', P.center)),
  fixture('removeGate.wired', WIRES, (a, { g1 }) => a.removeGate(g1), nandPair),
  fixture('selectGate.select', MOVE, (a, { g }) => a.selectGate(g), oneGate),
  fixture('selectGate.deselect', MOVE, (a) => a.selectGate(null), (a) => oneGate(a, (g) => a.selectGate(g))),
  fixture('updateGatePosition.wired', PERSIST, (a, { g2 }) => a.updateGatePosition(g2, at(10, 6)), nandPair),
  fixture('rotateGate.wired', PERSIST, (a, { g2 }) => a.rotateGate(g2, 'z', Math.PI / 2), nandPair),
  fixture('rotateGate.back', MOVE, (a, { g }) => a.rotateGate(g, 'z', -Math.PI / 2), (a) => oneGate(a, (g) => a.rotateGate(g, 'z', Math.PI / 2))),
  fixture('clearCircuit', GATES, (a) => a.clearCircuit(), (a) => ({ ...inputWired(a), ...nandPair(a) })),
  // The spec enters placement mode by clicking the chip's toolbar button, which calls `startPlacement`.
  fixture('startPlacement', BUILTINS, (a) => a.startPlacement('Mux')),
  fixture('placeGate', BUILTINS, (a) => a.placeGate(P.center), (a) => a.startPlacement('Mux16')),

  fixture('addWire.gateToGate', WIRES, (a, { g1, g2 }) => a.addWire(pin(g1, 'out-0'), pin(g2, 'in-0'), []), twoGates),
  fixture('addWire.inputToGate', NODES, (a, { i, g }) => a.addWire(node('input', i), pin(g, 'in-0'), []), unwired),
  fixture('addWire.gateToOutput', NODES, (a, { g, o }) => a.addWire(pin(g, 'out-0'), node('output', o), []), unwired),
  fixture('addWire.fromJunction', NODES, (a, { j, g }) => a.addWire(node('junction', j), pin(g, 'in-0'), [], [], 'sig-a'), junctionFed(false)),
  fixture('removeWire.gateToGate', WIRES, (a, { w }) => a.removeWire(w), nandPair),
  fixture('removeWire.junctionTrunk', JUNCTIONS, (a, { w }) => a.removeWire(w), junctionBranch('branched')),
  fixture('getPinWorldPosition', WIRES, (a, { g1, g2 }) => [a.getPinWorldPosition(g1, `${g1}-out-0`), a.getPinWorldPosition(g2, `${g2}-in-0`)], twoGates),

  fixture('startWiring', NODES, (a, { g }) => a.startWiring(g, `${g}-out-0`, 'output', at(0.7, 0)), oneGate),
  fixture('setDestinationNode', NODES, (a, { out }) => a.setDestinationNode(out, 'output'), wiringToNode('started')),
  // Without segments is what Node sees; with them is what the spec's browser run sees once
  // `WirePreview` has computed a path.
  fixture('completeWiringToNode.noSegments', NODES, (a, { out }) => a.completeWiringToNode(out, 'output'), wiringToNode('hovering')),
  fixture('completeWiringToNode.withSegments', NODES, (a, { out }) => a.completeWiringToNode(out, 'output'), wiringToNode('withSegments')),
  fixture('completeWiringToNode.duplicate', NODES, (a, { out }) => a.completeWiringToNode(out, 'output'), wiringToNode('withSegments', true)),

  fixture('addInputNode', NODES, (a) => a.addInputNode('a', P.left)),
  fixture('addOutputNode', NODES, (a) => a.addOutputNode('out', P.right)),
  fixture('updateInputNodeValue.wired', 'ui-shell/pinout-panel.store.spec.ts', (a, { i }) => a.updateInputNodeValue(i, 0), inputWired),
  fixture('renameInputNode.valid', RENAME, (a, { i }) => a.renameInputNode(i, 'sel'), (a) => ({ i: a.addInputNode('in0', P.left).id })),
  fixture('renameInputNode.duplicate', RENAME, (a, { i }) => a.renameInputNode(i, 'SEL'), (a) => ({
    i: a.addInputNode('a', P.left).id,
    other: a.addInputNode('sel', P.center).id,
  })),
  fixture('renameInputNode.invalid', RENAME, (a, { i }) => a.renameInputNode(i, 'bad-name'), (a) => ({ i: a.addInputNode('in0', P.left).id })),
  fixture('renameOutputNode.valid', RENAME, (a, { o }) => a.renameOutputNode(o, 'out'), (a) => ({ o: a.addOutputNode('out0', P.right).id })),
  fixture('removeInputNode.wired', NODES, (a, { i }) => a.removeInputNode(i), inputWired),
  fixture('removeOutputNode.wired', NODES, (a, { o }) => a.removeOutputNode(o), outputWired),

  fixture('addJunction', NODES, (a) => a.addJunction('sig-a', P.center)),
  fixture('removeJunction.wired', NODES, (a, { j }) => a.removeJunction(j), junctionFed(true)),
  fixture('placeJunctionOnWire.corner', JUNCTIONS, (a, { w }) => a.placeJunctionOnWire(at(4, -4), w), cornered(null)),
  fixture('placeJunctionOnWire.offCorner', JUNCTIONS, (a, { w }) => a.placeJunctionOnWire(at(4, -2), w), cornered(12)),
  fixture('startWiringFromJunction', JUNCTIONS, (a, { j }, s) => a.startWiringFromJunction(j, s.junctions[0].position), junctionBranch('placed')),
  fixture('completeWiringFromJunction', JUNCTIONS, (a, { g3 }) => a.completeWiringFromJunction(g3, `${g3}-in-0`, 'input'), junctionBranch('wiring')),

  fixture('toggleSimulation.start', SIMULATION, (a) => a.toggleSimulation()),
  fixture('toggleSimulation.stop', SIMULATION, (a) => a.toggleSimulation(), (a) => a.toggleSimulation()),
  fixture('simulationTick.nandChain', SIGNALS, (a) => a.simulationTick(), driven(false, [1, 1])),
  fixture('simulationTick.fanOut', SIGNALS, (a) => a.simulationTick(), driven(true, [0, 0])),

  fixture('addStatus', STATUS, (a) => a.addStatus('error', 'Parse failed at line 3')),
  // The spec dismisses the message by clicking the status bar, which calls `clearStatus`.
  fixture('clearStatus', STATUS, (a, { s }) => a.clearStatus(s), (a) => ({ s: a.addStatus('error', 'Parse failed at line 3').id })),

  fixture('placeBusSplitter', BUS, (a) => a.placeBusSplitter(16, P.center)),
  fixture('startBusPlacement', BUS, (a) => a.startBusPlacement('joiner')),
  fixture('placeBusComponent', BUS, (a) => a.placeBusComponent(P.right), (a) => a.startBusPlacement('joiner')),
]

const GOLDENS = '__snapshots__/characterization/store-actions'

describe('legacy store actions the @store suite drives (characterization)', () => {
  it('has one golden per fixture and no golden without a fixture', () => {
    // Keys only, so nothing is loaded; `import.meta.glob` takes a literal, hence GOLDENS spelled out.
    const onDisk = Object.keys(import.meta.glob('./__snapshots__/characterization/store-actions/*'))
    expect(onDisk.sort()).toEqual(FIXTURES.map((f) => `./${GOLDENS}/${f.name}.json`).sort())
  })

  it.each(FIXTURES.map((f) => [f.name, f] as const))('%s', async (name, f) => {
    await expect(characterize(f)).toMatchFileSnapshot(`${GOLDENS}/${name}.json`)
  })
})
