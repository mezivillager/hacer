// Pure logic for the "every cited repo path exists" guard.
// No I/O — the filesystem is injected, so docPathExists.logic.test.mjs runs on a fake.
//
// Why: REPO_MAP.md and AGENTS.md are the first things an agent reads, and a path that
// does not exist sends it (and its greps) nowhere. A citation is a backticked token that
// looks like a repo-relative path, or a markdown link target. Fenced code blocks are not
// scanned: tree diagrams and code samples are illustrations, not citations.

import { posix } from 'node:path'
import { OWNED_SKILLS } from './docPaths.logic.mjs'

/** Top-level directories a citation may start with. */
export const KNOWN_ROOTS = ['src', 'docs', 'scripts', 'e2e', 'tasks', 'public', 'conformance', '.claude', '.cursor', '.github', '.husky']

/** A line carrying this marker is skipped, for a doc that must cite a path that is not there yet. */
export const MISSING_PATH_MARKER = 'allow-missing-path'

/**
 * Docs whose path citations must all exist (ADR-0014), as globs over the repo-relative path —
 * `*` matches inside one segment, `**` across segments. A new doc under `docs/` is checked from
 * birth. Only the skills we own are in: `scripts/sync-superpowers.sh` overwrites the rest, so a
 * citation fixed there comes back.
 */
export const PATH_EXISTENCE_PATTERNS = [
  'REPO_MAP.md',
  'AGENTS.md',
  'docs/**',
  ...OWNED_SKILLS.map((prefix) => `${prefix}SKILL.md`),
]

/** Dated records of what was true on their date: a path deleted since is history, not drift. */
export const PATH_EXISTENCE_HISTORY = [
  'docs/research/**',
  'docs/harness/sessions/2*',
  'docs/harness/reviews/2*/**',
  'docs/decisions/rulings/2*',
]

/**
 * Docs still red, exempt until fixed, so the check is never red on `main`; sorted. Shrink-only:
 * `lint:docs` fails on an entry whose citations are all green, and a test refuses a new entry.
 */
