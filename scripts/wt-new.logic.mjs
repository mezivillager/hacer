// Pure decision logic for scripts/wt-new — no I/O, unit-tested in wt-new.logic.test.mjs.
//
// scripts/wt-new (bash) does the real work — fetch, `git worktree add`, `pnpm install
// --frozen-lockfile`, running the caller's verify command — and scripts/wt-new.mjs is its thin
// Node CLI for the two decidable steps this module owns: parsing the `<type>/<topic>` spec, and
// judging the evidence gathered along the way into one verdict.

const SPEC_RE = /^([a-z][a-z0-9]*)\/([a-z0-9][a-z0-9._-]*)$/

/**
 * Parse `<type>/<topic>` into the branch and worktree-directory names the repo's own convention
 * uses (.cursor/rules/020-git-worktree-no-main.mdc): the branch is the spec unchanged; the
 * worktree is always `hacer-wt-<topic>`, a sibling of the repo root — matching every worktree
 * already in this workspace (hacer-wt-222, hacer-wt-296, …), whether `<topic>` carries an issue
 * number (`157-wt-new`) or not (`probe`).
 * @returns {{ok: true, branch: string, dirName: string} | {ok: false, error: string}}
 */
export function parseSpec(spec) {
  const match = typeof spec === 'string' ? SPEC_RE.exec(spec) : null
  if (!match) {
    return {
      ok: false,
      error: `expected "<type>/<topic>" (lowercase, e.g. "feat/157-wt-new"), got ${JSON.stringify(spec ?? null)}`,
    }
  }
  const [, type, topic] = match
  return { ok: true, branch: `${type}/${topic}`, dirName: `hacer-wt-${topic}` }
}

/**
 * The packages @babel/helper-compilation-targets's nested node_modules must symlink after a
 * fresh install (implementer-brief.md): a plain, non-frozen install fixes only the top level and
 * leaves every test failing on `_lruCache is not a constructor`.
 */
export const REQUIRED_BABEL_HELPERS = ['browserslist', 'lru-cache', 'semver']

/** Whether a listing of that directory has every required unscoped symlink. */
export function hasBabelHelperSymlinks(entries) {
  const found = new Set(entries ?? [])
  return REQUIRED_BABEL_HELPERS.every((name) => found.has(name))
}

/** `git status --porcelain` output: empty (after trimming) means the worktree is clean. */
export function isTreeClean(porcelainOutput) {
  return (porcelainOutput ?? '').trim().length === 0
}

/**
 * The verdict wt-new exits on. Checks run in this fixed order, so the first failure is also the
 * most useful explanation of what went wrong: a broken install explains everything downstream, so
 * it is judged before the verify command even ran, which in turn is judged before the tree-clean
 * check that only makes sense once both already passed.
 * @param {{babelHelpersOk: boolean, verifyExitCode: number, treeClean: boolean}} evidence
 * @returns {{ok: true, reason: null} | {ok: false, reason: string}}
 */
export function judge(evidence) {
  if (!evidence.babelHelpersOk) {
    return { ok: false, reason: 'the @babel helper symlinks are missing — install did not finish cleanly' }
  }
  if (evidence.verifyExitCode !== 0) {
    return { ok: false, reason: `the verify command exited ${evidence.verifyExitCode}` }
  }
  if (!evidence.treeClean) {
    return { ok: false, reason: 'the worktree has uncommitted changes after install' }
  }
  return { ok: true, reason: null }
}
