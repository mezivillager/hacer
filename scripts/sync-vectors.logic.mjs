// Pure decisions for scripts/sync-vectors.sh. The shell clones nand2tetris/web-ide;
// this module names the pin, the projects vendored, the files each one ships, the few
// it leaves out, and the licence notice.

/** Public web-ide checkout. Never a sibling ../web-ide path. */
export const WEB_IDE_URL = 'https://github.com/nand2tetris/web-ide.git'

/**
 * Release 2026.19.0 (2026-05-16). Re-running the sync script checks this commit out,
 * so the vendored bytes do not follow whatever main happens to be later.
 */
export const WEB_IDE_COMMIT = '52611ad9bc2a30d329293b0cf58be672d672ac96'

/** Projects 1 to 4. Project 5 is the next commit. */
export const VENDORED_PROJECTS = ['01', '02', '03', '04']

/** Extensions a vendored file may have: .tst files load .asm (04) and .hack (05) programs. */
const VENDORED_EXTENSIONS = ['hdl', 'tst', 'cmp', 'asm', 'hack']

const IDENTIFIER = '[A-Za-z_$][\\w$]*'
/**
 * `import * as X from "./NN_x.js";`, a string module in the project's own directory, or from
 * "../project_NN/NN_x.js", a sibling project's: Project 05 reads Project 03's RAM16K stub.
 */
const MODULE_IMPORT = new RegExp(`^import \\* as (${IDENTIFIER}) from "(\\./|\\.\\./project_\\d{2}/)([\\w-]+)\\.js";$`, 'gm')
/** A plain `X.export` reference. */
const REFERENCE = `(${IDENTIFIER})\\.(${IDENTIFIER})`
/** A double-quoted string with no escape, quote or line break in it, so its text is its value. */
const LITERAL = '"([^"\\\\\\n]*)"'
/** Each map entry is read from the front of what is left, up to its comma or the map's end. */
const ENTRY_END = '\\s*(?:,|$)'
/** `"File.ext": X.export,` in CHIPS or a TESTS group. */
const CHIPS_ENTRY = new RegExp(`^\\s*"([^"]+)"\\s*:\\s*${REFERENCE}${ENTRY_END}`)
/**
 * `Name: X.export,` in BUILTIN_CHIPS, shipped as Name.hdl; or `Name: X.export.replace("literal",
 * "literal"),`, the one derived shape upstream uses (Project 05's RAM16K), which EXCLUDED then
 * leaves out (R757). No other expression is read, and no other map takes this one.
 */
const BUILTIN_ENTRY = new RegExp(
  `^\\s*(${IDENTIFIER})\\s*:\\s*${REFERENCE}(?:\\.replace\\(\\s*${LITERAL}\\s*,\\s*${LITERAL}\\s*,?\\s*\\))?${ENTRY_END}`,
)
const BUILTIN_SHAPE = 'a plain X.export reference, or one .replace("literal", "literal") of it'
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

/**
 * Each entry of a map body, read from the front, as its pattern's groups ([key, alias, exportName,
 * ...]); anything the pattern does not match throws.
 */
function mapEntries(body, name, pattern, shape = 'a plain X.export reference') {
  const entries = []
  for (let rest = body; rest.trim().length > 0; ) {
    const match = pattern.exec(rest)
    if (!match) throw new Error(`index.ts ${name} entry is not ${shape}: ${rest.trim().split('\n')[0]}`)
    entries.push(match.slice(1))
    rest = rest.slice(match[0].length)
  }
  return entries
}

/**
 * The entries of a TESTS map, Project 04's shape: `Name: { "File.ext": X.export, ... }` groups,
 * which upstream writes one directory per Name, so each entry keeps its group. Each .tst loads its
 * siblings by bare name and no name repeats across groups (shippedFiles throws on a repeat), so
 * the groups flatten into the project's one directory, as every other project is laid out. Null
 * when index.ts has no TESTS map; a map that is anything but such groups throws, and so does a
 * group name given twice, of which JS would keep only the last.
 */
function testsEntries(source) {
  const open = /^export const TESTS\s*=\s*\{/m.exec(source)
  if (!open) return null
  let rest = source.slice(open.index + open[0].length)
  const entries = []
  const groups = new Set()
  for (let match = TESTS_GROUP.exec(rest); match; match = TESTS_GROUP.exec(rest)) {
    const [whole, group, body] = match
    if (groups.has(group)) throw new Error(`index.ts TESTS map repeats group ${group}; JS would keep only the last`)
    groups.add(group)
    for (const [file, alias, exportName] of mapEntries(body, `TESTS.${group}`, CHIPS_ENTRY)) {
      entries.push({ file, alias, exportName, group })
    }
    rest = rest.slice(whole.length)
  }
  if (!/^\s*\}/.test(rest)) throw new Error('index.ts TESTS map is not a list of Name: { ... } groups')
  return entries
}

/**
 * The files a project's upstream index.ts ships, in its order. index.ts imports web-ide's own
 * dependencies, so a sparse checkout cannot import it: it is read as text. Its CHIPS map gives
 * `"File.ext": X.export`, or its TESTS map groups of those (Project 04, each entry keeping its
 * `group`); its BUILTIN_CHIPS map gives `Name: X.export` (shipped as Name.hdl), or the one derived
 * shape `Name: X.export.replace("literal", "literal")` (its `replace`); and X must be one of its
 * `import * as X from "./NN_x.js"` or `"../project_NN/NN_x.js"` modules. Anything else throws, as
 * do both maps or neither and a file shipped twice: the sync fails closed and never guesses (#193).
 * @param {string} indexSource
 * @returns {{file: string, module: string, exportName: string, group?: string,
 *   replace?: {search: string, replacement: string}}[]}
 */
