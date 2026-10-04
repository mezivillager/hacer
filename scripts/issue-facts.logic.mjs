import { builtinModules } from 'node:module'
import { extractPathCitations, findDeadPaths, formatDeadPaths } from './hooks/docPathExists.logic.mjs'

/** A bare package name counts as a claim only on a line that talks about dependencies. */
export const DEPENDENCY_WORDS =
  /(?<![\w-])(?:dependency|dependencies|devDependenc(?:y|ies)|peerDependenc(?:y|ies)|package\.json|lockfile|pnpm-lock\.yaml)(?![\w-])/i

const CODE_SPAN = /`([^`\n]+)`/g
const PACKAGE = /^((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z][a-z0-9._-]*)(?:@([~^]?\d[0-9A-Za-z.*+-]*))?$/
const LOCK_KEY = /^ {2}'?((?:@[^@/'\s]+\/)?[^@'\s]+)@([^('\s:]+)/
const BUILTINS = new Set(builtinModules)
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

/**
 * @typedef {{ line: number, name: string, version: string | null }} PackageClaim
 * @typedef {PackageClaim & { kind: 'missing' | 'transitive' | 'version', locked: string[] }} PackageFinding
 * @typedef {{ direct: Set<string>, locked: Map<string, Set<string>> }} Manifest
 */

/**
 * Every backticked token in `text` that names a package: a scoped name or a `name@version`
 * anywhere, a bare name only on a line with a dependency word. Path-shaped tokens are paths.
 * @param {string} text
 * @returns {PackageClaim[]}
 */
export function extractPackageClaims(text) {
  const claims = []
  ;(text || '').split('\n').forEach((line, index) => {
    const paths = new Set(extractPathCitations(line).map((c) => c.path))
    const seen = new Set()
    for (const span of line.matchAll(CODE_SPAN)) {
      const m = PACKAGE.exec(span[1])
      if (!m || paths.has(span[1]) || BUILTINS.has(m[1]) || seen.has(span[1])) continue
      const [, name, version = null] = m
      if (!name.startsWith('@') && version === null && !DEPENDENCY_WORDS.test(line)) continue
      seen.add(span[1])
      claims.push({ line: index + 1, name, version })
    }
  })
  return claims
}

/**
 * The direct dependencies of `package.json` and every name@version `pnpm-lock.yaml` resolves.
 * @param {string} packageJsonText
 * @param {string} lockText
 * @returns {Manifest}
 */
export function parseManifest(packageJsonText, lockText) {
  const pkg = JSON.parse(packageJsonText || '{}')
  const direct = new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(pkg[field] || {})))
  const locked = new Map()
  for (const line of (lockText || '').split('\n')) {
    const m = LOCK_KEY.exec(line)
    if (!m) continue
    if (!locked.has(m[1])) locked.set(m[1], new Set())
    locked.get(m[1]).add(m[2])
  }
  return { direct, locked }
}

/** Does `stated` (`19.2`, `^9.8.0`, `19.x`) name a prefix of `locked` (`19.2.4`)? */
export function versionMatches(stated, locked) {
  const want = stated.replace(/^[~^]/, '').split('.')
  const have = locked.split('.')
  return want.length <= have.length && want.every((part, k) => part === 'x' || part === '*' || part === have[k])
}

/**
 * The claims the manifest contradicts: absent from both files, present only as a transitive
 * dependency (pnpm does not hoist it, so it cannot be imported), or at a version nothing resolves to.
 * @param {PackageClaim[]} claims
 * @param {Manifest} manifest
 * @returns {PackageFinding[]}
 */
export function checkPackageClaims(claims, manifest) {
  const findings = []
  for (const claim of claims) {
    const locked = [...(manifest.locked.get(claim.name) || [])].sort()
    if (!manifest.direct.has(claim.name)) {
      findings.push({ ...claim, kind: locked.length ? 'transitive' : 'missing', locked })
    } else if (claim.version !== null && !locked.some((v) => versionMatches(claim.version, v))) {
      findings.push({ ...claim, kind: 'version', locked })
    }
  }
  return findings
}

/**
 * An `exists` over the tracked files that accepts any run of whole segments: an issue writes
 * `backlog.mjs` or `chip/chip.ts` for a path it does not spell out in full.
 * @param {string[]} files repo-relative
 */
export function pathIndex(files) {
  const runs = new Set()
  for (const file of files) {
    const parts = file.split('/')
    for (let start = 0; start < parts.length; start++) {
      for (let end = start + 1; end <= parts.length; end++) runs.add(parts.slice(start, end).join('/'))
    }
  }
  return (path) => runs.has(path)
}

/**
 * Every package claim the manifest contradicts and every cited repo path that does not exist.
 * @param {string} text an issue body, a brief or a comment
 * @param {{ manifest: Manifest, exists: (path: string) => boolean }} repo
 */
export function checkIssueFacts(text, repo) {
  return {
    packages: checkPackageClaims(extractPackageClaims(text), repo.manifest),
    paths: findDeadPaths(text, repo.exists),
  }
}

const KIND_TEXT = {
  missing: () => 'in neither package.json nor pnpm-lock.yaml',
  transitive: () => 'in pnpm-lock.yaml only, not a direct dependency',
  version: (f) => `pnpm-lock.yaml resolves ${f.locked.join(', ')}`,
}

/** One greppable line per finding, then an `ISSUE-FACTS:` summary line. */
export function formatIssueFacts(label, { packages, paths }) {
  const lines = packages.map(
    (f) => `PACKAGE ${label}:${f.line} ${f.name}${f.version ? `@${f.version}` : ''} — ${KIND_TEXT[f.kind](f)}`,
  )
  const dead = formatDeadPaths(label, paths)
  if (dead) lines.push(dead)
  lines.push(`ISSUE-FACTS: ${label} · ${packages.length} package · ${paths.length} path`)
  return lines.join('\n')
}
