import { describe, it, expect, beforeEach, vi } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())

  it('coalesces repeated calls into one execution after wait', () => {
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d(); d(); d()
    vi.advanceTimersByTime(99)
    expect(spy).toHaveBeenCalledTimes(0)
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('cancel() drops pending invocations', () => {
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d()
    d.cancel()
    vi.advanceTimersByTime(500)
    expect(spy).not.toHaveBeenCalled()
  })

  it('flush() runs the pending call immediately', () => {
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d()
    d.flush()
    expect(spy).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(500)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
