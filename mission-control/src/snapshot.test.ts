import { describe, expect, it } from 'vitest'
import { STALE_AFTER_MS, isStale } from './snapshot'

// #476 (MC-5): the site shows a freshness banner once the snapshot is more than two hours old. `now` is a plain
// number (not a fake clock) so this stays a pure, hermetic test regardless of when it actually runs.
describe('isStale', () => {
  it('STALE_AFTER_MS is two hours — the workflow refreshes hourly, so this is the reader-facing slack', () => {
    expect(STALE_AFTER_MS).toBe(2 * 60 * 60 * 1000)
  })

  it('freshly generated is not stale', () => {
    const generatedAt = '2026-09-25T03:16:09.339Z'
    expect(isStale(generatedAt, new Date(generatedAt).getTime())).toBe(false)
  })

  it('under two hours old is not stale', () => {
    const generatedAt = '2026-09-25T03:16:09.339Z'
    const now = new Date(generatedAt).getTime() + 60 * 60 * 1000 // 1h later
    expect(isStale(generatedAt, now)).toBe(false)
  })

  it('exactly two hours old is not yet stale — only strictly older is', () => {
    const generatedAt = '2026-09-25T03:16:09.339Z'
    const now = new Date(generatedAt).getTime() + STALE_AFTER_MS
    expect(isStale(generatedAt, now)).toBe(false)
  })

  it('one millisecond past two hours is stale', () => {
    const generatedAt = '2026-09-25T03:16:09.339Z'
    const now = new Date(generatedAt).getTime() + STALE_AFTER_MS + 1
    expect(isStale(generatedAt, now)).toBe(true)
  })

  it('well over two hours old is stale', () => {
    const generatedAt = '2026-09-25T03:16:09.339Z'
    const now = new Date(generatedAt).getTime() + 5 * 60 * 60 * 1000 // 5h later
    expect(isStale(generatedAt, now)).toBe(true)
  })
})
