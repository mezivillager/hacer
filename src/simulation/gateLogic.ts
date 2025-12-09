import type { GateType } from '@/store/types'

// Pure gate logic functions - easy to test
export const nandGate = (a: boolean, b: boolean): boolean => !(a && b)
export const andGate = (a: boolean, b: boolean): boolean => a && b
export const orGate = (a: boolean, b: boolean): boolean => a || b
export const notGate = (a: boolean): boolean => !a
export const norGate = (a: boolean, b: boolean): boolean => !(a || b)
export const xorGate = (a: boolean, b: boolean): boolean => a !== b
export const xnorGate = (a: boolean, b: boolean): boolean => a === b

// Gate logic lookup table for simulation
export const gateLogic: Record<GateType, (inputs: boolean[]) => boolean> = {
  NAND: (inputs) => nandGate(inputs[0], inputs[1]),
  AND: (inputs) => andGate(inputs[0], inputs[1]),
  OR: (inputs) => orGate(inputs[0], inputs[1]),
  NOT: (inputs) => notGate(inputs[0]),
  NOR: (inputs) => norGate(inputs[0], inputs[1]),
  XOR: (inputs) => xorGate(inputs[0], inputs[1]),
  XNOR: (inputs) => xnorGate(inputs[0], inputs[1]),
}
