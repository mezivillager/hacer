// Peer ranges for react, react-dom, three and @react-three/* (#455).
// No I/O — peer-range.mjs reads the installed tree and the allow-list.
//
// strict-peer-dependencies is not this gate. CI installs with --frozen-lockfile,
// which skips resolution, and pnpm only checks peers while resolving (R403). The
// flag stays exit 0 on a mismatched lockfile and would fail Dependabot's update
// job instead of the PR (R404). This reads the package.json files the install wrote.
//
// Measured while this landed (react 19.2.6, react-dom 19.2.6, three 0.184.0,
// @react-three/fiber 9.5.0, @react-three/drei 10.7.7, @react-three/test-renderer
// 9.1.0): zero unmet peers, so scripts/peer-range.allow.json is []. An entry is
// valid only with a non-empty reason, and only while that mismatch or missing
// peer is still present — a stale entry fails.

export const USAGE = 'usage: node scripts/peer-range.mjs [--modules <dir>] [--allow <file>]'

const EMPTY_SET = 'no React, @react-three/* or three package was installed'

const VERSION = /^(?:v)?(0|[1-9]\d*|x|X|\*)(?:\.(0|[1-9]\d*|x|X|\*))?(?:\.(0|[1-9]\d*|x|X|\*))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/
const TOKEN = /^(>=|<=|>|<|=|\^|~)?(.+)$/

const isWild = (part) => part === 'x' || part === 'X' || part === '*'

/** react, react-dom, three, and every @react-three/* package. three-stdlib is outside. */
export function inPeerSet(name) {
  return name === 'react' || name === 'react-dom' || name === 'three' || String(name).startsWith('@react-three/')
}

function parseVersionToken(token) {
  const match = VERSION.exec(token)
  if (!match) return null
  const raw = [match[1], match[2], match[3]]
  const components = raw[2] !== undefined ? 3 : raw[1] !== undefined ? 2 : 1
  const wildAt = raw.findIndex((part, index) => index < components && isWild(part))
  const num = (part) => (part === undefined || isWild(part) ? 0 : Number(part))
  return {
    major: num(raw[0]),
    minor: num(raw[1]),
    patch: num(raw[2]),
    prerelease: match[4] ? match[4].split('.') : [],
    components,
    wildAt: wildAt === -1 ? null : wildAt,
  }
}

function concrete(parsed) {
  return { major: parsed.major, minor: parsed.minor, patch: parsed.patch, prerelease: parsed.prerelease }
}

function cmpIdent(a, b) {
  const aNum = /^\d+$/.test(a)
  const bNum = /^\d+$/.test(b)
  if (aNum && bNum) return Math.sign(Number(a) - Number(b))
  if (aNum) return -1
  if (bNum) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

function cmpPre(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1
  if (b.length === 0) return -1
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (a[i] === undefined) return -1
    if (b[i] === undefined) return 1
    const d = cmpIdent(a[i], b[i])
    if (d !== 0) return d
  }
  return 0
}

function cmp(a, b) {
  if (a.major !== b.major) return Math.sign(a.major - b.major)
  if (a.minor !== b.minor) return Math.sign(a.minor - b.minor)
  if (a.patch !== b.patch) return Math.sign(a.patch - b.patch)
  return cmpPre(a.prerelease, b.prerelease)
}

function cmpOp(op, a, b) {
  const d = cmp(a, b)
  if (op === '>=') return d >= 0
  if (op === '<=') return d <= 0
  if (op === '>') return d > 0
  if (op === '<') return d < 0
  return d === 0
}

function bounds(lower, upper) {
  return [{ op: '>=', version: lower }, { op: '<', version: upper }]
}

function caretRange(parsed) {
  const lower = concrete(parsed)
  const upper = parsed.major > 0
    ? { major: parsed.major + 1, minor: 0, patch: 0, prerelease: [] }
    : parsed.minor > 0
      ? { major: 0, minor: parsed.minor + 1, patch: 0, prerelease: [] }
      : { major: 0, minor: 0, patch: parsed.patch + 1, prerelease: [] }
  return bounds(lower, upper)
}

