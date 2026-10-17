import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  INBOXES,
  InboxError,
  REVIEW_LABELS,
  REVIEW_LIST_LIMIT,
  entryStatus,
  formatEntries,
  listEntries,
  parseInbox,
  queueReviews,
  reviewIssue,
  reviewedIds,
  setStatus,
} from './inbox.logic.mjs'

const ROOT = path.join(import.meta.dirname, '..')
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'inbox')
const inboxOf = (prefix) => INBOXES.find((inbox) => inbox.prefix === prefix)

// scripts/fixtures/inbox/*-inbox.md are the three inboxes as origin/main held them at 579ff8f4 (2026-10-17), when
// #778 measured their counts. The live files move with every review, so only the recordings carry exact counts.
const recordedText = (prefix) => readFileSync(path.join(FIXTURES, path.basename(inboxOf(prefix).file)), 'utf8')
const recorded = INBOXES.map((inbox) => parseInbox(recordedText(inbox.prefix), inbox))
const liveText = (inbox) => readFileSync(path.join(ROOT, inbox.file), 'utf8')

// gh-review-issues.json has the shape `gh issue list --label inbox-review --state all --json number,title,state,body`
// prints. No review issue existed when it was written, so its three issues are composed: an open review of FID-006,
// a closed review of HRN-005 saved with the web editor's CRLF line endings, and an issue that quotes FID-007's
// marker inside a sentence.
const recordedIssues = JSON.parse(readFileSync(path.join(FIXTURES, 'gh-review-issues.json'), 'utf8'))

