// Pure detection logic for the "no machine-specific absolute paths in docs" guard.
// No I/O — fully unit tested in docPaths.logic.test.mjs.
//
// Why: an absolute path like /Users/villager/Documents/... is true on exactly one
// machine. It rots the moment a directory is renamed (see PR #132) and is useless
// to any other contributor or agent. Docs should use repo-relative paths instead.

/** Tilde roots that mean the same thing on every machine, so they stay legal. */
export const ALLOWED_TILDE_ROOTS = ['.claude', '.config', '.cursor', '.local', '.ssh']

/** A line carrying this marker is skipped, for the rare doc that must quote a real path. */
export const OPT_OUT_MARKER = 'allow-abs-path'

/**
 * Vendored trees we do not own. `scripts/sync-superpowers.sh` overwrites
 * `.claude/skills/` wholesale, so "fixing" a path there is reverted on the next
 * sync and would then fail CI forever — except for the two skills that script
 * explicitly preserves, which are ours and are checked.
 */
const VENDORED_PREFIXES = ['.claude/skills/', '.cursor/', 'node_modules/', '.tmp_superpowers/']
const OWNED_SKILLS = ['.claude/skills/hacer-patterns/', '.claude/skills/docs-sync/']

/** Generated files nobody hand-edits. */
const GENERATED_FILES = ['CHANGELOG.md']

// A path only counts when it starts at a boundary, so https://example.com/home/x
// is not mistaken for a home directory.
const BOUNDARY = String.raw`(?:^|[\s\`'"(\[=|])`
const SEGMENT = String.raw`[^\s\`'")\]]+`

const RULES = [
  { name: 'unix-home', re: new RegExp(`${BOUNDARY}(\\/(?:Users|home|root)\\/${SEGMENT})`, 'g') },
  { name: 'windows-drive', re: new RegExp(`${BOUNDARY}([A-Za-z]:\\\\${SEGMENT})`, 'g') },
  { name: 'tilde-home', re: new RegExp(`${BOUNDARY}(~\\/${SEGMENT})`, 'g') },
]

/** Is this a doc we author and therefore police? */
export function isScannedFile(p) {
  if (!p) return false
  if (!/\.mdx?$/.test(p) && !p.endsWith('.markdown')) return false
  if (GENERATED_FILES.includes(p)) return false
  if (OWNED_SKILLS.some((prefix) => p.startsWith(prefix))) return true
  if (VENDORED_PREFIXES.some((prefix) => p.startsWith(prefix))) return false
  return true
}

/** `~/.claude/hooks` is portable; `~/Documents/codelab` is not. */
function isPortableTildePath(match) {
  const root = match.slice(2).split('/')[0]
  return ALLOWED_TILDE_ROOTS.includes(root)
}

/**
 * Find every machine-specific absolute path in `text`.
 * @returns {{line:number, column:number, match:string, rule:string}[]}
 */
export function findAbsolutePaths(text) {
  const violations = []
  const lines = (text || '').split('\n')

  lines.forEach((line, index) => {
    if (line.includes(OPT_OUT_MARKER)) return

    for (const { name, re } of RULES) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(line)) !== null) {
        const match = m[1]
        if (name === 'tilde-home' && isPortableTildePath(match)) continue
        violations.push({
          line: index + 1,
          column: line.indexOf(match, m.index) + 1,
          match,
          rule: name,
        })
      }
    }
  })

  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

/** Render violations as `file:line:col  match`, one per line, for a terminal. */
export function formatViolations(file, violations) {
  if (!violations || violations.length === 0) return ''
  return violations.map((v) => `  ${file}:${v.line}:${v.column}  ${v.match}`).join('\n')
}
