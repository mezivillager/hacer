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
  | { type: 'output-list'; columns: TSTOutputColumn[] }
  | { type: 'set'; pin: string; value: number }
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
