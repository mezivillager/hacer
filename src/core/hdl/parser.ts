import type {
  HDLChip,
  HDLConnection,
  HDLParseError,
  HDLParseResult,
  HDLPart,
  HDLPin,
} from './types'

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type TokenType =
  | 'CHIP'
  | 'IN'
  | 'OUT'
  | 'PARTS'
  | 'BUILTIN'
  | 'TRUE'
  | 'FALSE'
  | 'IDENT'
  | 'NUMBER'
  | 'LBRACE'
  | 'RBRACE'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'SEMICOLON'
  | 'COMMA'
  | 'EQUALS'
  | 'COLON'
  | 'DOTDOT'
  | 'EOF'

interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const KEYWORDS: Record<string, TokenType> = {
  CHIP: 'CHIP',
  IN: 'IN',
  OUT: 'OUT',
  PARTS: 'PARTS',
  BUILTIN: 'BUILTIN',
  true: 'TRUE',
  false: 'FALSE',
}

function tokenize(
  source: string,
): { tokens: Token[] } | { errors: HDLParseError[] } {
  const tokens: Token[] = []
  let pos = 0
  let line = 1
  let column = 1

  function advance(): string {
    const ch = source[pos]
    pos++
    if (ch === '\n') {
      line++
      column = 1
    } else {
      column++
    }
    return ch
  }

  function peekAt(offset: number): string {
    const idx = pos + offset
    return idx < source.length ? source[idx] : '\0'
  }

  function skipWhitespace(): void {
    while (pos < source.length && /\s/.test(source[pos])) {
      advance()
    }
  }

  function skipLineComment(): void {
    while (pos < source.length && source[pos] !== '\n') {
      advance()
    }
  }

  function skipBlockComment(): HDLParseError | null {
    const startLine = line
    const startCol = column
    advance() // skip /
    advance() // skip *
    while (pos < source.length) {
      if (source[pos] === '*' && peekAt(1) === '/') {
        advance() // skip *
        advance() // skip /
        return null
      }
      advance()
    }
    return {
      line: startLine,
      column: startCol,
      message: 'Unterminated block comment',
    }
  }

  function skipWhitespaceAndComments(): HDLParseError | null {
    while (pos < source.length) {
      if (/\s/.test(source[pos])) {
        skipWhitespace()
      } else if (source[pos] === '/' && peekAt(1) === '/') {
        skipLineComment()
      } else if (source[pos] === '/' && peekAt(1) === '*') {
        const err = skipBlockComment()
        if (err) return err
      } else {
        break
      }
    }
    return null
  }

  function readIdentifier(): string {
    let result = ''
    while (pos < source.length && /[A-Za-z0-9_]/.test(source[pos])) {
      result += advance()
    }
    return result
  }

  function readNumber(): string {
    let result = ''
    while (pos < source.length && /[0-9]/.test(source[pos])) {
      result += advance()
    }
    return result
  }

  while (pos < source.length) {
    const commentErr = skipWhitespaceAndComments()
    if (commentErr) return { errors: [commentErr] }
    if (pos >= source.length) break

    const startLine = line
    const startCol = column
    const ch = pos < source.length ? source[pos] : '\0'

    if (/[A-Za-z_]/.test(ch)) {
      const ident = readIdentifier()
      const kwType = KEYWORDS[ident]
      tokens.push({
        type: kwType ?? 'IDENT',
        value: ident,
        line: startLine,
        column: startCol,
      })
    } else if (/[0-9]/.test(ch)) {
      const num = readNumber()
      tokens.push({
        type: 'NUMBER',
        value: num,
        line: startLine,
        column: startCol,
      })
    } else if (ch === '{') {
      advance()
      tokens.push({ type: 'LBRACE', value: '{', line: startLine, column: startCol })
    } else if (ch === '}') {
      advance()
      tokens.push({ type: 'RBRACE', value: '}', line: startLine, column: startCol })
    } else if (ch === '(') {
      advance()
      tokens.push({ type: 'LPAREN', value: '(', line: startLine, column: startCol })
    } else if (ch === ')') {
      advance()
      tokens.push({ type: 'RPAREN', value: ')', line: startLine, column: startCol })
    } else if (ch === '[') {
      advance()
      tokens.push({
        type: 'LBRACKET',
        value: '[',
        line: startLine,
        column: startCol,
      })
    } else if (ch === ']') {
      advance()
      tokens.push({
        type: 'RBRACKET',
        value: ']',
        line: startLine,
        column: startCol,
      })
    } else if (ch === ';') {
      advance()
      tokens.push({
        type: 'SEMICOLON',
        value: ';',
        line: startLine,
        column: startCol,
      })
    } else if (ch === ',') {
      advance()
      tokens.push({ type: 'COMMA', value: ',', line: startLine, column: startCol })
    } else if (ch === '=') {
      advance()
      tokens.push({ type: 'EQUALS', value: '=', line: startLine, column: startCol })
    } else if (ch === ':') {
      advance()
      tokens.push({ type: 'COLON', value: ':', line: startLine, column: startCol })
    } else if (ch === '.' && peekAt(1) === '.') {
      advance()
      advance()
      tokens.push({ type: 'DOTDOT', value: '..', line: startLine, column: startCol })
    } else {
      return {
        errors: [
          {
            line: startLine,
            column: startCol,
            message: `Unexpected character '${ch}'`,
          },
        ],
      }
    }
  }

  tokens.push({ type: 'EOF', value: '', line, column })
  return { tokens }
}

