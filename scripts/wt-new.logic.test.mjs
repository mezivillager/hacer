import { describe, it, expect } from 'vitest'
import {
  REQUIRED_BABEL_HELPERS,
  formatFreshness,
  hasBabelHelperSymlinks,
  isTreeClean,
  judge,
  judgeFetch,
  parseSpec,
} from './wt-new.logic.mjs'

describe('parseSpec', () => {
  it('splits a real branch spec into the branch (unchanged) and the hacer-wt-<topic> dir name', () => {
    expect(parseSpec('feat/157-wt-new')).toEqual({ ok: true, branch: 'feat/157-wt-new', dirName: 'hacer-wt-157-wt-new' })
    expect(parseSpec('fix/222-stale-pin-values')).toEqual({
      ok: true, branch: 'fix/222-stale-pin-values', dirName: 'hacer-wt-222-stale-pin-values',
    })
  })

  it('accepts the issue verification command\'s spec with no issue number', () => {
    expect(parseSpec('chore/probe')).toEqual({ ok: true, branch: 'chore/probe', dirName: 'hacer-wt-probe' })
  })

  it('accepts a topic with dots and underscores as well as hyphens', () => {
    expect(parseSpec('docs/v1.2_notes')).toEqual({ ok: true, branch: 'docs/v1.2_notes', dirName: 'hacer-wt-v1.2_notes' })
  })

  for (const bad of [undefined, null, '', 'no-slash', '/topic', 'type/', 'a/b/c', 'Feat/Topic', 'feat/../escape', ' feat/topic']) {
    it(`rejects ${JSON.stringify(bad)}`, () => {
      const result = parseSpec(bad)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/expected "<type>\/<topic>"/)
    })
  }
})

describe('REQUIRED_BABEL_HELPERS', () => {
  it('is the three packages implementer-brief.md names', () => {
    expect(REQUIRED_BABEL_HELPERS).toEqual(['browserslist', 'lru-cache', 'semver'])
  })
})

describe('hasBabelHelperSymlinks', () => {
  it('is true when a listing has all three, in any order, alongside other entries', () => {
    expect(hasBabelHelperSymlinks(['@babel', 'semver', 'browserslist', 'lru-cache'])).toBe(true)
  })

  it('is false when any required entry is missing', () => {
    expect(hasBabelHelperSymlinks(['browserslist', 'lru-cache'])).toBe(false)
    expect(hasBabelHelperSymlinks([])).toBe(false)
  })

  it('is false, not throwing, on undefined (a missing directory)', () => {
    expect(hasBabelHelperSymlinks(undefined)).toBe(false)
  })
})

describe('isTreeClean', () => {
  it('is true for empty or whitespace-only porcelain output', () => {
    expect(isTreeClean('')).toBe(true)
    expect(isTreeClean('\n')).toBe(true)
    expect(isTreeClean(undefined)).toBe(true)
  })

  it('is false when porcelain output lists a change', () => {
    expect(isTreeClean(' M src/foo.ts\n')).toBe(false)
    expect(isTreeClean('?? untracked-file\n')).toBe(false)
  })
})

describe('judge', () => {
  const passing = { babelHelpersOk: true, verifyExitCode: 0, treeClean: true }

  it('is ok when every check passes', () => {
    expect(judge(passing)).toEqual({ ok: true, reason: null })
  })

  it('blames missing babel symlinks first, before looking at the other evidence', () => {
    const result = judge({ ...passing, babelHelpersOk: false, verifyExitCode: 1, treeClean: false })
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('@babel helper symlinks') })
  })

  it('blames the verify command next, once symlinks are fine', () => {
    const result = judge({ ...passing, verifyExitCode: 1, treeClean: false })
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('verify command exited 1') })
  })

  it('blames an unclean tree last, once install and verify both passed', () => {
    const result = judge({ ...passing, treeClean: false })
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('uncommitted changes') })
  })
})

describe('judgeFetch', () => {
  it('is ok on exit 0', () => {
    expect(judgeFetch(0)).toEqual({ ok: true })
  })

  it('blames a real timeout only on exit 124 (timeout(1)/gtimeout(1)\'s own code) and says to retry', () => {
    const result = judgeFetch(124)
    expect(result.ok).toBe(false)
    expect(result.cause).toBe('timeout')
    expect(result.reason).toMatch(/timed out after 60s/)
    expect(result.reason).toMatch(/retry/)
  })

  // The bug the verifier caught: a bogus remote fails in under a second with exit 128, and the
  // old code told an unattended agent to "wait and retry" — advice that loops forever on a
  // permanent error. Every non-124, non-zero exit must be reported as git's own failure instead.
  for (const exitCode of [1, 2, 128]) {
    it(`blames git's own failure on exit ${exitCode}, and does not say to retry`, () => {
      const result = judgeFetch(exitCode)
      expect(result.ok).toBe(false)
      expect(result.cause).toBe('error')
      expect(result.reason).toMatch(new RegExp(`exit ${exitCode}`))
      expect(result.reason).not.toMatch(/timed out/)
      expect(result.reason).not.toMatch(/wait for it to finish and retry/)
    })
  }
})

describe('formatFreshness', () => {
  it('reports up to date, with the ahead count, when nothing is behind', () => {
    expect(formatFreshness(0, 0)).toBe('up to date — 0 commit(s) ahead of origin/main')
    expect(formatFreshness(0, 3)).toBe('up to date — 3 commit(s) ahead of origin/main')
  })

  it('reports drift, with both counts, and warns against trusting a stale --numstat', () => {
    const result = formatFreshness(4, 3)
    expect(result).toMatch(/4 commit\(s\) behind, 3 ahead/)
    expect(result).toMatch(/--numstat/)
  })
})
