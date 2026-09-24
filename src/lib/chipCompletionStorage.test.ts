import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readCompletedChips, markChipCompleted } from './chipCompletionStorage'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

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

  it('degrades silently when storage refuses to be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(readCompletedChips()).toEqual([])
  })

  it('keeps the in-memory list when storage refuses a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(markChipCompleted('Not')).toEqual(['Not'])
  })
})
