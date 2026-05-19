export type DisplayFormat = 'B' | 'D' | 'X'

function widthMask(width: number): number {
  return width >= 32 ? 0xFFFFFFFF : (1 << width) - 1
}

export function formatValue(value: number, width: number, format: DisplayFormat): string {
  const clamped = (value & widthMask(width)) >>> 0
  switch (format) {
    case 'B':
      return clamped.toString(2).padStart(width, '0')
    case 'D':
      return String(clamped)
    case 'X':
      return '0x' + clamped.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')
  }
}

export function parseValue(text: string, width: number): number | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) return null
  if (trimmed.startsWith('-')) return null

  let num: number
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    num = parseInt(trimmed.slice(2), 16)
  } else if (trimmed.startsWith('0b') || trimmed.startsWith('0B')) {
    num = parseInt(trimmed.slice(2), 2)
  } else {
    if (!/^[0-9]+$/.test(trimmed)) return null
    num = parseInt(trimmed, 10)
  }
  if (!Number.isFinite(num) || Number.isNaN(num)) return null
  return (num & widthMask(width)) >>> 0
}
