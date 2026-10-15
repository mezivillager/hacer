export type Position = { x: number; y: number; z: number }
export type Rotation = { x: number; y: number; z: number }
export type PerformanceMode = 'normal' | 'low-power'

export interface Pin {
  id: string
  name: string
  type: 'input' | 'output'
  value: number
  /** Bit width of the pin. Defaults to 1 for primitive gates when omitted. */
  width?: number
}

/**
 * Kind discriminator for bus components.
 */
export type BusComponentKind = 'splitter' | 'joiner'

/**
 * Bus splitter/joiner entity. NOT a registry chip and NOT a GateInstance — a
 * separate entity (like InputNode/OutputNode) whose pins are derived from
 * kind+width via createBusPins.
 *  - splitter: input `in` (N-bit) → outputs `out0..out{N-1}` (1-bit each).
 *  - joiner:   inputs `in0..in{N-1}` (1-bit each) → output `out` (N-bit).
 */
export interface BusComponent {
  id: string
  kind: BusComponentKind
  position: Position
  rotation: Rotation
  /** Bus width N (>= 2). */
  width: number
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
}
