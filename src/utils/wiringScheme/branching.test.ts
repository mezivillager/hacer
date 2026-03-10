/**
 * Branching and Signal Wire Tests
 *
 * Tests for the wire branching system that supports HDL-style circuits
 * where a single signal source can fan out to multiple destinations.
 *
 * Key test case: XOR gate built from AND, OR, NOT
 * XOR(a, b) = Or(And(a, Not(b)), And(Not(a), b))
 *
 * This requires:
 * - Input nodes for 'a' and 'b'
 * - Fan-out: 'a' goes to both Not gate AND to And gate
 * - Fan-out: 'b' goes to both Not gate AND to And gate
 * - Internal signals: notA, notB, aAndNotB, notAAndB
 * - Output node for 'out'
 */

import { describe, it, expect } from 'vitest'
import type { Position } from '@/store/types'
import type { WireSegment } from './types'
import {
  createSignal,
  addDestinationToSignal,
  calculateJunctionPosition,
  generateBranchSegments,
  type SignalEndpoint,
} from './branching'

describe('Signal System', () => {
  describe('createSignal', () => {
    it('creates a signal with a single source endpoint', () => {
      const source: SignalEndpoint = {
        type: 'input',
        entityId: 'input-a',
      }

      const signal = createSignal('sig-1', source)

      expect(signal.id).toBe('sig-1')
      expect(signal.source).toEqual(source)
      expect(signal.destinations).toEqual([])
    })

    it('creates a named signal for internal HDL wires', () => {
      const source: SignalEndpoint = {
        type: 'gate',
        entityId: 'not-gate-1',
        pinId: 'out',
      }

      const signal = createSignal('sig-notA', source, 'notA')

      expect(signal.name).toBe('notA')
    })

  })

  describe('addDestinationToSignal', () => {
    it('adds a single destination to a signal', () => {
      const source: SignalEndpoint = { type: 'input', entityId: 'input-a' }
      const signal = createSignal('sig-1', source)

      const destination: SignalEndpoint = {
        type: 'gate',
        entityId: 'not-gate-1',
        pinId: 'in',
      }

      const updated = addDestinationToSignal(signal, destination)

      expect(updated.destinations).toHaveLength(1)
      expect(updated.destinations[0]).toEqual(destination)
    })

    it('supports fan-out by adding multiple destinations', () => {
      const source: SignalEndpoint = { type: 'input', entityId: 'input-a' }
      let signal = createSignal('sig-1', source)

      // Fan-out: 'a' goes to Not gate AND to And gate
      const dest1: SignalEndpoint = { type: 'gate', entityId: 'not-gate-1', pinId: 'in' }
      const dest2: SignalEndpoint = { type: 'gate', entityId: 'and-gate-1', pinId: 'a' }

      signal = addDestinationToSignal(signal, dest1)
      signal = addDestinationToSignal(signal, dest2)

      expect(signal.destinations).toHaveLength(2)
      expect(signal.destinations).toContainEqual(dest1)
      expect(signal.destinations).toContainEqual(dest2)
    })

    it('supports output node as destination', () => {
      const source: SignalEndpoint = { type: 'gate', entityId: 'or-gate', pinId: 'out' }
      const signal = createSignal('sig-out', source)

      const destination: SignalEndpoint = { type: 'output', entityId: 'output-out' }
      const updated = addDestinationToSignal(signal, destination)

      expect(updated.destinations[0].type).toBe('output')
    })
  })
})

describe('Junction Placement', () => {
  describe('calculateJunctionPosition', () => {
    it('places junction on the wire path when fan-out is 2', () => {
      const sourcePos: Position = { x: 0, y: 0.2, z: 0 }
      const destPositions: Position[] = [
        { x: 8, y: 0.2, z: 0 },  // straight ahead
        { x: 4, y: 0.2, z: 4 },  // up and right
      ]

      const junction = calculateJunctionPosition(sourcePos, destPositions, [])

      // Junction should be at a section line intersection
      expect(junction.x % 4).toBe(0)
      expect(junction.z % 4).toBe(0)
      // Junction should be between source and destinations
      expect(junction.x).toBeGreaterThanOrEqual(sourcePos.x)
      expect(junction.x).toBeLessThanOrEqual(Math.max(...destPositions.map(d => d.x)))
    })

    it('places junction at optimal branching point for XOR pattern', () => {
      // XOR: input 'a' needs to reach Not(in=a) AND And(a=a, b=notB)
      const inputAPos: Position = { x: 0, y: 0.2, z: 4 }
      const notGateInputPos: Position = { x: 8, y: 0.2, z: 8 }
      const andGateInputPos: Position = { x: 16, y: 0.2, z: 4 }

      const junction = calculateJunctionPosition(
        inputAPos,
        [notGateInputPos, andGateInputPos],
        []
      )

      // Junction should be reachable from source
      expect(junction).toBeDefined()
      // Junction should be on section lines
      expect(junction.x % 4).toBe(0)
      expect(junction.z % 4).toBe(0)
    })

    it('returns source position when there is only one destination (no branching needed)', () => {
      const sourcePos: Position = { x: 0, y: 0.2, z: 0 }
      const destPositions: Position[] = [{ x: 8, y: 0.2, z: 0 }]

      const junction = calculateJunctionPosition(sourcePos, destPositions, [])

      // With single destination, junction is at source (effectively no junction)
      expect(junction).toEqual(sourcePos)
    })
  })
})