export const GRANDFATHERED_DOCS = [
  'docs/compatibility/nand2tetris/project1/gap-analysis.md',
  'docs/decisions/0001-adopt-adr-log-and-docs-sync-enforcement.md',
  'docs/decisions/0002-commit-and-worktree-conventions.md',
  'docs/decisions/0004-p05-18-boundary-evaluatechip-seam-landed-in-p05-16.md',
  'docs/decisions/0006-p05-22-test-lab-implementation-source-seam-and-store-action.md',
  'docs/decisions/0007-wire-routing-engine-direction.md',
  'docs/decisions/0008-scene-graph-routing-testing-layer.md',
  'docs/decisions/0009-bus-components-entity-and-wireendpoint-bus.md',
  'docs/decisions/0010-no-absolute-paths-in-docs.md',
  'docs/decisions/0011-remove-stryker-mutation-testing.md',
  'docs/decisions/0012-e2e-tests-manual-only.md',
  'docs/decisions/0013-backlog-in-github-issues-and-portfolio.md',
  'docs/decisions/0014-cited-doc-paths-must-exist.md',
  'docs/decisions/0015-releases-do-not-commit-to-main.md',
  'docs/decisions/0016-browser-qa-in-the-cloud.md',
  'docs/decisions/0017-documentation-platform.md',
  'docs/decisions/0018-fidelity-gate.md',
  'docs/decisions/0019-canvas-less-shell-mode.md',
  'docs/decisions/0020-spec-only-writes-read-only-projections.md',
  'docs/decisions/0022-node-entries.md',
  'docs/development/observed-bugs.md',
  'docs/harness/README.md',
  'docs/harness/cloud-queue.md',
  'docs/harness/cursor-lane.md',
  'docs/harness/fidelity-inbox.md',
  'docs/harness/ledger.md',
  'docs/harness/mission-control.md',
  'docs/harness/sessions/cloud-queue-inbox.md',
  'docs/llm-harness.md',
  'docs/llm-integration-proposal.md',
  'docs/plans/2026-03-22-phase-0.5-tickets.md',
  'docs/plans/2026-03-23-topological-sort-eval.md',
  'docs/plans/2026-03-26-hdl-parser-parity-hardening.md',
  'docs/plans/2026-04-17-design-system-migration.md',
  'docs/plans/2026-04-17-design-system-migration/01-phase-a-ant-strip.md',
  'docs/plans/2026-04-17-design-system-migration/02-phase-b-foundation.md',
  'docs/plans/2026-04-17-design-system-migration/03-phase-c-3a-compact-toolbar.md',
  'docs/plans/2026-04-17-design-system-migration/05-phase-c-3c-properties-panel.md',
  'docs/plans/2026-04-17-design-system-migration/06-phase-c-3d-help-bar.md',
  'docs/plans/2026-04-17-design-system-migration/07-phase-c-3e-3f-statusbar-demo-overlay.md',
  'docs/plans/2026-04-17-design-system-migration/08-phase-d-r3f-retoken.md',
  'docs/plans/2026-04-17-design-system-migration/09-phase-e-ui-spec-restoration.md',
  'docs/plans/2026-04-17-design-system-migration/10-phase-f-polish.md',
  'docs/plans/2026-05-12-documentation-refresh.md',
  'docs/plans/2026-05-14-p05-10-followups-and-process-hygiene.md',
  'docs/plans/2026-05-14-performance-mode-switch.md',
  'docs/plans/2026-05-15-p05-10-pinout-panel.md',
  'docs/plans/2026-05-18-p05-11-ticket-content-update.md',
  'docs/plans/2026-05-19-p05-13-multi-bit-io-ui.md',
  'docs/plans/2026-05-21-multi-bit-gates-and-floating-labels.md',
  'docs/plans/2026-05-21-properties-panel-width-editor.md',
  'docs/plans/2026-05-22-floating-label-polish.md',
  'docs/plans/2026-05-23-p05-14-circuit-persistence.md',
  'docs/plans/2026-05-24-builtin-chip-placement-standardization.md',
  'docs/plans/2026-06-19-docs-cleanup-and-sync-enforcement.md',
  'docs/plans/2026-06-19-p05-16-hdl-compiler.md',
  'docs/plans/2026-06-20-p05-17-test-execution-engine.md',
  'docs/plans/2026-06-20-p05-22-test-results-panel.md',
  'docs/plans/2026-06-26-scene-graph-routing-testing.md',
  'docs/plans/2026-06-27-bus-splitter-joiner.md',
  'docs/plans/phase-0.5-tickets-CHECKLIST.md',
  'docs/plans/phase-0.5-tickets/P05-01.md',
  'docs/plans/phase-0.5-tickets/P05-02.md',
  'docs/plans/phase-0.5-tickets/P05-03.md',
  'docs/plans/phase-0.5-tickets/P05-04.md',
  'docs/plans/phase-0.5-tickets/P05-05.md',
  'docs/plans/phase-0.5-tickets/P05-08.md',
  'docs/plans/phase-0.5-tickets/P05-09.md',
  'docs/plans/phase-0.5-tickets/P05-10.md',
  'docs/plans/phase-0.5-tickets/P05-11.md',
  'docs/plans/phase-0.5-tickets/P05-12.md',
  'docs/plans/phase-0.5-tickets/P05-13.md',
  'docs/plans/phase-0.5-tickets/P05-14.md',
  'docs/plans/phase-0.5-tickets/P05-15.md',
  'docs/plans/phase-0.5-tickets/P05-16.md',
  'docs/plans/phase-0.5-tickets/P05-17.md',
  'docs/plans/phase-0.5-tickets/P05-18.md',
  'docs/plans/phase-0.5-tickets/P05-19.md',
  'docs/plans/phase-0.5-tickets/P05-20.md',
  'docs/plans/phase-0.5-tickets/P05-21.md',
  'docs/plans/phase-0.5-tickets/P05-22.md',
  'docs/plans/phase-0.5-tickets/P05-23.md',
  'docs/plans/phase-0.5-tickets/P05-24.md',
  'docs/plans/phase-0.5-tickets/P05-26.md',
  'docs/plans/phase-0.5-tickets/P05-27.md',
  'docs/plans/phase-0.5-tickets/P05-28.md',
  'docs/plans/phase-0.5-tickets/P05-29.md',
  'docs/plans/phase-0.5-tickets/P05-31.md',
  'docs/plans/phase-0.5-tickets/P05-32.md',
  'docs/plans/phase-0.5-tickets/README.md',
  'docs/roadmap/phases/phase-0.25-ui-improvements.md',
  'docs/roadmap/phases/phase-2.5-developer-tooling.md',
  'docs/specs/2026-04-17-design-system-migration-design.md',
  'docs/specs/2026-04-18-properties-panel-as-drawer-tab.md',
  'docs/specs/2026-05-12-llm-docs-sync-design.md',
  'docs/specs/2026-06-19-p05-16-hdl-compiler-design.md',
  'docs/specs/2026-06-20-non3d-ux-test-foundation-design.md',
  'docs/specs/2026-06-20-p05-17-test-execution-engine-design.md',
  'docs/specs/2026-06-20-p05-22-test-results-panel-design.md',
  'docs/specs/2026-06-21-scene-graph-routing-testing-design.md',
  'docs/specs/2026-06-21-wire-routing-lane-exclusivity-design.md',
  'docs/specs/2026-06-21-wire-routing-stage1-design.md',
  'docs/specs/2026-06-27-bus-splitter-joiner-design.md',
]

