/**
 * Debounce function - delays execution until after wait time has passed since last call.
 *
 * The returned function exposes `cancel()` and `flush()` methods for pending calls.
 * Use `cancel()` when the originally scheduled call would produce stale state (e.g.
 * clearing a wire preview after the pointer has already left the canvas).
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function with `cancel()` and `flush()` methods
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => void> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let latestArgs: Parameters<T> | null = null

  const debounced = ((...args: Parameters<T>) => {
    latestArgs = args
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      const argsToUse = latestArgs
      latestArgs = null
      if (argsToUse) {
        func(...argsToUse)
      }
    }, wait)
  }) as DebouncedFunction<T>

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    latestArgs = null
  }

  debounced.flush = () => {
    if (timeoutId === null || latestArgs === null) return
    clearTimeout(timeoutId)
    timeoutId = null
    const argsToUse = latestArgs
    latestArgs = null
    func(...argsToUse)
  }

  return debounced
}


