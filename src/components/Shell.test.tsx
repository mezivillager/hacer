import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { Shell } from './Shell'
import { circuitActions } from '@/store/circuitStore'

beforeEach(() => circuitActions.clearCircuit())

describe('Shell', () => {
  it('renders the DOM shell panels together without a 3D scene', () => {
    render(
      <TooltipProvider>
        <Shell />
      </TooltipProvider>,
    )
    expect(screen.getByTestId('compact-toolbar')).toBeTruthy()
    expect(screen.getByTestId('right-action-bar')).toBeTruthy()
  })

  it('renders the injected scene in the canvas region', () => {
    render(
      <TooltipProvider>
        <Shell scene={<div data-testid="scene-stub" />} />
      </TooltipProvider>,
    )
    expect(screen.getByTestId('scene-stub')).toBeTruthy()
  })
})
