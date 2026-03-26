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

function toPipeCells(rawLine: string, lineNumber: number): string[] {
  const line = rawLine.trim()

  if (!line.startsWith('|') || !line.endsWith('|')) {
    throw new Error(`CMP line ${lineNumber} must be pipe-delimited`) // line number is 1-based for diagnostics
  }

  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

function parseCellValue(cell: string, lineNumber: number, columnName: string): number {
  if (cell === '') {
    return 0
  }

  if (cell.length > 1 && /^[01]+$/.test(cell)) {
    return Number.parseInt(cell, 2)
  }

  const parsed = Number.parseInt(cell, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(
      `CMP line ${lineNumber} has non-numeric value '${cell}' in column '${columnName}'`,
    )
  }

  return parsed
}

/** Parses a nand2tetris .cmp expected-output table into numeric rows. */
export function parseCmp(source: string): CmpFile {
  const lines: string[] = source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)

  if (lines.length === 0) {
    return { columns: [], rows: [] }
  }

  const headerCells = toPipeCells(lines[0], 1)
  const columns: CmpColumn[] = headerCells.map((name, index) => ({
    name,
    index,
  }))

  const rows: CmpRow[] = []
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const cells = toPipeCells(lines[rowIndex], rowIndex + 1)

    if (cells.length !== columns.length) {
      throw new Error(
        `CMP line ${rowIndex + 1} column count mismatch: expected ${columns.length}, got ${cells.length}`,
      )
    }

    const values = cells.map((cell, columnIndex) => {
      const columnName = columns[columnIndex]?.name ?? `col_${columnIndex}`
      return parseCellValue(cell, rowIndex + 1, columnName)
    })

    rows.push({ values })
  }

  return { columns, rows }
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
