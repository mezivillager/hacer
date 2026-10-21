import type { ChipRegistry } from '../chips/registry'
import type { CircuitSpec, PartId } from './types'

export interface BoundInput {
  partId: PartId
  pin: string
}

export interface BindUnconnectedInputsResult {
  doc: CircuitSpec
  bound: BoundInput[]
}

export function bindUnconnectedInputs(_doc: CircuitSpec, _registry: ChipRegistry): BindUnconnectedInputsResult {
  throw new Error('not implemented')
}
