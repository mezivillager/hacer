import { gateLogic } from './gateLogic'
import type { CircuitState, WireEndpoint } from '@/store/types'

/**
 * Result of {@link topologicalSort}: a gate evaluation order, or cycle involvement.
 */
export type TopologicalResult =
  | { type: 'success'; order: string[] }
  | { type: 'cycle'; involvedGateIds: string[] }

/**
 * Outcome of {@link evaluateCircuit}: either evaluation ran or a combinational cycle blocked it.
 */
export type EvaluateCircuitResult =
  | { status: 'ok' }
  | { status: 'cycle'; involvedGateIds: string[] }

/**
 * Traces through junctions to find the actual source gate ID.
 *
 * @param endpoint - Wire endpoint to resolve from
 * @param state - Current circuit state
 * @param visited - Junction IDs already visited (cycle guard)
 * @returns The driving gate's `entityId`, or `null` if the source is an input/output node or unresolved
 */
function resolveSourceGateId(
  endpoint: WireEndpoint,
  state: CircuitState,
  visited: Set<string> = new Set()
): string | null {
  switch (endpoint.type) {
    case 'gate':
      return endpoint.entityId
    case 'input':
    case 'output':
      return null
    case 'junction': {
      if (visited.has(endpoint.entityId)) return null
      visited.add(endpoint.entityId)

      const junction = state.junctions.find((j) => j.id === endpoint.entityId)
      if (junction && junction.wireIds.length > 0) {
        const originalWire = state.wires.find((w) => w.id === junction.wireIds[0])
        if (originalWire) {
          return resolveSourceGateId(originalWire.from, state, visited)
        }
      }
      return null
    }
    default:
      return null
  }
}

/**
 * Topological order of gates for combinational evaluation (Kahn's algorithm).
 * Junctions are not nodes; they are traced through to find driving gates.
 *
 * @param state - Circuit snapshot or Immer draft
 * @returns Ordered gate IDs, or a cycle with the gates that could not be scheduled
 */
export function topologicalSort(state: CircuitState): TopologicalResult {
  const gateIds = state.gates.map((g) => g.id)
  if (gateIds.length === 0) {
    return { type: 'success', order: [] }
  }

  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const id of gateIds) {
    adjacency.set(id, [])
    inDegree.set(id, 0)
  }

  for (const wire of state.wires) {
    if (wire.to.type !== 'gate') continue

    const destGateId = wire.to.entityId
    if (!inDegree.has(destGateId)) continue

    const sourceGateId = resolveSourceGateId(wire.from, state)
    if (sourceGateId === null || !inDegree.has(sourceGateId)) continue
    if (sourceGateId === destGateId) continue

    adjacency.get(sourceGateId)!.push(destGateId)
    inDegree.set(destGateId, inDegree.get(destGateId)! + 1)
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const order: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    order.push(current)

    for (const neighbor of adjacency.get(current)!) {
      const newDegree = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (order.length < gateIds.length) {
    const involvedGateIds = gateIds.filter((id) => !order.includes(id))
    return { type: 'cycle', involvedGateIds }
  }

  return { type: 'success', order }
}

/**
 * Numeric signal at a wire's source endpoint (for propagation and rendering).
 *
 * Includes cycle detection so malformed junction loops cannot recurse infinitely.
 *
 * @param from - Source endpoint of the wire
 * @param state - Current circuit state
 * @param visited - Internal: junction IDs already visited
 * @returns Signal value; `0` if missing, invalid, or cyclic
 *
 * @example
 * ```ts
 * const v = getSignalSourceValue(
 *   { type: 'input', entityId: inputNodeId },
 *   circuitState
 * )
 * ```
 */
export function getSignalSourceValue(
  from: WireEndpoint,
  state: CircuitState,
  visited: Set<string> = new Set()
): number {
  switch (from.type) {
    case 'input': {
      const inputNode = state.inputNodes.find((n) => n.id === from.entityId)
      return inputNode?.value ?? 0
    }
    case 'gate': {
      const gate = state.gates.find((g) => g.id === from.entityId)
      const outputPin = gate?.outputs.find((p) => p.id === from.pinId)
      return outputPin?.value ?? 0
    }
    case 'junction': {
      if (visited.has(from.entityId)) {
        return 0
      }
      visited.add(from.entityId)

      const junction = state.junctions.find((j) => j.id === from.entityId)
      if (junction && junction.wireIds.length > 0) {
        const originalWire = state.wires.find((w) => w.id === junction.wireIds[0])
        if (originalWire) {
          return getSignalSourceValue(originalWire.from, state, visited)
        }
      }
      return 0
    }
    case 'output':
    default:
      return 0
  }
}

/**
 * Evaluates all gates in topological order in one pass, then drives output nodes.
 * Mutates the Immer draft in place when the result {@link EvaluateCircuitResult} has `status: 'ok'`.
 * On a combinational cycle, returns without mutating gate or output values.
 *
 * @param state - Circuit state (typically an Immer draft from Zustand)
 * @returns Whether evaluation ran, or cycle metadata if the graph has feedback
 */
export function evaluateCircuit(state: CircuitState): EvaluateCircuitResult {
  const result = topologicalSort(state)
  if (result.type === 'cycle') {
    return { status: 'cycle', involvedGateIds: result.involvedGateIds }
  }

  for (const gateId of result.order) {
    const gate = state.gates.find((g) => g.id === gateId)
    if (!gate) continue

    for (const wire of state.wires) {
      if (wire.to.type === 'gate' && wire.to.entityId === gateId && wire.to.pinId) {
        const inputPin = gate.inputs.find((p) => p.id === wire.to.pinId)
        if (inputPin) {
          inputPin.value = getSignalSourceValue(wire.from, state)
        }
      }
    }

    const inputValues = gate.inputs.map((p) => p.value)
    const logic = gateLogic[gate.type]
    if (logic) {
      const outputValue = logic(inputValues)
      for (const output of gate.outputs) {
        output.value = outputValue
      }
    }
  }

  for (const wire of state.wires) {
    if (wire.to.type === 'output') {
      const outputNode = state.outputNodes.find((n) => n.id === wire.to.entityId)
      if (outputNode) {
        outputNode.value = getSignalSourceValue(wire.from, state)
      }
    }
  }

  return { status: 'ok' }
}
