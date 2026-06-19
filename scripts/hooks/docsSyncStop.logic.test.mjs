import { describe, it, expect } from 'vitest'
import {
  evaluateStopHook,
  isCodePath,
  isDocPath,
  REMINDER,
} from './docsSyncStop.logic.mjs'

describe('evaluateStopHook', () => {
  it('does not block when the stop hook is already active (loop guard)', () => {
    expect(evaluateStopHook({ stopHookActive: true, changedPaths: ['src/a.ts'] }))
      .toEqual({ remind: false, block: false, reason: '' })
  })

  it('does not block when already reminded this session', () => {
    expect(evaluateStopHook({ alreadyReminded: true, changedPaths: ['src/a.ts'] }))
      .toEqual({ remind: false, block: false, reason: '' })
  })

  it('does not block when nothing changed', () => {
    expect(evaluateStopHook({ changedPaths: [] }).block).toBe(false)
  })

  it('blocks once when code changed but no docs were touched', () => {
    const r = evaluateStopHook({ changedPaths: ['src/store/circuitStore.ts'] })
    expect(r).toEqual({ remind: true, block: true, reason: REMINDER })
  })

  it('treats e2e changes as code', () => {
    expect(evaluateStopHook({ changedPaths: ['e2e/specs/x.store.spec.ts'] }).block).toBe(true)
  })

  it('does not block when a decision was recorded (docs/decisions touched)', () => {
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', 'docs/decisions/0002-x.md'] }).block)
      .toBe(false)
  })

  it('does not block when any living doc was touched', () => {
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', 'REPO_MAP.md'] }).block).toBe(false)
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', '.cursorrules'] }).block).toBe(false)
  })

  it('ignores CHANGELOG.md as a doc touch (it is auto-generated)', () => {
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', 'CHANGELOG.md'] }).block).toBe(true)
  })

  it('reminds but does not block when enforcement is disabled', () => {
    const r = evaluateStopHook({ changedPaths: ['src/a.ts'], enforce: false })
    expect(r.remind).toBe(true)
    expect(r.block).toBe(false)
    expect(r.reason).toBe(REMINDER)
  })
})

describe('path classifiers', () => {
  it('classifies code paths', () => {
    expect(isCodePath('src/x.ts')).toBe(true)
    expect(isCodePath('e2e/x.spec.ts')).toBe(true)
    expect(isCodePath('docs/x.md')).toBe(false)
  })

  it('classifies doc paths (except CHANGELOG.md)', () => {
    expect(isDocPath('docs/roadmap/vision.md')).toBe(true)
    expect(isDocPath('README.md')).toBe(true)
    expect(isDocPath('.cursorrules')).toBe(true)
    expect(isDocPath('CHANGELOG.md')).toBe(false)
    expect(isDocPath('src/x.ts')).toBe(false)
  })
})