function globMatches(file, pattern) {
  const source = pattern
    .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
    .replace(/\*\*|\*/g, (star) => (star === '**' ? '.*' : '[^/]*'))
  return new RegExp(`^${source}$`).test(file)
}

/** Does this repo-relative file get the citation check? */
export function isPathExistenceFile(file, patterns = PATH_EXISTENCE_PATTERNS) {
  return (
    patterns.some((pattern) => globMatches(file, pattern)) &&
    !PATH_EXISTENCE_HISTORY.some((pattern) => globMatches(file, pattern)) &&
    !GRANDFATHERED_DOCS.includes(file)
  )
}

/** File extensions that make a slash-less token, or a token under an unknown root, a path. */
const KNOWN_EXTENSIONS = [
  'md', 'mdc', 'mdx', 'txt', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'yml', 'yaml',
  'toml', 'sh', 'html', 'css', 'svg', 'png', 'hdl', 'tst', 'cmp', 'hack', 'asm', 'vm', 'jack',
]

const CODE_SPAN = /`([^`\n]+)`/g
const LINK_TARGET = /\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g
/** CommonMark: a backtick fence's info string has no backtick, so ```x``` on one line is a span. */
const FENCE = /^ {0,3}(`{3,}(?!.*`)|~{3,})(.*)$/
// A named file with a known extension — `x.ts`, not the bare `.ts` of `.tst/.cmp` prose.
const EXTENSION = new RegExp(`(^|/)[^/.][^/]*\\.(${KNOWN_EXTENSIONS.join('|')})$`)
/** A bare `.tst` or `.md` in prose names an extension, not a dotfile. */
const BARE_EXTENSION = new RegExp(`^\\.(${KNOWN_EXTENSIONS.join('|')})$`)
/** Anything a real repo path never contains: whitespace, globs, placeholders, ellipses, JSX. */
const NOT_A_PATH = /[\s*{}<>…|=]|\.\.\./

/**
 * @typedef {{ line: number, path: string, kind: 'code' | 'link' }} PathCitation
 */

/** A `file:12`, `file:12:3` or `file:12-20` citation: the line is not the path. */
const LINE_SUFFIX = /:\d+(?::\d+)?(?:-\d+(?::\d+)?)?$/

/** `./x/` → `x`; anchors and line suffixes dropped. Returns '' when nothing is left. */
function normalise(raw) {
  return raw.replace(/#.*$/, '').replace(LINE_SUFFIX, '').replace(/^\.\//, '').replace(/\/+$/, '')
}

function isSchemeOrAbsolute(token) {
  return /^[a-z][a-z0-9+.-]*:/i.test(token) || token.startsWith('/') || token.startsWith('~')
}

/** Does a backticked token look like a repo-relative path citation? */
function codeTokenPath(token) {
  if (NOT_A_PATH.test(token) || isSchemeOrAbsolute(token)) return null
  if (token.startsWith('../') || token.startsWith('@/')) return null
  const path = normalise(token)
  if (!path) return null
  const [root] = path.split('/')
  if (KNOWN_ROOTS.includes(root)) return path
  // A trailing slash says "directory" outright: `apps/api/`, or the bare `busPlacementActions/`.
  if (token.endsWith('/')) return path
  if (path.includes('/')) return EXTENSION.test(path) ? path : null
  // Bare token: a top-level file (`AGENTS.md`, `package.json`) or dotfile (`.cursorrules`).
  if (BARE_EXTENSION.test(path)) return null
  return EXTENSION.test(path) || /^\.[A-Za-z]/.test(path) ? path : null
}

/** Resolve a link target against the citing doc; null when it is not a repo path. */
function linkTargetPath(target, docDir) {
  if (NOT_A_PATH.test(target) || isSchemeOrAbsolute(target) || target.startsWith('#')) return null
  const stripped = normalise(target)
  if (!stripped) return null
  const resolved = posix.normalize(posix.join(docDir || '', stripped))
  if (resolved === '.' || resolved.startsWith('../') || resolved === '..') return null
  return resolved
}

/**
 * @typedef {{ line: number, reason: 'unclosed' } | { line: number, reason: 'nested-opener', opener: number }} FenceWarning
 */

/** Which lines are fence or fenced content, and where the fences look broken. */
function scanFences(lines) {
  const fenced = new Array(lines.length).fill(false)
  /** @type {FenceWarning[]} */
  const warnings = []
  let open = null
  lines.forEach((line, index) => {
    const m = FENCE.exec(line)
    if (open === null) {
      if (!m) return
      open = { line: index + 1, char: m[1][0], length: m[1].length }
      fenced[index] = true
      return
    }
    fenced[index] = true
    if (!m || m[1][0] !== open.char || m[1].length < open.length) return
    if (m[2].trim() === '') open = null
    else warnings.push({ line: index + 1, reason: 'nested-opener', opener: open.line })
  })
  if (open !== null) warnings.push({ line: open.line, reason: 'unclosed' })
  return { fenced, warnings }
}

/**
 * Fences that are probably typos: one left open at the end of the file, or an opener with an
 * info string inside an open block, which a missing or extra fence above usually explains.
 * @param {string} text
 * @returns {FenceWarning[]}
 */
export function findFenceWarnings(text) {
  return scanFences((text || '').split('\n')).warnings
}

/** Render one `FENCE file:line …` per warning, for grep. */
export function formatFenceWarnings(file, warnings) {
  if (!warnings || warnings.length === 0) return ''
  return warnings
    .map((w) =>
      w.reason === 'unclosed'
        ? `FENCE ${file}:${w.line} opens a code block that never closes`
        : `FENCE ${file}:${w.line} opens a code block inside the one opened at line ${w.opener} — a stray fence above?`,
    )
    .join('\n')
}

/**
 * Extract every repo-relative path citation from markdown `text`.
 * @param {string} text
 * @param {{ docDir?: string }} [options] directory of the citing doc, for resolving links
 * @returns {PathCitation[]}
 */
export function extractPathCitations(text, options = {}) {
  const docDir = options.docDir || ''
  const citations = []
  const lines = (text || '').split('\n')
  const { fenced } = scanFences(lines)

  lines.forEach((line, index) => {
    if (fenced[index] || line.includes(MISSING_PATH_MARKER)) return

    const seen = new Set()
    const push = (path, kind) => {
      if (path === null || seen.has(path)) return
      seen.add(path)
      citations.push({ line: index + 1, path, kind })
    }
    for (const m of line.matchAll(CODE_SPAN)) push(codeTokenPath(m[1]), 'code')
    for (const m of line.matchAll(LINK_TARGET)) push(linkTargetPath(m[1], docDir), 'link')
  })

  return citations
}

/**
 * The citations in `text` whose path `exists` does not know.
 * @param {string} text
 * @param {(path: string) => boolean} exists repo-relative path, no trailing slash
 * @param {{ docDir?: string }} [options]
 * @returns {PathCitation[]}
 */
export function findDeadPaths(text, exists, options = {}) {
  const docDir = options.docDir || ''
  // A backticked citation resolves against the repo root or — like a link target already
  // does — against the citing doc: `verifier-brief.md` in docs/harness/ means its sibling.
  return extractPathCitations(text, options).filter(
    (c) => !exists(c.path) && !(c.kind === 'code' && docDir && exists(posix.join(docDir, c.path))),
  )
}

/** Render one `DEAD PATH file:line path` per hit, for grep. */
export function formatDeadPaths(file, deadPaths) {
  if (!deadPaths || deadPaths.length === 0) return ''
  return deadPaths.map((d) => `DEAD PATH ${file}:${d.line} ${d.path}`).join('\n')
}
