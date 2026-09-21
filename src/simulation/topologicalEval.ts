import { clampToWidth } from './busOps'
import { evaluateSplitter, evaluateJoiner } from './busLogic'
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'
import { evaluateChipWithCtx, DEFAULT_MAX_DEPTH } from '@/core/chips/evaluateChip'
import { combineRegistries } from '@/core/chips/combineRegistries'
import type { CircuitDocument, Pin, Wire, WireEndpoint } from '@/store/types'

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
  state: CircuitDocument,
  visited: Set<string> = new Set()
): string | null {
  switch (endpoint.type) {
    case 'gate':
      return endpoint.entityId
    case 'bus':
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
export function topologicalSort(state: CircuitDocument): TopologicalResult {
  const nodeIds = [
    ...state.gates.map((g) => g.id),
    ...state.busComponents.map((c) => c.id),
  ]
  if (nodeIds.length === 0) {
    return { type: 'success', order: [] }
  }

  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const id of nodeIds) {
    adjacency.set(id, [])
    inDegree.set(id, 0)
  }

  for (const wire of state.wires) {
    if (wire.to.type !== 'gate' && wire.to.type !== 'bus') continue

    const destId = wire.to.entityId
    if (!inDegree.has(destId)) continue

    const sourceId = resolveSourceGateId(wire.from, state)
    if (sourceId === null || !inDegree.has(sourceId)) continue

    adjacency.get(sourceId)!.push(destId)
    inDegree.set(destId, inDegree.get(destId)! + 1)
  }

  // Kahn's BFS — use a queue index instead of shift() to stay O(V+E)
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const order: string[] = []
  let queueIdx = 0
  while (queueIdx < queue.length) {
    const current = queue[queueIdx++]
    order.push(current)

    for (const neighbor of adjacency.get(current)!) {
      const newDegree = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (order.length < nodeIds.length) {
    const orderedSet = new Set(order)
    const involvedGateIds = nodeIds.filter((id) => !orderedSet.has(id))
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
  state: CircuitDocument,
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
    case 'bus': {
      const component = state.busComponents.find((c) => c.id === from.entityId)
      const outputPin = component?.outputs.find((p) => p.id === from.pinId)
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

function destinationWidth(wire: Wire, state: CircuitDocument): number {
  let endpointWidth: number
  switch (wire.to.type) {
    case 'output': {
      const node = state.outputNodes.find((n) => n.id === wire.to.entityId)
      endpointWidth = node?.width ?? 1
      break
    }
    case 'gate': {
      const gate = state.gates.find((g) => g.id === wire.to.entityId)
      const pin = gate?.inputs.find((p) => p.id === wire.to.pinId)
      endpointWidth = pin?.width ?? 1
      break
    }
    case 'bus': {
      const component = state.busComponents.find((c) => c.id === wire.to.entityId)
      const pin = component?.inputs.find((p) => p.id === wire.to.pinId)
      endpointWidth = pin?.width ?? 1
      break
    }
    default:
      endpointWidth = 1
  }
  const wireWidth = wire.width ?? 1
  return Math.min(wireWidth, endpointWidth)
}

/**
 * Clears every input pin of `entity` that no wire currently drives.
 *
 * A pin's value belongs to its driver. Only the loop below writes input pins,
 * and only for pins a wire reaches — so without this a pin whose wire was
 * removed would keep whatever that wire last wrote and the chip would go on
 * evaluating a signal that is no longer connected (B-008). A pin with no
 * incoming wire is floating, and HACER reads floating as `0`: the value
 * {@link getSignalSourceValue} already returns for a missing source, and the
 * value a save/reload produces (gate pin values are not serialised).
 *
 * Stated here rather than in each caller so every entry point to evaluation —
 * the live store tick, the truth table, a deserialised document — inherits it.
 *
 * @param entity - Gate or bus component whose input pins are being reconciled
 * @param incoming - Wires whose destination is this entity, or `undefined` for none
 */
function clearUndrivenInputs(entity: { inputs: Pin[] }, incoming: Wire[] | undefined): void {
  const driven = new Set(incoming?.map((w) => w.to.pinId))
  for (const pin of entity.inputs) {
    if (!driven.has(pin.id)) pin.value = 0
  }
}

/**
 * Evaluates all gates in topological order in one pass, then drives output nodes.
 * Mutates the Immer draft in place when the result {@link EvaluateCircuitResult} has `status: 'ok'`.
 * On a combinational cycle, returns without mutating gate or output values.
 *
 * @param state - Circuit document (typically an Immer draft from Zustand, or a scratch copy)
 * @returns Whether evaluation ran, or cycle metadata if the graph has feedback
 */
export function evaluateCircuit(state: CircuitDocument): EvaluateCircuitResult {
  const result = topologicalSort(state)
  if (result.type === 'cycle') {
    return { status: 'cycle', involvedGateIds: result.involvedGateIds }
  }

  // Pre-index for O(gates + wires) evaluation instead of O(gates × wires)
  const gateById = new Map(state.gates.map((g) => [g.id, g]))
  const wiresByDestGate = new Map<string, typeof state.wires>()
  for (const wire of state.wires) {
    if (wire.to.type === 'gate' && wire.to.pinId) {
      let bucket = wiresByDestGate.get(wire.to.entityId)
      if (!bucket) {
        bucket = []
        wiresByDestGate.set(wire.to.entityId, bucket)
      }
      bucket.push(wire)
    }
  }

  const busById = new Map(state.busComponents.map((c) => [c.id, c]))
  const wiresByDestBus = new Map<string, typeof state.wires>()
  for (const wire of state.wires) {
    if (wire.to.type === 'bus' && wire.to.pinId) {
      let bucket = wiresByDestBus.get(wire.to.entityId)
      if (!bucket) {
        bucket = []
        wiresByDestBus.set(wire.to.entityId, bucket)
      }
      bucket.push(wire)
    }
  }

  const resolver = combineRegistries(getBuiltinChipRegistry(), getUserChipRegistry())

  for (const gateId of result.order) {
    const busComponent = busById.get(gateId)
    if (busComponent) {
      const incoming = wiresByDestBus.get(gateId)
      clearUndrivenInputs(busComponent, incoming)
      if (incoming) {
        for (const wire of incoming) {
          const inputPin = busComponent.inputs.find((p) => p.id === wire.to.pinId)
          if (inputPin) {
            const raw = getSignalSourceValue(wire.from, state)
            inputPin.value = clampToWidth(raw, destinationWidth(wire, state))
          }
        }
      }
      if (busComponent.kind === 'splitter') {
        const bits = evaluateSplitter(busComponent.inputs[0]?.value ?? 0, busComponent.width)
        busComponent.outputs.forEach((pin, i) => {
          pin.value = bits[i] ?? 0
        })
      } else {
        const inValues = busComponent.inputs.map((p) => p.value)
        busComponent.outputs[0].value = clampToWidth(evaluateJoiner(inValues), busComponent.width)
      }
      continue
    }

    const gate = gateById.get(gateId)
    if (!gate) continue

    const incomingWires = wiresByDestGate.get(gateId)
    clearUndrivenInputs(gate, incomingWires)
    if (incomingWires) {
      for (const wire of incomingWires) {
        const inputPin = gate.inputs.find((p) => p.id === wire.to.pinId)
        if (inputPin) {
          const raw = getSignalSourceValue(wire.from, state)
          inputPin.value = clampToWidth(raw, destinationWidth(wire, state))
        }
      }
    }

    const chip = resolver.get(gate.chipName)
    if (!chip) {
      // Unknown chip — skip evaluation.
      continue
    }

    const inputsByName: Record<string, number> = {}
    for (const inputPin of gate.inputs) {
      inputsByName[inputPin.name] = inputPin.value
    }
    let outputs: Record<string, number>
    try {
      outputs = evaluateChipWithCtx(chip, inputsByName, {
        registry: resolver,
        depth: 0,
        maxDepth: DEFAULT_MAX_DEPTH,
        evalChip: evaluateChipWithCtx,
      })
    } catch {
      // Compile/eval failure for this chip — skip it; combinational result for the
      // rest of the circuit is still produced. (Surfacing per-chip compile errors to
      // the UI is a follow-up; see spec error model.)
      continue
    }
    for (const outputPin of gate.outputs) {
      const newValue = outputs[outputPin.name]
      if (typeof newValue === 'number') {
        outputPin.value = clampToWidth(newValue, outputPin.width ?? 1)
      }
    }
  }

  for (const wire of state.wires) {
    if (wire.to.type === 'output') {
      const outputNode = state.outputNodes.find((n) => n.id === wire.to.entityId)
      if (outputNode) {
        const raw = getSignalSourceValue(wire.from, state)
        outputNode.value = clampToWidth(raw, destinationWidth(wire, state))
      }
    }
  }

  return { status: 'ok' }
}
