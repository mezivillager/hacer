export interface TSTOutputColumn {
  name: string
  format: 'B' | 'D' | 'X' | 'S'
  padLeft: number
  width: number
  padRight: number
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
