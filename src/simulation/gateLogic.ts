import type { GateType } from '@/store/types'

export const nandGate = (a: number, b: number): number => (a & b) ^ 1
export const andGate = (a: number, b: number): number => a & b
export const orGate = (a: number, b: number): number => a | b
export const notGate = (a: number): number => a ^ 1
export const norGate = (a: number, b: number): number => (a | b) ^ 1
export const xorGate = (a: number, b: number): number => a ^ b
export const xnorGate = (a: number, b: number): number => (a ^ b) ^ 1

export const gateLogic: Record<GateType, (inputs: number[]) => number> = {
  NAND: (inputs) => nandGate(inputs[0], inputs[1]),
  AND: (inputs) => andGate(inputs[0], inputs[1]),
  OR: (inputs) => orGate(inputs[0], inputs[1]),
  NOT: (inputs) => notGate(inputs[0]),
  NOR: (inputs) => norGate(inputs[0], inputs[1]),
  XOR: (inputs) => xorGate(inputs[0], inputs[1]),
  XNOR: (inputs) => xnorGate(inputs[0], inputs[1]),
}
