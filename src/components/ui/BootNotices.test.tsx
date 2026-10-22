import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toaster } from 'sonner'
import { notify } from '@/lib/notify'
import { BootNotices } from './BootNotices'

describe('BootNotices', () => {
  it('shows each notice once, after a Toaster earlier in the tree is listening', async () => {
    const restored = vi.fn(() => notify.info('Restored your last circuit'))
    const warned = vi.fn(() => notify.warning('Could not restore'))

    render(
      <>
        <Toaster />
        <BootNotices notices={[restored, warned]} />
      </>,
    )

    expect(await screen.findByText('Restored your last circuit')).toBeInTheDocument()
    expect(await screen.findByText('Could not restore')).toBeInTheDocument()
    expect(restored).toHaveBeenCalledTimes(1)
    expect(warned).toHaveBeenCalledTimes(1)
  })
})
