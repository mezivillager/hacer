import { describe, it, expect } from 'vitest'
import { parsePrNumber, foldersToRemove } from './pr-preview-sweep.logic.mjs'

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

describe('foldersToRemove', () => {
  it('removes a folder whose PR is not open', () => {
    expect(foldersToRemove(['pr-1', 'pr-2'], [1])).toEqual(['pr-2'])
  })

  it("never removes an open PR's folder", () => {
    const result = foldersToRemove(['pr-1', 'pr-2', 'pr-3'], [1, 2, 3])
    expect(result).toEqual([])
  })

  it('leaves a folder with no PR number alone, even though nothing keeps it', () => {
    const result = foldersToRemove(['pr-1', 'assets', 'pr-preview-index'], [1])
    expect(result).toEqual([])
  })

  it('returns nothing to remove when the folder list is empty', () => {
    expect(foldersToRemove([], [1, 2])).toEqual([])
  })

  it('removes every parseable folder when no PR is open', () => {
    expect(foldersToRemove(['pr-1', 'pr-2'], [])).toEqual(['pr-1', 'pr-2'])
  })

  // Real gh-pages state, fetched 2026-09-25 via
  //   gh api "repos/mezivillager/hacer/contents/pr-preview?ref=gh-pages" --jq '.[]|select(.type=="dir")|.name'
  // — the same 29 folders issue #484 measured. The open set here (#410, #459, #488) is what
  // `gh pr list --state open --json number` returned at the same moment, not the issue's own
  // {#410, #459, #461} snapshot: #461 merged (and its folder was already gone) and #488 opened
  // in the hours between the issue being filed and this PR being built. The arithmetic the issue
  // cares about — 29 folders, 3 open, 26 stale — holds either way.
  it('the measured case: 29 real pr-preview folders, 3 open PRs -> 26 removals', () => {
    const folders = [
      'pr-75', 'pr-76', 'pr-77', 'pr-78', 'pr-81', 'pr-87', 'pr-91', 'pr-92', 'pr-98',
      'pr-113', 'pr-117', 'pr-118', 'pr-137', 'pr-243', 'pr-245', 'pr-248', 'pr-254',
      'pr-276', 'pr-278', 'pr-306', 'pr-322', 'pr-366', 'pr-410', 'pr-411', 'pr-441',
      'pr-442', 'pr-451', 'pr-459', 'pr-488',
    ]
    const openPrNumbers = [410, 459, 488]

    const result = foldersToRemove(folders, openPrNumbers)

    expect(result).toHaveLength(26)
    // Called out in the issue as merged this week — must be swept.
    expect(result).toEqual(expect.arrayContaining(['pr-441', 'pr-442', 'pr-451']))
    // The open PRs' folders must survive.
    expect(result).not.toEqual(expect.arrayContaining(['pr-410', 'pr-459', 'pr-488']))
  })
})
