import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

import { notify } from './notify'
import { toast } from 'sonner'

describe('notify (Sonner-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['success', 'info', 'error', 'warning'] as const)(
    'forwards notify.%s to sonner toast.%s',
    (level) => {
      notify[level]('hello')
      expect(toast[level]).toHaveBeenCalledWith('hello', undefined)
    },
  )

  it('forwards options when provided', () => {
    notify.error('boom', { description: 'details', duration: 1000 })
    expect(toast.error).toHaveBeenCalledWith('boom', {
      description: 'details',
      duration: 1000,
    })
  })
})
