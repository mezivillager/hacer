import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// The wiring between gh and the logic, where R518 lived: a gh call that fails prints its error
// body on stdout, and that text must never become data. gh is a test double (GH_BIN) serving the
// recorded fixtures; nothing here reaches GitHub.

const SCRIPT = path.join(import.meta.dirname, 'merge-on-green.mjs')
const FIXTURES = path.join(import.meta.dirname, 'fixtures/merge-on-green')
const read = (name) => readFileSync(path.join(FIXTURES, name), 'utf8')
const cleanup = []

afterEach(() => {
  while (cleanup.length > 0) rmSync(cleanup.pop(), { recursive: true, force: true })
})

const GH_DOUBLE = `#!/bin/sh
printf '%s\\n' "$*" >> "$STUB/calls.log"
case "$1 $2" in
  "pr view") cat "$STUB/pr.json"; exit 0 ;;
  "pr merge"|"api graphql")
    error="$STUB/$2-error.txt"
    if [ -f "$error" ]; then cat "$error" >&2; exit 1; fi
    exit 0 ;;
  "run rerun") exit 0 ;;
  "pr edit")
    while [ $# -gt 0 ]; do [ "$1" = "--body-file" ] && cp "$2" "$STUB/edited-body.md"; shift; done
    exit 0 ;;
esac
case "$2" in
  *rules/branches/*) if [ -f "$STUB/rules.json" ]; then cat "$STUB/rules.json"; exit 0; fi; cat "$STUB/404.json"; exit 1 ;;
  */protection) cat "$STUB/404.json"; exit 1 ;;
  *check-runs*) cat "$STUB/checks.json"; exit 0 ;;
  */activity*) cat "$STUB/pushes.json"; exit 0 ;;
  */pulls/*/commits*) cat "$STUB/commits.json"; exit 0 ;;
  */jobs*) echo '[]'; exit 0 ;;
  *actions/runs*) cat "$STUB/runs.json"; exit 0 ;;
esac
echo "gh double: unexpected call: $*" >&2
exit 1
`

/**
 * Runs the tool once against a recorded state. `rules: false` makes the rulesets call fail too;
 * `refuse` maps `merge` or `graphql` to the stderr line gh prints when GitHub refuses that call.
 */
function runTool(state, { rules = true, args = ['1'], pr = {}, refuse = {} } = {}) {
  const stub = mkdtempSync(path.join(tmpdir(), 'merge-on-green-'))
  cleanup.push(stub)
  const fixture = JSON.parse(read(`${state}.json`))
  writeFileSync(path.join(stub, 'pr.json'), JSON.stringify({ ...fixture.pr, ...pr }))
  writeFileSync(path.join(stub, 'pushes.json'), JSON.stringify(fixture.basePushes ?? []))
  writeFileSync(path.join(stub, 'checks.json'), `${JSON.stringify(fixture.checkRuns)}\n`)
  writeFileSync(path.join(stub, 'runs.json'), `${JSON.stringify(fixture.workflowRuns)}\n`)
  writeFileSync(path.join(stub, 'commits.json'), `${JSON.stringify(fixture.commits ?? [])}\n`)
  for (const [call, line] of Object.entries(refuse)) writeFileSync(path.join(stub, `${call}-error.txt`), `${line}\n`)
  writeFileSync(path.join(stub, '404.json'), read('protection-404.json'))
  if (rules) writeFileSync(path.join(stub, 'rules.json'), read('rules-main.json'))
  const gh = path.join(stub, 'gh')
  writeFileSync(gh, GH_DOUBLE)
  chmodSync(gh, 0o755)

  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, GH_BIN: gh, STUB: stub },
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS - 2000,
  })
  const saved = (name) => (existsSync(path.join(stub, name)) ? readFileSync(path.join(stub, name), 'utf8') : '')
  return { ...result, fixture, calls: saved('calls.log'), body: saved('edited-body.md') }
}

const PR_646 = 'PR_kwDORdjPzc8AAAABGL8cJA'

// Explicit timeout, not the 5 s default: each test spawns the CLI, measured up to 4.8 s under load (1.3 s alone).
const SPAWN_TIMEOUT_MS = 15000

