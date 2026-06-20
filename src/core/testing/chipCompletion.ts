// src/core/testing/chipCompletion.ts
// Persisted "verified chips" contract — shared with the future P05-19 chip browser.
const KEY = 'hacer-completed-chips'

export function readCompletedChips(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function markChipCompleted(chipName: string): string[] {
  const current = readCompletedChips()
  if (current.includes(chipName)) return current
  const next = [...current, chipName]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — keep the in-memory list */
  }
  return next
}
