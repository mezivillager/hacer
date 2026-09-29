import { describe, it, expect } from 'vitest'
import { expectOneGoldenPerCase } from './characterizationGoldens'

describe('expectOneGoldenPerCase', () => {
  it('passes when the directory holds exactly one golden per case', () => {
    const onDisk = { './g/a.json': 1, './g/b.json': 1 }
    expect(() => expectOneGoldenPerCase(onDisk, ['a', 'b'], './g')).not.toThrow()
  })

  it('fails on a golden without a case', () => {
    expect(() => expectOneGoldenPerCase({ './g/a.json': 1, './g/x.json': 1 }, ['a'], './g')).toThrow()
  })

  it('fails on a case without a golden', () => {
    expect(() => expectOneGoldenPerCase({ './g/a.json': 1 }, ['a', 'b'], './g')).toThrow()
  })

  it('fails on a nested golden even when its file name matches a case', () => {
    const onDisk = { './g/a.json': 1, './g/sub/b.json': 1 }
    expect(() => expectOneGoldenPerCase(onDisk, ['a', 'b'], './g')).toThrow()
  })

  it('fails on a golden nested where every golden is nested', () => {
    expect(() => expectOneGoldenPerCase({ './g/sub/a.json': 1 }, ['a'], './g')).toThrow()
  })
})
