import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  REQUIRED_CONTEXTS,
  checkWorkflow,
  concurrencyGroups,
  formatFindings,
  isUniquePerRun,
  jobContexts,
  workflowEvents,
} from './required-checks.logic.mjs'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github/workflows')

const workflowFiles = readdirSync(WORKFLOW_DIR)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .map((file) => [file, readFileSync(path.join(WORKFLOW_DIR, file), 'utf-8')])

const requiredWorkflows = workflowFiles.filter(([, source]) =>
  jobContexts(source).some((context) => REQUIRED_CONTEXTS.includes(context)),
)

describe('jobContexts', () => {
  it('names a job by its id when it declares no name', () => {
    const source = ['on:', '  push:', 'jobs:', '  ci:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: a@v1'].join('\n')
    expect(jobContexts(source)).toEqual(['ci'])
  })

  it('prefers an explicit job name over the id', () => {
    const source = ['jobs:', '  build_job:', '    name: build', '    runs-on: ubuntu-latest'].join('\n')
    expect(jobContexts(source)).toEqual(['build'])
  })

  it('reads every job and stops at the end of the jobs block', () => {
    const source = ['jobs:', '  one:', '    runs-on: x', '  two:', '    name: second', '    runs-on: x', 'trailing: value'].join('\n')
    expect(jobContexts(source)).toEqual(['one', 'second'])
  })

  it('is not fooled by a step name, a nested key or a comment', () => {
    const source = [
      'jobs:',
      '  ci:',
      '    runs-on: x',
      '    # a comment at job depth',
      '    env:',
      '      NAME: x',
      '    steps:',
      '      - name: Lint',
      '        run: pnpm run lint',
    ].join('\n')
    expect(jobContexts(source)).toEqual(['ci'])
  })

  it('returns nothing when there is no jobs block', () => {
    expect(jobContexts('on:\n  push:\n')).toEqual([])
  })

  const conditional = ['jobs:', '  qa:', "    name: ${{ github.event_name == 'workflow_dispatch' && 'qa (manual)' || 'qa' }}", '    runs-on: x'].join('\n')

  it('resolves a name conditional on the event, for the event asked', () => {
    expect(jobContexts(conditional, 'workflow_dispatch')).toEqual(['qa (manual)'])
    expect(jobContexts(conditional, 'pull_request')).toEqual(['qa'])
  })

  it('reads the negated form too', () => {
    const source = conditional.replace("== 'workflow_dispatch' && 'qa (manual)' || 'qa'", "!= 'workflow_dispatch' && 'qa' || 'qa (manual)'")
    expect(jobContexts(source, 'workflow_dispatch')).toEqual(['qa (manual)'])
    expect(jobContexts(source, 'pull_request')).toEqual(['qa'])
  })

  it('lists every name a conditional can take when no event is asked', () => {
    expect(jobContexts(conditional)).toEqual(['qa (manual)', 'qa'])
  })

  it('reads a job name past its trailing comment, and keeps a # inside quotes', () => {
    const named = (name) => ['jobs:', '  build:', `    name: ${name}`, '    runs-on: x'].join('\n')
    expect(jobContexts(named('ci # the required context'))).toEqual(['ci'])
    expect(jobContexts(named("'ci' # quoted"))).toEqual(['ci'])
    expect(jobContexts(named('"ci # kept"'))).toEqual(['ci # kept'])
    expect(jobContexts(named("'ci # kept'"))).toEqual(['ci # kept'])
    expect(jobContexts(named("${{ github.event_name == 'workflow_dispatch' && 'ci (manual)' || 'ci' }} # see #368"), 'pull_request')).toEqual(['ci'])
  })
})

describe('workflowEvents', () => {
  it('reads the block form', () => {
    const source = ['on:', '  pull_request:', '    types: [opened]', '  workflow_dispatch:', '    inputs:', '      pr:', '        type: number', 'jobs:'].join('\n')
    expect(workflowEvents(source)).toEqual(['pull_request', 'workflow_dispatch'])
  })

  it('reads the one-line and list forms', () => {
    expect(workflowEvents('on: push\njobs:\n')).toEqual(['push'])
    expect(workflowEvents('on: [push, workflow_dispatch] # both\njobs:\n')).toEqual(['push', 'workflow_dispatch'])
  })

  it('returns nothing when there is no on key', () => {
    expect(workflowEvents('jobs:\n  ci:\n    runs-on: x\n')).toEqual([])
  })
})

