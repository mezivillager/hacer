import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { project1CmpFixtures } from '../src/core/testing/project1CmpFixtures.ts'
import { project1TstFixtures } from '../src/core/testing/project1TstFixtures.ts'
import {
  VENDORED_PROJECTS,
  WEB_IDE_COMMIT,
  WEB_IDE_URL,
  exportText,
  licenseNotice,
  shippedFiles,
  sparsePaths,
} from './sync-vectors.logic.mjs'

const VECTORS = new URL('../conformance/vectors/', import.meta.url)
const FIXTURES = new URL('./fixtures/sync-vectors/', import.meta.url)

/** A project's upstream index.ts at the pinned commit, copied verbatim into scripts/fixtures/. */
function upstreamIndex(project) {
  return readFileSync(new URL(`project_${project}.index.ts.txt`, FIXTURES), 'utf8')
}

/** Trimmed from upstream project_05/index.ts: its BUILTIN_CHIPS holds an entry that is a call, not a reference. */
const PROJECT_05_BUILTINS = `import * as RAM16K from "../project_03/08_ram16k.js";
import * as Memory from "./01_memory.js";
import * as Screen from "./04_screen.js";

export const CHIPS = {
  "Memory.hdl": Memory.hdl,
};

export const BUILTIN_CHIPS = {
  Screen: Screen.hdl,
  RAM16K: RAM16K.hdl.replace(
    "//// Replace this comment with your code.",
    "BUILTIN RAM16K;",
  ),
};
`

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
  it('clones the public web-ide repo at one recorded commit, projects 01 and 02', () => {
    expect(WEB_IDE_URL).toBe('https://github.com/nand2tetris/web-ide.git')
    expect(WEB_IDE_COMMIT).toMatch(/^[0-9a-f]{40}$/)
    expect(VENDORED_PROJECTS).toEqual(['01', '02'])
    expect(sparsePaths()).toEqual(['projects/src/project_01', 'projects/src/project_02'])
  })
})

