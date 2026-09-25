import { describe, expect, it } from 'vitest'
import { KEEP_DAYS, parseSnapshotTime, planPrune } from './prune.logic.mjs'

const DAY = 24 * 60 * 60 * 1000
const at = (isoInstant) => `${isoInstant}.json`

describe('parseSnapshotTime', () => {
  it('a real archive file name, exactly Date#toISOString() + .json, parses to that instant', () => {
    expect(parseSnapshotTime('2026-09-25T04:16:09.339Z.json')).toBe('2026-09-25T04:16:09.339Z')
  })

  it('anything that is not exactly one snapshot file name is not a candidate at all: null, never a guess', () => {
    for (const name of [
      'notes.txt', '.gitkeep', 'README.md', 'index.html',
      '2026-09-25.json', // no time-of-day: not what collect.mjs writes
      '2026-09-25T04:16:09Z.json', // no milliseconds
      '2026-09-25T04:16:09.339.json', // no Z
      '../2026-09-25T04:16:09.339Z.json', // a path segment: this pattern cannot match across a separator
      'sub/2026-09-25T04:16:09.339Z.json',
    ]) expect(parseSnapshotTime(name)).toBeNull()
  })
})

describe('planPrune', () => {
  it('nothing on disk: nothing to remove, nothing to keep', () => {
    expect(planPrune([])).toEqual({ toRemove: [], kept: [] })
  })

  it(`keeps ${KEEP_DAYS} days: default is exported so the workflow and this spec cannot drift apart`, () => {
    expect(KEEP_DAYS).toBe(90)
  })

  it('every snapshot inside the window is kept, none removed', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const names = [at('2026-09-01T00:00:00.000Z'), at('2026-09-20T00:00:00.000Z'), at('2026-09-25T00:00:00.000Z')]
    expect(planPrune(names, { now, keepDays: 90 })).toEqual({ toRemove: [], kept: names })
  })

  it('a snapshot older than the window is removed; one inside it is kept — chronological order both ways', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const old = at('2026-01-01T00:00:00.000Z') // well past 90 days
    const recent = at('2026-09-20T00:00:00.000Z')
    expect(planPrune([recent, old], { now, keepDays: 90 })).toEqual({ toRemove: [old], kept: [recent] })
  })

  it('exactly keepDays old is still kept — only strictly older is pruned', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const boundary = at(new Date(now.getTime() - 90 * DAY).toISOString())
    const newer = at(new Date(now.getTime() - 1 * DAY).toISOString())
    expect(planPrune([newer, boundary], { now, keepDays: 90 })).toEqual({ toRemove: [], kept: [boundary, newer] })
  })

  it('one millisecond past the window is pruned, once it is not the newest file', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const justOver = at(new Date(now.getTime() - 90 * DAY - 1).toISOString())
    const newer = at(new Date(now.getTime() - 1 * DAY).toISOString())
    expect(planPrune([newer, justOver], { now, keepDays: 90 })).toEqual({ toRemove: [justOver], kept: [newer] })
  })

  it('never removes the newest snapshot, even when every snapshot on disk is outside the window', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const names = [at('2025-01-01T00:00:00.000Z'), at('2025-06-01T00:00:00.000Z'), at('2025-12-01T00:00:00.000Z')]
    const result = planPrune(names, { now, keepDays: 90 })
    expect(result.toRemove).not.toContain(names[2]) // the newest of the three
    expect(result.kept).toContain(names[2])
    expect(result.toRemove).toEqual([names[0], names[1]])
  })

  it('a single old snapshot is the newest by definition: kept, not removed', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const onlyOne = at('2020-01-01T00:00:00.000Z')
    expect(planPrune([onlyOne], { now, keepDays: 90 })).toEqual({ toRemove: [], kept: [onlyOne] })
  })

  it('a name that is not a snapshot file is always kept, never a removal candidate, however old the real ones are', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const stray = '.gitkeep'
    const old = at('2020-01-01T00:00:00.000Z')
    const newer = at('2026-09-20T00:00:00.000Z')
    const result = planPrune([stray, old, newer], { now, keepDays: 90 })
    expect(result.toRemove).toEqual([old])
    expect(result.kept).toEqual(expect.arrayContaining([stray, newer]))
    expect(result.toRemove).not.toContain(stray)
  })

  it('a shorter keepDays prunes more aggressively, still protecting the newest', () => {
    const now = new Date('2026-09-25T00:00:00.000Z')
    const names = [at('2026-09-01T00:00:00.000Z'), at('2026-09-10T00:00:00.000Z'), at('2026-09-24T00:00:00.000Z')]
    expect(planPrune(names, { now, keepDays: 7 })).toEqual({ toRemove: [names[0], names[1]], kept: [names[2]] })
  })
})
