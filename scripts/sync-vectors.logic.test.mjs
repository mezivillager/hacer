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
  refuseUnshipped,
  shippedFiles,
  sparsePaths,
  vendoredNames,
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
  it('clones the public web-ide repo at one recorded commit, projects 01 to 04', () => {
    expect(WEB_IDE_URL).toBe('https://github.com/nand2tetris/web-ide.git')
    expect(WEB_IDE_COMMIT).toMatch(/^[0-9a-f]{40}$/)
    expect(VENDORED_PROJECTS).toEqual(['01', '02', '03', '04'])
    expect(sparsePaths()).toEqual([
      'projects/src/project_01', 'projects/src/project_02', 'projects/src/project_03', 'projects/src/project_04',
    ])
  })

  it('keeps one upstream index.ts fixture per vendored project, each recorded at WEB_IDE_COMMIT', () => {
    const fixtures = readdirSync(FIXTURES).sort()
    expect(fixtures).toEqual(VENDORED_PROJECTS.map((project) => `project_${project}.index.ts.txt`))
    for (const project of VENDORED_PROJECTS) {
      const [provenance] = upstreamIndex(project).split('\n')
      expect(provenance, `project_${project}`).toBe(
        `// Test fixture: nand2tetris/web-ide projects/src/project_${project}/index.ts at ${WEB_IDE_COMMIT}`,
      )
    }
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

  it('reads the 25 files Project 03 ships: its 24 CHIPS entries, then DFF.hdl from BUILTIN_CHIPS', () => {
    const files = shippedFiles(upstreamIndex('03'))
    const chips = ['Bit', 'Register', 'PC', 'RAM8', 'RAM64', 'RAM512', 'RAM4K', 'RAM16K']
    expect(files.map((entry) => entry.file)).toEqual([
      ...chips.flatMap((chip) => ['hdl', 'tst', 'cmp'].map((ext) => `${chip}.${ext}`)),
      'DFF.hdl',
    ])
    expect(files).toContainEqual({ file: 'RAM4K.tst', module: '07_ram4k.ts', exportName: 'tst' })
    expect(files.at(-1)).toEqual({ file: 'DFF.hdl', module: '00_dff.ts', exportName: 'hdl' })
  })

  it("reads the 7 files Project 04 ships from its TESTS groups, flattened: Mult's three, then Fill's four", () => {
    const files = shippedFiles(upstreamIndex('04'))
    expect(files).toEqual([
      { file: 'Mult.asm', module: '01_mult.ts', exportName: 'asm' },
      { file: 'Mult.tst', module: '01_mult.ts', exportName: 'tst' },
      { file: 'Mult.cmp', module: '01_mult.ts', exportName: 'cmp' },
      { file: 'Fill.asm', module: '02_fill.ts', exportName: 'asm' },
      { file: 'Fill.tst', module: '02_fill.ts', exportName: 'tst' },
      { file: 'FillAutomatic.tst', module: '02_fill.ts', exportName: 'autoTst' },
      { file: 'FillAutomatic.cmp', module: '02_fill.ts', exportName: 'autoCmp' },
    ])
  })

  it('refuses a TESTS entry that is not a plain X.export reference, and a TESTS map that is not Name: { ... } groups', () => {
    const mult = 'import * as Mult from "./01_mult.js";\n'
    expect(() => shippedFiles(`${mult}export const TESTS = {\n  Mult: {\n    "Mult.tst": Mult.tst.replace("a", "b"),\n  },\n};\n`))
      .toThrow(/TESTS\.Mult entry is not a plain X\.export reference/)
    expect(() => shippedFiles(`${mult}export const TESTS = {\n  "Mult.tst": Mult.tst,\n};\n`))
      .toThrow(/TESTS map is not a list of Name: \{ \.\.\. \} groups/)
    expect(() => shippedFiles(`${mult}export const TESTS = {\n  Mult: {\n    Inner: {\n      "Mult.tst": Mult.tst,\n    },\n  },\n};\n`))
      .toThrow(/TESTS map is not a list of Name: \{ \.\.\. \} groups/)
    expect(() => shippedFiles(`${mult}export const TESTS = {\n  Mult: {\n    "Mult.tst": Mult.tst,\n  },\n  Fill: {\n    "Mult.tst": Mult.tst,\n  },\n};\n`))
      .toThrow(/duplicate output path Mult\.tst/)
  })

  it("refuses an entry that is not a plain X.export reference (Project 05's RAM16K .replace)", () => {
    expect(() => shippedFiles(PROJECT_05_BUILTINS)).toThrow(/BUILTIN_CHIPS entry is not a plain X\.export reference/)
  })

  it('refuses a duplicate output path, an unknown module, and an index.ts with neither a CHIPS nor a TESTS map, or both', () => {
    const imports = 'import * as Alu from "./06_alu.js";\nimport * as AluAll from "./06_alu_all.js";\n'
    expect(() => shippedFiles(`${imports}export const CHIPS = {\n  "ALU.hdl": Alu.hdl,\n  "ALU.hdl": AluAll.hdl,\n};\n`))
      .toThrow(/duplicate output path ALU\.hdl/)
    expect(() => shippedFiles(`${imports}export const CHIPS = {\n  "ALU.hdl": NoStat.hdl,\n};\n`))
      .toThrow(/unknown module NoStat/)
    expect(() => shippedFiles(imports)).toThrow(/no CHIPS or TESTS map/)
    expect(() => shippedFiles(`${imports}export const CHIPS = {\n  "ALU.hdl": Alu.hdl,\n};\nexport const TESTS = {\n  Alu: {\n    "ALU.tst": Alu.tst,\n  },\n};\n`))
      .toThrow(/both a CHIPS and a TESTS map/)
  })

  it('refuses an output name that is not a flat .hdl, .tst, .cmp or .asm file name, a dotfile among them', () => {
    const alu = 'import * as Alu from "./06_alu.js";\n'
    const refused = /not a flat \.hdl, \.tst, \.cmp or \.asm file name/
    expect(() => shippedFiles(`${alu}export const CHIPS = {\n  "../ALU.hdl": Alu.hdl,\n};\n`)).toThrow(refused)
    expect(() => shippedFiles(`${alu}export const CHIPS = {\n  "ALU.hack": Alu.hdl,\n};\n`)).toThrow(refused)
    // What lets the exact-files check disregard dotfiles: upstream can never ship one through the sync.
    expect(() => shippedFiles(`${alu}export const CHIPS = {\n  ".ALU.tst": Alu.tst,\n};\n`)).toThrow(refused)
  })

  it('reads an export as file text ending in a newline, and refuses a missing or empty export', () => {
    const basic = { file: 'ALU-basic.tst', module: '06_alu.ts', exportName: 'basic_tst' }
    expect(exportText({ basic_tst: 'load ALU.hdl,' }, basic)).toBe('load ALU.hdl,\n')
    expect(exportText({ basic_tst: '| x |\n' }, basic)).toBe('| x |\n')
    expect(() => exportText({ hdl: 'CHIP ALU {' }, basic)).toThrow(/06_alu\.ts has no basic_tst text for ALU-basic\.tst/)
    expect(() => exportText({ basic_tst: '' }, basic)).toThrow(/06_alu\.ts has no basic_tst text for ALU-basic\.tst/)
  })
})

