// Pure decision logic for the docs-sync Stop hook. No I/O — fully unit tested.

const CODE_PREFIXES = ['src/', 'e2e/']

export const REMINDER = [
  'Docs-sync checkpoint: this session changed code (src/ or e2e/) but touched no documentation.',
  'Before wrapping up, run the `docs-sync` skill to:',
  '  1. Record any emergent decisions / new directions as an ADR in docs/decisions/.',
  '  2. Run the author pass in docs/llm-docs-sync.md to reconcile living docs.',
  'If no doc-relevant decision was made, say so explicitly and continue.',
].join('\n')

/** Product/behaviour code that may embody a decision. */
export function isCodePath(p) {
  return CODE_PREFIXES.some((prefix) => p.startsWith(prefix))
}

/** Documentation (so the session already touched docs). CHANGELOG.md is auto-generated, not a doc touch. */
export function isDocPath(p) {
  if (p === 'CHANGELOG.md') return false
  if (p.startsWith('docs/')) return true
  if (p === '.cursorrules') return true
  return p.endsWith('.md')
}

/** Parse `git status --porcelain` output (uncommitted changes) into changed paths. */
export function parsePorcelainPaths(text) {
  return (text || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3)) // strip the 2 status chars + space
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // rename: take new path
    .map((p) => p.replace(/^"|"$/g, '').trim())
    .filter(Boolean)
}

/** Parse `git diff --name-only` output (committed changes vs a base) into changed paths. */
export function parseDiffNamesPaths(text) {
  return (text || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Union of uncommitted (porcelain) and committed (diff vs base) changed paths, deduped.
 * Detecting committed changes is what stops the "work committed before Stop" bypass.
 */
export function collectChangedPaths(porcelainText, diffText) {
  return [...new Set([...parsePorcelainPaths(porcelainText), ...parseDiffNamesPaths(diffText)])]
}

/**
 * Decide whether the Stop hook should remind/block to prompt a docs-sync.
 * @param {{ stopHookActive?: boolean, alreadyReminded?: boolean, changedPaths?: string[], enforce?: boolean }} input
 * @returns {{ remind: boolean, block: boolean, reason: string }}
 */
export function evaluateStopHook(input) {
  const {
    stopHookActive = false,
    alreadyReminded = false,
    changedPaths = [],
    enforce = true,
  } = input

  const quiet = { remind: false, block: false, reason: '' }
  if (stopHookActive || alreadyReminded) return quiet

  const codeChanged = changedPaths.some(isCodePath)
  const docsTouched = changedPaths.some(isDocPath)

  if (codeChanged && !docsTouched) {
    return { remind: true, block: enforce, reason: REMINDER }
  }
  return quiet
}
