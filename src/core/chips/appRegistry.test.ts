import { describe, it, expect, beforeEach } from 'vitest'
import {
  getBuiltinChipRegistry,
  getUserChipRegistry,
  resetAppRegistriesForTests,
} from './appRegistry'

beforeEach(() => {
  resetAppRegistriesForTests()
})

describe('appRegistry', () => {
  it('getBuiltinChipRegistry returns same instance across calls', () => {
    const a = getBuiltinChipRegistry()
    const b = getBuiltinChipRegistry()
    expect(a).toBe(b)
  })

  it('getUserChipRegistry returns same instance across calls', () => {
    const a = getUserChipRegistry()
    const b = getUserChipRegistry()
    expect(a).toBe(b)
  })

  it('getBuiltinChipRegistry is pre-populated with all 16 Project 1 chips', () => {
    const reg = getBuiltinChipRegistry()
    expect(reg.list()).toHaveLength(16)
    expect(reg.has('Nand')).toBe(true)
    expect(reg.has('DMux8Way')).toBe(true)
  })

  it('getUserChipRegistry starts empty', () => {
    expect(getUserChipRegistry().list()).toHaveLength(0)
  })

  it('builtin and user registries are distinct instances', () => {
    expect(getBuiltinChipRegistry()).not.toBe(getUserChipRegistry())
  })

  it('resetAppRegistriesForTests re-initializes both singletons', () => {
    const userReg1 = getUserChipRegistry()
    resetAppRegistriesForTests()
    const userReg2 = getUserChipRegistry()
    expect(userReg2).not.toBe(userReg1)
    expect(userReg2.list()).toHaveLength(0)
    expect(getBuiltinChipRegistry().list()).toHaveLength(16)
  })
})