describe('merge-on-green.mjs (gh is a test double)', () => {
  it('exits 0 for a merged PR, after printing the required set it read', () => {
    const result = runTool('merged')
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/required on main \(rulesets\): ci, pr-hygiene, browser-qa/)
    expect(result.stdout).toMatch(/merged/)
  }, SPAWN_TIMEOUT_MS)

  it('never reads an API error body on stdout as a required context (R518)', () => {
    const result = runTool('non-required-failure', { rules: false })
    expect(result.stdout).not.toContain('Branch not protected')
    expect(result.stdout).toMatch(/every check counts as required/)
    expect(result.status).toBe(2) // deploy-preview now counts as required, and it failed
  }, SPAWN_TIMEOUT_MS)

  it('appends its marker to the body once, keeps the body, and exits 3 at the deadline', () => {
    const result = runTool('empty-cancelled-suite', { args: ['517', 'mezivillager/hacer', '0'], pr: { autoMergeRequest: null } })
    expect(result.status).toBe(3)
    expect(result.calls.match(/^pr edit /gm)).toHaveLength(1)
    expect(result.body.startsWith(result.fixture.pr.body.trimEnd())).toBe(true)
    expect(result.body).toMatch(
      /<!-- merge-on-green: edited to re-run the required checks on ce3e920a6414164989dbdb8b9d45d8ead2ac1bbc at .+ -->$/,
    )
  }, SPAWN_TIMEOUT_MS)

  it('updates a stale green by REBASE, pinned to the head it judged, and says why (#407, #669)', () => {
    const result = runTool('stale-green', { args: ['646', 'mezivillager/hacer', '0'], pr: { id: PR_646 } })
    expect(result.status).toBe(3)
    const update = result.calls.split('\n').filter((line) => line.startsWith('api graphql '))
    expect(update).toHaveLength(1)
    expect(update[0]).toMatch(/updatePullRequestBranch\(input: \{.*updateMethod: REBASE/)
    expect(update[0]).toContain(`-f id=${PR_646}`)
    expect(update[0]).toContain('-f head=f9ecfbda4bc8ba6f77359f1aeb024a1b4a0b8713')
    expect(result.calls).not.toMatch(/^pr (update-branch|merge) /m)
    expect(result.stdout).toContain('main moved to 59cc2f0 since')
  }, SPAWN_TIMEOUT_MS)

  it('stops at once when GitHub refuses the REBASE update, exit 4, in its words', () => {
    const refusal = 'GraphQL: Resource not accessible by integration (updatePullRequestBranch)'
    const result = runTool('stale-green', { args: ['646', 'mezivillager/hacer', '5'], pr: { id: PR_646 }, refuse: { graphql: refusal } })
    expect(result.status).toBe(4)
    expect(result.calls.match(/^api graphql /gm)).toHaveLength(1)
    expect(result.stdout).toContain(refusal)
  }, SPAWN_TIMEOUT_MS)

  it('stops after the first "can’t be rebased" refusal, naming the merge commit (#667)', () => {
    const fixture = JSON.parse(read('rebase-refused.json'))
    const result = runTool('rebase-refused', { args: ['667', 'mezivillager/hacer', '5'], refuse: { merge: fixture.refusal } })
    expect(result.status).toBe(4)
    expect(result.calls.match(/^pr merge /gm)).toHaveLength(1)
    expect(result.calls).toMatch(/^api repos\/mezivillager\/hacer\/pulls\/667\/commits/m)
    expect(result.stdout).toMatch(/give-up: .*181b3c3/)
  }, SPAWN_TIMEOUT_MS)

  it('merges a fresh green itself, pinned to the head it judged, never through auto-merge', () => {
    const result = runTool('fresh-green', { args: ['645', 'mezivillager/hacer', '0'] })
    expect(result.calls).toMatch(/^pr merge 645 -R mezivillager\/hacer --rebase --match-head-commit a75b5930bb8a8e9f6541ccacd957a919d96d2ab9$/m)
    expect(result.calls).not.toMatch(/--auto/)
  }, SPAWN_TIMEOUT_MS)

  it('--dry-run prints the action and does nothing', () => {
    const result = runTool('stale-green', { args: ['646', '--dry-run'] })
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/update-branch: ci ran at/)
    expect(result.calls).not.toMatch(/^pr (update-branch|merge|edit) /m)
  }, SPAWN_TIMEOUT_MS)

  it('exits 1 with the usage line when no PR is given', () => {
    const result = runTool('merged', { args: [] })
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/usage/)
  })
})
