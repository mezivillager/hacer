import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  REQUIRED_CONTEXTS,
  cancelInProgressSettings,
  checkWorkflow,
  formatFindings,
  jobContexts,
} from './required-checks.logic.mjs'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github/workflows')

const workflowFiles = readdirSync(WORKFLOW_DIR)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .map((file) => [file, readFileSync(path.join(WORKFLOW_DIR, file), 'utf-8')])

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
})

describe('cancelInProgressSettings', () => {
  it('reads the value at workflow and at job level, in file order', () => {
    const source = [
      'concurrency:',
      '  group: a',
      '  cancel-in-progress: false',
      'jobs:',
      '  ci:',
      '    concurrency:',
      '      cancel-in-progress: true',
    ].join('\n')
    expect(cancelInProgressSettings(source)).toEqual(['false', 'true'])
  })

  it('ignores a commented-out setting and keeps a trailing comment out of the value', () => {
    const source = ['# cancel-in-progress: true', 'concurrency:', '  cancel-in-progress: false # see #295'].join('\n')
    expect(cancelInProgressSettings(source)).toEqual(['false'])
  })

  it('returns nothing when the workflow declares no concurrency', () => {
    expect(cancelInProgressSettings('jobs:\n  ci:\n    runs-on: x\n')).toEqual([])
  })
})

describe('checkWorkflow', () => {
  const required = ['ci']
  const withSetting = (value) =>
    ['concurrency:', '  group: g', `  cancel-in-progress: ${value}`, 'jobs:', '  ci:', '    runs-on: x'].join('\n')

  it('flags a workflow that posts a required context and cancels in-progress runs', () => {
    const findings = checkWorkflow('ci.yml', withSetting('true'), required)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ file: 'ci.yml', contexts: ['ci'] })
  })

  it('passes the same workflow once cancellation is off', () => {
    expect(checkWorkflow('ci.yml', withSetting('false'), required)).toEqual([])
  })

  it('passes a workflow with no concurrency block at all', () => {
    expect(checkWorkflow('ci.yml', 'jobs:\n  ci:\n    runs-on: x\n', required)).toEqual([])
  })

  it('leaves a workflow that posts no required context alone', () => {
    const source = withSetting('true').replace('  ci:', '  preview:')
    expect(checkWorkflow('pr-preview.yml', source, required)).toEqual([])
  })
})

describe('formatFindings', () => {
  it('names the file, the contexts and the fix', () => {
    const report = formatFindings(checkWorkflow('ci.yml', 'concurrency:\n  cancel-in-progress: true\njobs:\n  ci:\n    runs-on: x\n', ['ci']))
    expect(report).toContain('ci.yml')
    expect(report).toContain('cancel-in-progress')
  })

  it('says so when there is nothing to report', () => {
    expect(formatFindings([])).toMatch(/no required workflow/i)
  })
})

// The guard itself (#295): a cancelled run of a required context posts a `cancelled` check run,
// and GitHub counts the newest check run per context — so one cancellation strands the PR at
// `mergeStateStatus: BLOCKED` with every check reported green.
describe('the repo .github/workflows', () => {
  it('has a workflow for every required context', () => {
    const produced = new Set(workflowFiles.flatMap(([, source]) => jobContexts(source)))
    for (const context of REQUIRED_CONTEXTS) expect([...produced]).toContain(context)
  })

  it('never lets a required check be cancelled by concurrency', () => {
    const findings = workflowFiles.flatMap(([file, source]) => checkWorkflow(file, source))
    expect(formatFindings(findings)).toMatch(/no required workflow/i)
  })
})
