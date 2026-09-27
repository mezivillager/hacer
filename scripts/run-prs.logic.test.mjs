import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { formatConsole, mergedInWindow, searchDateRange } from './run-prs.logic.mjs'

// scripts/fixtures/run-prs-2026-09-23.json is a trimmed recording of
//   gh pr list --state merged --search "merged:2026-09-23" --json number,title,mergedAt,labels --limit 200
// taken 2026-09-27: 26 PRs, every label trimmed to {name}. GitHub's `merged:` qualifier is day
// granularity, so this one search mixes two runs: the 2026-09-23 foundation run
// (docs/harness/sessions/2026-09-23.md) and a later run the same day (nine PRs from #417,
// 10:44:25Z onward — docs/harness/reviews/2026-09-26/reviews/3.md F6).
const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', 'run-prs-2026-09-23.json'), 'utf8'))

// The 2026-09-23 run's window: its first PR (#360) merged 2026-09-23T00:15:54Z; #354, the last
// merge before it, is named in the record as "before the run's first artefact" and merged
// 2026-09-22T18:32:15Z, so midnight is a clean `from` between the two. Its last PR (#412, "close
// the 2026-09-23 run…") merged 2026-09-23T05:52:32Z; `to` sits well before the next run's first PR
// (#417, 10:44:25Z).
const RUN_FROM = '2026-09-23T00:00:00Z'
const RUN_TO = '2026-09-23T06:00:00Z'

// The 15 PRs docs/harness/sessions/2026-09-23.md names by number: ten in its "What was built" table
// (§3) plus five more in "What landed after this record was first written" (§6a).
const RECORD_NAMES = [360, 362, 365, 366, 370, 358, 375, 351, 387, 388, 396, 398, 399, 404, 409]
// The two PRs the run also merged that the record never names by number, because they *are* the
// record: writing it (#393) and closing the run (#412) — S9 / F16's "two record PRs".
const RECORD_PRS = [393, 412]

describe('searchDateRange', () => {
  it('spans every calendar day the window touches', () => {
    expect(searchDateRange('2026-09-22T18:32:16Z', '2026-09-23T06:00:00Z')).toBe('2026-09-22..2026-09-23')
  })

  it('is a single day when the window does not cross midnight', () => {
    expect(searchDateRange(RUN_FROM, RUN_TO)).toBe('2026-09-23..2026-09-23')
  })
})

describe('mergedInWindow', () => {
  it('narrows the day-granularity fixture to exactly the PRs the 2026-09-23 run merged', () => {
    const result = mergedInWindow(fixture, RUN_FROM, RUN_TO)
    expect(result.map((pr) => pr.number)).toEqual([
      360, 362, 366, 365, 370, 358, 375, 351, 387, 388, 393, 398, 396, 404, 399, 409, 412,
    ])
    expect(result).toHaveLength(17) // S9 / F16: 17 distinct, not the brief's 13
  })

  it('yields every PR the session record names by number', () => {
    const numbers = mergedInWindow(fixture, RUN_FROM, RUN_TO).map((pr) => pr.number)
    for (const named of RECORD_NAMES) expect(numbers).toContain(named)
  })

  it('the remainder is exactly the two record PRs (17 named+record, 15 without them)', () => {
    const numbers = mergedInWindow(fixture, RUN_FROM, RUN_TO).map((pr) => pr.number)
    expect(numbers.filter((n) => !RECORD_NAMES.includes(n))).toEqual(RECORD_PRS)
  })

  it('excludes the later same-day run that a day-granularity search alone could not', () => {
    // The fixture's 26 rows are every PR gh's day search returns for 2026-09-23; the window narrows
    // that to the run's 17 and drops the later run's nine (#417 at 10:44:25Z onward).
    expect(fixture).toHaveLength(26)
    const numbers = mergedInWindow(fixture, RUN_FROM, RUN_TO).map((pr) => pr.number)
    expect(numbers).not.toContain(417)
    expect(numbers).not.toContain(430)
  })

  it('sorts oldest first, then by number on an exact tie', () => {
    const prs = [
      { number: 2, title: 'b', mergedAt: '2026-01-01T00:00:00Z', labels: [] },
      { number: 1, title: 'a', mergedAt: '2026-01-01T00:00:00Z', labels: [] },
      { number: 3, title: 'c', mergedAt: '2026-01-02T00:00:00Z', labels: [] },
    ]
    expect(mergedInWindow(prs, '2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z').map((pr) => pr.number)).toEqual([1, 2, 3])
  })

  it('the window is [from, to): `to` is excluded, `from` is included', () => {
    const prs = [
      { number: 1, title: 'at from', mergedAt: '2026-01-01T00:00:00Z', labels: [] },
      { number: 2, title: 'at to', mergedAt: '2026-01-02T00:00:00Z', labels: [] },
    ]
    expect(mergedInWindow(prs, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z').map((pr) => pr.number)).toEqual([1])
  })

  it('normalises labels to plain names, whether given as gh objects or strings', () => {
    const prs = [
      { number: 1, title: 't', mergedAt: '2026-01-01T00:00:00Z', labels: [{ name: 'risk:0' }] },
      { number: 2, title: 't', mergedAt: '2026-01-01T00:00:01Z', labels: ['risk:0'] },
    ]
    const [a, b] = mergedInWindow(prs, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')
    expect(a.labels).toEqual(['risk:0'])
    expect(b.labels).toEqual(['risk:0'])
  })
})

describe('formatConsole', () => {
  it('prints one line per PR, oldest first, plus a trailing count', () => {
    const prs = mergedInWindow(fixture, RUN_FROM, RUN_TO)
    const lines = formatConsole(prs).split('\n')
    expect(lines).toHaveLength(18) // 17 PRs + the count line
    expect(lines[0]).toBe('#360\t2026-09-23T00:15:54Z\tLayer rules as a shrink-only ratchet, wired into lint (#329)\t[released, risk:1, size-override, project:foundation]')
    expect(lines.at(-1)).toBe('17 PRs merged')
  })

  it('singularises the count for exactly one PR', () => {
    expect(formatConsole([{ number: 1, title: 't', mergedAt: '2026-01-01T00:00:00Z', labels: [] }]).split('\n').at(-1)).toBe(
      '1 PR merged',
    )
  })

  it('prints zero without a label bracket, still with a count line', () => {
    expect(formatConsole([])).toBe('0 PRs merged')
  })
})
