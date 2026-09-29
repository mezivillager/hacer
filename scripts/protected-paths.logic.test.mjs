import { describe, expect, it } from 'vitest'
import { PROTECTED_GLOBS, isProtectedPath } from './protected-paths.logic.mjs'

describe('conformance/vectors/**', () => {
  it('is the protected-path glob', () => {
    expect(PROTECTED_GLOBS).toContain('conformance/vectors/**')
  })

  it('matches every file under the vendored oracle, at any project depth', () => {
    expect(isProtectedPath('conformance/vectors/01/Xor.tst')).toBe(true)
    expect(isProtectedPath('conformance/vectors/01/Xor.hdl')).toBe(true)
    expect(isProtectedPath('conformance/vectors/01/Xor.cmp')).toBe(true)
    expect(isProtectedPath('conformance/vectors/LICENSE')).toBe(true)
    expect(isProtectedPath('conformance/vectors/02/Add.hdl')).toBe(true)
  })

  it('does not match the hand-transcribed fixtures or other source', () => {
    expect(isProtectedPath('src/core/testing/project1CmpFixtures.ts')).toBe(false)
    expect(isProtectedPath('src/core/testing/project1TstFixtures.ts')).toBe(false)
    expect(isProtectedPath('scripts/sync-vectors.sh')).toBe(false)
  })
})

describe('**/__snapshots__/characterization/**', () => {
  it('is a protected-path glob', () => {
    expect(PROTECTED_GLOBS).toContain('**/__snapshots__/characterization/**')
  })

  it('matches the legacy characterization goldens, at any depth', () => {
    expect(isProtectedPath('src/core/serialization/__snapshots__/characterization/evaluation/junction-chain.json')).toBe(true)
    expect(isProtectedPath('src/store/__snapshots__/characterization/actions.json')).toBe(true)
    expect(isProtectedPath('__snapshots__/characterization/scene.json')).toBe(true)
    expect(isProtectedPath('src\\utils\\__snapshots__\\characterization\\scene.json')).toBe(true)
  })

  it('does not match ordinary snapshots or the characterization tests themselves', () => {
    expect(isProtectedPath('src/core/serialization/__snapshots__/serialization.test.ts.snap')).toBe(false)
    expect(isProtectedPath('src/core/serialization/legacyEvaluation.characterization.test.ts')).toBe(false)
    expect(isProtectedPath('src/characterization/evaluation.json')).toBe(false)
    expect(isProtectedPath('src/__snapshots__/characterization.json')).toBe(false)
  })
})
