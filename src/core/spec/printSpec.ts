import type { CircuitSpec, Sidecar } from './types'

export interface PrintSpecOptions {
  dialect?: 'hacer' | 'nand2tetris'
  sidecar?: Sidecar
}

export function printSpec(_doc: CircuitSpec, _options: PrintSpecOptions = {}): string {
  throw new Error('not implemented')
}
