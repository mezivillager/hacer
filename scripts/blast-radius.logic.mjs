// Blast radius of seed files (#333). No I/O — unit tested in blast-radius.logic.test.mjs.
// The file walk and `gh issue view` live in blast-radius.mjs.
//
// Direct importers are a proxy: the count is who would have to be re-read if a seed's shape
// changed, not the files a change will actually edit. A spike is what shows the edit set.

import path from 'node:path'
import ts from 'typescript'

/** What the report is. Direct importers are not the edit set. */
export const PROXY_NOTE = 'Direct importers are a proxy for blast radius, not the real edit set.'

export const USAGE = 'usage: node scripts/blast-radius.mjs [--json] [--issue <n>] <file>...'

const ISSUE_ERROR = '--issue needs a positive issue number'

// Production direct importers above which seeds are not agent-ready as written.
// More than this number — 20 itself still passes.
//
// Evidence for 20. Not a SWE-bench figure: that benchmark counts files a patch edits, and this
// constant counts production files that import the seeds. Foundation audit, 2026-09-21,
// docs/research/2026-09-21-foundation-audit/evidence/MEASUREMENTS.md §1 (commit 6e6e636):
// the 10 then-ready issues had production direct-importer counts 1, 1, 1, 4, 10, 19, 37, 40, 42, 59.
// Four were at 84+ importers counting tests (#186 105, #185 103, #188 86, #189 84); four were at
// 6 or fewer. 20 is the first integer above the largest count outside that wide cluster (#210 at 19)
// and below the cluster the audit called not small (37 and up).
// Why a threshold exists at all: SWE-bench-Live (Zhang et al., that audit's RESEARCH.md) solved
// 48% of single-file patches under five lines, under 10% at three or more files, and none at seven
// or more. Direct importers are only a proxy for that edit set. Move this number only with a new measurement.
export const AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD = 20

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.d.ts']
const INDEXES = ['index.ts', 'index.tsx', 'index.mts', 'index.js', 'index.mjs', 'index.cjs']

const byName = (a, b) => a.localeCompare(b, 'en')

/** `*.test.*` only — the issue's rule. A helper at `src/test/helpers.ts` stays in the production count. */
export function isTestFile(file) {
  return /\.test\./.test(String(file ?? ''))
}