describe('shipped files, read from upstream index.ts', () => {
  it('reads the 17 files Project 02 ships: ALU and ALU-basic from 06_alu, neither ALU variant', () => {
    const files = shippedFiles(upstreamIndex('02'))
    expect(files.map((entry) => entry.file)).toEqual([
      'HalfAdder.hdl', 'HalfAdder.tst', 'HalfAdder.cmp',
      'FullAdder.hdl', 'FullAdder.tst', 'FullAdder.cmp',
      'Add16.hdl', 'Add16.tst', 'Add16.cmp',
      'Inc16.hdl', 'Inc16.tst', 'Inc16.cmp',
      'ALU.hdl', 'ALU.tst', 'ALU.cmp', 'ALU-basic.tst', 'ALU-basic.cmp',
    ])
    expect(files.filter((entry) => entry.file.startsWith('ALU'))).toEqual([
      { file: 'ALU.hdl', module: '06_alu.ts', exportName: 'hdl' },
      { file: 'ALU.tst', module: '06_alu.ts', exportName: 'tst' },
      { file: 'ALU.cmp', module: '06_alu.ts', exportName: 'cmp' },
      { file: 'ALU-basic.tst', module: '06_alu.ts', exportName: 'basic_tst' },
      { file: 'ALU-basic.cmp', module: '06_alu.ts', exportName: 'basic_cmp' },
    ])
    const modules = files.map((entry) => entry.module)
    expect(modules).not.toContain('05_alu_no_stat.ts')
    expect(modules).not.toContain('06_alu_all.ts')
  })

  it('turns a bare BUILTIN_CHIPS key into Name.hdl, so Project 01 gives the 48 files already vendored', () => {
    const files = shippedFiles(upstreamIndex('01'))
    expect(files).toHaveLength(48)
    expect(files).toContainEqual({ file: 'Nand.hdl', module: '00_nand.ts', exportName: 'hdl' })
    expect(files.map((entry) => entry.file).sort()).toEqual(readdirSync(new URL('01/', VECTORS)).sort())
  })

  it("refuses an entry that is not a plain X.export reference (Project 05's RAM16K .replace)", () => {
    expect(() => shippedFiles(PROJECT_05_BUILTINS)).toThrow(/BUILTIN_CHIPS entry is not a plain X\.export reference/)
  })

  it('refuses a duplicate output path, an unknown module, and an index.ts with no CHIPS map', () => {
    const imports = 'import * as Alu from "./06_alu.js";\nimport * as AluAll from "./06_alu_all.js";\n'
    expect(() => shippedFiles(`${imports}export const CHIPS = {\n  "ALU.hdl": Alu.hdl,\n  "ALU.hdl": AluAll.hdl,\n};\n`))
      .toThrow(/duplicate output path ALU\.hdl/)
    expect(() => shippedFiles(`${imports}export const CHIPS = {\n  "ALU.hdl": NoStat.hdl,\n};\n`))
      .toThrow(/unknown module NoStat/)
    // Project 04's shape: a nested TESTS map of .asm programs, no CHIPS.
    expect(() => shippedFiles('import * as Mult from "./01_mult.js";\nexport const TESTS = {\n  Mult: {\n    "Mult.tst": Mult.tst,\n  },\n};\n'))
      .toThrow(/no CHIPS map/)
  })

  it('refuses an output name that is not a flat .hdl, .tst or .cmp file name', () => {
    const alu = 'import * as Alu from "./06_alu.js";\n'
    expect(() => shippedFiles(`${alu}export const CHIPS = {\n  "../ALU.hdl": Alu.hdl,\n};\n`)).toThrow(/not a flat \.hdl, \.tst or \.cmp file name/)
    expect(() => shippedFiles(`${alu}export const CHIPS = {\n  "ALU.hack": Alu.hdl,\n};\n`)).toThrow(/not a flat \.hdl, \.tst or \.cmp file name/)
  })

  it('reads an export as file text ending in a newline, and refuses a missing or empty export', () => {
    const basic = { file: 'ALU-basic.tst', module: '06_alu.ts', exportName: 'basic_tst' }
    expect(exportText({ basic_tst: 'load ALU.hdl,' }, basic)).toBe('load ALU.hdl,\n')
    expect(exportText({ basic_tst: '| x |\n' }, basic)).toBe('| x |\n')
    expect(() => exportText({ hdl: 'CHIP ALU {' }, basic)).toThrow(/06_alu\.ts has no basic_tst text for ALU-basic\.tst/)
    expect(() => exportText({ basic_tst: '' }, basic)).toThrow(/06_alu\.ts has no basic_tst text for ALU-basic\.tst/)
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

  it('names the vendored projects, 01 and 02', () => {
    const notice = licenseNotice()
    expect(notice).toContain('Projects included: 01, 02.')
    expect(notice).not.toContain('Projects 2-5')
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

describe('sync-vectors.sh', () => {
  it('runs under the bash 3.2 macOS ships: no mapfile or readarray, which need bash 4', () => {
    const script = readFileSync(new URL('./sync-vectors.sh', import.meta.url), 'utf8')
    expect(script).not.toMatch(/\b(?:mapfile|readarray)\b/)
  })
})

describe('Project 2 vectors', () => {
  it('conformance/vectors/02 is exactly the 17 shipped files, each .hdl and .tst under the nand2tetris header', () => {
    const shipped = shippedFiles(upstreamIndex('02')).map((entry) => entry.file)
    const onDisk = readdirSync(new URL('02/', VECTORS)).sort()
    expect(onDisk).toEqual([...shipped].sort())
    expect(onDisk).toHaveLength(17)
    for (const file of onDisk) {
      const text = readFileSync(new URL(`02/${file}`, VECTORS), 'utf8')
      if (file.endsWith('.cmp')) {
        expect(text.startsWith('|'), file).toBe(true)
      } else {
        expect(text, file).toContain('This file is part of www.nand2tetris.org')
        expect(text, file).toContain(`File name: projects/2/${file}`)
      }
    }
  })
})