describe('concurrencyGroups', () => {
  it('reads the group at workflow and at job level, in file order', () => {
    const source = [
      'concurrency:',
      '  group: pr-${{ github.event.pull_request.number }}',
      '  cancel-in-progress: false',
      'jobs:',
      '  ci:',
      '    concurrency:',
      '      cancel-in-progress: true',
      '      group: job-${{ github.run_id }}',
      '    runs-on: x',
    ].join('\n')
    expect(concurrencyGroups(source)).toEqual(['pr-${{ github.event.pull_request.number }}', 'job-${{ github.run_id }}'])
  })

  it('reads the one-line form, whose value is the group', () => {
    const source = ['concurrency: ci-${{ github.ref }}', 'jobs:', '  ci:', '    runs-on: x'].join('\n')
    expect(concurrencyGroups(source)).toEqual(['ci-${{ github.ref }}'])
  })

  it('keeps quotes and trailing comments out of the group, and skips a commented-out key', () => {
    const source = ['# concurrency: old-group', 'concurrency: # see #530', "  group: 'g' # per PR", 'jobs:'].join('\n')
    expect(concurrencyGroups(source)).toEqual(['g'])
  })

  it('reads null for a declaration whose group it cannot read: a flow mapping, or no group key', () => {
    const source = [
      'concurrency: { group: g, cancel-in-progress: false }',
      'jobs:',
      '  ci:',
      '    concurrency:',
      '      cancel-in-progress: true',
      '    runs-on: x',
    ].join('\n')
    expect(concurrencyGroups(source)).toEqual([null, null])
  })

  it('returns nothing when the workflow declares no concurrency', () => {
    expect(concurrencyGroups('jobs:\n  ci:\n    runs-on: x\n')).toEqual([])
  })
})

describe('isUniquePerRun', () => {
  it('accepts a group that interpolates the run id on its own', () => {
    expect(isUniquePerRun('pr-hygiene-${{ github.run_id }}')).toBe(true)
    expect(isUniquePerRun('${{github.run_id}}-${{ github.run_attempt }}')).toBe(true)
  })

  it('rejects a group that runs share: keyed by the PR, the event or a constant', () => {
    expect(isUniquePerRun('pr-hygiene-${{ github.event.pull_request.number || inputs.pr }}')).toBe(false)
    expect(isUniquePerRun('browser-qa-${{ github.event_name }}-${{ github.event.pull_request.number || inputs.pr }}')).toBe(false)
    expect(isUniquePerRun('gh-pages')).toBe(false)
  })

  it('rejects the run id as a fallback, which a pull request event never reaches', () => {
    expect(isUniquePerRun('${{ github.workflow }}-${{ github.event.pull_request.number || github.run_id }}')).toBe(false)
  })

  it('rejects a group it could not read', () => {
    expect(isUniquePerRun(null)).toBe(false)
  })
})

