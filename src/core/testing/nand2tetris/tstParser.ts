import type {
  TSTCommand,
  TSTOutputColumn,
  TSTParseError,
  TSTParseResult,
} from './types'

interface Statement {
  text: string
  terminator: ',' | ';'
  line: number
  column: number
}

const COMMAND_PATTERN = /^(\S+)(?:\s|$)/
const OUTPUT_COLUMN_PATTERN =
  /^([A-Za-z_][A-Za-z0-9_]*)(?:%([BDXS])(\d+)\.(\d+)\.(\d+))?$/

function stripComments(
  source: string,
  errors: TSTParseError[],
): string {
  let result = ''
  let idx = 0
  let line = 1
  let column = 1

  while (idx < source.length) {
    const ch = source[idx]
    const next = source[idx + 1]

    if (ch === '/' && next === '/') {
      result += '  '
      idx += 2
      column += 2

      while (idx < source.length && source[idx] !== '\n') {
        result += ' '
        idx++
        column++
      }

      continue
    }

    if (ch === '/' && next === '*') {
      const startLine = line
      const startColumn = column
      result += '  '
      idx += 2
      column += 2

      let terminated = false

      while (idx < source.length) {
        const blockCh = source[idx]
        const blockNext = source[idx + 1]

        if (blockCh === '*' && blockNext === '/') {
          result += '  '
          idx += 2
          column += 2
          terminated = true
          break
        }

        if (blockCh === '\n') {
          result += '\n'
          line++
          column = 1
        } else {
          result += ' '
          column++
        }

        idx++
      }

      if (!terminated) {
        errors.push({
          line: startLine,
          column: startColumn,
          message: 'Unterminated block comment',
        })
      }

      continue
    }

    result += ch

    if (ch === '\n') {
      line++
      column = 1
    } else {
      column++
    }

    idx++
  }

  return result
}

function splitStatements(
  source: string,
  errors: TSTParseError[],
): Statement[] {
  const statements: Statement[] = []

  let current = ''
  let line = 1
  let column = 1
  let statementStartLine = 1
  let statementStartColumn = 1
  let hasStatementContent = false

  const startStatement = (): void => {
    statementStartLine = line
    statementStartColumn = column
    hasStatementContent = true
  }

  const pushStatement = (terminator: ',' | ';'): void => {
    const text = current.trim()
    if (text.length > 0) {
      statements.push({
        text,
        terminator,
        line: statementStartLine,
        column: statementStartColumn,
      })
    } else {
      errors.push({
        line: statementStartLine,
        column: statementStartColumn,
        message: 'Empty statement',
      })
    }

    current = ''
    hasStatementContent = false
  }

  for (let idx = 0; idx < source.length; idx++) {
    const ch = source[idx]

    if (!hasStatementContent) {
      if (/\s/.test(ch)) {
        if (ch === '\n') {
          line++
          column = 1
        } else {
          column++
        }
        continue
      }
      startStatement()
    }

    if (ch === ',' || ch === ';') {
      pushStatement(ch)
      column++
      continue
    }

    current += ch

    if (ch === '\n') {
      line++
      column = 1
    } else {
      column++
    }
  }

  if (current.trim().length > 0) {
    errors.push({
      line: statementStartLine,
      column: statementStartColumn,
      message: 'Statement missing terminator',
    })
  }

  return statements
}

function parseSetValue(token: string): number | null {
  if (token.startsWith('%B')) {
    const match = token.match(/^%B([01]+)$/)
    if (!match) return null
    return parseInt(match[1], 2)
  }

  if (token.startsWith('%X')) {
    const match = token.match(/^%X([0-9A-Fa-f]+)$/)
    if (!match) return null
    return parseInt(match[1], 16)
  }

  if (token.startsWith('%D')) {
    const match = token.match(/^%D(-?\d+)$/)
    if (!match) return null
    return parseInt(match[1], 10)
  }

  if (!/^-?\d+$/.test(token)) {
    return null
  }

  return parseInt(token, 10)
}

function parseOutputColumn(token: string): TSTOutputColumn | null {
  const match = token.match(OUTPUT_COLUMN_PATTERN)
  if (!match) return null

  const [, name, format, padLeftRaw, widthRaw, padRightRaw] = match
  if (!format) {
    return {
      name,
      format: 'B',
      padLeft: 1,
      width: 1,
      padRight: 1,
    }
  }

  const padLeft = parseInt(padLeftRaw, 10)
  const width = parseInt(widthRaw, 10)
  const padRight = parseInt(padRightRaw, 10)

  if (Number.isNaN(padLeft) || Number.isNaN(width) || Number.isNaN(padRight)) {
    return null
  }

  if (padLeft < 0 || width <= 0 || padRight < 0) {
    return null
  }

  return {
    name,
    format: format as TSTOutputColumn['format'],
    padLeft,
    width,
    padRight,
  }
}

