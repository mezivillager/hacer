import type { ChipRegistry } from '../chips/registry'
import type { ParseSpecResult } from './types'

export interface ParseSpecOptions {
  chips?: ChipRegistry
}

export function parseSpec(_source: string, _options: ParseSpecOptions = {}): ParseSpecResult {
  throw new Error('not implemented')
}
