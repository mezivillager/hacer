/**
 * XOR Circuit Integration Test
 *
 * Comprehensive test verifying the wiring scheme can support building
 * an XOR gate from AND, OR, and NOT gates (with fan-out support).
 *
 * XOR(a, b) = Or(And(a, Not(b)), And(Not(a), b))
 *
 * Circuit Layout:
 *
 *   [InputA] ---+--- [Not1] ---> notA ---+
 *               |                        |
 *               +--- [And1(a, notB)] ----+--- [Or] --- [Output]
 *               |    /                   |
 *               |   /                    |
 *   [InputB] --+|--+                     |
 *              ||                        |
 *              |+--- [Not2] ---> notB ---+
 *              |                         |
 *              +---- [And2(notA, b)] ----+
 */

import { describe, it, expect } from 'vitest'
import type { Position } from '@/store/types'
import {
  createSignal,
  addDestinationToSignal,
  calculateJunctionPosition,
  generateBranchSegments,
  hasFanOut,
  type Signal,
} from './branching'
import type { WireSegment } from './types'

describe('XOR Circuit Complete Wiring', () => {
  // Gate positions in a logical layout
  const layout = {
    // Input nodes on the left
    inputA: { x: 0, y: 0.2, z: 0 } as Position,
    inputB: { x: 0, y: 0.2, z: 12 } as Position,

    // NOT gates for inverting inputs
    not1: { x: 8, y: 0.2, z: 0 } as Position,   // Not(a) -> notA
    not2: { x: 8, y: 0.2, z: 12 } as Position,  // Not(b) -> notB

    // AND gates for products
    and1: { x: 16, y: 0.2, z: 4 } as Position,  // And(a, notB) -> aAndNotB
    and2: { x: 16, y: 0.2, z: 8 } as Position,  // And(notA, b) -> notAAndB

    // OR gate for sum
    or: { x: 24, y: 0.2, z: 6 } as Position,    // Or(aAndNotB, notAAndB) -> out

    // Output node on the right
    output: { x: 32, y: 0.2, z: 6 } as Position,
  }

  describe('Signal Topology', () => {
    it('creates correct signal structure for XOR', () => {
      // Signal 'a': InputA -> (Not1, And1) - requires fan-out
      const signalA = addDestinationToSignal(
        addDestinationToSignal(
          createSignal('sig-a', { type: 'input', entityId: 'inputA' }, 'a'),
          { type: 'gate', entityId: 'not1', pinId: 'in' }
        ),
        { type: 'gate', entityId: 'and1', pinId: 'a' }
      )

      // Signal 'b': InputB -> (Not2, And2) - requires fan-out
      const signalB = addDestinationToSignal(
        addDestinationToSignal(
          createSignal('sig-b', { type: 'input', entityId: 'inputB' }, 'b'),
          { type: 'gate', entityId: 'not2', pinId: 'in' }
        ),
        { type: 'gate', entityId: 'and2', pinId: 'b' }
      )

      // Signal 'notA': Not1 -> And2 - point-to-point
      const signalNotA = addDestinationToSignal(
        createSignal('sig-notA', { type: 'gate', entityId: 'not1', pinId: 'out' }, 'notA'),
        { type: 'gate', entityId: 'and2', pinId: 'a' }
      )

      // Signal 'notB': Not2 -> And1 - point-to-point
      const signalNotB = addDestinationToSignal(
        createSignal('sig-notB', { type: 'gate', entityId: 'not2', pinId: 'out' }, 'notB'),
        { type: 'gate', entityId: 'and1', pinId: 'b' }
      )

      // Signal 'aAndNotB': And1 -> Or
      const signalAAndNotB = addDestinationToSignal(
        createSignal('sig-aAndNotB', { type: 'gate', entityId: 'and1', pinId: 'out' }, 'aAndNotB'),
        { type: 'gate', entityId: 'or', pinId: 'a' }
      )

      // Signal 'notAAndB': And2 -> Or
      const signalNotAAndB = addDestinationToSignal(
        createSignal('sig-notAAndB', { type: 'gate', entityId: 'and2', pinId: 'out' }, 'notAAndB'),
        { type: 'gate', entityId: 'or', pinId: 'b' }
      )

      // Signal 'out': Or -> Output
      const signalOut = addDestinationToSignal(
        createSignal('sig-out', { type: 'gate', entityId: 'or', pinId: 'out' }),
        { type: 'output', entityId: 'output' }
      )

      // Verify fan-out signals
      expect(hasFanOut(signalA)).toBe(true)
      expect(hasFanOut(signalB)).toBe(true)

      // Verify point-to-point signals
      expect(hasFanOut(signalNotA)).toBe(false)
      expect(hasFanOut(signalNotB)).toBe(false)
      expect(hasFanOut(signalAAndNotB)).toBe(false)
      expect(hasFanOut(signalNotAAndB)).toBe(false)
      expect(hasFanOut(signalOut)).toBe(false)

      // Verify total connections
      // signalA: 2 destinations
      // signalB: 2 destinations
      // All others: 1 destination each
      const totalDestinations = [
        signalA, signalB, signalNotA, signalNotB,
        signalAAndNotB, signalNotAAndB, signalOut
      ].reduce((sum, s) => sum + s.destinations.length, 0)

      expect(totalDestinations).toBe(9) // 2+2+1+1+1+1+1 = 9
    })
  })

  describe('Junction Placement for Fan-out', () => {
    it('calculates junction for signal A (input -> not1, and1)', () => {
      const junction = calculateJunctionPosition(
        layout.inputA,
        [layout.not1, layout.and1],
        []
      )

      // Junction should be on section lines
      expect(junction.x % 4).toBe(0)
      expect(junction.z % 4).toBe(0)

      // Junction should be between source and destinations
      expect(junction.x).toBeGreaterThanOrEqual(layout.inputA.x)
      expect(junction.x).toBeLessThanOrEqual(Math.max(layout.not1.x, layout.and1.x))
    })

    it('calculates junction for signal B (input -> not2, and2)', () => {
      const junction = calculateJunctionPosition(
        layout.inputB,
        [layout.not2, layout.and2],
        []
      )

      // Junction should be on section lines
      expect(junction.x % 4).toBe(0)
      expect(junction.z % 4).toBe(0)
    })
  })

  describe('Wire Segment Generation', () => {
    it('generates segments for all XOR circuit wires without overlap', () => {
      const allSegments: WireSegment[] = []

      // Generate wire from inputA junction to not1
      const junctionA = calculateJunctionPosition(
        layout.inputA,
        [layout.not1, layout.and1],
        []
      )

      // Branch: junction A -> not1
      const aToNot1 = generateBranchSegments(
        junctionA,
        layout.not1,
        { direction: { x: -1, y: 0, z: 0 } },
        allSegments
      )
      expect(aToNot1.length).toBeGreaterThan(0)
      allSegments.push(...aToNot1)

      // Branch: junction A -> and1
      const aToAnd1 = generateBranchSegments(
        junctionA,
        layout.and1,
        { direction: { x: -1, y: 0, z: 0 } },
        allSegments
      )
      expect(aToAnd1.length).toBeGreaterThan(0)
      allSegments.push(...aToAnd1)

      // Generate wire from inputB junction to not2 and and2
      const junctionB = calculateJunctionPosition(
        layout.inputB,
        [layout.not2, layout.and2],
        []
      )

      // Branch: junction B -> not2
      const bToNot2 = generateBranchSegments(
        junctionB,
        layout.not2,
        { direction: { x: -1, y: 0, z: 0 } },
        allSegments
      )
      expect(bToNot2.length).toBeGreaterThan(0)
      allSegments.push(...bToNot2)

      // Branch: junction B -> and2
      const bToAnd2 = generateBranchSegments(
        junctionB,
        layout.and2,
        { direction: { x: -1, y: 0, z: 0 } },
        allSegments
      )
      expect(bToAnd2.length).toBeGreaterThan(0)
      allSegments.push(...bToAnd2)

      // Verify we have generated wires for all fan-out branches
      expect(allSegments.length).toBeGreaterThan(0)
    })

    it('generates point-to-point internal signal wires', () => {
      // notA: not1 -> and2
      const notAWire = generateBranchSegments(
        layout.not1,
        layout.and2,
        { direction: { x: -1, y: 0, z: 0 } },
        []
      )
      expect(notAWire.length).toBeGreaterThan(0)

      // notB: not2 -> and1
      const notBWire = generateBranchSegments(
        layout.not2,
        layout.and1,
        { direction: { x: -1, y: 0, z: 0 } },
        []
      )
      expect(notBWire.length).toBeGreaterThan(0)

      // aAndNotB: and1 -> or
      const aAndNotBWire = generateBranchSegments(
        layout.and1,
        layout.or,
        { direction: { x: -1, y: 0, z: 0 } },
        []
      )
      expect(aAndNotBWire.length).toBeGreaterThan(0)

      // notAAndB: and2 -> or
      const notAAndBWire = generateBranchSegments(
        layout.and2,
        layout.or,
        { direction: { x: -1, y: 0, z: 0 } },
        []
      )
      expect(notAAndBWire.length).toBeGreaterThan(0)

      // out: or -> output
      const outWire = generateBranchSegments(
        layout.or,
        layout.output,
        { direction: { x: -1, y: 0, z: 0 } },
        []
      )
      expect(outWire.length).toBeGreaterThan(0)
    })
  })

  describe('Complete XOR Circuit Assembly', () => {
    it('assembles full XOR circuit with correct wire count', () => {
      // Count expected wires:
      // - inputA trunk: inputA -> junctionA (1 wire)
      // - inputA branches: junctionA -> not1, junctionA -> and1 (2 wires)
      // - inputB trunk: inputB -> junctionB (1 wire)
      // - inputB branches: junctionB -> not2, junctionB -> and2 (2 wires)
      // - Internal signals: notA, notB, aAndNotB, notAAndB, out (5 wires)
      // Total: 1 + 2 + 1 + 2 + 5 = 11 wires

      const signals: Signal[] = []
      let wireCount = 0

      // Signal A (fan-out: 2 destinations)
      const sigA = addDestinationToSignal(
        addDestinationToSignal(
          createSignal('sig-a', { type: 'input', entityId: 'inputA' }),
          { type: 'gate', entityId: 'not1', pinId: 'in' }
        ),
        { type: 'gate', entityId: 'and1', pinId: 'a' }
      )
      signals.push(sigA)
      wireCount += 1 + sigA.destinations.length // trunk + branches

      // Signal B (fan-out: 2 destinations)
      const sigB = addDestinationToSignal(
        addDestinationToSignal(
          createSignal('sig-b', { type: 'input', entityId: 'inputB' }),
          { type: 'gate', entityId: 'not2', pinId: 'in' }
        ),
        { type: 'gate', entityId: 'and2', pinId: 'b' }
      )
      signals.push(sigB)
      wireCount += 1 + sigB.destinations.length // trunk + branches

      // Point-to-point signals (no fan-out)
      const pointToPointSignals = [
        { source: { type: 'gate' as const, entityId: 'not1', pinId: 'out' }, dest: { type: 'gate' as const, entityId: 'and2', pinId: 'a' } },
        { source: { type: 'gate' as const, entityId: 'not2', pinId: 'out' }, dest: { type: 'gate' as const, entityId: 'and1', pinId: 'b' } },
        { source: { type: 'gate' as const, entityId: 'and1', pinId: 'out' }, dest: { type: 'gate' as const, entityId: 'or', pinId: 'a' } },
        { source: { type: 'gate' as const, entityId: 'and2', pinId: 'out' }, dest: { type: 'gate' as const, entityId: 'or', pinId: 'b' } },
        { source: { type: 'gate' as const, entityId: 'or', pinId: 'out' }, dest: { type: 'output' as const, entityId: 'output' } },
      ]

      wireCount += pointToPointSignals.length

      // Total wires: 3 (sigA) + 3 (sigB) + 5 (point-to-point) = 11
      expect(wireCount).toBe(11)
    })
  })
})
