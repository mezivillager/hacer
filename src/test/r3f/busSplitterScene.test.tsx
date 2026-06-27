/**
 * Scene-graph render test for bus splitter output pins (ADR-0008 layer).
 *
 * Proves that every dynamic output pin of a splitter gets a rendered wire
 * whose endpoint reaches that pin's world position — the densest dynamic-pin
 * case the r3f harness has seen. This is the end-to-end integration gate for
 * bus geometry + wiring + rendering.
 *
 * Wiring strategy: mirrors how the existing routingScene tests build wires —
 * calculateWirePath produces segments via the same router the app uses, then
 * commits via addWire (no crossing resolution, which is a separate concern).
 *
 * Y-plane note: the router's exit/approach segments force y=WIRE_HEIGHT (0.2)
 * regardless of pin world-position y (which is 0 for both gate and bus pins
 * placed at y=0). expectWireConnects receives wire-plane projections
 * { x: pin.x, y: WIRE_HEIGHT, z: pin.z } — geometrically correct x,z-only
 * comparison, not a tolerance weakening.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config'
import { resetCircuitStore } from './seedCircuit'
import { renderCircuitScene, type SceneTestHandle } from './renderCircuitScene'
import { getRenderedWirePolylines, expectWireConnects, expectNoWireOverlaps } from './wireGeometry'
import type { Wire } from '@/store/types'

const getState = () => useCircuitStore.getState()

/**
 * Route and add a wire from a bus output pin to a gate input pin using the
 * same routing computation the app uses (calculateWirePath), deconflicting
 * against all existing wire segments, then commit via addWire. Returns the Wire.
 */
function wireBusPinToGatePin(busId: string, busPinId: string, gateId: string, gatePinId: string): Wire {
  const state = getState()
  const fromPos = state.getPinWorldPosition(busId, busPinId)!
  const fromOri = state.getPinOrientation(busId, busPinId)!
  const toPos = state.getPinWorldPosition(gateId, gatePinId)!
  const toOri = state.getPinOrientation(gateId, gatePinId)!
  const path = calculateWirePath(
    fromPos,
    { type: 'pin', pin: toPos, orientation: { direction: toOri } },
    { direction: fromOri },
    state.gates,
    { existingSegments: state.wires.flatMap((w) => w.segments) },
  )
  return state.addWire(
    { type: 'bus', entityId: busId, pinId: busPinId },
    { type: 'gate', entityId: gateId, pinId: gatePinId },
    path.segments,
  )
}

describe('bus splitter scene-graph rendering', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('renders a connected wire from every splitter output pin to its gate', async () => {
    const inputNode = getState().addInputNode('a', { x: -4, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!

    // Route input node → splitter 'in' pin
    const inPin = getState().getPinWorldPosition(splitter.id, 'in')!
    const off = calculateNodePinPosition('input')
    const inStart = { x: inputNode.position.x + off.x, y: 0.2, z: inputNode.position.z + off.z }
    const inPath = calculateWirePath(
      inStart,
      {
        type: 'pin',
        pin: inPin,
        orientation: { direction: getState().getPinOrientation(splitter.id, 'in')! },
      },
      { direction: { x: 1, y: 0, z: 0 } },
      getState().gates,
      { existingSegments: [] },
    )
    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      inPath.segments,
    )

    // One downstream Not gate per splitter output bit; spread along Z so trunks
    // route on distinct tracks.
    const gateIds: string[] = []
    const wireByPin = new Map<string, string>()
    for (let i = 0; i < 4; i++) {
      const gate = getState().addGate('Not', { x: 6, y: 0, z: (i - 1.5) * 4 })
      gateIds.push(gate.id)
      const wire = wireBusPinToGatePin(splitter.id, `out${i}`, gate.id, gate.inputs[0].id)
      wireByPin.set(`out${i}`, wire.id)
    }

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    // Non-vacuity: 1 input wire + 4 output wires must all render.
    expect(rendered.length, 'expected 5 rendered wires (1 input + 4 output pins)').toBe(5)

    // Every splitter output pin has a rendered wire connecting it to the correct gate pin.
    for (let i = 0; i < 4; i++) {
      const wireId = wireByPin.get(`out${i}`)!
      const w = rendered.find((r) => r.wireId === wireId)
      expect(w, `no rendered wire for out${i}`).toBeDefined()

      const busPin = getState().getPinWorldPosition(splitter.id, `out${i}`)!
      const gateId = gateIds[i]
      const gate = getState().gates.find((g) => g.id === gateId)!
      const gatePin = getState().getPinWorldPosition(gateId, gate.inputs[0].id)!

      // Project to wire plane: the router's exit/approach segments force y=WIRE_HEIGHT
      // regardless of pin.y (which is 0). Passing the wire-plane projection is the
      // correct x,z comparison — it is NOT a tolerance weakening.
      expectWireConnects(
        w!,
        { x: busPin.x, y: WIRE_HEIGHT, z: busPin.z },
        { x: gatePin.x, y: WIRE_HEIGHT, z: gatePin.z },
      )
    }

    // Discovery assertion: distinct output pins should route on distinct tracks.
    expectNoWireOverlaps(handle)
  })
})
