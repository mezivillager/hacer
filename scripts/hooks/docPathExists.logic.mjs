// Pure logic for the "every cited repo path exists" guard.
// No I/O — the filesystem is injected, so docPathExists.logic.test.mjs runs on a fake.
//
// Why: REPO_MAP.md and AGENTS.md are the first things an agent reads, and a path that
// does not exist sends it (and its greps) nowhere. A citation is a backticked token that
// looks like a repo-relative path, or a markdown link target. Fenced code blocks are not
// scanned: tree diagrams and code samples are illustrations, not citations.

import { posix } from 'node:path'

/** Top-level directories a citation may start with. */
export const KNOWN_ROOTS = ['src', 'docs', 'scripts', 'e2e', 'tasks', 'public', '.claude', '.cursor', '.github', '.husky']

/** A line carrying this marker is skipped, for a doc that must cite a path that is not there yet. */
export const MISSING_PATH_MARKER = 'allow-missing-path'

/** File extensions that make a slash-less token, or a token under an unknown root, a path. */
const KNOWN_EXTENSIONS = [
  'md', 'mdc', 'mdx', 'txt', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'yml', 'yaml',
  'toml', 'sh', 'html', 'css', 'svg', 'png', 'hdl', 'tst', 'cmp', 'hack', 'asm', 'vm', 'jack',
]

const CODE_SPAN = /`([^`\n]+)`/g
const LINK_TARGET = /\]\(([^)\s]+)\)/g
const FENCE = /^\s*(```|~~~)/
// A named file with a known extension — `x.ts`, not the bare `.ts` of `.tst/.cmp` prose.
const EXTENSION = new RegExp(`(^|/)[^/.][^/]*\\.(${KNOWN_EXTENSIONS.join('|')})$`)
/** A bare `.tst` or `.md` in prose names an extension, not a dotfile. */
const BARE_EXTENSION = new RegExp(`^\\.(${KNOWN_EXTENSIONS.join('|')})$`)
/** Anything a real repo path never contains: whitespace, globs, placeholders, ellipses, JSX. */
const NOT_A_PATH = /[\s*{}<>…|=]|\.\.\./

/**
 * @typedef {{ line: number, path: string, kind: 'code' | 'link' }} PathCitation
 */

/** `./x/` → `x`; anchors dropped. Returns '' when nothing is left. */
function normalise(raw) {
  return raw.replace(/#.*$/, '').replace(/^\.\//, '').replace(/\/+$/, '')
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
 * Extract every repo-relative path citation from markdown `text`.
 * @param {string} text
 * @param {{ docDir?: string }} [options] directory of the citing doc, for resolving links
 * @returns {PathCitation[]}
 */
export function extractPathCitations(text, options = {}) {
  const docDir = options.docDir || ''
  const citations = []
  let inFence = false

  ;(text || '').split('\n').forEach((line, index) => {
    if (FENCE.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence || line.includes(MISSING_PATH_MARKER)) return

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
  return extractPathCitations(text, options).filter((c) => !exists(c.path))
}

/** Render one `DEAD PATH file:line path` per hit, for grep. */
export function formatDeadPaths(file, deadPaths) {
  if (!deadPaths || deadPaths.length === 0) return ''
  return deadPaths.map((d) => `DEAD PATH ${file}:${d.line} ${d.path}`).join('\n')
}
