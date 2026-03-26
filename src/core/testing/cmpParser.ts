/** Represents a column in a .cmp file. */
export interface CmpColumn {
  /** The name of the column (trimmed string). */
  name: string
  /** The 0-based index of this column in the table. */
  index: number
}

/** Represents a single data row of expected numeric values. */
export interface CmpRow {
  /** The numeric values for each column, parsed appropriately. */
  values: number[]
}

/** A structured representation of a fully parsed .cmp file. */
export interface CmpFile {
  /** The ordered list of columns found in the .cmp file header. */
  columns: CmpColumn[]
  /** The list of expected data rows. */
  rows: CmpRow[]
}

/** Details about a mismatch between an expected .cmp row and actual simulator output. */
export interface CmpMismatch {
  /** The 0-based row index where the mismatch occurred. */
  row: number
  /** The name of the column that mismatched. */
  column: string
  /** The expected numeric value from the .cmp file. */
  expected: number
  /** The actual numeric value returned by the simulator. */
  actual: number
}

export interface CmpParseError {
  line: number
  column: number
  message: string
}

/** Discriminated union returned by `parseCmp`. */
export type CmpParseResult =
  | { success: true; file: CmpFile }
  | { success: false; errors: CmpParseError[] }

function toPipeCells(
  rawLine: string,
  lineNumber: number,
  errors: CmpParseError[],
): string[] | null {
  const line = rawLine.trim()

  if (!line.startsWith('|') || !line.endsWith('|')) {
    errors.push({
      line: lineNumber,
      column: 1,
      message: `CMP line ${lineNumber} must be pipe-delimited`,
    })
    return null
  }

  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

function parseCellValue(
  cell: string,
  lineNumber: number,
  columnIndex: number,
  columnName: string,
  errors: CmpParseError[],
): number | null {
  if (cell === '') {
    return 0
  }

  if (cell.length > 1 && /^[01]+$/.test(cell)) {
    return Number.parseInt(cell, 2)
  }

  if (!/^-?\d+$/.test(cell)) {
    errors.push({
      line: lineNumber,
      column: columnIndex + 1,
      message: `CMP line ${lineNumber} has non-numeric value '${cell}' in column '${columnName}'`,
    })
    return null
  }

  return Number.parseInt(cell, 10)
}

/**
 * Parses a `.cmp` expected-output table into structured columns and numeric rows.
 *
 * @param source - Full `.cmp` file contents
 * @returns Discriminated union: `{ success: true, file }` or `{ success: false, errors }`
 */
export function parseCmp(source: string): CmpParseResult {
  const errors: CmpParseError[] = []

  const lines: string[] = source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)

  if (lines.length === 0) {
    return { success: true, file: { columns: [], rows: [] } }
  }

  const headerCells = toPipeCells(lines[0], 1, errors)
  if (headerCells === null) {
    return { success: false, errors }
  }

  const columns: CmpColumn[] = headerCells.map((name, index) => ({
    name,
    index,
  }))

  const rows: CmpRow[] = []
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const cells = toPipeCells(lines[rowIndex], rowIndex + 1, errors)
    if (cells === null) {
      continue
    }

    if (cells.length !== columns.length) {
      errors.push({
        line: rowIndex + 1,
        column: 1,
        message: `CMP line ${rowIndex + 1} column count mismatch: expected ${columns.length}, got ${cells.length}`,
      })
      continue
    }

    const values: number[] = []
    let rowValid = true
    for (let columnIndex = 0; columnIndex < cells.length; columnIndex++) {
      const columnName = columns[columnIndex]?.name ?? `col_${columnIndex}`
      const value = parseCellValue(
        cells[columnIndex],
        rowIndex + 1,
        columnIndex,
        columnName,
        errors,
      )
      if (value === null) {
        rowValid = false
      } else {
        values.push(value)
      }
    }

    if (rowValid) {
      rows.push({ values })
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, file: { columns, rows } }
}

/**
 * Compares a single actual output row against the expected CMP row.
 * Returns the first mismatch or null when the row matches.
 */
export function compareCmpRow(
  actual: number[],
  expected: CmpRow,
  columns: CmpColumn[],
  row = 0,
): CmpMismatch | null {
  const width = Math.max(actual.length, expected.values.length, columns.length)

  for (let index = 0; index < width; index++) {
    const expectedValue =
      index < expected.values.length ? expected.values[index] ?? Number.NaN : Number.NaN
    const actualValue = index < actual.length ? actual[index] ?? Number.NaN : Number.NaN

    if (expectedValue !== actualValue) {
      return {
        row,
        column: columns[index]?.name ?? `col_${index}`,
        expected: expectedValue,
        actual: actualValue,
      }
    }
  }

  return null
}
