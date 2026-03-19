import { describe, expect, it } from 'vitest'
import {
  displayVersionFromPackageVersion,
  normalizeReleaseTag,
} from './githubRelease'

describe('normalizeReleaseTag', () => {
  it('keeps leading v', () => {
    expect(normalizeReleaseTag('v1.2.3')).toBe('v1.2.3')
  })

  it('adds v when missing', () => {
    expect(normalizeReleaseTag('1.2.3')).toBe('v1.2.3')
  })

  it('trims whitespace', () => {
    expect(normalizeReleaseTag('  v2.0.0  ')).toBe('v2.0.0')
  })

  it('returns empty for blank', () => {
    expect(normalizeReleaseTag('')).toBe('')
    expect(normalizeReleaseTag('   ')).toBe('')
  })
})

describe('displayVersionFromPackageVersion', () => {
  it('adds v for semver', () => {
    expect(displayVersionFromPackageVersion('1.1.3')).toBe('v1.1.3')
  })

  it('keeps v prefix', () => {
    expect(displayVersionFromPackageVersion('v1.0.0')).toBe('v1.0.0')
  })

  it('uses v0.0.0 for empty', () => {
    expect(displayVersionFromPackageVersion('')).toBe('v0.0.0')
  })
})
