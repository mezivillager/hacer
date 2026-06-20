import { describe, it, expect, beforeEach } from 'vitest'
import { readCompletedChips, markChipCompleted } from './chipCompletion'

beforeEach(() => localStorage.clear())

describe('chipCompletion', () => {
  it('reads an empty list when nothing is stored', () => {
    expect(readCompletedChips()).toEqual([])
  })

  it('marks a chip completed and persists it', () => {
    expect(markChipCompleted('Not')).toEqual(['Not'])
    expect(readCompletedChips()).toEqual(['Not'])
    expect(JSON.parse(localStorage.getItem('hacer-completed-chips')!)).toEqual(['Not'])
  })

  it('does not duplicate an already-completed chip', () => {
    markChipCompleted('Not')
    expect(markChipCompleted('Not')).toEqual(['Not'])
  })

  it('returns an empty list on corrupt storage', () => {
    localStorage.setItem('hacer-completed-chips', 'not json{')
    expect(readCompletedChips()).toEqual([])
  })
})
