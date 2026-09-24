// Red-commit stub for #465: every parser returns an empty graph, so each test fails on its own
// assertion rather than on an import error. The implementation replaces this file.

const emptyGraph = () => ({ nodes: [], edges: [], artefacts: [], errors: [] })

export const parseAdr = emptyGraph
export const parseRulings = emptyGraph
export const parsePremises = emptyGraph
export const parseLedger = emptyGraph
export const parseLineage = emptyGraph
export const nextRulingId = () => 'R0'
