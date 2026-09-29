import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

// Two of OpenSSF Scorecard's checks, held for every workflow rather than scorecard.yml alone
// (scorecard.workflow.test.mjs pins that file's own shape).
// - Pinned-Dependencies: an action pinned by tag runs whatever the tag points to next; a full commit
//   SHA cannot move. The release goes in a trailing comment, which Dependabot updates with the SHA.
// - Token-Permissions: the workflow-level token is read-only, and a job that writes says so in its
//   own `permissions:` block, one comment per write stating what uses it.
// Read as text, like the other workflow tests: the repo has no YAML dependency and these files are
// small and hand-written.

const DIR = path.join(import.meta.dirname, '..', '.github', 'workflows')
const workflows = readdirSync(DIR)
  .filter((file) => /\.ya?ml$/.test(file))
  .sort()
  .map((file) => [file, readFileSync(path.join(DIR, file), 'utf8')])

const isComment = (line) => line.trimStart().startsWith('#')

/** Every non-comment line naming an action, whatever its shape, so an odd one cannot slip past. */
const usesLines = (source) => source.split('\n').filter((line) => !isComment(line) && /\buses:/.test(line))

/** The non-blank lines of the top-level `permissions:` block, comments stripped. */
function topLevelPermissions(source) {
  const lines = source
    .split('\n')
    .filter((line) => !isComment(line))
    .map((line) => line.replace(/\s+#.*$/, ''))
    .filter((line) => line.trim() !== '')
  const start = lines.findIndex((line) => /^permissions:/.test(line))
  if (start === -1) return []
  const end = lines.findIndex((line, index) => index > start && /^\S/.test(line))
  return lines.slice(start, end === -1 ? undefined : end)
}

describe('.github/workflows', () => {
  it('holds workflows that use actions, so the checks below are not vacuous', () => {
    expect(workflows.map(([file]) => file)).toEqual(expect.arrayContaining(['ci.yml', 'deploy.yml', 'pr-hygiene.yml', 'release.yml']))
    expect(workflows.flatMap(([, source]) => usesLines(source)).length).toBeGreaterThan(workflows.length)
  })

  it.each(workflows)('%s pins every action by full commit SHA, with its release in a comment', (file, source) => {
    for (const line of usesLines(source)) {
      expect(line, file).toMatch(/^\s+(?:- )?uses: [\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
    }
  })

  it.each(workflows)('%s keeps its workflow-level token read-only', (file, source) => {
    const [head, ...entries] = topLevelPermissions(source)
    // No block at all means the repository default, which can be write-all.
    expect(head, `${file} declares no top-level permissions`).toBeDefined()
    if (head === 'permissions: read-all' || head === 'permissions: {}') {
      expect(entries).toEqual([])
    } else {
      expect(head).toBe('permissions:')
      for (const entry of entries) expect(entry, file).toMatch(/^ {2}[a-z-]+: (?:read|none)$/)
    }
  })

  it.each(workflows)('%s states what uses each write it grants', (file, source) => {
    expect(source).not.toMatch(/write-all/)
    const lines = source.split('\n')
    lines.forEach((line, index) => {
      if (isComment(line) || !/^\s+[a-z-]+:\s*write\b/.test(line)) return
      const stated = /\swrite\s+#\s*\S/.test(line) || isComment(lines[index - 1] ?? '')
      expect(stated, `${file}:${index + 1} grants \`${line.trim()}\` with no comment on it or above it`).toBe(true)
    })
  })
})
