// Blast radius of seed files (#333). No I/O — unit tested in blast-radius.logic.test.mjs.
// The file walk and `gh issue view` live in blast-radius.mjs.

/** What the report is. Direct importers are not the edit set. */
export const PROXY_NOTE = 'Direct importers are a proxy for blast radius, not the real edit set.'

export const USAGE = 'usage: node scripts/blast-radius.mjs [--json] [--issue <n>] <file>...'

/** Sentinel until the measurement lands. */
export const AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD = 0

export function isTestFile() {
  return false
}

export function resolveSpecifier() {
  return null
}

export function extractSpecifiers() {
  return []
}

export function blastRadius() {
  return {
    proxy: 'not implemented',
    threshold: AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD,
    seeds: [],
    unmatched: [],
    direct: { production: [], tests: [] },
    transitive: { production: [], tests: [] },
    counts: { directProduction: 0, directTests: 0, transitiveProduction: 0, transitiveTests: 0 },
    overThreshold: false,
  }
}

export function formatReport() {
  return ''
}

export function formatJson() {
  return '{}\n'
}

export function parseArgs() {
  return { ok: false, error: 'not implemented' }
}

export function parseFilesLikelyTouched() {
  return []
}
