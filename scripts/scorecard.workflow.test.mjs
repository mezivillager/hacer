import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { REQUIRED_CONTEXTS, jobContexts } from './required-checks.logic.mjs'

// #542: OpenSSF Scorecard runs advisory only. Everything that keeps it advisory lives in its
// workflow file — which events start it, what its token may write, whether its results leave for the
// OpenSSF API, which check contexts it posts — so the file is read as text and that shape is pinned.
// A missing file reads as empty, so each assertion fails on its own instead of the module failing
// to load.

const FILE = path.join(import.meta.dirname, '..', '.github', 'workflows', 'scorecard.yml')
const raw = existsSync(FILE) ? readFileSync(FILE, 'utf8') : ''

/** The workflow without its comments, so a trigger or a permission named in prose does not count. */
const source = raw
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .map((line) => line.replace(/\s+#.*$/, ''))
  .join('\n')

/** The non-blank lines of a top-level key's block: from `key:` up to the next line that starts in
 *  column 0. Blank lines are dropped, since stripping the comments leaves them behind. */
function topLevelBlock(key) {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line === `${key}:` || line.startsWith(`${key}: `))
  if (start === -1) return []
  const end = lines.findIndex((line, index) => index > start && /^\S/.test(line))
  return lines.slice(start, end === -1 ? undefined : end).filter((line) => line.trim() !== '')
}

/** The keys one level inside a top-level block. */
const childKeys = (block) => block.slice(1).flatMap((line) => line.match(/^ {2}([A-Za-z_-]+):/)?.[1] ?? [])

describe('.github/workflows/scorecard.yml', () => {
  it('exists and runs ossf/scorecard-action', () => {
    expect(existsSync(FILE)).toBe(true)
    expect(source).toMatch(/^\s+(?:- )?uses: ossf\/scorecard-action@/m)
  })

  it('runs weekly, on push to main and by hand, and never on a pull request', () => {
    const on = topLevelBlock('on')
    expect(childKeys(on).sort()).toEqual(['push', 'schedule', 'workflow_dispatch'])
    expect(on.join('\n')).toMatch(/^ {2}push:\n {4}branches: \[main\]$/m)
    expect(source).not.toMatch(/\bpull_request(?:_target)?\b/)

    const crons = [...on.join('\n').matchAll(/cron: '([^']+)'/g)].map((match) => match[1])
    expect(crons).toHaveLength(1)
    // Weekly: one minute, one hour, any day of the month, any month, one day of the week.
    expect(crons[0]).toMatch(/^\d{1,2} \d{1,2} \* \* [0-6]$/)
  })

  it('publishes nothing to the OpenSSF API, so it needs no OIDC token', () => {
    expect(source).toMatch(/^\s+publish_results: false$/m)
    expect(source).not.toMatch(/publish_results: true/)
    expect(source).not.toMatch(/id-token/)
  })

  it('writes its results as SARIF and uploads that file to code scanning', () => {
    expect(source).toMatch(/^\s+results_format: sarif$/m)
    const resultsFile = source.match(/^\s+results_file: (\S+)$/m)?.[1]
    expect(resultsFile).toBeDefined()
    expect(source).toMatch(/^\s+(?:- )?uses: github\/codeql-action\/upload-sarif@/m)
    expect(source).toMatch(new RegExp(`^\\s+sarif_file: ${resultsFile}$`, 'm'))
  })

  it('pins every action by full commit SHA, with its release in a comment', () => {
    const uses = raw.split('\n').filter((line) => /^\s+(?:- )?uses:/.test(line))
    expect(uses.length).toBeGreaterThanOrEqual(3)
    for (const line of uses) expect(line).toMatch(/^\s+(?:- )?uses: [\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
    const actions = uses.map((line) => line.match(/uses: ([^@]+)@/)?.[1])
    expect(actions).toEqual(expect.arrayContaining(['actions/checkout', 'ossf/scorecard-action', 'github/codeql-action/upload-sarif']))
  })

  it('keeps its token read-only apart from security-events: write', () => {
    // Read-only at workflow level, whichever spelling.
    expect(['permissions: read-all', 'permissions:\n  contents: read']).toContain(topLevelBlock('permissions').join('\n'))
    // The only write anywhere is the SARIF upload's.
    const writes = [...source.matchAll(/^\s+([a-z-]+):\s*write\b/gm)].map((match) => match[1])
    expect(writes).toEqual(['security-events'])
    expect(source).not.toMatch(/write-all/)
    // The checkout leaves no token in .git/config for the steps after it.
    expect(source).toMatch(/^\s+persist-credentials: false$/m)
  })

  it('is not a required check: none of its jobs posts a required context', () => {
    const contexts = jobContexts(source)
    expect(contexts.length).toBeGreaterThan(0)
    for (const context of contexts) expect(REQUIRED_CONTEXTS).not.toContain(context)
  })
})
