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
  return projects.map((project) => `projects/src/project_${project}`)
}

/** @param {string} hdl */
export function chipNameFromHdl(hdl) {
  const match = /^CHIP\s+([A-Za-z][A-Za-z0-9]*)/m.exec(hdl ?? '')
  if (!match) throw new Error('HDL has no CHIP declaration')
  return match[1]
}

function withTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`
}

/**
 * @param {{hdl?: string, tst?: string, cmp?: string}} mod
 * @returns {{name: string, hdl: string, tst: string, cmp: string}}
 */
export function filesForChip(mod) {
  for (const part of ['hdl', 'tst', 'cmp']) {
    if (typeof mod?.[part] !== 'string' || mod[part].length === 0) {
      throw new Error(`chip module is missing ${part}`)
    }
  }
  return {
    name: chipNameFromHdl(mod.hdl),
    hdl: withTrailingNewline(mod.hdl),
    tst: withTrailingNewline(mod.tst),
    cmp: withTrailingNewline(mod.cmp),
  }
}

/** The notice written to conformance/vectors/LICENSE. */
export function licenseNotice() {
  const projects = VENDORED_PROJECTS.join(', ')
  return (
    'Official nand2tetris project vectors, vendored for the HACER conformance oracle.\n' +
    '\n' +
    'Source checkout: https://github.com/nand2tetris/web-ide\n' +
    `Pinned commit: ${WEB_IDE_COMMIT}\n` +
    'Upstream form: TypeScript string modules (export const hdl / tst / cmp) under\n' +
    'projects/src/project_<nn>/*.ts. This tree is the extracted text, not the modules.\n' +
    `Projects included: ${projects}. Projects 2-5 are follow-ups and are not in this tree yet.\n` +
    '\n' +
    'Licence of these .hdl / .tst / .cmp files:\n' +
    'Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported\n' +
    '(CC BY-NC-SA 3.0).\n' +
    'https://creativecommons.org/licenses/by-nc-sa/3.0/\n' +
    'The rights holders state that licence for all Nand to Tetris materials and tools:\n' +
    'https://www.nand2tetris.org/license\n' +
    'Copyright Noam Nisan and Shimon Schocken. Each file\'s header identifies the text as\n' +
    'part of www.nand2tetris.org and the book "The Elements of Computing Systems" (MIT Press).\n' +
    '\n' +
    'What this is not: web-ide\'s MIT license (Copyright 2022 David Souther et al.) does not cover these files.\n' +
    'HACER\'s MIT license does not cover them either. They stay under\n' +
    'CC BY-NC-SA 3.0, including its NonCommercial and ShareAlike terms. Do not relicense\n' +
    'them as MIT.\n'
  )
}
