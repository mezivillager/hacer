// Pure decisions for scripts/sync-vectors.sh. The shell clones nand2tetris/web-ide;
// this module names the pin, the projects this slice vendors, and the licence notice.

/** Public web-ide checkout. Never a sibling ../web-ide path. */
export const WEB_IDE_URL = 'https://github.com/nand2tetris/web-ide.git'

/**
 * Release 2026.19.0 (2026-05-16). Re-running the sync script checks this commit out,
 * so the vendored bytes do not follow whatever main happens to be later.
 */
export const WEB_IDE_COMMIT = '52611ad9bc2a30d329293b0cf58be672d672ac96'

/** Project 1 only. Projects 2–5 are follow-ups to #193. */
export const VENDORED_PROJECTS = ['01']

/** @param {string[]} [projects] */
export function sparsePaths(projects = VENDORED_PROJECTS) {
  void projects
  throw new Error('not implemented')
}

/** @param {string} hdl */
export function chipNameFromHdl(hdl) {
  void hdl
  throw new Error('not implemented')
}

/**
 * @param {{hdl?: string, tst?: string, cmp?: string}} mod
 * @returns {{name: string, hdl: string, tst: string, cmp: string}}
 */
export function filesForChip(mod) {
  void mod
  throw new Error('not implemented')
}

/** The notice written to conformance/vectors/LICENSE. */
export function licenseNotice() {
  throw new Error('not implemented')
}