function tildeRange(parsed) {
  const lower = concrete(parsed)
  const upper = parsed.components <= 1
    ? { major: parsed.major + 1, minor: 0, patch: 0, prerelease: [] }
    : { major: parsed.major, minor: parsed.minor + 1, patch: 0, prerelease: [] }
  return bounds(lower, upper)
}

function partialRange(parsed) {
  const lower = { major: parsed.major, minor: parsed.components === 1 ? 0 : parsed.minor, patch: 0, prerelease: [] }
  const upper = parsed.components === 1
    ? { major: parsed.major + 1, minor: 0, patch: 0, prerelease: [] }
    : { major: parsed.major, minor: parsed.minor + 1, patch: 0, prerelease: [] }
  return bounds(lower, upper)
}

function expandToken(token) {
  if (token === '*' || token === 'x' || token === 'X') return { ok: true, comparators: [{ op: '*', version: null }] }
  const match = TOKEN.exec(token)
  if (!match) return { ok: false, error: `unreadable comparator ${token}` }
  const op = match[1] ?? null
  const parsed = parseVersionToken(match[2])
  if (!parsed) return { ok: false, error: `unreadable version ${match[2]}` }
  if (parsed.wildAt === 0) return { ok: true, comparators: [{ op: '*', version: null }] }
  if (parsed.wildAt !== null && op !== null) return { ok: false, error: `wildcard with an operator is not read (${token})` }
  if (parsed.wildAt !== null) return { ok: true, comparators: partialRange({ ...parsed, components: parsed.wildAt }) }
  if (op === '^') return { ok: true, comparators: caretRange(parsed) }
  if (op === '~') return { ok: true, comparators: tildeRange(parsed) }
  if (op === null && parsed.components < 3) return { ok: true, comparators: partialRange(parsed) }
  return { ok: true, comparators: [{ op: op ?? '=', version: concrete(parsed) }] }
}

function setMatches(version, comparators) {
  if (comparators.some((c) => c.op === '*')) return true
  if (version.prerelease.length > 0) {
    const gated = comparators.some((c) => c.version
      && c.version.prerelease.length > 0
      && c.version.major === version.major
      && c.version.minor === version.minor
      && c.version.patch === version.patch)
    if (!gated) return false
  }
  return comparators.every((c) => cmpOp(c.op, version, c.version))
}

/** @returns {{ok: true, satisfies: boolean} | {ok: false, error: string}} */
export function satisfiesRange(versionText, rangeText) {
  const parsedVersion = parseVersionToken(String(versionText).trim())
  if (!parsedVersion || parsedVersion.wildAt !== null) return { ok: false, error: `unreadable version ${versionText}` }
  const version = concrete(parsedVersion)
  const range = String(rangeText).trim()
  if (range === '') return { ok: false, error: 'empty range' }
  if (range.includes(' - ')) return { ok: false, error: `hyphen ranges are not read (${range})` }
  if (range === '*' || range === 'x' || range === 'X') return { ok: true, satisfies: true }
  const alternatives = range.split('||').map((side) => side.trim()).filter((side) => side.length > 0)
  if (alternatives.length === 0) return { ok: false, error: 'empty range' }
  let satisfies = false
  for (const alternative of alternatives) {
    const comparators = []
    for (const token of alternative.split(/\s+/).filter(Boolean)) {
      const expanded = expandToken(token)
      if (!expanded.ok) return expanded
      comparators.push(...expanded.comparators)
    }
    if (comparators.length === 0) return { ok: false, error: 'empty range' }
    if (setMatches(version, comparators)) satisfies = true
  }
  return { ok: true, satisfies }
}

function violation(pkg, peer, kind, resolved) {
  return {
    dependent: pkg.name,
    dependentVersion: pkg.version,
    peer: peer.name,
    range: peer.range,
    resolved,
    optional: peer.optional === true,
    kind,
  }
}

function normalizeAllow(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return { error: 'allow entry is not an object' }
  const { dependent, peer, range, reason } = entry
  if (typeof dependent !== 'string' || typeof peer !== 'string' || typeof range !== 'string') {
    return { error: 'allow entry needs dependent, peer and range strings' }
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    return { error: `allow entry for ${dependent} / ${peer} / ${range} has no reason` }
  }
  return { entry: { dependent, peer, range, reason: reason.trim() } }
}