const stateOf = (status) => status.split(/[ (]/)[0]
const proposedIds = (inboxes) => inboxes.flatMap((inbox) => inbox.entries).filter((entry) => entry.status === 'proposed').map((entry) => entry.id)

describe('parseInbox', () => {
  it('reads the recorded inboxes to their measured counts: 24 FID (14 proposed), 9 HRN (5 proposed), 0 PRD', () => {
    const counts = recorded.map((inbox) => [inbox.prefix, inbox.entries.length, proposedIds([inbox]).length])
    expect(counts).toEqual([['FID', 24, 14], ['HRN', 9, 5], ['PRD', 0, 0]])
  })

  it('does not count the template under "Entry format" as an entry', () => {
    const ids = recorded.flatMap((inbox) => inbox.entries.map((entry) => entry.id))
    expect(ids).not.toContain('FID-NNN')
    expect(ids).not.toContain('HRN-NNN')
    expect(ids.filter((id) => id.startsWith('FID'))).toEqual(Array.from({ length: 24 }, (_, i) => `FID-${String(i + 1).padStart(3, '0')}`))
  })

  it('gives each entry its id, title, status, file and heading line', () => {
    const [fidelity, harness] = recorded
    expect(fidelity.entries.find((entry) => entry.id === 'FID-006')).toMatchObject({
      id: 'FID-006',
      title: 'The public HDL reference lists the three accepted builtin forms and who accepts each',
      status: 'proposed',
      file: 'docs/harness/fidelity-inbox.md',
      line: 117,
    })
    expect(fidelity.entries[0]).toMatchObject({ id: 'FID-001', line: 32 })
    expect(fidelity.entries[0].status).toMatch(/^deferred \(owner, 2026-09-19: /)
    expect(harness.entries.find((entry) => entry.id === 'HRN-001')).toMatchObject({
      status: 'filed (#702), closed by PR #711 on 2026-10-15',
      file: 'docs/harness/harness-inbox.md',
      line: 61,
    })
  })

  it('reads each file\'s status grammar from its own template', () => {
    const [fidelity, harness] = recorded
    expect(fidelity.grammar).toEqual(['proposed', 'approved', 'declined (<reason>)', 'deferred (<until>)', 'filed (#n)'])
    expect(harness.grammar).toEqual(['proposed', 'approved', 'declined (<reason>)', 'filed (#n)'])
  })

  it.each(INBOXES.map((inbox) => [inbox.file, inbox]))('%s, as it is now: every entry heading parses, with a status its grammar names', (_file, inbox) => {
    const text = liveText(inbox)
    const parsed = parseInbox(text, inbox)
    const headings = text.match(new RegExp(`^### ${inbox.prefix}-\\d`, 'gm')) ?? []
    expect(parsed.entries).toHaveLength(headings.length)
    const keywords = parsed.grammar.map(stateOf)
    for (const entry of parsed.entries) expect(keywords).toContain(stateOf(entry.status))
    expect(new Set(parsed.entries.map((entry) => entry.id)).size).toBe(parsed.entries.length)
  })

  it('refuses an entry with no status line, and an id used twice', () => {
    const template = recordedText('PRD').replace('*Empty — the first review is #269 PR 2.*', '')
    const entry = (id, status) => `### ${id} · A proposal\n- **Date:** 2026-10-17 · **Target epic:** #144 polish\n${status}\n`
    expect(() => parseInbox(template + entry('PRD-001', ''), inboxOf('PRD'))).toThrow(InboxError)
    expect(() => parseInbox(template + entry('PRD-001', '- **Status:** proposed') + entry('PRD-001', '- **Status:** proposed'), inboxOf('PRD')))
      .toThrow(/PRD-001/)
  })
})

describe('listEntries and entryStatus', () => {
  it('lists every entry, or only those whose status starts with the one asked for', () => {
    expect(listEntries(recorded)).toHaveLength(33)
    expect(listEntries(recorded, { status: 'proposed' }).map((entry) => entry.id)).toEqual(proposedIds(recorded))
    expect(listEntries(recorded, { status: 'deferred' }).map((entry) => entry.id)).toEqual(['FID-001', 'FID-002', 'FID-003', 'FID-004', 'FID-005'])
    expect(() => listEntries(recorded, { status: 'propsed' })).toThrow(InboxError)
  })

  it('formats one line per entry: id, status, file:line and title', () => {
    const lines = formatEntries(listEntries(recorded, { status: 'proposed' })).split('\n')
    expect(lines).toHaveLength(19)
    expect(lines[0]).toBe('FID-006\tproposed\tdocs/harness/fidelity-inbox.md:117\tThe public HDL reference lists the three accepted builtin forms and who accepts each')
  })

  it('prints the status, and with --not exits 1 while the entry still has that status', () => {
    expect(entryStatus(recorded, 'FID-006')).toEqual({ exitCode: 0, stdout: 'proposed' })
    expect(entryStatus(recorded, 'FID-006', { not: 'proposed' })).toEqual({ exitCode: 1, stdout: 'proposed' })
    expect(entryStatus(recorded, 'HRN-001', { not: 'proposed' })).toEqual({ exitCode: 0, stdout: 'filed (#702), closed by PR #711 on 2026-10-15' })
  })

  it('refuses an unknown id, and a --not value outside the entry\'s grammar', () => {
    expect(() => entryStatus(recorded, 'FID-999')).toThrow(InboxError)
    expect(() => entryStatus(recorded, 'FID-NNN')).toThrow(InboxError)
    expect(() => entryStatus(recorded, 'FID-006', { not: 'propsed' })).toThrow(/propsed/)
    expect(() => entryStatus(recorded, 'HRN-005', { not: 'deferred' })).toThrow(InboxError)
  })
})

describe('setStatus', () => {
  const lines = (text) => text.split('\n')
  const changedLines = (before, after) => lines(before).flatMap((line, i) => (line === lines(after)[i] ? [] : [i + 1]))

  it('rewrites only the entry\'s Status line; every other byte is unchanged', () => {
    const before = recordedText('FID')
    const after = setStatus(before, inboxOf('FID'), 'FID-006', 'approved')
    expect(lines(after)).toHaveLength(lines(before).length)
    expect(changedLines(before, after)).toEqual([119])
    expect(lines(after)[118]).toBe('- **Status:** approved')
    expect(after.replace('- **Status:** approved', '- **Status:** proposed')).toBe(before)
  })

  it('takes every form of the file\'s grammar', () => {
    const before = recordedText('FID')
    for (const value of ['declined (panel, #9001: FID-008 already covers it)', 'deferred (until #142 exits)', 'filed (#9010)', 'proposed']) {
      expect(lines(setStatus(before, inboxOf('FID'), 'FID-007', value))[135]).toBe(`- **Status:** ${value}`)
    }
  })

  it('refuses a value outside the file\'s own grammar, an unknown id and the template', () => {
    const fidelity = recordedText('FID')
    for (const value of ['accepted', 'declined', 'declined ()', 'filed (#)', 'filed (abc)', 'filed (#12', 'approved\n- **Status:** proposed', ' approved', '']) {
      expect(() => setStatus(fidelity, inboxOf('FID'), 'FID-006', value), JSON.stringify(value)).toThrow(InboxError)
    }
    expect(() => setStatus(recordedText('HRN'), inboxOf('HRN'), 'HRN-005', 'deferred (until the next retro)')).toThrow(/grammar/)
    expect(() => setStatus(fidelity, inboxOf('FID'), 'FID-999', 'approved')).toThrow(InboxError)
    expect(() => setStatus(fidelity, inboxOf('FID'), 'FID-NNN', 'approved')).toThrow(InboxError)
  })

  it('keeps a CRLF line ending on the line it rewrites', () => {
    const crlf = recordedText('HRN').replaceAll('\n', '\r\n')
    const after = setStatus(crlf, inboxOf('HRN'), 'HRN-005', 'approved')
    expect(after).toBe(crlf.replace('- **Status:** proposed\r\n', '- **Status:** approved\r\n'))
  })
})

describe('queue', () => {
  /** A `gh` stand-in that remembers what it files, as GitHub would. */
  function recordingGh(issues) {
    const known = [...issues]
    const filed = []
    return {
      filed,
      listReviewIssues: () => [...known],
      fileIssue: (draft) => {
        const number = 9100 + filed.length
        filed.push(draft)
        known.push({ number, title: draft.title, state: 'OPEN', body: draft.body })
        return `https://github.com/mezivillager/hacer/issues/${number}`
      },
    }
  }

  it('reads the Inbox-entry marker lines of open and closed issues, not a marker quoted inside a sentence', () => {
    expect([...reviewedIds(recordedIssues)].sort()).toEqual(['FID-006', 'HRN-005'])
  })

  it('files one review issue per proposed entry with no review issue yet, open or closed, and prints each', () => {
    const gh = recordingGh(recordedIssues)
    const lines = queueReviews(recorded, gh)
    const expected = proposedIds(recorded).filter((id) => id !== 'FID-006' && id !== 'HRN-005')
    expect(expected).toHaveLength(17)
    expect(gh.filed.map((draft) => draft.id)).toEqual(expected)
    expect(lines).toHaveLength(17)
    expect(lines[0]).toBe('filed https://github.com/mezivillager/hacer/issues/9100: Inbox review: FID-007 · Phase 0.6 accepts `CLOCKED` after all three builtin forms')
  })

  it('files nothing on a second run', () => {
    const gh = recordingGh(recordedIssues)
    queueReviews(recorded, gh)
    const filedOnce = gh.filed.length
    expect(queueReviews(recorded, gh)).toEqual([])
    expect(gh.filed).toHaveLength(filedOnce)
  })

  it('files nothing with dryRun, and prints what it would file', () => {
    const lines = queueReviews(recorded, {
      listReviewIssues: () => recordedIssues,
      fileIssue: () => { throw new Error('a dry run filed an issue') },
      dryRun: true,
    })
    expect(lines).toHaveLength(17)
    expect(lines[0]).toMatch(/^would file: Inbox review: FID-007 · /)
  })

  it('refuses to dedupe against a list gh may have cut short', () => {
    const full = Array.from({ length: REVIEW_LIST_LIMIT }, (_, i) => ({ number: i + 1, title: 't', state: 'CLOSED', body: '' }))
    expect(() => queueReviews(recorded, { listReviewIssues: () => full, fileIssue: () => 'x', dryRun: true })).toThrow(InboxError)
  })

  it('writes the review issue in the issue form, labelled for the upkeep slot, ending in its marker', () => {
    const entry = recorded[0].entries.find((candidate) => candidate.id === 'FID-006')
    const draft = reviewIssue(entry)
    expect(draft.id).toBe('FID-006')
    expect(draft.title).toBe(`Inbox review: FID-006 · ${entry.title}`)
    expect(draft.labels).toEqual(REVIEW_LABELS)
    expect(REVIEW_LABELS).toEqual(['inbox-review', 'agent-ready', 'risk:0', 'project:upkeep'])
    const headings = draft.body.split('\n').filter((line) => line.startsWith('## '))
    expect(headings).toEqual(['## Goal', '## Acceptance criteria', '## Verification command', '## Scope', '## Files likely touched', '## Risk', '## Blocked by'])
    expect(draft.body).toContain('`node scripts/inbox.mjs status FID-006 --not proposed`')
    expect(draft.body).toContain('`docs/harness/inbox-panel-brief.md`')
    expect(draft.body).toContain('## Inbox panel: APPROVED | DECLINED | DEFERRED')
    expect(draft.body).toContain('`node scripts/inbox.mjs set FID-006 <status>`')
    expect(draft.body).toMatch(/## Files likely touched\n`docs\/harness\/fidelity-inbox\.md`\n/)
    expect(draft.body).toMatch(/## Blocked by\n—\n/)
    expect(draft.body.split('\n').at(-1)).toBe('Inbox-entry: FID-006')
    expect([...reviewedIds([{ ...draft, number: 1, state: 'OPEN' }])]).toEqual(['FID-006'])
  })
})
