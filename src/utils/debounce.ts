/**
 * Debounce function - delays execution until after wait time has passed since last call.
 *
 * The returned function exposes a `cancel()` method that clears any pending invocation
 * without firing it. Use this when the originally scheduled call would produce stale
 * state (e.g. clearing a wire preview after the pointer has already left the canvas).
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function with a `cancel()` method
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => void> {
  (...args: Parameters<T>): void
  cancel: () => void
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      console.debug('[debounce] Executing debounced function', { wait })
      func(...args)
    }, wait)
  }) as DebouncedFunction<T>

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}