// ---------------------------------------------------------------------------
// Recursive Descent Parser
// ---------------------------------------------------------------------------

class Parser {
  private tokens: Token[]
  private pos = 0
  private errors: HDLParseError[] = []

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private eat(type: TokenType): Token | null {
    const tok = this.current()
    if (tok.type === type) {
      this.pos++
      return tok
    }
    return null
  }

  private expect(type: TokenType): Token {
    const tok = this.eat(type)
    if (!tok) {
      const cur = this.current()
      this.errors.push({
        line: cur.line,
        column: cur.column,
        message: `Expected '${tokenLabel(type)}' but got '${cur.value || cur.type}'`,
      })
      return cur
    }
    return tok
  }

  parse(): HDLParseResult {
    const chip = this.parseChip()
    if (this.errors.length > 0) {
      return { success: false, errors: this.errors }
    }
    if (this.current().type !== 'EOF') {
      const cur = this.current()
      this.errors.push({
        line: cur.line,
        column: cur.column,
        message: `Unexpected token after chip declaration: '${cur.value || cur.type}'`,
      })
      return { success: false, errors: this.errors }
    }
    return { success: true, chip }
  }

  private parseChip(): HDLChip {
    this.expect('CHIP')
    if (this.errors.length > 0) {
      return emptyChip()
    }

    const nameToken = this.current()
    if (nameToken.type !== 'IDENT') {
      this.errors.push({
        line: nameToken.line,
        column: nameToken.column,
        message: `Expected chip name but got '${nameToken.value || nameToken.type}'`,
      })
      return emptyChip()
    }
    this.pos++

    this.expect('LBRACE')
    if (this.errors.length > 0) return emptyChip()

    // P05-04 grammar: ChipDecl = 'CHIP' Name '{' InDecl OutDecl PartsDecl '}'
    const inputs = this.parseInDecl()
    if (this.errors.length > 0) return emptyChip()

    const outputs = this.parseOutDecl()
    if (this.errors.length > 0) return emptyChip()

    const partsResult = this.parsePartsDecl()
    if (this.errors.length > 0) return emptyChip()
    const parts = partsResult.parts
    const builtin = partsResult.builtin

    this.expect('RBRACE')
    if (this.errors.length > 0) return emptyChip()

    const chip: HDLChip = {
      name: nameToken.value,
      inputs,
      outputs,
      parts,
    }
    if (builtin !== undefined) {
      chip.builtin = builtin
    }
    return chip
  }

  private parseInDecl(): HDLPin[] {
    this.expect('IN')
    const pins = this.parsePinList()
    this.expect('SEMICOLON')
    return pins
  }

  private parseOutDecl(): HDLPin[] {
    this.expect('OUT')
    const pins = this.parsePinList()
    this.expect('SEMICOLON')
    return pins
  }

