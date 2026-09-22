// Pure logic for the layer ratchet (#329). No I/O — unit tested in layer-ratchet.logic.test.mjs;
// the cruise and the exit code live in layer-ratchet.mjs.

export const CONFIG_FILE = '.dependency-cruiser.cjs'
export const KNOWN_VIOLATIONS_FILE = '.dependency-cruiser-known-violations.json'
export const ESLINT_SUPPRESSIONS_FILE = 'eslint-suppressions.json'

export function countSuppressions() {
  throw new Error('not implemented')
}

export function summarise() {
  throw new Error('not implemented')
}

export function formatReport() {
  throw new Error('not implemented')
}
