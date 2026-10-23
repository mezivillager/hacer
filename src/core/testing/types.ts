export interface TSTOutputColumn {
  name: string
  format: 'B' | 'D' | 'X' | 'S'
  padLeft: number
  width: number
  padRight: number
  /** A bare name: the width is the chip pin's, and `width` holds 1 until the chip resolves it. */
  widthFromChip?: boolean
}

export type TSTCommand =
  | { type: 'load'; filename: string }
  | { type: 'output-file'; filename: string }
  | { type: 'compare-to'; filename: string }
  // `line` is where the statement starts in the script, so a run-time error about a pin can point at it.
  | { type: 'output-list'; columns: TSTOutputColumn[]; line?: number }
  | { type: 'set'; pin: string; value: number; line?: number }
  | { type: 'eval' }
  | { type: 'output' }
  // A command written with '!' is followed by one: a run ends there, as the reference's run() does.
  | { type: 'break' }

export interface TSTScript {
  commands: TSTCommand[]
}

export interface TSTParseError {
  line: number
  column: number
  message: string
}

export type TSTParseResult =
  | { success: true; script: TSTScript }
  | { success: false; errors: TSTParseError[] }
