import { useCircuitStore } from '@/store/circuitStore'
import type { GateInstance, InputNode, OutputNode, Wire } from '@/store/types'

export type SelectedElement =
  | {
      kind: 'gate'
      id: string
      gateType: GateInstance['type']
      name: string
      position: GateInstance['position']
      rotation: GateInstance['rotation']
    }
  | { kind: 'wire'; id: string; from: Wire['from']; to: Wire['to'] }
  | { kind: 'input'; id: string; name: string; position: InputNode['position'] }
  | { kind: 'output'; id: string; name: string; position: OutputNode['position'] }

/**
 * Maps HACER's three selection slots (selectedGateId / selectedWireId /
 * selectedNodeId + selectedNodeType) into a discriminated union for
 * per-kind rendering inside PropertiesPanel.
 *
 * Priority: gate > wire > node when multiple slots are set (defensive;
 * store action invariants typically clear other slots when one is set).
 *
 * Junction selection is intentionally not handled \u2014 HACER's store has
 * no junction selection slot. If junction selection lands later, add a
 * 'junction' kind here.
 */
export function useSelectedElement(): SelectedElement | null {
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType)
  const gates = useCircuitStore((s) => s.gates)
  const wires = useCircuitStore((s) => s.wires)
  const inputNodes = useCircuitStore((s) => s.inputNodes)
  const outputNodes = useCircuitStore((s) => s.outputNodes)

  if (selectedGateId) {
    const g = gates.find((x) => x.id === selectedGateId)
    if (g) {
      return {
        kind: 'gate',
        id: g.id,
        gateType: g.type,
        name: `${g.type}_${g.id.slice(0, 4)}`,
        position: g.position,
        rotation: g.rotation,
      }
    }
  }

  if (selectedWireId) {
    const w = wires.find((x) => x.id === selectedWireId)
    if (w) return { kind: 'wire', id: w.id, from: w.from, to: w.to }
  }

  if (selectedNodeId && selectedNodeType) {
    if (selectedNodeType === 'input') {
      const n = inputNodes.find((x) => x.id === selectedNodeId)
      if (n) return { kind: 'input', id: n.id, name: n.name, position: n.position }
    } else if (selectedNodeType === 'output') {
      const n = outputNodes.find((x) => x.id === selectedNodeId)
      if (n) return { kind: 'output', id: n.id, name: n.name, position: n.position }
    }
  }

  return null
}
