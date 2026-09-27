// Pure decisions for scripts/sync-vectors.sh. The shell clones nand2tetris/web-ide;
// this module names the pin, the projects vendored so far, the files each one ships,
// and the licence notice.

/** Public web-ide checkout. Never a sibling ../web-ide path. */
export const WEB_IDE_URL = 'https://github.com/nand2tetris/web-ide.git'

/**
 * Release 2026.19.0 (2026-05-16). Re-running the sync script checks this commit out,
 * so the vendored bytes do not follow whatever main happens to be later.
 */
export const WEB_IDE_COMMIT = '52611ad9bc2a30d329293b0cf58be672d672ac96'

/** Projects 1–5 are #193's scope; the ones not in VENDORED_PROJECTS yet are follow-ups. */
const PLANNED_PROJECTS = ['01', '02', '03', '04', '05']

/** Projects 1 and 2. Projects 3–5 are follow-ups to #193. */
export const VENDORED_PROJECTS = ['01', '02']

/** Extensions a vendored file may have. The .asm (04) and .hack (05) slices widen this. */
const VENDORED_EXTENSIONS = ['hdl', 'tst', 'cmp']

const IDENTIFIER = '[A-Za-z_$][\\w$]*'
/** `import * as X from "./NN_x.js";`, a string module in the project's own directory. */
const MODULE_IMPORT = new RegExp(`^import \\* as (${IDENTIFIER}) from "\\./([\\w-]+)\\.js";$`, 'gm')
/** `"File.ext": X.export` in CHIPS. */
const CHIPS_ENTRY = new RegExp(`^"([^"]+)"\\s*:\\s*(${IDENTIFIER})\\.(${IDENTIFIER})$`)
/** `Name: X.export` in BUILTIN_CHIPS, shipped as Name.hdl. */
const BUILTIN_ENTRY = new RegExp(`^(${IDENTIFIER})\\s*:\\s*(${IDENTIFIER})\\.(${IDENTIFIER})$`)
const FILE_NAME = new RegExp(`^[A-Za-z0-9][\\w-]*\\.(?:${VENDORED_EXTENSIONS.join('|')})$`)
const EXTENSION_LIST = VENDORED_EXTENSIONS.map((ext) => `.${ext}`).join(', ').replace(/, ([^,]+)$/, ' or $1')

/** @param {string[]} [projects] */
export function sparsePaths(projects = VENDORED_PROJECTS) {
  return projects.map((project) => `projects/src/project_${project}`)
}

/**
 * The text between `export const <name> = {` and the next `}`, or null when index.ts has no
 * such map. A nested object or a brace in a string cuts the body short, and the cut entry then
 * fails the plain-entry check, so this never reads past a shape it does not understand.
 */
function mapBody(source, name) {
  const open = new RegExp(`^export const ${name}\\s*=\\s*\\{`, 'm').exec(source)
  if (!open) return null
  const start = open.index + open[0].length
  const end = source.indexOf('}', start)
  if (end === -1) throw new Error(`index.ts ${name} map is not closed`)
  return source.slice(start, end)
}

/** Each comma-separated entry of a map body as [key, alias, exportName]; anything else throws. */
function mapEntries(body, name, pattern) {
  return body
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .map((piece) => {
      const match = pattern.exec(piece)
      if (!match) throw new Error(`index.ts ${name} entry is not a plain X.export reference: ${piece}`)
      return match.slice(1)
    })
}

/**
 * The files a project's upstream index.ts ships, in its order. index.ts imports web-ide's own
 * dependencies, so a sparse checkout cannot import it: it is read as text. Its CHIPS map gives
 * `"File.ext": X.export`, its BUILTIN_CHIPS map `Name: X.export` (shipped as Name.hdl), and X
 * must be one of its `import * as X from "./NN_x.js"` modules. Anything else throws, as does a
 * file shipped twice: the sync fails closed and never guesses (#193).
 * @param {string} indexSource
 * @returns {{file: string, module: string, exportName: string}[]}
 */