const byName = (a, b) => a.dependent.localeCompare(b.dependent, 'en') || a.peer.localeCompare(b.peer, 'en')

/**
 * @param {{packages: Array<{name: string, version: string, peers: Array<{name: string, range: string, optional?: boolean}>, resolved: Record<string, string | null>}>, allow: Array<{dependent: string, peer: string, range: string, reason: string}>}} input
 */
export function checkPeerRanges({ packages, allow }) {
  const inSet = (packages ?? []).filter((pkg) => inPeerSet(pkg.name))
  const allowList = Array.isArray(allow) ? allow : []
  if (inSet.length === 0) {
    return { ok: false, packages: 0, checked: 0, violations: [], suppressed: [], allowErrors: [EMPTY_SET] }
  }
  const violations = []
  let checked = 0
  for (const pkg of inSet) {
    for (const peer of pkg.peers ?? []) {
      checked += 1
      const resolved = Object.hasOwn(pkg.resolved ?? {}, peer.name) ? pkg.resolved[peer.name] : null
      if (resolved === null || resolved === undefined) {
        if (peer.optional === true) continue
        violations.push(violation(pkg, peer, 'missing', null))
        continue
      }
      const verdict = satisfiesRange(resolved, peer.range)
      if (!verdict.ok) violations.push(violation(pkg, peer, 'unparsed', resolved))
      else if (!verdict.satisfies) violations.push(violation(pkg, peer, 'mismatch', resolved))
    }
  }
  violations.sort(byName)
  const suppressed = []
  const allowErrors = []
  const used = new Set()
  for (const raw of allowList) {
    const normalized = normalizeAllow(raw)
    if (normalized.error) {
      allowErrors.push(normalized.error)
      continue
    }
    const entry = normalized.entry
    const match = violations.find((item) => !used.has(item)
      && (item.kind === 'mismatch' || item.kind === 'missing')
      && item.dependent === entry.dependent
      && item.peer === entry.peer
      && item.range === entry.range)
    if (!match) {
      allowErrors.push(`allow entry for ${entry.dependent} / ${entry.peer} / ${entry.range} matches no current violation`)
      continue
    }
    used.add(match)
    suppressed.push({ ...match, reason: entry.reason })
  }
  const remaining = violations.filter((item) => !used.has(item))
  return {
    ok: remaining.length === 0 && allowErrors.length === 0,
    packages: inSet.length,
    checked,
    violations: remaining,
    suppressed,
    allowErrors,
  }
}

function violationLine(item) {
  if (item.kind === 'missing') return `${item.dependent}@${item.dependentVersion} is missing required peer ${item.peer} (${item.range})`
  if (item.kind === 'unparsed') return `${item.dependent}@${item.dependentVersion} peer ${item.peer} has a range this check cannot read (${item.range})`
  const optional = item.optional ? ' (optional peer is installed)' : ''
  return `${item.dependent}@${item.dependentVersion} requires ${item.peer}@${item.resolved} to satisfy ${item.range}${optional}`
}

/** The CLI's stdout. A pass names the counts so a check of nothing cannot look like this. */
export function formatReport(result) {
  if (result.ok) return `PEER-RANGE: PASS packages=${result.packages} checked=${result.checked} violations=0\n`
  const lines = ['PEER-RANGE: FAIL', ...result.violations.map(violationLine)]
  for (const error of result.allowErrors) lines.push(`allow-list: ${error}`)
  lines.push(`PEER-RANGE: FAIL packages=${result.packages} checked=${result.checked} violations=${result.violations.length}`)
  return `${lines.join('\n')}\n`
}

/** @param {string[]} argv @param {{modules: string, allow: string}} defaults */
export function parseArgs(argv, defaults) {
  let modules = defaults.modules
  let allow = defaults.allow
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg !== '--modules' && arg !== '--allow') return { ok: false, error: `peer-range: unknown argument ${arg}\n${USAGE}` }
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) return { ok: false, error: `peer-range: ${arg} needs a value\n${USAGE}` }
    if (arg === '--modules') modules = value
    else allow = value
    i += 1
  }
  return { ok: true, modules, allow }
}
