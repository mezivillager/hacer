import { describe, it, expect } from 'vitest'
import {
  parsePrNumber,
  foldersNeedingLookup,
  planRemovals,
  safetyCheck,
  DEFAULT_MAX_REMOVALS,
} from './pr-preview-sweep.logic.mjs'

describe('parsePrNumber', () => {
  it('reads the PR number out of a pr-preview folder name', () => {
    expect(parsePrNumber('pr-410')).toBe(410)
    expect(parsePrNumber('pr-1')).toBe(1)
  })

  it('returns null for a folder name with no PR number', () => {
    expect(parsePrNumber('assets')).toBeNull()
    expect(parsePrNumber('pr-')).toBeNull()
    expect(parsePrNumber('pr-abc')).toBeNull()
    expect(parsePrNumber('pr-410-old')).toBeNull()
  })
})

describe('foldersNeedingLookup', () => {
  it('skips a folder the open-PR pre-filter already proves open', () => {
    expect(foldersNeedingLookup(['pr-1', 'pr-2'], [1])).toEqual(['pr-2'])
  })

  it('needs a lookup for every folder when the pre-filter list is empty', () => {
    expect(foldersNeedingLookup(['pr-1', 'pr-2'], [])).toEqual(['pr-1', 'pr-2'])
  })

  it('never asks for a lookup on a folder with no PR number', () => {
    expect(foldersNeedingLookup(['assets', 'pr-1'], [])).toEqual(['pr-1'])
  })
})

describe('planRemovals', () => {
  // The bug a verifier reproduced on PR #491: `gh pr list` returned [], and here every
  // per-folder lookup also produced nothing (the state map has no entries at all). Positive
  // evidence is required for removal, so *absence* of evidence must keep everything.
  it('removes nothing when no folder has a resolved state (list and every lookup failed)', () => {
    const { toRemove, kept } = planRemovals(['pr-1', 'pr-2', 'pr-3'], new Map())
    expect(toRemove).toEqual([])
    expect(kept).toHaveLength(3)
    expect(kept.every((f) => f.reason?.includes('no positive evidence of closure'))).toBe(true)
  })

  it("keeps a folder whose PR view says OPEN", () => {
    const states = new Map([['pr-1', 'OPEN']])
    const { toRemove, kept } = planRemovals(['pr-1'], states)
    expect(toRemove).toEqual([])
    expect(kept).toEqual([{ name: 'pr-1', reason: null }])
  })

  it('keeps a folder whose PR view failed (no entry in the state map), with a reason', () => {
    const { toRemove, kept } = planRemovals(['pr-2'], new Map())
    expect(toRemove).toEqual([])
    expect(kept[0].reason).toMatch(/pr #2: no positive evidence of closure/)
  })

  it('removes a folder proven CLOSED or MERGED', () => {
    const states = new Map([
      ['pr-3', 'CLOSED'],
      ['pr-4', 'MERGED'],
    ])
    const { toRemove, kept } = planRemovals(['pr-3', 'pr-4'], states)
    expect(toRemove).toEqual(['pr-3', 'pr-4'])
    expect(kept).toEqual([])
  })

  it('leaves a folder with no PR number alone regardless of the state map', () => {
    const states = new Map([['assets', 'CLOSED']]) // even a bogus entry can't remove it
    const { toRemove, kept } = planRemovals(['assets'], states)
    expect(toRemove).toEqual([])
    expect(kept).toEqual([{ name: 'assets', reason: 'no PR number in folder name' }])
  })

  // Real gh-pages + gh pr state, fetched 2026-09-25 (round 2) via:
  //   gh api "repos/mezivillager/hacer/contents/pr-preview?ref=gh-pages" --jq '.[]|select(.type=="dir")|.name'
  //   gh pr list --state all --limit 500 --json number,state
  // 33 folders; the 7 with an open PR and a folder (#410, #459, #490, #491, #492, #493, #495)
  // confirmed OPEN; the other 26 individually confirmed CLOSED or MERGED — real positive
  // evidence for every removal, not an inferred absence. The open set has moved again since
  // round 1 (#488 merged and its folder is gone; #490-#496 opened), but 33 folders / 26 stale
  // still lands on the same count round 1 measured, this time for the right reason.
  it('the measured case: 33 real pr-preview folders, 26 proven closed/merged -> 26 removals', () => {
    const openFolders = ['pr-410', 'pr-459', 'pr-490', 'pr-491', 'pr-492', 'pr-493', 'pr-495']
    const closedOrMergedFolders = [
      'pr-75', 'pr-76', 'pr-77', 'pr-78', 'pr-81', 'pr-87', 'pr-91', 'pr-92', 'pr-98',
      'pr-113', 'pr-117', 'pr-118', 'pr-137', 'pr-243', 'pr-245', 'pr-248', 'pr-254',
      'pr-276', 'pr-278', 'pr-306', 'pr-322', 'pr-366', 'pr-411', 'pr-441', 'pr-442', 'pr-451',
    ]
    const folders = [...openFolders, ...closedOrMergedFolders]
    const states = new Map([
      ...openFolders.map((name) => [name, 'OPEN']),
      ...closedOrMergedFolders.map((name) => [name, 'MERGED']), // all but pr-77/pr-322 really are MERGED; CLOSED and MERGED are both removed, so the map need not distinguish them for this assertion
    ])

    const result = planRemovals(folders, states)

    expect(result.toRemove).toHaveLength(26)
    expect(result.toRemove).toEqual(expect.arrayContaining(['pr-441', 'pr-442', 'pr-451']))
    expect(result.toRemove).not.toEqual(expect.arrayContaining(openFolders))
    expect(result.kept.map((f) => f.name)).toEqual(openFolders)
  })
})

describe('safetyCheck', () => {
  it('refuses when the plan would remove every folder present', () => {
    const result = safetyCheck(['pr-1', 'pr-2'], ['pr-1', 'pr-2'], DEFAULT_MAX_REMOVALS)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/every folder present/)
  })

  it('allows an empty run — nothing present, nothing to remove', () => {
    expect(safetyCheck([], [], DEFAULT_MAX_REMOVALS)).toEqual({ allowed: true, reason: null })
  })

  it('refuses when removals exceed the cap', () => {
    const folders = Array.from({ length: 50 }, (_, i) => `pr-${i}`)
    const result = safetyCheck(folders, folders.slice(0, 41), 40)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/exceeds --max-removals 40/)
  })

  it('allows a normal partial removal under the cap', () => {
    const result = safetyCheck(['pr-1', 'pr-2', 'pr-3'], ['pr-2'], DEFAULT_MAX_REMOVALS)
    expect(result).toEqual({ allowed: true, reason: null })
  })
})