function commandName(statement: Statement): string {
  const match = statement.text.match(COMMAND_PATTERN)
  return (match?.[1] ?? '').toLowerCase()
}

function parseStatement(statement: Statement): TSTCommand | TSTParseError {
  const name = commandName(statement)

  if (
    ['repeat', 'while', 'tick', 'tock', 'ticktock', 'vmstep'].includes(name)
  ) {
    return {
      line: statement.line,
      column: statement.column,
      message: `Unsupported command '${name}' in Phase 0.5 parser scope`,
    }
  }

  if (name === 'load') {
    const match = statement.text.match(/^load\s+(\S+)$/)
    if (!match) {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'load' command syntax",
      }
    }
    if (statement.terminator !== ',') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'load' must end with ','",
      }
    }
    return { type: 'load', filename: match[1] }
  }

  if (name === 'output-file') {
    const match = statement.text.match(/^output-file\s+(\S+)$/)
    if (!match) {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'output-file' command syntax",
      }
    }
    if (statement.terminator !== ',') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'output-file' must end with ','",
      }
    }
    return { type: 'output-file', filename: match[1] }
  }

  if (name === 'compare-to') {
    const match = statement.text.match(/^compare-to\s+(\S+)$/)
    if (!match) {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'compare-to' command syntax",
      }
    }
    if (statement.terminator !== ',') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'compare-to' must end with ','",
      }
    }
    return { type: 'compare-to', filename: match[1] }
  }

  if (name === 'output-list') {
    const match = statement.text.match(/^output-list\s+(.+)$/)
    if (!match) {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'output-list' command syntax",
      }
    }
    if (statement.terminator !== ';') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'output-list' must end with ';'",
      }
    }

    const rawColumns = match[1].trim().split(/\s+/).filter(Boolean)
    if (rawColumns.length === 0) {
      return {
        line: statement.line,
        column: statement.column,
        message: 'output-list requires at least one column',
      }
    }

    const columns: TSTOutputColumn[] = []
    for (const rawColumn of rawColumns) {
      const parsed = parseOutputColumn(rawColumn)
      if (!parsed) {
        return {
          line: statement.line,
          column: statement.column,
          message: `Invalid output-list format specifier '${rawColumn}'`,
        }
      }
      columns.push(parsed)
    }

    return { type: 'output-list', columns }
  }

  if (name === 'set') {
    const match = statement.text.match(/^set\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/)
    if (!match) {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'set' command syntax",
      }
    }
    if (statement.terminator !== ',') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'set' must end with ','",
      }
    }

    const pin = match[1]
    const valueToken = match[2].trim()
    const parsedValue = parseSetValue(valueToken)
    if (parsedValue === null) {
      const errorHint = valueToken.startsWith('%B')
        ? 'binary'
        : valueToken.startsWith('%X')
          ? 'hex'
          : valueToken.startsWith('%D')
            ? 'decimal'
            : 'numeric'

      return {
        line: statement.line,
        column: statement.column,
        message: `Invalid ${errorHint} set value '${valueToken}'`,
      }
    }

    return { type: 'set', pin, value: parsedValue }
  }

  if (name === 'eval') {
    if (statement.text !== 'eval') {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'eval' command syntax",
      }
    }
    if (statement.terminator !== ',') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'eval' must end with ','",
      }
    }
    return { type: 'eval' }
  }

  if (name === 'output') {
    if (statement.text !== 'output') {
      return {
        line: statement.line,
        column: statement.column,
        message: "Invalid 'output' command syntax",
      }
    }
    if (statement.terminator !== ';') {
      return {
        line: statement.line,
        column: statement.column,
        message: "'output' must end with ';'",
      }
    }
    return { type: 'output' }
  }

  return {
    line: statement.line,
    column: statement.column,
    message: `Unknown command '${name || statement.text}'`,
  }
}

export function parseTST(source: string): TSTParseResult {
  if (!source.trim()) {
    return {
      success: false,
      errors: [{ line: 1, column: 1, message: 'Empty input' }],
    }
  }

  const errors: TSTParseError[] = []

  const withoutComments = stripComments(source, errors)
  if (errors.length > 0) {
    return { success: false, errors }
  }

  const statements = splitStatements(withoutComments, errors)
  if (errors.length > 0) {
    return { success: false, errors }
  }

  const commands: TSTCommand[] = []

  for (const statement of statements) {
    const parsed = parseStatement(statement)
    if ('message' in parsed) {
      errors.push(parsed)
      continue
    }
    commands.push(parsed)
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    script: {
      commands,
    },
  }
}
