// The one-line summaries the three required checks print — `HYGIENE:`, `BROWSER-QA:`, `LAYER-RATCHET:` — published
// where a program can read them without Actions log access (MC-6, #477). No I/O of its own: each check's script
// publishes through publishLine, and scripts/mission-control/collect.logic.mjs reads the lines back with
// parseCheckLine. Why a notice, and what it needs: docs/harness/mission-control.md § Checks.

/** Each required check, by the name its check run carries, and the prefix of the line it publishes. */
export const CHECK_LINES = Object.freeze({ 'pr-hygiene': 'HYGIENE', 'browser-qa': 'BROWSER-QA', ci: 'LAYER-RATCHET' })

export function publishLine() {
  throw new Error('not implemented')
}

export function parseCheckLine() {
  throw new Error('not implemented')
}