export function shippedFiles(indexSource) {
  const modules = new Map(
    Array.from(indexSource.matchAll(MODULE_IMPORT), ([, alias, from, name]) => [alias, `${from === './' ? '' : from}${name}.ts`]),
  )
  const chips = mapBody(indexSource, 'CHIPS')
  const tests = testsEntries(indexSource)
  if (chips === null && tests === null) throw new Error('index.ts has no CHIPS or TESTS map')
  if (chips !== null && tests !== null) throw new Error('index.ts has both a CHIPS and a TESTS map')
  const builtins = mapEntries(mapBody(indexSource, 'BUILTIN_CHIPS') ?? '', 'BUILTIN_CHIPS', BUILTIN_ENTRY, BUILTIN_SHAPE)
  const entries = [
    ...(tests ?? mapEntries(chips, 'CHIPS', CHIPS_ENTRY).map(([file, alias, exportName]) => ({ file, alias, exportName }))),
    ...builtins.map(([name, alias, exportName, search, replacement]) => ({
      file: `${name}.hdl`,
      alias,
      exportName,
      ...(search === undefined ? {} : { replace: { search, replacement } }),
    })),
  ]
  const seen = new Set()
  return entries.map(({ file, alias, ...rest }) => {
    if (!FILE_NAME.test(file)) throw new Error(`index.ts names ${file}, not a flat ${EXTENSION_LIST} file name`)
    if (seen.has(file)) throw new Error(`index.ts has a duplicate output path ${file}`)
    seen.add(file)
    const module = modules.get(alias)
    if (!module) throw new Error(`index.ts reads ${file} from unknown module ${alias}`)
    return { file, module, ...rest }
  })
}

/**
 * Files an upstream index.ts ships that are not course material, which the sync does not vendor
 * (R757): project, then file, then a one-line reason that the LICENSE repeats. Applied after the
 * strict parse, by vendoredEntries.
 */
export const EXCLUDED = Object.freeze({
  '05': Object.freeze({
    'MaxRam.tst': "web-ide's own e2e fixture (web-ide #652, MIT), not course material",
    'MaxRam.cmp': "web-ide's own e2e fixture (web-ide #652, MIT), not course material",
    'RAM16K.hdl':
      "web-ide's derived built-in, RAM16K.hdl.replace() over Project 3's stub: not course material, " +
      'and 03/RAM16K.hdl but for its one new line',
  }),
})

/**
 * The entries of a project's shippedFiles that the sync vendors: all but its EXCLUDED files. It
 * fails closed both ways. An exclusion that matches nothing shipped throws, so a later pin that
 * drops or renames the file is noticed. So does a derived entry that no exclusion names: its text
 * is web-ide's .replace() over another file, never course material, and exportText does not apply it.
 * @param {string} project
 * @param {ReturnType<typeof shippedFiles>} entries
 */
export function vendoredEntries(project, entries) {
  const excluded = EXCLUDED[project] ?? {}
  const shipped = new Set(entries.map((entry) => entry.file))
  for (const file of Object.keys(excluded)) {
    if (!shipped.has(file)) throw new Error(`exclusion ${project}/${file} matches nothing upstream ships at ${WEB_IDE_COMMIT}`)
  }
  const kept = entries.filter((entry) => !Object.hasOwn(excluded, entry.file))
  const derived = kept.find((entry) => entry.replace !== undefined)
  if (derived) {
    throw new Error(
      `index.ts derives ${derived.file} with .replace(), and no exclusion names it: a derived file is web-ide's, not course material`,
    )
  }
  return kept
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
 * Throws once, naming every vendored project directory that holds a file the sync does not vendor
 * there, so one run shows them all: one its upstream index.ts does not ship, or one EXCLUDED leaves
 * out, since `shipped` is vendoredEntries' list. The sync refuses rather than deletes (R754): the tree
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
      `${strays.join('; ')}. Upstream does not ship them at ${WEB_IDE_COMMIT}, or EXCLUDED leaves them out. ` +
        'If upstream dropped one or EXCLUDED names it, remove it and re-run: git rm it in a commit of its own ' +
        'if git tracks it, or delete it if not.',
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
  const excluded = Object.entries(EXCLUDED).flatMap(([project, files]) =>
    Object.entries(files).map(([file, reason]) => `- ${project}/${file}: ${reason}.\n`),
  )
  return (
    'Official nand2tetris project vectors, vendored for the HACER conformance oracle.\n' +
    '\n' +
    'Source checkout: https://github.com/nand2tetris/web-ide\n' +
    `Pinned commit: ${WEB_IDE_COMMIT}\n` +
    'Upstream form: TypeScript string modules under projects/src/project_<nn>/*.ts. Each\n' +
    'project\'s index.ts names the files it ships and the export each is read from; this\n' +
    'tree is that extracted text, not the modules.\n' +
    `Projects included: ${VENDORED_PROJECTS.join(', ')}.\n` +
    (excluded.length === 0 ? '' : `Not vendored, although upstream ships them:\n${excluded.join('')}`) +
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
