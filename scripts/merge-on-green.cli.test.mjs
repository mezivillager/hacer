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
  "pr merge"|"pr update-branch"|"run rerun") exit 0 ;;
  "pr edit")
    while [ $# -gt 0 ]; do [ "$1" = "--body-file" ] && cp "$2" "$STUB/edited-body.md"; shift; done
    exit 0 ;;
esac
case "$2" in
  *rules/branches/*) if [ -f "$STUB/rules.json" ]; then cat "$STUB/rules.json"; exit 0; fi; cat "$STUB/404.json"; exit 1 ;;
  */protection) cat "$STUB/404.json"; exit 1 ;;
  *check-runs*) cat "$STUB/checks.json"; exit 0 ;;
  *actions/runs*) cat "$STUB/runs.json"; exit 0 ;;
esac
echo "gh double: unexpected call: $*" >&2
exit 1
`

/** Runs the tool once against a recorded state. `rules: false` makes the rulesets call fail too. */
function runTool(state, { rules = true, args = ['1'] } = {}) {
  const stub = mkdtempSync(path.join(tmpdir(), 'merge-on-green-'))
  cleanup.push(stub)
  const fixture = JSON.parse(read(`${state}.json`))
  writeFileSync(path.join(stub, 'pr.json'), JSON.stringify(fixture.pr))
  writeFileSync(path.join(stub, 'checks.json'), `${JSON.stringify(fixture.checkRuns)}\n`)
  writeFileSync(path.join(stub, 'runs.json'), `${JSON.stringify(fixture.workflowRuns)}\n`)
  writeFileSync(path.join(stub, '404.json'), read('protection-404.json'))
  if (rules) writeFileSync(path.join(stub, 'rules.json'), read('rules-main.json'))
  const gh = path.join(stub, 'gh')
  writeFileSync(gh, GH_DOUBLE)
  chmodSync(gh, 0o755)

  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, GH_BIN: gh, STUB: stub },
    encoding: 'utf8',
  })
  const saved = (name) => (existsSync(path.join(stub, name)) ? readFileSync(path.join(stub, name), 'utf8') : '')
  return { ...result, fixture, calls: saved('calls.log'), body: saved('edited-body.md') }
}

describe('merge-on-green.mjs (gh is a test double)', () => {
  it('exits 0 for a merged PR, after printing the required set it read', () => {
    const result = runTool('merged')
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/required on main \(rulesets\): ci, pr-hygiene, browser-qa/)
    expect(result.stdout).toMatch(/merged/)
  })

  it('never reads an API error body on stdout as a required context (R518)', () => {
    const result = runTool('non-required-failure', { rules: false })
    expect(result.stdout).not.toContain('Branch not protected')
    expect(result.stdout).toMatch(/every check counts as required/)
    expect(result.status).toBe(2) // deploy-preview now counts as required, and it failed
  })

  it('appends its marker to the body once, keeps the body, and exits 3 at the deadline', () => {
    const result = runTool('empty-cancelled-suite', { args: ['517', 'mezivillager/hacer', '0'] })
    expect(result.status).toBe(3)
    expect(result.calls.match(/^pr edit /gm)).toHaveLength(1)
    expect(result.body.startsWith(result.fixture.pr.body.trimEnd())).toBe(true)
    expect(result.body).toMatch(
      /<!-- merge-on-green: edited to re-run the required checks on ce3e920a6414164989dbdb8b9d45d8ead2ac1bbc at .+ -->$/,
    )
  })

  it('exits 1 with the usage line when no PR is given', () => {
    const result = runTool('merged', { args: [] })
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/usage/)
  })
})
