export interface DebouncedFn {
  (): void
  cancel: () => void
  flush: () => void
}

export function debounce(fn: () => void, waitMs: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (() => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn()
    }, waitMs)
  }) as DebouncedFn
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
      fn()
    }
  }
  return debounced
}
