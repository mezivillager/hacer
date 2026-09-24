export type DisplayFormat = 'B' | 'D' | 'X'

export function formatValue(_value: number, _width: number, _format: DisplayFormat): string {
  throw new Error('not implemented')
}

export function parseValue(_text: string, _width: number): number | null {
  throw new Error('not implemented')
}
