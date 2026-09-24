import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { project1CmpFixtures } from '../src/core/testing/project1CmpFixtures.ts'
import { project1TstFixtures } from '../src/core/testing/project1TstFixtures.ts'
import {
  VENDORED_PROJECTS,
  WEB_IDE_COMMIT,
  WEB_IDE_URL,
  chipNameFromHdl,
  filesForChip,
  licenseNotice,
  sparsePaths,
} from './sync-vectors.logic.mjs'

const VECTORS = new URL('../conformance/vectors/', import.meta.url)

/** // comments are the only difference the audit found between the 16 fixtures and upstream. */
function withoutLineComments(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trimEnd())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

describe('sync pin', () => {
  it('clones the public web-ide repo at one recorded commit, project 01 only', () => {
    expect(WEB_IDE_URL).toBe('https://github.com/nand2tetris/web-ide.git')
    expect(WEB_IDE_COMMIT).toMatch(/^[0-9a-f]{40}$/)
    expect(VENDORED_PROJECTS).toEqual(['01'])
    expect(sparsePaths()).toEqual(['projects/src/project_01'])
  })

  it('names a chip from its HDL declaration and refuses a module missing a part', () => {
    expect(chipNameFromHdl('// header\nCHIP Xor {\n    IN a, b;\n    OUT out;\n}')).toBe('Xor')
    expect(() => filesForChip({ hdl: 'CHIP Xor {\n', tst: 'load Xor.hdl,\n' })).toThrow(/cmp/)
    const files = filesForChip({ hdl: 'CHIP Xor {\n', tst: 'load Xor.hdl,', cmp: '| a | b |out|' })
    expect(files.name).toBe('Xor')
    expect(files.hdl.endsWith('\n')).toBe(true)
    expect(files.tst.endsWith('\n')).toBe(true)
    expect(files.cmp.endsWith('\n')).toBe(true)
  })
})

describe('licence notice', () => {
  it('records the pinned commit and the licence of the vector content, not web-ide MIT', () => {
    const notice = licenseNotice()
    expect(notice).toContain(WEB_IDE_COMMIT)
    expect(notice).toContain('https://github.com/nand2tetris/web-ide')
    expect(notice).toContain('Creative Commons Attribution-NonCommercial-ShareAlike 3.0')
    expect(notice).toContain('https://www.nand2tetris.org/license')
    expect(notice).toContain('https://creativecommons.org/licenses/by-nc-sa/3.0/')
    expect(notice).toContain('Nisan')
    expect(notice).toContain('Schocken')
    expect(notice).toContain('NonCommercial')
    expect(notice).toContain('David Souther')
    expect(notice).toContain('does not cover these files')
    expect(notice.endsWith('\n')).toBe(true)
  })

  it('is the bytes written to conformance/vectors/LICENSE', () => {
    const onDisk = readFileSync(new URL('LICENSE', VECTORS), 'utf8')
    expect(onDisk).toBe(licenseNotice())
  })
})

describe('Project 1 fixtures', () => {
  it('the 16 hand-transcribed fixtures match the vendored files', () => {
    const names = Object.keys(project1TstFixtures)
    expect(names).toHaveLength(16)
    expect(Object.keys(project1CmpFixtures).sort()).toEqual([...names].sort())

    for (const name of names) {
      const tst = readFileSync(new URL(`01/${name}.tst`, VECTORS), 'utf8')
      const cmp = readFileSync(new URL(`01/${name}.cmp`, VECTORS), 'utf8')
      const hdl = readFileSync(new URL(`01/${name}.hdl`, VECTORS), 'utf8')
      expect(withoutLineComments(tst), `${name}.tst`).toBe(withoutLineComments(project1TstFixtures[name]))
      expect(cmp.trim(), `${name}.cmp`).toBe(project1CmpFixtures[name].trim())
      expect(hdl, `${name}.hdl`).toContain(`CHIP ${name}`)
    }
  })
})
