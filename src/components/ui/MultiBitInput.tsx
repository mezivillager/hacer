import { useState } from 'react'
import { formatValue, parseValue, type DisplayFormat } from './multiBitFormat'

interface MultiBitInputProps {
  nodeId: string
  currentValue: number
  width: number
  onValueChange: (nodeId: string, value: number) => void
  readOnly?: boolean
}

export function MultiBitInput({
  nodeId,
  currentValue,
  width,
  onValueChange,
  readOnly = false,
}: MultiBitInputProps) {
  const [format, setFormat] = useState<DisplayFormat>('D')
  const [editText, setEditText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  if (width <= 8) {
    return (
      <div data-testid={`multibit-input-${nodeId}`} className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: width }, (_, i) => {
            const bitIndex = width - 1 - i
            const bit = (currentValue >>> bitIndex) & 1
            return (
              <button
                key={i}
                type="button"
                data-testid={`bit-toggle-${nodeId}-${i}`}
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return
                  onValueChange(nodeId, currentValue ^ (1 << bitIndex))
                }}
                className={
                  'font-mono text-[10px] leading-none px-1 py-0.5 rounded ' +
                  (bit
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground') +
                  ' disabled:cursor-default cursor-pointer'
                }
              >
                {bit}
              </button>
            )
          })}
        </div>
        <span data-testid={`multibit-display-${nodeId}`} className="font-mono text-xs">
          {formatValue(currentValue, width, format)}
        </span>
        <FormatSelector nodeId={nodeId} format={format} onChange={setFormat} />
      </div>
    )
  }

  return (
    <div data-testid={`multibit-input-${nodeId}`} className="flex items-center gap-2">
      {isEditing && !readOnly ? (
        <input
          data-testid={`multibit-text-input-${nodeId}`}
          className="font-mono text-xs w-24 px-1 py-0.5 rounded bg-background border"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={() => {
            const parsed = parseValue(editText, width)
            if (parsed !== null) onValueChange(nodeId, parsed)
            setIsEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          data-testid={`multibit-display-${nodeId}`}
          disabled={readOnly}
          onClick={() => {
            if (readOnly) return
            setEditText(formatValue(currentValue, width, format))
            setIsEditing(true)
          }}
          className="font-mono text-xs px-1.5 py-0.5 rounded hover:bg-accent disabled:hover:bg-transparent disabled:cursor-default cursor-pointer"
        >
          {formatValue(currentValue, width, format)}
        </button>
      )}
      <FormatSelector nodeId={nodeId} format={format} onChange={setFormat} />
    </div>
  )
}

function FormatSelector({
  nodeId,
  format,
  onChange,
}: {
  nodeId: string
  format: DisplayFormat
  onChange: (f: DisplayFormat) => void
}) {
  return (
    <span data-testid={`format-selector-${nodeId}`} className="flex gap-0.5">
      {(['B', 'D', 'X'] as const).map((f) => (
        <button
          key={f}
          type="button"
          data-testid={`format-${f}-${nodeId}`}
          onClick={() => onChange(f)}
          className={
            'font-mono text-[10px] leading-none px-1 py-0.5 rounded cursor-pointer ' +
            (f === format
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:bg-accent')
          }
        >
          {f}
        </button>
      ))}
    </span>
  )
}
