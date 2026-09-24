import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderShell } from './renderShell'
import { circuitActions } from '@/store/circuitStore'

beforeEach(() => circuitActions.clearCircuit())

// #313: first test in the file pays the full `renderShell()` mount cost. Measured over 3 full
// `pnpm run test:run` runs with 2 other agent processes active: 1450-2415ms, up to 48% of
// vitest's 5000ms default. 10000ms is ~4.1x that worst measured duration.
const SLOW_MOUNT_TIMEOUT_MS = 10000

describe('renderShell (RTL integration harness)', () => {
  it(
    'mounts the full DOM shell with no 3D scene',
    () => {
      renderShell()
      expect(screen.getByTestId('compact-toolbar')).toBeTruthy()
      expect(screen.getByTestId('right-action-bar')).toBeTruthy()
    },
    SLOW_MOUNT_TIMEOUT_MS,
  )

  it('supports a cross-panel user scenario: opening the info panel from the action bar', () => {
    renderShell()
    fireEvent.click(screen.getByTestId('right-bar-info-trigger'))
    expect(screen.getByTestId('info-panel')).toBeTruthy()
  })
})