export function shippedFiles(indexSource) {
  const modules = new Map(
    Array.from(indexSource.matchAll(MODULE_IMPORT), ([, alias, name]) => [alias, `${name}.ts`]),
  )
  const chips = mapBody(indexSource, 'CHIPS')
  if (chips === null) throw new Error('index.ts has no CHIPS map')
  const builtins = mapEntries(mapBody(indexSource, 'BUILTIN_CHIPS') ?? '', 'BUILTIN_CHIPS', BUILTIN_ENTRY)
  const entries = [
    ...mapEntries(chips, 'CHIPS', CHIPS_ENTRY),
    ...builtins.map(([name, alias, exportName]) => [`${name}.hdl`, alias, exportName]),
  ]
  const seen = new Set()
  return entries.map(([file, alias, exportName]) => {
    if (!FILE_NAME.test(file)) throw new Error(`index.ts names ${file}, not a flat ${EXTENSION_LIST} file name`)
    if (seen.has(file)) throw new Error(`index.ts has a duplicate output path ${file}`)
    seen.add(file)
    const module = modules.get(alias)
    if (!module) throw new Error(`index.ts reads ${file} from unknown module ${alias}`)
    return { file, module, exportName }
  })
}

/**
 * Throws when a vendored project directory holds a file its upstream index.ts does not ship.
 * The sync refuses rather than deletes: the tree is a held-out oracle, so a vector leaves it only
 * by a reviewed `git rm`, never as a side effect of a run, including one whose parser reads a
 * later index.ts short. Files that are shipped but missing are fine; the sync writes them.
 * @param {string} project
 * @param {string[]} onDisk names in conformance/vectors/<project>/, [] before the first sync
 * @param {string[]} shipped
 */
export function refuseUnshipped(project, onDisk, shipped) {
  const wanted = new Set(shipped)
  const extra = onDisk.filter((name) => !wanted.has(name)).sort()
  if (extra.length > 0) {
    throw new Error(
      `conformance/vectors/${project} holds ${extra.join(', ')}, which upstream does not ship at ${WEB_IDE_COMMIT}. ` +
        'If upstream dropped it, git rm it in its own commit and re-run.',
    )
  }
}

function withTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`
}

/**
 * One shipped file's text: its module's export, ending in a newline.
 * @param {Record<string, unknown>} mod
 * @param {{file: string, module: string, exportName: string}} entry
 */
export function exportText(mod, { file, module, exportName }) {
  const text = mod?.[exportName]
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${module} has no ${exportName} text for ${file}`)
  }
  return withTrailingNewline(text)
}

/** The notice written to conformance/vectors/LICENSE. */
export function licenseNotice() {
  const projects = VENDORED_PROJECTS.join(', ')
  const pending = PLANNED_PROJECTS.filter((project) => !VENDORED_PROJECTS.includes(project))
  const followUps = pending.length > 0 ? ` Projects ${pending.join(', ')} are follow-ups and are not in this tree yet.` : ''
  return (
    'Official nand2tetris project vectors, vendored for the HACER conformance oracle.\n' +
    '\n' +
    'Source checkout: https://github.com/nand2tetris/web-ide\n' +
    `Pinned commit: ${WEB_IDE_COMMIT}\n` +
    'Upstream form: TypeScript string modules under projects/src/project_<nn>/*.ts. Each\n' +
    'project\'s index.ts names the files it ships and the export each is read from; this\n' +
    'tree is that extracted text, not the modules.\n' +
    `Projects included: ${projects}.${followUps}\n` +
    '\n' +
    'Licence of these .hdl / .tst / .cmp files:\n' +
    'Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported\n' +
    '(CC BY-NC-SA 3.0).\n' +
    'https://creativecommons.org/licenses/by-nc-sa/3.0/\n' +
    'The rights holders state that licence for all Nand to Tetris materials and tools:\n' +
    'https://www.nand2tetris.org/license\n' +
    'Copyright Noam Nisan and Shimon Schocken. Each .hdl and .tst file\'s header identifies the\n' +
    'text as part of www.nand2tetris.org and the book "The Elements of Computing Systems" (MIT Press).\n' +
    '\n' +
    'What this is not: web-ide\'s MIT license (Copyright 2022 David Souther et al.) does not cover these files.\n' +
    'HACER\'s MIT license does not cover them either. They stay under\n' +
    'CC BY-NC-SA 3.0, including its NonCommercial and ShareAlike terms. Do not relicense\n' +
    'them as MIT.\n'
  )
}
