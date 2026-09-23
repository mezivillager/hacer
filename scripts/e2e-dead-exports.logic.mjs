// Pure logic for the e2e dead-export check (#332). No I/O — unit tested in
// e2e-dead-exports.logic.test.mjs; the git listing and the TypeScript parse live in
// e2e-dead-exports.mjs.

export const EXIT = { ok: 0, dead: 1, usage: 2 }

/** A non-spec file under `e2e/`: the helpers, fixtures, selectors and types the specs draw on. */
export function isScoped(file) {
  return file.startsWith('e2e/') && !/\.(spec|test)\.tsx?$/.test(file)
}

export function findDeadExports(modules) {
  throw new Error('not implemented')
}

export function formatReport(dead) {
  throw new Error('not implemented')
}