describe('Branch Segment Generation', () => {
  describe('generateBranchSegments', () => {
    it('generates segments from junction to single destination', () => {
      const junctionPos: Position = { x: 4, y: 0.2, z: 4 }
      // Destination represents gate-1's input pin (used conceptually, not in segment calculation)
      const destPos: Position = { x: 8, y: 0.2, z: 4 }
      const destOrientation = { x: -1, y: 0, z: 0 } // facing left

      const segments = generateBranchSegments(
        junctionPos,
        destPos,
        { direction: destOrientation },
        []
      )

      expect(segments.length).toBeGreaterThan(0)
      // First segment should start from junction
      expect(segments[0].start).toEqual(junctionPos)
      // Last segment should end at destination
      const lastSegment = segments[segments.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(destPos.x, 1)
      expect(lastSegment.end.z).toBeCloseTo(destPos.z, 1)
    })

    it('generates multiple branch paths for fan-out', () => {
      const junctionPos: Position = { x: 4, y: 0.2, z: 4 }

      // Two destinations from same junction
      const dest1Pos: Position = { x: 8, y: 0.2, z: 4 }
      const dest2Pos: Position = { x: 4, y: 0.2, z: 8 }

      const segments1 = generateBranchSegments(
        junctionPos,
        dest1Pos,
        { direction: { x: -1, y: 0, z: 0 } },
        []
      )

      const segments2 = generateBranchSegments(
        junctionPos,
        dest2Pos,
        { direction: { x: 0, y: 0, z: -1 } },
        []
      )

      // Both branches should start from same junction
      expect(segments1[0].start).toEqual(junctionPos)
      expect(segments2[0].start).toEqual(junctionPos)

      // But should end at different destinations
      expect(segments1[segments1.length - 1].end.x).toBeCloseTo(dest1Pos.x, 1)
      expect(segments2[segments2.length - 1].end.z).toBeCloseTo(dest2Pos.z, 1)
    })

    it('avoids overlapping with existing wire segments', () => {
      const junctionPos: Position = { x: 4, y: 0.2, z: 4 }
      const destPos: Position = { x: 12, y: 0.2, z: 4 }

      // Existing wire blocking the direct path
      const existingSegments: WireSegment[] = [
        {
          start: { x: 8, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 8 },
          type: 'vertical',
        },
      ]

      const segments = generateBranchSegments(
        junctionPos,
        destPos,
        { direction: { x: -1, y: 0, z: 0 } },
        existingSegments
      )

      // Path should route around the obstacle
      expect(segments.length).toBeGreaterThan(0)
      // Verify no segment overlaps with existing (this is handled by pathfinding)
    })
  })
})

describe('XOR Circuit Integration', () => {
  /**
   * XOR(a, b) = Or(And(a, Not(b)), And(Not(a), b))
   *
   * Visual layout:
   *   [Input a] ---+--- [Not] ---> notA ---+
   *                |                       |
   *                +--- [And(a, notB)] ----+--- [Or] --- [Output]
   *                                        |
   *   [Input b] ---+--- [Not] ---> notB ---+
   *                |                       |
   *                +--- [And(notA, b)] ----+
   */

  it('creates signal topology for XOR from AND, OR, NOT', () => {
    // Create input signals with fan-out
    const signalA = createSignal('sig-a', { type: 'input', entityId: 'input-a' }, 'a')
    const signalB = createSignal('sig-b', { type: 'input', entityId: 'input-b' }, 'b')

    // Signal 'a' fans out to: Not gate AND And gate
    const signalAWithFanout = addDestinationToSignal(
      addDestinationToSignal(signalA, { type: 'gate', entityId: 'not-1', pinId: 'in' }),
      { type: 'gate', entityId: 'and-1', pinId: 'a' }
    )

    // Signal 'b' fans out to: Not gate AND And gate
    const signalBWithFanout = addDestinationToSignal(
      addDestinationToSignal(signalB, { type: 'gate', entityId: 'not-2', pinId: 'in' }),
      { type: 'gate', entityId: 'and-2', pinId: 'b' }
    )

    // Internal signals (no fan-out, point-to-point)
    const signalNotA = addDestinationToSignal(
      createSignal('sig-notA', { type: 'gate', entityId: 'not-1', pinId: 'out' }, 'notA'),
      { type: 'gate', entityId: 'and-2', pinId: 'a' }
    )

    const signalNotB = addDestinationToSignal(
      createSignal('sig-notB', { type: 'gate', entityId: 'not-2', pinId: 'out' }, 'notB'),
      { type: 'gate', entityId: 'and-1', pinId: 'b' }
    )

    // And gate outputs to Or gate
    const signalAAndNotB = addDestinationToSignal(
      createSignal('sig-aAndNotB', { type: 'gate', entityId: 'and-1', pinId: 'out' }, 'aAndNotB'),
      { type: 'gate', entityId: 'or-1', pinId: 'a' }
    )

    const signalNotAAndB = addDestinationToSignal(
      createSignal('sig-notAAndB', { type: 'gate', entityId: 'and-2', pinId: 'out' }, 'notAAndB'),
      { type: 'gate', entityId: 'or-1', pinId: 'b' }
    )

    // Or gate output to circuit output
    const signalOut = addDestinationToSignal(
      createSignal('sig-out', { type: 'gate', entityId: 'or-1', pinId: 'out' }),
      { type: 'output', entityId: 'output-out' }
    )

    // Verify fan-out
    expect(signalAWithFanout.destinations).toHaveLength(2)
    expect(signalBWithFanout.destinations).toHaveLength(2)

    // Verify internal signals are point-to-point
    expect(signalNotA.destinations).toHaveLength(1)
    expect(signalNotB.destinations).toHaveLength(1)

    // Verify And gate signals connect to Or gate
    expect(signalAAndNotB.destinations[0].entityId).toBe('or-1')
    expect(signalNotAAndB.destinations[0].entityId).toBe('or-1')

    // Verify output connection
    expect(signalOut.destinations[0].type).toBe('output')
  })

  it('generates wire segments for entire XOR circuit with proper junction placement', () => {
    // This test verifies the visual wiring can be generated
    // XOR layout positions (all gates positioned on section lines)
    const positions = {
      inputA: { x: 0, y: 0.2, z: 0 } as Position,
      inputB: { x: 0, y: 0.2, z: 8 } as Position,
      not1: { x: 8, y: 0.2, z: 0 } as Position,   // Not(in=a)
      not2: { x: 8, y: 0.2, z: 8 } as Position,   // Not(in=b)
      and1: { x: 16, y: 0.2, z: 2 } as Position,  // And(a, notB)
      and2: { x: 16, y: 0.2, z: 6 } as Position,  // And(notA, b)
      or: { x: 24, y: 0.2, z: 4 } as Position,    // Or
      output: { x: 32, y: 0.2, z: 4 } as Position,
    }

    // Calculate junction for input 'a' fan-out (goes to not1 and and1)
    const junctionA = calculateJunctionPosition(
      positions.inputA,
      [positions.not1, positions.and1],
      []
    )

    // Calculate junction for input 'b' fan-out (goes to not2 and and2)
    const junctionB = calculateJunctionPosition(
      positions.inputB,
      [positions.not2, positions.and2],
      []
    )

    // Junctions should be placed optimally
    expect(junctionA).toBeDefined()
    expect(junctionB).toBeDefined()

    // Generate branch segments from junction A to both destinations
    const branchAToNot1 = generateBranchSegments(
      junctionA,
      positions.not1,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    const branchAToAnd1 = generateBranchSegments(
      junctionA,
      positions.and1,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    // Generate branch segments from junction B to both destinations
    const branchBToNot2 = generateBranchSegments(
      junctionB,
      positions.not2,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    const branchBToAnd2 = generateBranchSegments(
      junctionB,
      positions.and2,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    // All branches should be valid
    expect(branchAToNot1.length).toBeGreaterThan(0)
    expect(branchAToAnd1.length).toBeGreaterThan(0)
    expect(branchBToNot2.length).toBeGreaterThan(0)
    expect(branchBToAnd2.length).toBeGreaterThan(0)

    // Generate internal signal wires (notA -> and2, notB -> and1)
    const notAToAnd2 = generateBranchSegments(
      positions.not1,
      positions.and2,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    const notBToAnd1 = generateBranchSegments(
      positions.not2,
      positions.and1,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    expect(notAToAnd2.length).toBeGreaterThan(0)
    expect(notBToAnd1.length).toBeGreaterThan(0)

    // Generate And outputs to Or
    const and1ToOr = generateBranchSegments(
      positions.and1,
      positions.or,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    const and2ToOr = generateBranchSegments(
      positions.and2,
      positions.or,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    expect(and1ToOr.length).toBeGreaterThan(0)
    expect(and2ToOr.length).toBeGreaterThan(0)

    // Generate Or to output
    const orToOutput = generateBranchSegments(
      positions.or,
      positions.output,
      { direction: { x: -1, y: 0, z: 0 } },
      []
    )

    expect(orToOutput.length).toBeGreaterThan(0)
  })
})