  private parsePinList(): HDLPin[] {
    const pins: HDLPin[] = []
    pins.push(this.parsePin())

    while (this.eat('COMMA')) {
      pins.push(this.parsePin())
    }

    return pins
  }

  private parsePin(): HDLPin {
    const nameToken = this.expect('IDENT')
    let width = 1
    if (this.eat('LBRACKET')) {
      const numToken = this.expect('NUMBER')
      const parsed = parseInt(numToken.value, 10)
      if (Number.isNaN(parsed) || parsed <= 0) {
        this.errors.push({
          line: numToken.line,
          column: numToken.column,
          message: 'Invalid pin width; expected positive integer',
        })
      } else {
        width = parsed
      }
      this.expect('RBRACKET')
    }
    return { name: nameToken.value, width }
  }

  private parsePartsDecl(): { parts: HDLPart[]; builtin?: string } {
    this.expect('PARTS')
    this.expect('COLON')

    if (this.current().type === 'BUILTIN') {
      this.pos++
      const nameToken = this.current()
      if (nameToken.type !== 'IDENT') {
        this.errors.push({
          line: nameToken.line,
          column: nameToken.column,
          message: "Expected built-in chip name after 'BUILTIN'",
        })
        return { parts: [] }
      }
      this.pos++
      this.expect('SEMICOLON')
      return { parts: [], builtin: nameToken.value }
    }

    const parts: HDLPart[] = []
    while (this.current().type === 'IDENT') {
      parts.push(this.parsePart())
      if (this.errors.length > 0) return { parts }
      this.expect('SEMICOLON')
      if (this.errors.length > 0) return { parts }
    }

    return { parts }
  }

  private parsePart(): HDLPart {
    const nameToken = this.expect('IDENT')
    this.expect('LPAREN')
    const connections = this.parseConnList()
    this.expect('RPAREN')
    return { name: nameToken.value, connections }
  }

  private parseConnList(): HDLConnection[] {
    const conns: HDLConnection[] = []
    if (this.current().type === 'RPAREN') return conns

    conns.push(this.parseConn())
    while (this.eat('COMMA')) {
      conns.push(this.parseConn())
    }
    return conns
  }

  private parseConn(): HDLConnection {
    const internalToken = this.expect('IDENT')
    this.expect('EQUALS')

    if (this.current().type === 'TRUE') {
      this.pos++
      return { internal: internalToken.value, external: 'true' }
    }
    if (this.current().type === 'FALSE') {
      this.pos++
      return { internal: internalToken.value, external: 'false' }
    }

    const externalToken = this.expect('IDENT')
    const conn: HDLConnection = {
      internal: internalToken.value,
      external: externalToken.value,
    }

    if (this.eat('LBRACKET')) {
      const startToken = this.expect('NUMBER')
      const start = parseInt(startToken.value, 10)
      let end = start
      if (this.eat('DOTDOT')) {
        const endToken = this.expect('NUMBER')
        end = parseInt(endToken.value, 10)
      }
      this.expect('RBRACKET')
      conn.start = start
      conn.end = end
    }

    return conn
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyChip(): HDLChip {
  return { name: '', inputs: [], outputs: [], parts: [] }
}

function tokenLabel(type: TokenType): string {
  const labels: Partial<Record<TokenType, string>> = {
    LBRACE: '{',
    RBRACE: '}',
    LPAREN: '(',
    RPAREN: ')',
    LBRACKET: '[',
    RBRACKET: ']',
    SEMICOLON: ';',
    COMMA: ',',
    EQUALS: '=',
    COLON: ':',
    DOTDOT: '..',
  }
  return labels[type] ?? type
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse HACK-style HDL source into an {@link HDLChip} AST, or structured errors.
 *
 * @param source - Full `.hdl` file contents (comments and whitespace allowed)
 * @returns Discriminated union: `{ success: true, chip }` or `{ success: false, errors }`
 */
export function parseHDL(source: string): HDLParseResult {
  if (!source.trim()) {
    return {
      success: false,
      errors: [{ line: 1, column: 1, message: 'Empty input' }],
    }
  }

  const tokenResult = tokenize(source)
  if ('errors' in tokenResult) {
    return { success: false, errors: tokenResult.errors }
  }

  const parser = new Parser(tokenResult.tokens)
  return parser.parse()
}
