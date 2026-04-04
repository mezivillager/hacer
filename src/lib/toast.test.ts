import { describe, it, expect, vi } from 'vitest'
import { toast } from 'sonner'
import { notify } from './toast'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

describe('notify', () => {
  it('delegates success to toast.success', () => {
    notify.success('done')
    expect(toast.success).toHaveBeenCalledWith('done')
  })

  it('delegates error to toast.error', () => {
    notify.error('fail')
    expect(toast.error).toHaveBeenCalledWith('fail')
  })

  it('delegates warning to toast.warning', () => {
    notify.warning('watch out')
    expect(toast.warning).toHaveBeenCalledWith('watch out')
  })

  it('delegates info to toast.info', () => {
    notify.info('fyi')
    expect(toast.info).toHaveBeenCalledWith('fyi')
  })
})
