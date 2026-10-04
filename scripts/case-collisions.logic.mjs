// Tracked paths that are one path on macOS: case and Unicode normalization are ignored (#516, #682). No I/O — case-collisions.mjs lists the tree.
// An extension-less import resolves by stem, so Foo.tsx beside foo.ts collides though the two full paths do not.

export const USAGE = 'usage: node scripts/case-collisions.mjs [--root <repo>]'

// Vite's default resolve.extensions plus what TypeScript's bundler resolution reads; `.d.*` before `.ts`.
const MODULE_EXTENSIONS = ['.d.ts', '.d.mts', '.d.cts', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json']

const collisionKey = (name) => name.normalize('NFC').toLowerCase()
const dirname = (file) => file.slice(0, Math.max(file.lastIndexOf('/'), 0))
const basename = (file) => file.slice(file.lastIndexOf('/') + 1)

function moduleStems(file) {
  const name = basename(file)
  const extension = MODULE_EXTENSIONS.find((ext) => name.length > ext.length && name.endsWith(ext))
  if (extension === undefined) return []
  const stem = file.slice(0, -extension.length)
  const dir = dirname(file)
  return basename(stem) === 'index' && dir !== '' ? [stem, dir] : [stem]
}

function directoriesOf(files) {
  const dirs = new Set()
  for (const file of files) {
    for (let at = file.indexOf('/'); at !== -1; at = file.indexOf('/', at + 1)) dirs.add(file.slice(0, at))
  }
  return dirs
}

function groupsOf(entries, keep = () => true) {
  const byKey = new Map()
  for (const entry of entries) {
    const key = collisionKey(entry.name)
    byKey.set(key, [...(byKey.get(key) ?? []), entry])
  }
  return [...byKey.values()].filter((group) => new Set(group.map((entry) => entry.name)).size > 1 && keep(group))
}

const sorted = (values) => [...new Set(values)].sort()
const byFirst = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)

/** Groups of tracked paths that collide: whole paths of files, of directories, and module stems. */
export function findCaseCollisions(files) {
  const pathEntries = [
    ...files.map((file) => ({ name: file, shown: file })),
    ...[...directoriesOf(files)].map((dir) => ({ name: dir, shown: `${dir}/` })),
  ]
  const fileGroups = []
  const directoryGroups = []
  for (const group of groupsOf(pathEntries)) {
    ;(group.some((entry) => entry.shown.endsWith('/')) ? directoryGroups : fileGroups).push(group)
  }
  const directoryGroupOf = new Map()
  directoryGroups.forEach((group, index) => {
    for (const entry of group) if (entry.shown.endsWith('/')) directoryGroupOf.set(entry.name, index)
  })
  const explainedByDirectory = (group) => {
    const parents = new Set(group.map((entry) => directoryGroupOf.get(dirname(entry.name))))
    return new Set(group.map((entry) => basename(entry.name))).size === 1 && parents.size === 1 && !parents.has(undefined)
  }
  const showAll = (group) => sorted(group.map((entry) => entry.shown))
  const file = fileGroups.filter((group) => !explainedByDirectory(group)).map(showAll)
  const directory = directoryGroups.map(showAll)
  const stemEntries = files.flatMap((path) => moduleStems(path).map((stem) => ({ name: stem, shown: path })))
  const stem = groupsOf(stemEntries, (group) => new Set(group.map((entry) => collisionKey(entry.shown))).size > 1).map(
    (group) => sorted(group.map((entry) => entry.shown)),
  )
  return {
    ok: file.length + directory.length + stem.length === 0,
    file: file.sort(byFirst),
    directory: directory.sort(byFirst),
    stem: stem.sort(byFirst),
  }
}

export function formatReport(result) {
  const counts = `${result.file.length} file · ${result.directory.length} directory · ${result.stem.length} stem`
  if (result.ok) return `CASE-COLLISIONS: PASS ${counts}\n`
  const lines = [`CASE-COLLISIONS: FAIL ${counts} — one path on a case-insensitive filesystem (macOS)`]
  for (const kind of ['file', 'directory', 'stem']) {
    for (const group of result[kind]) lines.push(`  ${kind}: ${group.join(' ↔ ')}`)
  }
  return `${lines.join('\n')}\n`
}

export function parseArgs(argv, defaults) {
  let root = defaults.root
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1] !== undefined) {
      root = argv[++i]
      continue
    }
    return { ok: false, error: `case-collisions: unexpected argument ${argv[i]}\n${USAGE}` }
  }
  return { ok: true, root }
}