describe('checkWorkflow', () => {
  const required = ['ci']
  const withGroup = (group, cancel = 'false') =>
    ['concurrency:', `  group: ${group}`, `  cancel-in-progress: ${cancel}`, 'jobs:', '  ci:', '    runs-on: x'].join('\n')

  it('flags a group the runs share even with cancel-in-progress off, since a pending run is dropped (#530)', () => {
    const findings = checkWorkflow('ci.yml', withGroup('ci-${{ github.event.pull_request.number }}'), required)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      file: 'ci.yml',
      contexts: ['ci'],
      rule: 'concurrency',
      group: 'ci-${{ github.event.pull_request.number }}',
    })
  })

  it('flags a shared group at job level too', () => {
    const source = ['jobs:', '  ci:', '    concurrency: ci-${{ github.ref }}', '    runs-on: x'].join('\n')
    expect(checkWorkflow('ci.yml', source, required)).toMatchObject([{ rule: 'concurrency', group: 'ci-${{ github.ref }}' }])
  })

  it('flags a concurrency declaration whose group it cannot read', () => {
    const source = ['concurrency: { group: g }', 'jobs:', '  ci:', '    runs-on: x'].join('\n')
    expect(checkWorkflow('ci.yml', source, required)).toMatchObject([{ rule: 'concurrency', group: null }])
  })

  it('passes a group unique per run, whatever cancel-in-progress says', () => {
    expect(checkWorkflow('ci.yml', withGroup('ci-${{ github.run_id }}', 'true'), required)).toEqual([])
  })

  it('passes a workflow with no concurrency block at all', () => {
    expect(checkWorkflow('ci.yml', 'jobs:\n  ci:\n    runs-on: x\n', required)).toEqual([])
  })

  const dispatchable = (name) =>
    ['on:', '  pull_request:', '  workflow_dispatch:', 'jobs:', '  ci:', `    name: ${name}`, '    runs-on: x'].join('\n')

  it('flags a required context a manual dispatch would post, outside the PR\'s own runs (#368)', () => {
    expect(checkWorkflow('ci.yml', dispatchable('ci'), required)).toMatchObject([{ file: 'ci.yml', contexts: ['ci'], rule: 'dispatch' }])
  })

  it('passes a dispatch whose job takes another name on that event', () => {
    const name = "${{ github.event_name == 'workflow_dispatch' && 'ci (manual)' || 'ci' }}"
    expect(checkWorkflow('ci.yml', dispatchable(name), required)).toEqual([])
  })

  it('passes a required context posted by a workflow with no workflow_dispatch', () => {
    expect(checkWorkflow('ci.yml', dispatchable('ci').replace('  workflow_dispatch:\n', ''), required)).toEqual([])
  })

  it('reads a required context past a trailing comment on the job name', () => {
    const source = ['concurrency: shared', 'jobs:', '  build:', '    name: ci # the required context', '    runs-on: x'].join('\n')
    expect(checkWorkflow('ci.yml', source, required)).toMatchObject([{ rule: 'concurrency', contexts: ['ci'], group: 'shared' }])
  })

  it('flags a ${{ }} job name it cannot resolve instead of passing it', () => {
    const name = "${{ inputs.pr && 'x' || 'ci' }}"
    const source = ['concurrency: shared', 'jobs:', '  build:', `    name: ${name}`, '    runs-on: x'].join('\n')
    const findings = checkWorkflow('ci.yml', source, required)
    expect(findings).toMatchObject([{ file: 'ci.yml', rule: 'unresolved-name', name }])
    expect(formatFindings(findings)).toContain(`ci.yml names a job ${name}`)
  })

  it('leaves a workflow that posts no required context alone', () => {
    const source = withGroup('gh-pages').replace('  ci:', '  preview:')
    expect(checkWorkflow('pr-preview.yml', source, required)).toEqual([])
  })
})

describe('formatFindings', () => {
  it('names the file, the group and the fix', () => {
    const report = formatFindings(checkWorkflow('ci.yml', 'concurrency: ci-${{ github.ref }}\njobs:\n  ci:\n    runs-on: x\n', ['ci']))
    expect(report).toContain('ci.yml')
    expect(report).toContain('ci-${{ github.ref }}')
    expect(report).toContain('${{ github.run_id }}')
  })

  it('says so when there is nothing to report', () => {
    expect(formatFindings([])).toMatch(/no required workflow/i)
  })
})

// The guard itself. A concurrency group that the runs of a required workflow share strands a PR at
// `mergeStateStatus: BLOCKED` with every check reported green: a run it cancels in progress posts a
// `cancelled` check run (#295), and a run it drops while pending leaves a check suite with no check
// run, which the merge box reads when that suite is the workflow's newest (#530).
describe('the repo .github/workflows', () => {
  it('has a workflow for every required context', () => {
    const produced = new Set(workflowFiles.flatMap(([, source]) => jobContexts(source)))
    for (const context of REQUIRED_CONTEXTS) expect([...produced]).toContain(context)
  })

  it.each(requiredWorkflows)('%s shares no concurrency group between its runs', (file, source) => {
    const shared = concurrencyGroups(source).filter((group) => !isUniquePerRun(group))
    expect(shared, formatFindings(checkWorkflow(file, source))).toEqual([])
  })

  it.each(requiredWorkflows)('%s posts no required context from a manual dispatch', (file, source) => {
    const dispatched = workflowEvents(source).includes('workflow_dispatch') ? jobContexts(source, 'workflow_dispatch') : []
    expect(dispatched.filter((context) => REQUIRED_CONTEXTS.includes(context)), formatFindings(checkWorkflow(file, source))).toEqual([])
  })

  it.each(workflowFiles)('%s names every job in a shape the guard can resolve', (file, source) => {
    const unresolved = checkWorkflow(file, source).filter((finding) => finding.rule === 'unresolved-name')
    expect(unresolved, formatFindings(unresolved)).toEqual([])
  })

  it('still posts browser-qa and pr-hygiene under the required name from their PR events', () => {
    const contextsOn = (file, event) => jobContexts(workflowFiles.find(([name]) => name === file)[1], event)
    expect(contextsOn('browser-qa.yml', 'pull_request')).toEqual(['browser-qa'])
    expect(contextsOn('pr-hygiene.yml', 'pull_request_target')).toEqual(['pr-hygiene'])
  })
})
