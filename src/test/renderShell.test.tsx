import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderShell } from './renderShell'
import { circuitActions } from '@/store/circuitStore'

beforeEach(() => circuitActions.clearCircuit())

describe('renderShell (RTL integration harness)', () => {
  it('mounts the full DOM shell with no 3D scene', () => {
    renderShell()
    expect(screen.getByTestId('compact-toolbar')).toBeTruthy()
    expect(screen.getByTestId('right-action-bar')).toBeTruthy()
  })

  it('supports a cross-panel user scenario: opening the info panel from the action bar', () => {
    renderShell()
    fireEvent.click(screen.getByTestId('right-bar-info-trigger'))
    expect(screen.getByTestId('info-panel')).toBeTruthy()
  })
})