/** A repo-relative module specifier, or null for a package or a file that is not in `files`. */
export function resolveSpecifier(fromFile, specifier, files) {
  if (typeof specifier !== 'string' || specifier.length === 0) return null
  let base
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`
  else if (specifier.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier))
  else return null
  if (base.endsWith('/') && base.length > 1) base = base.slice(0, -1)
  const candidates = [base]
  for (const ext of EXTENSIONS) candidates.push(base + ext)
  for (const index of INDEXES) candidates.push(path.posix.join(base, index))
  return candidates.find((candidate) => files.has(candidate)) ?? null
}

/** Module specifiers this source imports or re-exports, in source order. Comments and strings are not imports. */
export function extractSpecifiers(source) {
  const sf = ts.createSourceFile('file.tsx', String(source ?? ''), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const specs = []
  const visit = (node) => {
    const declared = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
    if (declared && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text)
    } else if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      const expr = node.expression
      const dynamic = expr.kind === ts.SyntaxKind.ImportKeyword
      const required = ts.isIdentifier(expr) && expr.text === 'require'
      if (dynamic || required) specs.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return specs
}

function globToRegExp(pattern) {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      out += '.*'
      i += 1
      continue
    }
    if (ch === '*') {
      out += '[^/]*'
      continue
    }
    out += '\\^$+?.()|{}[]'.includes(ch) ? `\\${ch}` : ch
  }
  return new RegExp(`^${out}$`)
}

function matchSeed(file, seed) {
  if (seed.endsWith('/')) return file.startsWith(seed)
  if (seed.includes('*')) return globToRegExp(seed).test(file)
  return file === seed
}

function partition(names) {
  const production = []
  const tests = []
  for (const file of [...names].sort(byName)) (isTestFile(file) ? tests : production).push(file)
  return { production, tests }
}

function buildGraph(files) {
  const paths = new Set(Object.keys(files))
  const graph = {}
  for (const [file, source] of Object.entries(files)) {
    const imports = new Set()
    if (typeof source === 'string' && source.length > 0) {
      for (const spec of extractSpecifiers(source)) {
        const resolved = resolveSpecifier(file, spec, paths)
        if (resolved && resolved !== file) imports.add(resolved)
      }
    }
    graph[file] = imports
  }
  return graph
}

/**
 * @param {{ files: Record<string, string>, seeds: string[] }} input
 * `files` maps a repo-relative path to its source. An empty string is a file that exists but is
 * not parsed (markdown, yaml) — it can still be a seed.
 */
export function blastRadius({ files, seeds }) {
  const graph = buildGraph(files ?? {})
  const reverse = new Map(Object.keys(graph).map((file) => [file, new Set()]))
  for (const [file, imports] of Object.entries(graph)) {
    for (const target of imports) if (reverse.has(target)) reverse.get(target).add(file)
  }

  const seedFiles = new Set()
  const unmatched = []
  for (const seed of seeds ?? []) {
    const hits = Object.keys(graph).filter((file) => matchSeed(file, seed))
    if (hits.length === 0) unmatched.push(seed)
    for (const hit of hits) seedFiles.add(hit)
  }

  const direct = new Set()
  for (const seed of seedFiles) {
    for (const importer of reverse.get(seed) ?? []) if (!seedFiles.has(importer)) direct.add(importer)
  }

  const seen = new Set(seedFiles)
  const queue = [...seedFiles]
  while (queue.length) {
    const node = queue.shift()
    for (const importer of reverse.get(node) ?? []) {
      if (seen.has(importer)) continue
      seen.add(importer)
      queue.push(importer)
    }
  }
  const transitive = new Set([...seen].filter((file) => !seedFiles.has(file)))

  const directParts = partition(direct)
  const transitiveParts = partition(transitive)
  const counts = {
    directProduction: directParts.production.length,
    directTests: directParts.tests.length,
    transitiveProduction: transitiveParts.production.length,
    transitiveTests: transitiveParts.tests.length,
  }
  return {
    proxy: PROXY_NOTE,
    threshold: AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD,
    seeds: [...seedFiles].sort(byName),
    unmatched,
    direct: directParts,
    transitive: transitiveParts,
    counts,
    overThreshold: counts.directProduction > AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD,
  }
}

function section(title, files) {
  return [title, ...(files.length ? files.map((file) => `  ${file}`) : ['  (none)'])]
}

/** The human report. Always names the proxy. */
export function formatReport(report) {
  const lines = [
    `BLAST-RADIUS: seeds=${report.seeds.length} directProduction=${report.counts.directProduction} directTests=${report.counts.directTests} transitiveProduction=${report.counts.transitiveProduction} transitiveTests=${report.counts.transitiveTests} overThreshold=${report.overThreshold}`,
    report.proxy,
    '',
    ...section('Seeds', report.seeds),
  ]
  if (report.unmatched.length) lines.push('', ...section('Unmatched seeds', report.unmatched))
  lines.push(
    '',
    ...section(`Direct production importers (${report.counts.directProduction})`, report.direct.production),
    '',
    ...section(`Direct test importers (${report.counts.directTests})`, report.direct.tests),
    '',
    ...section(`Reverse transitive closure, production (${report.counts.transitiveProduction})`, report.transitive.production),
    '',
    ...section(`Reverse transitive closure, tests (${report.counts.transitiveTests})`, report.transitive.tests),
    '',
  )
  return lines.join('\n')
}

export function formatJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`
}

/** @returns {{ok:true, json:boolean, issue:number|null, files:string[]} | {ok:false, error:string}} */
export function parseArgs(argv) {
  const files = []
  let json = false
  let issue = null
  const args = argv ?? []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--json') {
      json = true
      continue
    }
    if (arg === '--issue') {
      const value = args[++i]
      if (!/^[1-9]\d*$/.test(value ?? '')) return { ok: false, error: ISSUE_ERROR }
      issue = Number(value)
      continue
    }
    if (arg.startsWith('-')) return { ok: false, error: `unknown option ${arg}` }
    files.push(arg)
  }
  if (issue === null && files.length === 0) return { ok: false, error: USAGE }
  return { ok: true, json, issue, files }
}

const SECTION_HEADING = /^#{1,6}[ \t]+files likely touched[ \t]*$/im

function looksLikePath(token) {
  if (!token || /\s/.test(token)) return false
  if (token.includes('*') || token.includes('/')) return /^[A-Za-z0-9_@./~*-]+$/.test(token)
  return /^[A-Za-z0-9_@.-]+\.[A-Za-z0-9]+$/.test(token)
}

/** Backtick paths from a "Files likely touched" section. A backticked command is not a path. */
export function parseFilesLikelyTouched(body) {
  const text = String(body ?? '')
  const match = SECTION_HEADING.exec(text)
  if (!match) return []
  const rest = text.slice(match.index + match[0].length)
  const next = rest.search(/^#{1,6}[ \t]+\S/m)
  const section = next === -1 ? rest : rest.slice(0, next)
  const paths = []
  const seen = new Set()
  for (const tick of section.matchAll(/`([^`]+)`/g)) {
    const raw = tick[1].trim()
    if (/\s/.test(raw) && !raw.includes(',')) continue
    for (const part of raw.split(',')) {
      const token = part.trim()
      if (!looksLikePath(token) || seen.has(token)) continue
      seen.add(token)
      paths.push(token)
    }
  }
  return paths
}
