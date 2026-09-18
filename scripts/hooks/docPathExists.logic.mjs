// Pure logic for the "every cited repo path exists" guard.
// No I/O — the filesystem is injected, so docPathExists.logic.test.mjs runs on a fake.

/** Top-level directories a citation may start with. */
export const KNOWN_ROOTS = ['src', 'docs', 'scripts', 'e2e', 'tasks', 'public', '.claude', '.cursor', '.github', '.husky']

/** A line carrying this marker is skipped, for a doc that must cite a path that is not there yet. */
export const MISSING_PATH_MARKER = 'allow-missing-path'

/**
 * @typedef {{ line: number, path: string, kind: 'code' | 'link' }} PathCitation
 */

/**
 * Extract every repo-relative path citation from markdown `text`.
 * @param {string} text
 * @param {{ docDir?: string }} [options] directory of the citing doc, for resolving links
 * @returns {PathCitation[]}
 */
export function extractPathCitations(text, options = {}) {
  void text
  void options
  return []
}

/**
 * The citations in `text` whose path `exists` does not know.
 * @param {string} text
 * @param {(path: string) => boolean} exists repo-relative path, no trailing slash
 * @param {{ docDir?: string }} [options]
 * @returns {PathCitation[]}
 */
export function findDeadPaths(text, exists, options = {}) {
  void text
  void exists
  void options
  return []
}

/** Render one `DEAD PATH file:line path` per hit, for grep. */
export function formatDeadPaths(file, deadPaths) {
  void file
  void deadPaths
  return ''
}
