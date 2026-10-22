import { describe, expect, it } from 'vitest'
import { ESLint, Linter } from 'eslint'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const RULE = 'max-lines-per-function'
const OPTIONS = { max: 80, skipBlankLines: true, skipComments: true }

const eslint = new ESLint({ cwd: REPO_ROOT })
const ruleFor = async (file) => (await eslint.calculateConfigForFile(file))?.rules?.[RULE]

/** A function of `codeLines` code lines, every statement followed by a blank line and a comment line. */
const generated = (codeLines) =>
  [
    'function generated(total) {',
    ...Array.from({ length: codeLines - 2 }, (_, i) => `  total += ${i}\n\n  // not a code line`),
    '}',
  ].join('\n')

describe('max-lines-per-function on src/ production code', () => {
  it('src production files carry max-lines-per-function at 80 code lines, and tests do not', async () => {
    for (const file of ['src/core/hdl/compiler.ts', 'src/App.tsx']) {
      expect(await ruleFor(file), file).toEqual([2, expect.objectContaining(OPTIONS)])
    }
    expect(await ruleFor('src/core/hdl/compiler.test.ts')).toBeUndefined()
  })

  it('a function of 81 code lines fails and one of 80 passes under the configured options', async () => {
    const configured = (await ruleFor('src/core/hdl/compiler.ts')) ?? 'off'
    const lint = (code) =>
      new Linter().verify(code, [{ rules: { [RULE]: configured } }]).filter((message) => message.ruleId === RULE)
    expect(lint(generated(81))).toHaveLength(1)
    expect(lint(generated(80))).toEqual([])
  })
})
