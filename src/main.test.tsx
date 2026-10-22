import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

const boot = vi.hoisted(() => ({ order: [] as string[], element: null as ReactNode }))

vi.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: (element: ReactNode) => {
      boot.order.push('render')
      boot.element = element
    },
  }),
}))

vi.mock('./App', async () => {
  const { Toaster } = await import('sonner')
  return { default: () => <Toaster /> }
})

vi.mock('@/store/actions/persistenceActions/autosave', async () => {
  const { notify } = await import('@/lib/notify')
  return {
    restoreAutosave: (announce: (show: () => void) => void) => {
      boot.order.push('restore')
      announce(() => notify.info('Restored your last circuit'))
    },
  }
})

beforeEach(() => {
  vi.resetModules()
  boot.order = []
  boot.element = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('main.tsx boot', () => {
  it('restores the autosave once, before the first render, and shows its notice once the Toaster listens', async () => {
    vi.stubEnv('MODE', 'production')
    await import('./main')

    expect(boot.order).toEqual(['restore', 'render'])
    render(<>{boot.element}</>)
    expect(await screen.findByText('Restored your last circuit')).toBeInTheDocument()
  })

  it('does not restore in test mode', async () => {
    await import('./main')
    expect(boot.order).toEqual(['render'])
  })
})
