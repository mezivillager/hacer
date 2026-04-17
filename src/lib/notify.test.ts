import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notify } from './notify'

describe('notify (Phase A stub)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it.each(['success', 'info', 'error', 'warning'] as const)(
    'exports notify.%s as a callable function',
    (level) => {
      expect(typeof notify[level]).toBe('function')
    },
  )

  it('routes calls to console.warn with the level prefix', () => {
    notify.error('something broke')
    expect(warnSpy).toHaveBeenCalledWith('[notify.error]', 'something broke', '')
  })

  it('forwards opts when provided', () => {
    notify.success('done', { description: 'all good' })
    expect(warnSpy).toHaveBeenCalledWith('[notify.success]', 'done', { description: 'all good' })
  })
})