describe('exact files', () => {
  const bit = ['Bit.hdl', 'Bit.tst', 'Bit.cmp']

  it('refuses a vendored directory that holds a file upstream does not ship, and names every one', () => {
    expect(() => refuseUnshipped([{ project: '03', onDisk: ['Bit.cmp', 'Stale.tst', 'Bit.hdl', 'Old.hdl'], shipped: bit }]))
      .toThrow(/conformance\/vectors\/03 holds Old\.hdl, Stale\.tst\. Upstream does not ship them at /)
    expect(() => refuseUnshipped([{ project: '03', onDisk: [...bit], shipped: bit }])).not.toThrow()
  })

  it('refuses once, naming the stray files in every vendored directory, not only the first', () => {
    const directories = [
      { project: '01', onDisk: ['Not.hdl'], shipped: ['Not.hdl'] },
      { project: '02', onDisk: ['Stale.tst', 'HalfAdder.hdl'], shipped: ['HalfAdder.hdl'] },
      { project: '03', onDisk: ['Extra.cmp', ...bit], shipped: bit },
    ]
    expect(() => refuseUnshipped(directories))
      .toThrow(/conformance\/vectors\/02 holds Stale\.tst; conformance\/vectors\/03 holds Extra\.cmp\. Upstream/)
  })

  it('says to git rm a stray file only when git tracks it, and to delete it otherwise', () => {
    expect(() => refuseUnshipped([{ project: '03', onDisk: ['Stale.tst'], shipped: bit }]))
      .toThrow(/remove it and re-run: git rm it in a commit of its own if git tracks it, or delete it if not\.$/)
  })

  it("disregards a dotfile such as Finder's .DS_Store or a vim swap file: shippedFiles refuses a dotfile name", () => {
    expect(vendoredNames(['.DS_Store', 'Bit.hdl', '.Bit.tst.swp', 'Bit.tst'])).toEqual(['Bit.hdl', 'Bit.tst'])
    expect(() => refuseUnshipped([{ project: '03', onDisk: ['.DS_Store', ...bit, '.Bit.tst.swp'], shipped: bit }])).not.toThrow()
  })

  it('accepts a directory missing shipped files, or not there yet: the sync writes those', () => {
    expect(() => refuseUnshipped([{ project: '03', onDisk: ['Bit.hdl'], shipped: bit }])).not.toThrow()
    expect(() => refuseUnshipped([{ project: '03', onDisk: [], shipped: ['Bit.hdl'] }])).not.toThrow()
    expect(() => refuseUnshipped([])).not.toThrow()
  })

  it('each vendored project directory holds exactly the files its upstream index.ts ships', () => {
    for (const project of VENDORED_PROJECTS) {
      const shipped = shippedFiles(upstreamIndex(project)).map((entry) => entry.file)
      expect(vendoredNames(readdirSync(new URL(`${project}/`, VECTORS))).sort(), project).toEqual([...shipped].sort())
    }
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

  it('names the vendored projects, 01 to 04, and 05 as still to come', () => {
    const notice = licenseNotice()
    expect(notice).toContain('Projects included: 01, 02, 03, 04. Project 05 is a follow-up and is not in this tree yet.')
    expect(notice).not.toContain('Projects 2-5')
  })

  it('covers the .asm files Project 04 ships, and says their header names nand2tetris too', () => {
    const notice = licenseNotice()
    expect(notice).toContain('Licence of these .hdl / .tst / .cmp / .asm files:')
    expect(notice).toContain("Each .hdl, .tst and .asm file's header identifies the")
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
    const onDisk = vendoredNames(readdirSync(new URL('02/', VECTORS))).sort()
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

describe('Project 3 vectors', () => {
  it('conformance/vectors/03 is exactly the 25 shipped files, each .hdl and .tst under the nand2tetris header', () => {
    const shipped = shippedFiles(upstreamIndex('03')).map((entry) => entry.file)
    const onDisk = vendoredNames(readdirSync(new URL('03/', VECTORS))).sort()
    expect(onDisk).toEqual([...shipped].sort())
    expect(onDisk).toHaveLength(25)
    for (const file of onDisk) {
      const text = readFileSync(new URL(`03/${file}`, VECTORS), 'utf8')
      if (file.endsWith('.cmp')) {
        expect(text.startsWith('|'), file).toBe(true)
      } else {
        expect(text, file).toContain('This file is part of www.nand2tetris.org')
        expect(text, file).toContain('by Nisan and Schocken, MIT Press.')
        // Upstream's headers name projects/3/a/Bit.hdl, but projects/03/a/PC.tst and projects/03/DFF.hdl.
        expect(text, file).toMatch(new RegExp(`File name: projects/0?3/(?:[ab]/)?${file.replace('.', '\\.')}\n`))
      }
    }
  })
})

describe('Project 4 vectors', () => {
  it('conformance/vectors/04 is exactly the 7 shipped files, each .asm and .tst under the nand2tetris header', () => {
    const shipped = shippedFiles(upstreamIndex('04')).map((entry) => entry.file)
    const onDisk = vendoredNames(readdirSync(new URL('04/', VECTORS))).sort()
    expect(onDisk).toEqual([...shipped].sort())
    expect(onDisk).toHaveLength(7)
    for (const file of onDisk) {
      const text = readFileSync(new URL(`04/${file}`, VECTORS), 'utf8')
      if (file.endsWith('.cmp')) {
        expect(text.startsWith('|'), file).toBe(true)
      } else {
        expect(text, file).toContain('This file is part of www.nand2tetris.org')
        expect(text, file).toContain('by Nisan and Schocken, MIT Press.')
        // Upstream's headers name projects/4/Mult.asm and projects/4/mult/Mult.tst, and
        // projects/4/fill/FillAutomatic with no extension.
        const [stem, ext] = file.split('.')
        expect(text, file).toMatch(new RegExp(`File name: projects/4/(?:mult/|fill/)?${stem}(?:\\.${ext})?\n`))
      }
    }
  })

  it('each .tst loads a program and compares to a file that 04 itself holds', () => {
    const onDisk = new Set(readdirSync(new URL('04/', VECTORS)))
    for (const file of [...onDisk].filter((name) => name.endsWith('.tst'))) {
      const text = readFileSync(new URL(`04/${file}`, VECTORS), 'utf8')
      const named = Array.from(text.matchAll(/^(?:load|compare-to) ([\w-]+\.\w+)[,;]/gm), ([, name]) => name)
      expect(named.length, file).toBeGreaterThan(0)
      for (const name of named) expect(onDisk.has(name), `${file} names ${name}`).toBe(true)
    }
  })
})
