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

/** Projects 1 to 4. Project 5 is a follow-up to #193. */
export const VENDORED_PROJECTS = ['01', '02', '03', '04']

/** Extensions a vendored file may have: Project 04's .tst files load .asm programs. The .hack (05) slice widens this. */
const VENDORED_EXTENSIONS = ['hdl', 'tst', 'cmp', 'asm']

const IDENTIFIER = '[A-Za-z_$][\\w$]*'
/** `import * as X from "./NN_x.js";`, a string module in the project's own directory. */
const MODULE_IMPORT = new RegExp(`^import \\* as (${IDENTIFIER}) from "\\./([\\w-]+)\\.js";$`, 'gm')
/** `"File.ext": X.export` in CHIPS. */
const CHIPS_ENTRY = new RegExp(`^"([^"]+)"\\s*:\\s*(${IDENTIFIER})\\.(${IDENTIFIER})$`)
/** `Name: X.export` in BUILTIN_CHIPS, shipped as Name.hdl. */
const BUILTIN_ENTRY = new RegExp(`^(${IDENTIFIER})\\s*:\\s*(${IDENTIFIER})\\.(${IDENTIFIER})$`)
/** `Name: { ... },`, one group of a TESTS map, whose body holds no brace. */
const TESTS_GROUP = new RegExp(`^\\s*(${IDENTIFIER})\\s*:\\s*\\{([^{}]*)\\}\\s*,?`)
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
 * The entries of a TESTS map, Project 04's shape: `Name: { "File.ext": X.export, ... }` groups,
 * which upstream writes one directory per Name. Each .tst loads its siblings by bare name and no
 * name repeats across groups (shippedFiles throws on a repeat), so the groups flatten into the
 * project's one directory, as every other project is laid out. Null when index.ts has no TESTS
 * map; a map that is anything but such groups throws.
 */
function testsEntries(source) {
  const open = /^export const TESTS\s*=\s*\{/m.exec(source)
  if (!open) return null
  let rest = source.slice(open.index + open[0].length)
  const entries = []
  for (let group = TESTS_GROUP.exec(rest); group; group = TESTS_GROUP.exec(rest)) {
    entries.push(...mapEntries(group[2], `TESTS.${group[1]}`, CHIPS_ENTRY))
    rest = rest.slice(group[0].length)
  }
  if (!/^\s*\}/.test(rest)) throw new Error('index.ts TESTS map is not a list of Name: { ... } groups')
  return entries
}

/**
 * The files a project's upstream index.ts ships, in its order. index.ts imports web-ide's own
 * dependencies, so a sparse checkout cannot import it: it is read as text. Its CHIPS map gives
 * `"File.ext": X.export`, or its TESTS map groups of those (Project 04); its BUILTIN_CHIPS map
 * gives `Name: X.export` (shipped as Name.hdl); and X must be one of its
 * `import * as X from "./NN_x.js"` modules. Anything else throws, as do both maps or neither and
 * a file shipped twice: the sync fails closed and never guesses (#193).
 * @param {string} indexSource
 * @returns {{file: string, module: string, exportName: string}[]}
 */
export function shippedFiles(indexSource) {
  const modules = new Map(
    Array.from(indexSource.matchAll(MODULE_IMPORT), ([, alias, name]) => [alias, `${name}.ts`]),
  )
  const chips = mapBody(indexSource, 'CHIPS')
  const tests = testsEntries(indexSource)
  if (chips === null && tests === null) throw new Error('index.ts has no CHIPS or TESTS map')
  if (chips !== null && tests !== null) throw new Error('index.ts has both a CHIPS and a TESTS map')
  const builtins = mapEntries(mapBody(indexSource, 'BUILTIN_CHIPS') ?? '', 'BUILTIN_CHIPS', BUILTIN_ENTRY)
  const entries = [
    ...(tests ?? mapEntries(chips, 'CHIPS', CHIPS_ENTRY)),
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

/** Red stub (R757): the exclusion table, empty until the green commit. */
export const EXCLUDED = {}

/** Red stub (R757): returns the entries unchanged until the green commit. */
export function vendoredEntries(project, entries) {
  return entries
}

/**
 * The names in a vendored directory that the exact-files check reads: all but dotfiles, such as
 * Finder's .DS_Store or an editor's swap file. Disregarding them cannot hide a vector: FILE_NAME
 * makes shippedFiles refuse a name that does not start with a letter or digit, so the sync never
 * ships a dotfile, and no index.ts under web-ide's projects/src names one at the pin.
 * @param {string[]} names
 */
export function vendoredNames(names) {
  return names.filter((name) => !name.startsWith('.'))
}

/**
 * Throws once, naming every vendored project directory that holds a file its upstream index.ts
 * does not ship, so one run shows them all. The sync refuses rather than deletes (R754): the tree
 * is a held-out oracle, so a vector leaves it only by a reviewed `git rm`, never as a side effect
 * of a run, including one whose parser reads a later index.ts short. Files that are shipped but
 * missing are fine; the sync writes them. Dotfiles are disregarded (vendoredNames).
 * @param {{project: string, onDisk: string[], shipped: string[]}[]} directories onDisk is the
 *   names in conformance/vectors/<project>/, [] before the first sync
 */
export function refuseUnshipped(directories) {
  const strays = directories.flatMap(({ project, onDisk, shipped }) => {
    const wanted = new Set(shipped)
    const extra = vendoredNames(onDisk).filter((name) => !wanted.has(name)).sort()
    return extra.length > 0 ? [`conformance/vectors/${project} holds ${extra.join(', ')}`] : []
  })
  if (strays.length > 0) {
    throw new Error(
      `${strays.join('; ')}. Upstream does not ship them at ${WEB_IDE_COMMIT}. If upstream dropped one, ` +
        'remove it and re-run: git rm it in a commit of its own if git tracks it, or delete it if not.',
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
  const followUps =
    pending.length === 0
      ? ''
      : pending.length === 1
        ? ` Project ${pending[0]} is a follow-up and is not in this tree yet.`
        : ` Projects ${pending.join(', ')} are follow-ups and are not in this tree yet.`
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
    `Licence of these ${VENDORED_EXTENSIONS.map((ext) => `.${ext}`).join(' / ')} files:\n` +
    'Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported\n' +
    '(CC BY-NC-SA 3.0).\n' +
    'https://creativecommons.org/licenses/by-nc-sa/3.0/\n' +
    'The rights holders state that licence for all Nand to Tetris materials and tools:\n' +
    'https://www.nand2tetris.org/license\n' +
    'Copyright Noam Nisan and Shimon Schocken. Each .hdl, .tst and .asm file\'s header identifies the\n' +
    'text as part of www.nand2tetris.org and the book "The Elements of Computing Systems" (MIT Press).\n' +
    '\n' +
    'What this is not: web-ide\'s MIT license (Copyright 2022 David Souther et al.) does not cover these files.\n' +
    'HACER\'s MIT license does not cover them either. They stay under\n' +
    'CC BY-NC-SA 3.0, including its NonCommercial and ShareAlike terms. Do not relicense\n' +
    'them as MIT.\n'
  )
}
