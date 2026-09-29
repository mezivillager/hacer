import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Scene.tsx is the only component that renders an R3F <Canvas>, i.e. the only place a WebGL
// context is created. Stubbing it records whether the app ever reaches it.
const sceneRendered = vi.hoisted(() => vi.fn())
vi.mock('@/components/canvas/Scene/Scene', () => ({
  Scene: () => {
    sceneRendered()
    return null
  },
}))

// The first test in a file pays the full app import and mount cost; same budget as
// src/test/renderShell.test.tsx.
const SLOW_MOUNT_TIMEOUT_MS = 10000

function mountAt(search: string) {
  window.history.replaceState(null, '', `/${search}`)
  return render(<App />)
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  sceneRendered.mockClear()
  vi.restoreAllMocks()
})

describe('App renderer selection', () => {
  it(
    'mounts the shell without the scene or a WebGL context under ?renderer=none',
    () => {
      const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')

      const { container } = mountAt('?notour=1&renderer=none')

      expect(screen.getByTestId('compact-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('right-action-bar')).toBeInTheDocument()
      expect(sceneRendered).not.toHaveBeenCalled()
      expect(container.querySelector('canvas')).toBeNull()
      expect(getContext).not.toHaveBeenCalled()
    },
    SLOW_MOUNT_TIMEOUT_MS,
  )

  it('reaches the scene by default', () => {
    mountAt('?notour=1')

    expect(screen.getByTestId('compact-toolbar')).toBeInTheDocument()
    expect(sceneRendered).toHaveBeenCalled()
  })

  it('reaches the scene for an unrecognised renderer value', () => {
    mountAt('?notour=1&renderer=2d')

    expect(sceneRendered).toHaveBeenCalled()
  })
})
