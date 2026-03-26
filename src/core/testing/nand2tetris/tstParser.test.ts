import { describe, expect, it } from 'vitest'
import { project1TstFixtures } from './project1TstFixtures'
import { parseTST } from './tstParser'

const NAND_TST = project1TstFixtures.Nand
const NOT_TST = project1TstFixtures.Not
const MUX4WAY16_TST = project1TstFixtures.Mux4Way16

describe('TST Parser', () => {
  describe('basic parsing', () => {
    it('parses Nand.tst (no load, output-list + commands)', () => {
      const result = parseTST(NAND_TST)
      expect(result.success).toBe(true)
      if (!result.success) return

      const commands = result.script.commands
      const outputList = commands.find((command) => command.type === 'output-list')
      expect(outputList).toBeDefined()

      if (outputList?.type === 'output-list') {
        expect(outputList.columns).toHaveLength(3)
        expect(outputList.columns.map((column) => column.name)).toEqual([
          'a',
          'b',
          'out',
        ])
      }

      const sets = commands.filter((command) => command.type === 'set')
      const evals = commands.filter((command) => command.type === 'eval')
      const outputs = commands.filter((command) => command.type === 'output')

      expect(sets).toHaveLength(8)
      expect(evals).toHaveLength(4)
      expect(outputs).toHaveLength(4)
    })

    it('parses Not.tst with load and compare-to directives', () => {
      const result = parseTST(NOT_TST)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.script.commands[0]).toEqual({ type: 'load', filename: 'Not.hdl' })
      expect(result.script.commands[1]).toEqual({ type: 'compare-to', filename: 'Not.cmp' })
      expect(result.script.commands[2]).toMatchObject({ type: 'output-list' })
    })
  })

  describe('format specifiers', () => {
    it('parses output-list with explicit format specifiers', () => {
      const result = parseTST(MUX4WAY16_TST)
      expect(result.success).toBe(true)
      if (!result.success) return

      const outputList = result.script.commands.find(
        (command) => command.type === 'output-list',
      )
      expect(outputList?.type).toBe('output-list')
      if (outputList?.type !== 'output-list') return

      expect(outputList.columns[0]).toEqual({
        name: 'a',
        format: 'B',
        padLeft: 1,
        width: 16,
        padRight: 1,
      })

      expect(outputList.columns[4]).toEqual({
        name: 'sel',
        format: 'B',
        padLeft: 2,
        width: 2,
        padRight: 2,
      })
    })

    it('defaults format for plain names (no % specifier)', () => {
      const result = parseTST('output-list a b out;')
      expect(result.success).toBe(true)
      if (!result.success) return

      const outputList = result.script.commands.find(
        (command) => command.type === 'output-list',
      )
      expect(outputList?.type).toBe('output-list')
      if (outputList?.type !== 'output-list') return

      expect(outputList.columns[0]).toEqual({
        name: 'a',
        format: 'B',
        padLeft: 1,
        width: 1,
        padRight: 1,
      })
    })

    it('rejects malformed output-list format specifier', () => {
      const result = parseTST('output-list a%B1.16 out;')
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('format specifier')
    })
  })

  describe('value parsing', () => {
    it('parses decimal set values', () => {
      const result = parseTST('output-list a;\nset a 42,\neval,\noutput;')
      expect(result.success).toBe(true)
      if (!result.success) return

      const setCommand = result.script.commands.find((command) => command.type === 'set')
      if (setCommand?.type === 'set') {
        expect(setCommand.value).toBe(42)
      }
    })

    it('parses binary set values (%B prefix)', () => {
      const result = parseTST(
        'output-list a;\nset a %B0001001000110100,\neval,\noutput;',
      )
      expect(result.success).toBe(true)
      if (!result.success) return

      const setCommand = result.script.commands.find((command) => command.type === 'set')
      if (setCommand?.type === 'set') {
        expect(setCommand.value).toBe(0b0001001000110100)
      }
    })

    it('rejects invalid binary set values', () => {
      const result = parseTST('output-list a;\nset a %B102,\neval,\noutput;')
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('binary')
    })
  })

  describe('comments and unsupported syntax', () => {
    it('ignores line comments in test scripts', () => {
      const result = parseTST(`// Test Not
output-list in out;
set in 0,  // set to zero
eval,
output;`)
      expect(result.success).toBe(true)
    })

    it('ignores block comments in test scripts', () => {
      const result = parseTST(`/* Test Not */
output-list in out;
set in 0,
/* evaluate and capture output */
eval,
output;`)
      expect(result.success).toBe(true)
    })

    it('ignores inline block comments containing separators', () => {
      const result = parseTST(`output-list in out;
set in /* comment with , and ; */ 0,
eval,
output;`)
      expect(result.success).toBe(true)
    })

    it('rejects repeat commands in Phase 0.5 scope', () => {
      const result = parseTST(`output-list a;
repeat 3 {
  eval,
};`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.message.includes('Unsupported command'))).toBe(
        true,
      )
    })
  })

  describe('error handling', () => {
    it('rejects unterminated block comments', () => {
      const result = parseTST(`/* unterminated
output-list a;`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Unterminated block comment')
      expect(result.errors[0].line).toBe(1)
      expect(result.errors[0].column).toBe(1)
    })

    it('rejects statements missing terminator at EOF', () => {
      const result = parseTST('output-list a b out')
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('missing terminator')
    })

    it('rejects single keyword missing terminator at EOF', () => {
      const result = parseTST('output')
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('missing terminator')
    })

    it('rejects empty statements from consecutive separators', () => {
      const result = parseTST('eval,,output;')
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Empty statement')
    })

    it('rejects empty statement from leading separator', () => {
      const result = parseTST(';eval,output;')
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Empty statement')
    })

    it('reports location for unterminated block comment at offset', () => {
      const result = parseTST(`output-list a;
set a 0, /* unclosed
eval,
output;`)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].message).toContain('Unterminated block comment')
      expect(result.errors[0].line).toBe(2)
    })
  })

  describe('all Project 1 TST files parse', () => {
    for (const [name, script] of Object.entries(project1TstFixtures)) {
      it(`parses ${name}.tst without errors`, () => {
        const result = parseTST(script)
        expect(result.success).toBe(true)
      })
    }
  })
})
