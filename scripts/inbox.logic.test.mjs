import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'
import {
  INBOXES,
  InboxError,
  JUDGE_LABELS,
  REVIEW_LABELS,
  REVIEW_LIST_LIMIT,
  assertGrammar,
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

// scripts/fixtures/inbox/{fidelity,harness,product}-inbox.md are the three inboxes as origin/main held them at 579ff8f4
// (2026-10-17), when #778 measured their counts. The live files move with every review, so only the recordings carry
// exact counts. judge-inbox.md is composed: the live header with one entry in each of three statuses (#963).
const recordedText = (prefix) => readFileSync(path.join(FIXTURES, path.basename(inboxOf(prefix).file)), 'utf8')
const recorded = ['FID', 'HRN', 'PRD'].map((prefix) => parseInbox(recordedText(prefix), inboxOf(prefix)))
const liveText = (inbox) => readFileSync(path.join(ROOT, inbox.file), 'utf8')

// gh-review-issues.json has the shape `gh issue list --label inbox-review --state all --json number,title,state,body`
// prints. No review issue existed when it was written, so its three issues are composed: an open review of FID-006,
// a closed review of HRN-005 saved with the web editor's CRLF line endings, and an issue that quotes FID-007's
// marker inside a sentence.
const recordedIssues = JSON.parse(readFileSync(path.join(FIXTURES, 'gh-review-issues.json'), 'utf8'))
const noteGrammarText = readFileSync(path.join(FIXTURES, 'note-grammar-inbox.md'), 'utf8')

const stateOf = (status) => status.split(/[ (]/)[0]
const proposedIds = (inboxes) => inboxes.flatMap((inbox) => inbox.entries).filter((entry) => entry.status === 'proposed').map((entry) => entry.id)
const hrnEntry = (n, extra = '') => `\n### HRN-${n} · Proposal ${n}\n- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22\n- **Status:** proposed\n${extra}`
const harnessWith = (...entries) => parseInbox(recordedText('HRN') + entries.join(''), inboxOf('HRN'))
const listedIds = (drafts) => drafts.map((draft) => [...reviewedIds([draft])])

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

  it('reads an optional **Review:** own line on an entry, and refuses any other value', () => {
    const harness = harnessWith(hrnEntry('010', '- **Review:** own\n'), hrnEntry('011'))
    expect(harness.entries.filter((entry) => entry.ownReview).map((entry) => entry.id)).toEqual(['HRN-010'])
    expect(harness.entries.map((entry) => entry.ownReview)).toEqual([...Array(9).fill(false), true, false])
    for (const value of ['Own', 'batch', '', 'own (a gate)']) {
      expect(() => harnessWith(hrnEntry('010', `- **Review:** ${value}\n`)), JSON.stringify(value)).toThrow(/HRN-010/)
    }
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

describe('status grammar', () => {
  const PRD = inboxOf('PRD')
  const offGrammarText = readFileSync(path.join(FIXTURES, 'off-grammar-inbox.md'), 'utf8')
  const offGrammar = parseInbox(offGrammarText, PRD)
  const withOffGrammar = [recorded[0], recorded[1], offGrammar]
  const offGrammarReport = ['docs/harness/product-inbox.md:16: PRD-001', 'docs/harness/product-inbox.md:20: PRD-002', 'docs/harness/product-inbox.md:32: PRD-005']
  const noteGrammar = parseInbox(noteGrammarText, PRD)
  const noteGrammarReport = ['docs/harness/product-inbox.md:16: PRD-001', 'docs/harness/product-inbox.md:20: PRD-002']
  const withStatus = (text, line, status) => text.split('\n').map((raw, i) => (i === line - 1 ? `- **Status:** ${status}` : raw)).join('\n')

  /** The `file:line: id` of each entry the InboxError `run` throws reports, after its summary line; [] if it returns. */
  function reported(run) {
    try {
      run()
    } catch (error) {
      if (!(error instanceof InboxError)) throw error
      return error.message.split('\n').slice(1).map((line) => line.split(' ', 2).join(' '))
    }
    return []
  }

  it('reports each entry whose status is outside its file\'s grammar, at its Status line: Proposed, approve, a note with no comma', () => {
    expect(reported(() => assertGrammar([offGrammar]))).toEqual(offGrammarReport)
  })

  it('takes a form followed by a comma and a note, as filed entries carry "closed by PR #n"', () => {
    expect(assertGrammar(recorded)).toBe(recorded)
    expect(recorded[1].entries[0].status).toBe('filed (#702), closed by PR #711 on 2026-10-15')
  })

  it('reports the entries of every inbox in one error', () => {
    const fidelity = parseInbox(withStatus(recordedText('FID'), 119, 'Approved'), inboxOf('FID'))
    expect(reported(() => assertGrammar([fidelity, recorded[1], offGrammar])))
      .toEqual(['docs/harness/fidelity-inbox.md:119: FID-006', ...offGrammarReport])
  })

  it('list and status refuse while an entry is outside its grammar', () => {
    expect(reported(() => listEntries(withOffGrammar))).toEqual(offGrammarReport)
    expect(reported(() => listEntries(withOffGrammar, { status: 'proposed' }))).toEqual(offGrammarReport)
    expect(reported(() => entryStatus(withOffGrammar, 'FID-006', { not: 'proposed' }))).toEqual(offGrammarReport)
  })

  it('queue refuses, dry run or not, before it asks gh for the review issues', () => {
    const gh = { listReviewIssues: () => { throw new Error('queue asked gh') }, fileIssue: () => { throw new Error('queue filed an issue') } }
    for (const dryRun of [true, false]) expect(reported(() => queueReviews(withOffGrammar, { ...gh, dryRun }))).toEqual(offGrammarReport)
  })

  it('set refuses while another entry in the file is outside the grammar, and repairs one that is', () => {
    expect(reported(() => setStatus(offGrammarText, PRD, 'PRD-003', 'approved'))).toEqual(offGrammarReport)
    const repaired = setStatus(offGrammarText, PRD, 'PRD-001', 'proposed')
    expect(repaired.split('\n')[15]).toBe('- **Status:** proposed')
    expect(reported(() => assertGrammar([parseInbox(repaired, PRD)]))).toEqual(offGrammarReport.slice(1))
  })

  it('takes a note after filed, declined and deferred only: a note after proposed or approved is reported', () => {
    expect(reported(() => assertGrammar([noteGrammar]))).toEqual(noteGrammarReport)
  })

  it('queue files no review while proposed or approved carries a note, dry run or not', () => {
    const gh = { listReviewIssues: () => { throw new Error('queue asked gh') }, fileIssue: () => { throw new Error('queue filed an issue') } }
    const withNote = [recorded[0], recorded[1], noteGrammar]
    for (const dryRun of [true, false]) expect(reported(() => queueReviews(withNote, { ...gh, dryRun }))).toEqual(noteGrammarReport)
  })

  it('set refuses while proposed or approved carries a note; once repaired it writes the panel\'s statuses verbatim', () => {
    expect(reported(() => setStatus(noteGrammarText, PRD, 'PRD-003', 'approved'))).toEqual(noteGrammarReport)
    const repaired = setStatus(setStatus(noteGrammarText, PRD, 'PRD-001', 'proposed'), PRD, 'PRD-002', 'approved')
    const declined = noteGrammar.entries.find((entry) => entry.id === 'PRD-005').status
    expect(declined).toMatch(/^declined \(inbox panel, #791: .*, which .*; #338's .*\)$/)
    for (const value of [declined, 'deferred (inbox panel, #9003: until the next retro)', 'filed (#9010)', 'approved', 'proposed']) {
      const entries = listEntries([parseInbox(setStatus(repaired, PRD, 'PRD-003', value), PRD)])
      expect(entries.find((entry) => entry.id === 'PRD-003').status).toBe(value)
    }
  })

  it.each(['HRN', 'PRD'])('%s, as it is now: its grammar names deferred (<until>), and set writes one', (prefix) => {
    const inbox = inboxOf(prefix)
    const text = liveText(inbox)
    const { grammar, entries: [first] } = parseInbox(text, inbox)
    expect(grammar).toContain('deferred (<until>)')
    const value = 'deferred (inbox panel, #9003: until the next retro)'
    expect(setStatus(text, inbox, first.id, value).split('\n')[first.statusLine - 1]).toBe(`- **Status:** ${value}`)
  })

  it('every inbox, as it is now, is inside its grammar', () => {
    expect(reported(() => assertGrammar(INBOXES.map((inbox) => parseInbox(liveText(inbox), inbox))))).toEqual([])
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

  it('files a review issue per proposed FID entry and one for the HRN entries, for every entry no issue reviews yet, open or closed, and prints each', () => {
    const gh = recordingGh(recordedIssues)
    const lines = queueReviews(recorded, gh)
    const expected = proposedIds(recorded).filter((id) => id !== 'FID-006' && id !== 'HRN-005')
    expect(expected).toHaveLength(17)
    expect(listedIds(gh.filed).flat()).toEqual(expected)
    expect(listedIds(gh.filed).at(-1)).toEqual(['HRN-006', 'HRN-007', 'HRN-008', 'HRN-009'])
    expect(lines).toHaveLength(14)
    expect(lines[0]).toBe('filed https://github.com/mezivillager/hacer/issues/9100: Inbox review: FID-007 · Phase 0.6 accepts `CLOCKED` after all three builtin forms')
  })

  it('queueReviews files one review for the new proposed HRN entries together, one Inbox-entry line each', () => {
    const gh = recordingGh(recordedIssues)
    const lines = queueReviews([recorded[1]], gh)
    expect(gh.filed).toHaveLength(1)
    const [draft] = gh.filed
    expect(draft.body.split('\n').filter((line) => line.startsWith('Inbox-entry:')))
      .toEqual(['HRN-006', 'HRN-007', 'HRN-008', 'HRN-009'].map((id) => `Inbox-entry: ${id}`))
    expect(draft.labels).toEqual(REVIEW_LABELS)
    expect(draft.title).toBe('Inbox review: HRN-006, HRN-007, HRN-008, HRN-009 · a batch of 4 harness entries')
    expect(lines).toEqual([`filed https://github.com/mezivillager/hacer/issues/9100: ${draft.title}`])
  })

  it('queueReviews starts a second review after five entries', () => {
    const five = recordingGh([])
    queueReviews([recorded[1]], five)
    expect(listedIds(five.filed)).toEqual([['HRN-005', 'HRN-006', 'HRN-007', 'HRN-008', 'HRN-009']])
    const eight = recordingGh([])
    queueReviews([harnessWith(hrnEntry('010'), hrnEntry('011'), hrnEntry('012'))], eight)
    expect(listedIds(eight.filed)).toEqual([['HRN-005', 'HRN-006', 'HRN-007', 'HRN-008', 'HRN-009'], ['HRN-010', 'HRN-011', 'HRN-012']])
  })

  it('queueReviews keeps a review of its own for an HRN entry marked Review: own, and for every FID, PRD and JDG entry', () => {
    const harness = harnessWith(hrnEntry('010', '- **Review:** own\n'), hrnEntry('011'))
    const product = parseInbox(`${recordedText('PRD')}\n### PRD-001 · A proposal\n- **Date:** 2026-10-17 · **Target epic:** #144 polish\n- **Status:** proposed\n`, inboxOf('PRD'))
    const judge = parseInbox(recordedText('JDG'), inboxOf('JDG'))
    const gh = recordingGh(recordedIssues)
    queueReviews([recorded[0], harness, product, judge], gh)
    const fidelity = proposedIds([recorded[0]]).filter((id) => id !== 'FID-006')
    expect(listedIds(gh.filed)).toEqual([
      ...fidelity.map((id) => [id]),
      ['HRN-006', 'HRN-007', 'HRN-008', 'HRN-009', 'HRN-011'],
      ['HRN-010'],
      ['PRD-001'],
      ['JDG-001'],
    ])
    const own = [...recorded[0].entries, ...harness.entries, ...product.entries, ...judge.entries]
      .filter((entry) => entry.status === 'proposed' && entry.id !== 'FID-006' && (!entry.id.startsWith('HRN-') || entry.id === 'HRN-010'))
    expect(gh.filed.filter((draft) => reviewedIds([draft]).size === 1)).toEqual(own.map(reviewIssue))
  })

  it('queueReviews files nothing for an entry that a batch review lists, open or closed', () => {
    const batch = (number, state, ids, eol) => ({ number, title: 't', state, body: ['## Goal', 'A batch.', '', ...ids.map((id) => `Inbox-entry: ${id}`), ''].join(eol) })
    const gh = recordingGh([batch(9300, 'CLOSED', ['HRN-005', 'HRN-006', 'HRN-007'], '\r\n'), batch(9301, 'OPEN', ['HRN-008', 'HRN-009'], '\n')])
    const harness = harnessWith(hrnEntry('010'), hrnEntry('011'))
    queueReviews([harness], gh)
    expect(listedIds(gh.filed)).toEqual([['HRN-010', 'HRN-011']])
    expect(queueReviews([harness], gh)).toEqual([])
    expect(gh.filed).toHaveLength(1)
  })

  it('a batch review\'s body gives the status command for each entry it lists', () => {
    const gh = recordingGh([])
    queueReviews([recorded[1]], gh)
    expect(gh.filed).toHaveLength(1)
    const [{ body }] = gh.filed
    const entries = recorded[1].entries.filter((entry) => entry.status === 'proposed')
    const status = (id) => `node scripts/inbox.mjs status ${id} --not proposed`
    const headings = body.split('\n').filter((line) => line.startsWith('## '))
    expect(headings).toEqual(['## Goal', '## Acceptance criteria', '## Verification command', '## Scope', '## Files likely touched', '## Risk', '## Blocked by'])
    expect(body).toContain(`## Verification command\n\`${entries.map((entry) => status(entry.id)).join(' && ')}\`\n\n## Scope`)
    for (const entry of entries) expect(body).toContain(`- ${entry.id} · ${entry.title}\n`)
    expect(body).toContain('`docs/harness/inbox-panel-brief.md`')
    expect(body).toContain('`node scripts/inbox.mjs set <ID> <status>`')
    expect(body).toMatch(/## Files likely touched\n`docs\/harness\/harness-inbox\.md`\n/)
    expect(body.split('\n').slice(-entries.length)).toEqual(entries.map((entry) => `Inbox-entry: ${entry.id}`))
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
    expect(lines).toHaveLength(14)
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

// R889: the judge inbox is read like the other three, and its review issues go to the judge (#963).
describe('the judge inbox', () => {
  const judgeInbox = () => inboxOf('JDG')
  const judgeText = () => recordedText('JDG')
  const judged = () => parseInbox(judgeText(), judgeInbox())
  const JUDGE_GRAMMAR = ['proposed', 'approved', 'declined (<reason>)', 'deferred (<until>)', 'filed (#n)',
    'decided (<decision>), owner action: <what>']
  const DECIDED = 'decided (B: one repository secret, read only by ui-tour.yml), owner action: add the secret in Settings → Secrets'
  const panelReview = JSON.parse(readFileSync(path.join(FIXTURES, 'review-FID-006.json'), 'utf8'))

  it('reads judge-inbox.md as the fourth inbox, its grammar the harness inbox\'s plus the owner-action form', () => {
    expect(INBOXES.map((inbox) => inbox.prefix)).toEqual(['FID', 'HRN', 'PRD', 'JDG'])
    expect(judgeInbox()).toEqual({ prefix: 'JDG', file: 'docs/harness/judge-inbox.md' })
    const { grammar, entries } = judged()
    expect(grammar).toEqual(JUDGE_GRAMMAR)
    expect(grammar.slice(0, -1)).toEqual(parseInbox(liveText(inboxOf('HRN')), inboxOf('HRN')).grammar)
    expect(entries.map((entry) => [entry.id, entry.status, entry.file])).toEqual([
      ['JDG-001', 'proposed', 'docs/harness/judge-inbox.md'],
      ['JDG-002', DECIDED, 'docs/harness/judge-inbox.md'],
      ['JDG-003', 'filed (#9020), judge #9021: option A', 'docs/harness/judge-inbox.md'],
    ])
  })

  it('lists JDG entries beside the other three, and by status, decided among them', () => {
    const all = [...recorded, judged()]
    expect(listEntries(all)).toHaveLength(36)
    expect(listEntries(all, { status: 'proposed' }).map((entry) => entry.id)).toEqual([...proposedIds(recorded), 'JDG-001'])
    expect(listEntries(all, { status: 'decided' }).map((entry) => entry.id)).toEqual(['JDG-002'])
    expect(() => listEntries(recorded, { status: 'decided' })).toThrow(InboxError)
    expect(entryStatus(all, 'JDG-002', { not: 'proposed' })).toEqual({ exitCode: 0, stdout: DECIDED })
    expect(entryStatus(all, 'JDG-001', { not: 'proposed' })).toEqual({ exitCode: 1, stdout: 'proposed' })
  })

  it('sets a JDG status to every form of its grammar, and refuses decided without its owner action', () => {
    const text = judgeText()
    const { statusLine } = judged().entries[0]
    for (const value of ['approved', 'declined (judge, #9021: option B instead, since A needs a runner)',
      'deferred (judge, #9021: until #142 exits)', 'filed (#9030)', 'decided (A: wait), owner action: connect GitHub to Claude', 'proposed']) {
      expect(setStatus(text, judgeInbox(), 'JDG-001', value).split('\n')[statusLine - 1]).toBe(`- **Status:** ${value}`)
    }
    for (const value of ['decided (A)', 'decided (A), owner action: ', 'decided (A), owner action:', 'decided, owner action: x', 'owner action: x']) {
      expect(() => setStatus(text, judgeInbox(), 'JDG-001', value), JSON.stringify(value)).toThrow(InboxError)
    }
    expect(() => setStatus(recordedText('HRN'), inboxOf('HRN'), 'HRN-005', 'decided (A), owner action: x')).toThrow(/grammar/)
  })

  it('queues a JDG review issue with the judge labels and title, and the other three with REVIEW_LABELS as before', () => {
    const entry = judged().entries[0]
    const draft = reviewIssue(entry)
    expect(JUDGE_LABELS).toEqual(['judge-review', 'agent-ready', 'risk:0', 'project:harness'])
    expect(draft).toMatchObject({ id: 'JDG-001', title: `Judge review: JDG-001 · ${entry.title}`, labels: JUDGE_LABELS })
    const headings = draft.body.split('\n').filter((line) => line.startsWith('## '))
    expect(headings).toEqual(['## Goal', '## Acceptance criteria', '## Verification command', '## Scope', '## Files likely touched', '## Risk', '## Blocked by'])
    expect(draft.body).toContain('`docs/harness/judge-brief.md`')
    expect(draft.body).toContain('## Judge: DECIDED <option> | DEFERRED (<checkable condition>)')
    expect(draft.body).toContain('`node scripts/inbox.mjs set JDG-001 <status>`')
    expect(draft.body).toContain('`decided (<decision>), owner action: <what>`')
    expect(draft.body).toContain('`node scripts/inbox.mjs status JDG-001 --not proposed`')
    expect(draft.body).toMatch(/## Files likely touched\n`docs\/harness\/judge-inbox\.md`\n/)
    expect(draft.body).not.toMatch(/inbox-panel-brief|Inbox panel/)
    expect(draft.body.split('\n').at(-1)).toBe('Inbox-entry: JDG-001')
    const fidelity = recorded[0].entries.find((candidate) => candidate.id === 'FID-006')
    expect(reviewIssue(fidelity)).toEqual(panelReview)
    for (const other of recorded.flatMap((inbox) => inbox.entries).map(reviewIssue)) {
      expect([other.labels, other.title.startsWith('Inbox review: ')]).toEqual([REVIEW_LABELS, true])
    }
  })

  it('dedupes every entry against the inbox-review and judge-review issues together, each list read once', () => {
    const asked = []
    const filed = []
    const lists = { 'inbox-review': recordedIssues, 'judge-review': [{ number: 9021, title: 't', state: 'CLOSED', body: 'Inbox-entry: JDG-001' }] }
    const gh = {
      listReviewIssues: (label) => {
        asked.push(label)
        return lists[label] ?? []
      },
      fileIssue: (draft) => {
        filed.push(draft)
        return `https://github.com/mezivillager/hacer/issues/${9100 + filed.length}`
      },
    }
    const all = [...recorded, judged()]
    expect(queueReviews(all, gh)).toHaveLength(14)
    expect(asked).toEqual(['inbox-review', 'judge-review'])
    expect(filed.map((draft) => draft.id)).not.toContain('JDG-001')

    asked.length = 0
    filed.length = 0
    lists['judge-review'] = [{ number: 9022, title: 't', state: 'OPEN', body: 'Inbox-entry: FID-007' }]
    const lines = queueReviews(all, gh)
    expect(asked).toEqual(['inbox-review', 'judge-review'])
    expect(filed.at(-1)).toMatchObject({ id: 'JDG-001', labels: JUDGE_LABELS })
    expect(lines.at(-1)).toMatch(/^filed https:\/\/github\.com\/mezivillager\/hacer\/issues\/\d+: Judge review: JDG-001 · /)
    expect(filed.slice(0, -1).map((draft) => draft.labels)).toEqual(Array(13).fill(REVIEW_LABELS))
    expect(filed.map((draft) => draft.id)).not.toContain('FID-007')

    asked.length = 0
    queueReviews(recorded, { ...gh, dryRun: true })
    expect(asked).toEqual(['inbox-review'])
  })

  it('refuses to dedupe against a judge-review list gh may have cut short', () => {
    const full = Array.from({ length: REVIEW_LIST_LIMIT }, (_, i) => ({ number: i + 1, title: 't', state: 'CLOSED', body: '' }))
    const gh = { listReviewIssues: (label) => (label === 'judge-review' ? full : []), fileIssue: () => 'x', dryRun: true }
    expect(() => queueReviews([...recorded, judged()], gh)).toThrow(/judge-review/)
  })

  it('the live judge-inbox.md is inside its grammar', () => {
    const live = parseInbox(liveText(judgeInbox()), judgeInbox())
    expect(live.grammar).toEqual(JUDGE_GRAMMAR)
    expect(assertGrammar([live])).toEqual([live])
  })
})

describe('inbox.mjs', () => {
  const cleanup = []
  afterEach(() => {
    while (cleanup.length > 0) rmSync(cleanup.pop(), { recursive: true, force: true })
  })

  /** A checkout in miniature: the CLI, its logic, the recorded FID and HRN inboxes, and `productText` as the PRD inbox. */
  function disposableCheckout(productText) {
    const root = mkdtempSync(path.join(tmpdir(), 'inbox-'))
    cleanup.push(root)
    mkdirSync(path.join(root, 'scripts'))
    mkdirSync(path.join(root, 'docs', 'harness'), { recursive: true })
    for (const script of ['inbox.mjs', 'inbox.logic.mjs']) copyFileSync(path.join(import.meta.dirname, script), path.join(root, 'scripts', script))
    for (const inbox of INBOXES) writeFileSync(path.join(root, inbox.file), inbox.prefix === 'PRD' ? productText : recordedText(inbox.prefix))
    return root
  }
  const cli = (root, ...args) => spawnSync(process.execPath, [path.join(root, 'scripts', 'inbox.mjs'), ...args], { encoding: 'utf8' })

  it('exits 1 on an inbox outside its grammar, naming each entry on stderr, and set leaves the file as it was', () => {
    const root = disposableCheckout(noteGrammarText)
    const list = cli(root, 'list')
    expect([list.status, list.stdout]).toEqual([1, ''])
    const [summary, ...lines] = list.stderr.trimEnd().split('\n')
    expect(summary).toBe('inbox: 2 status line(s) outside their file\'s grammar; nothing done:')
    expect(lines.map((line) => line.split(' ', 2).join(' '))).toEqual(['docs/harness/product-inbox.md:16: PRD-001', 'docs/harness/product-inbox.md:20: PRD-002'])
    const set = cli(root, 'set', 'PRD-003', 'approved')
    expect(set.status).toBe(1)
    expect(readFileSync(path.join(root, inboxOf('PRD').file), 'utf8')).toBe(noteGrammarText)
  })

  it('lists and sets a JDG entry in docs/harness/judge-inbox.md', () => {
    const root = disposableCheckout(recordedText('PRD'))
    const decided = cli(root, 'list', '--status', 'decided')
    expect([decided.status, decided.stdout.split('\t').slice(0, 1)]).toEqual([0, ['JDG-002']])
    const value = 'decided (A: wait), owner action: connect GitHub to Claude'
    const set = cli(root, 'set', 'JDG-001', value)
    expect([set.status, set.stdout]).toEqual([0, `JDG-001: ${value} (docs/harness/judge-inbox.md)\n`])
    expect(cli(root, 'status', 'JDG-001', '--not', 'proposed')).toMatchObject({ status: 0, stdout: `${value}\n` })
  })
})
