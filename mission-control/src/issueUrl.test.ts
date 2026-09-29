import { describe, expect, it } from 'vitest'
import { buildIssueUrl } from './issueUrl'

describe('issueUrl', () => {
  it('buildIssueUrl encodes template, title and body correctly', () => {
    const url = new URL(buildIssueUrl({
      title: 'Ledger L057: fix & "mechanise" it?',
      context: 'Ledger row L057\nhttps://github.com/mezivillager/hacer/blob/main/docs/harness/ledger.md #12 100% <b>',
    }))
    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/mezivillager/hacer/issues/new')
    expect(url.searchParams.get('template')).toBe('process-improvement.yml')
    expect(url.searchParams.get('title')).toBe('Ledger L057: fix & "mechanise" it?')
    expect(url.searchParams.get('context')).toBe(
      'Ledger row L057\nhttps://github.com/mezivillager/hacer/blob/main/docs/harness/ledger.md #12 100% <b>')
    // URL-safe: no raw space, newline, quote or angle bracket survives in the query string.
    expect(url.search).not.toMatch(/[ \n"<>]/)
    expect(url.search.match(/&/g)).toHaveLength(2)
  })
})
