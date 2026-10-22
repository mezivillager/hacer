// Pure decision logic for scripts/wt-new — no I/O, unit-tested in wt-new.logic.test.mjs.
//
// scripts/wt-new (bash) does the real work — fetch, `git worktree add`, `pnpm install
// --frozen-lockfile`, running the caller's verify command — and scripts/wt-new.mjs is its thin
// Node CLI for the two decidable steps this module owns: parsing the `<type>/<topic>` spec, and
// judging the evidence gathered along the way into one verdict.

import { createHash } from 'node:crypto'
import path from 'node:path'

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

/**
 * The verdict for one `git fetch origin` attempt, wrapped in `timeout 60` (or `gtimeout`). Only
 * exit 124 — `timeout(1)`'s own code for "the command was still running at the deadline" — is a
 * real timeout, worth retrying once whatever is holding the lock finishes. Every other nonzero
 * exit is git's own failure (a bad remote, no network, …): retrying without fixing the cause
 * cannot help, so it must never carry "wait and retry" advice — the bug a reviewer caught live,
 * reproduced with a bogus remote failing in under a second yet reported as a 60s timeout.
 * @returns {{ok: true} | {ok: false, cause: 'timeout' | 'error', reason: string}}
 */
export function judgeFetch(exitCode) {
  if (exitCode === 0) return { ok: true }
  if (exitCode === 124) {
    return {
      ok: false,
      cause: 'timeout',
      reason: 'git fetch origin timed out after 60s (a ref-lock race with a sibling worktree ' +
        'fetching at the same moment is the usual cause) — wait for it to finish and retry',
    }
  }
  return {
    ok: false,
    cause: 'error',
    reason: `git fetch origin failed (exit ${exitCode}) — see git's error above; this is not a ` +
      'timeout, so retrying without addressing the cause will not help',
  }
}

/** The one-line report `wt-new --refresh` prints for how far HEAD is from `origin/main`. */
export function formatFreshness(behind, ahead) {
  if (behind === 0) return `up to date — ${ahead} commit(s) ahead of origin/main`
  return `origin/main has moved — ${behind} commit(s) behind, ${ahead} ahead. ` +
    'Diff/rebase against origin/main, not a stale HEAD, before trusting a --numstat.'
}

const trimTrailingSlashes = (dir) => dir.replace(/\/+$/, '')

/**
 * A linked worktree's own scratch folder, `<tmpDir>/hacer-scratch/<worktree id>-<repo hash>`: the last
 * segment of its git dir and 8 hex of a hash of the common git dir, so two clones never share one.
 * Refuses the main checkout (git dir is the common dir) and any relative input.
 * @returns {{ok: true, path: string} | {ok: false, reason: string}}
 */
export function scratchFolder(tmpDir, gitDir, commonDir) {
  if (![tmpDir, gitDir, commonDir].every((dir) => typeof dir === 'string' && path.isAbsolute(dir))) {
    return { ok: false, reason: 'the temp dir, the git dir and the common git dir must all be absolute paths' }
  }
  if (trimTrailingSlashes(gitDir) === trimTrailingSlashes(commonDir)) {
    return { ok: false, reason: `${gitDir} is the main checkout's git dir — only a linked worktree gets a scratch folder` }
  }
  const id = path.basename(gitDir)
  if (id === '' || id === '.' || id === '..') {
    return { ok: false, reason: `${JSON.stringify(gitDir)} has no worktree id as its last segment` }
  }
  const repoHash = createHash('sha256').update(trimTrailingSlashes(commonDir)).digest('hex').slice(0, 8)
  return { ok: true, path: path.join(tmpDir, 'hacer-scratch', `${id}-${repoHash}`) }
}
