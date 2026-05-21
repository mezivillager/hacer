import type { GateType } from '@/store/types'
import { maskForWidth } from './busOps'

// All ops operate bitwise across `width` bits and mask their result to width.
// width=1 preserves legacy boolean behavior.
export const nandGate = (a: number, b: number, width: number): number => ((~(a & b)) & maskForWidth(width)) >>> 0
export const andGate = (a: number, b: number, width: number): number => ((a & b) & maskForWidth(width)) >>> 0
export const orGate = (a: number, b: number, width: number): number => ((a | b) & maskForWidth(width)) >>> 0
export const notGate = (a: number, width: number): number => ((~a) & maskForWidth(width)) >>> 0
export const norGate = (a: number, b: number, width: number): number => ((~(a | b)) & maskForWidth(width)) >>> 0
export const xorGate = (a: number, b: number, width: number): number => ((a ^ b) & maskForWidth(width)) >>> 0
export const xnorGate = (a: number, b: number, width: number): number => ((~(a ^ b)) & maskForWidth(width)) >>> 0

export const gateLogic: Record<GateType, (inputs: number[], width: number) => number> = {
  NAND: (inputs, w) => nandGate(inputs[0], inputs[1], w),
  AND: (inputs, w) => andGate(inputs[0], inputs[1], w),
  OR: (inputs, w) => orGate(inputs[0], inputs[1], w),
  NOT: (inputs, w) => notGate(inputs[0], w),
  NOR: (inputs, w) => norGate(inputs[0], inputs[1], w),
  XOR: (inputs, w) => xorGate(inputs[0], inputs[1], w),
  XNOR: (inputs, w) => xnorGate(inputs[0], inputs[1], w),
}
