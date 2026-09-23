// Pure logic for the e2e dead-export check (#332). No I/O — unit tested in
// e2e-dead-exports.logic.test.mjs; the git listing and the TypeScript parse live in
// e2e-dead-exports.mjs.
//
// Why: the foundation audit found 46 of 116 exported symbols in `e2e/`'s non-spec files with no
// caller anywhere, and #317 found a wait helper that had rotted unnoticed because nothing called
// it. Nothing in `lint` could see that: ESLint's unused-vars is per-file, and an exported symbol
// is "used" as far as it is concerned. This walks the import graph instead.
//
// A module record (built by the I/O half) is:
//   { file, exports: [{name, kind}], imports: [{from, name}], reexports: [{from, name, as}],
//     starReexports: [from], namespaceImports: [from], internalRefs: [name] }
// where every `from` is already resolved to a repo-relative path, or null when it left the repo.

export const EXIT = { ok: 0, dead: 1, usage: 2 }

/** A non-spec file under `e2e/`: the helpers, fixtures, selectors and types the specs draw on. */
export function isScoped(file) {
  return file.startsWith('e2e/') && !/\.(spec|test)\.tsx?$/.test(file)
}

/**
 * Every export in a scoped file that no other module imports and its own file no longer
 * references. A barrel is a conduit, not a caller: a name is used where an import *names* it,
 * which is why a `export * from` re-export alone never keeps a symbol alive.
 */
export function findDeadExports(modules) {
  const byFile = new Map(modules.map((module) => [module.file, module]))
  const used = new Set()

  /** Mark `name` used in whichever module actually declares it, following barrels. */
  const use = (from, name, seen = new Set()) => {
    const module = from === null ? undefined : byFile.get(from)
    if (!module || seen.has(module.file)) return
    seen.add(module.file)
    if (module.exports.some((e) => e.name === name)) {
      used.add(`${module.file}\u0000${name}`)
      return
    }
    for (const star of module.starReexports) use(star, name, seen)
    for (const re of module.reexports) if (re.as === name) use(re.from, re.name, seen)
  }

  for (const module of modules) {
    for (const im of module.imports) use(im.from, im.name)
    for (const ns of module.namespaceImports) {
      for (const e of byFile.get(ns)?.exports ?? []) used.add(`${ns}\u0000${e.name}`)
    }
  }

  return modules
    .filter((module) => isScoped(module.file))
    .flatMap((module) =>
      module.exports
        .filter((e) => !used.has(`${module.file}\u0000${e.name}`) && !module.internalRefs.includes(e.name))
        .map((e) => ({ file: module.file, name: e.name, kind: e.kind })),
    )
}

/** One greppable `E2E-DEAD-EXPORTS:` line, then the dead exports grouped by file. */
export function formatReport(dead) {
  const head = `E2E-DEAD-EXPORTS: ${dead.length} dead export${dead.length === 1 ? '' : 's'}`
  const files = [...new Set(dead.map((d) => d.file))]
  return [
    head,
    ...files.flatMap((file) => [
      `  ${file}`,
      ...dead.filter((d) => d.file === file).map((d) => `    ${d.kind} ${d.name}`),
    ]),
  ].join('\n')
}
