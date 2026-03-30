import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { NodeSelector } from './NodeSelector'
import { useCircuitStore } from '@/store/circuitStore'

vi.mock('antd', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Space: ({
    children,
    wrap: _wrap,
    ...rest
  }: {
    children: React.ReactNode
    wrap?: boolean
    [key: string]: unknown
  }) => <div {...rest}>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  Segmented: ({
    options,
    value,
    onChange,
  }: {
    options: Array<{ label: string; value: string }>
    value?: string
    onChange: (nextValue: string) => void
  }) => (
    <div role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}))

const setState = useCircuitStore.setState

describe('NodeSelector', () => {
  beforeEach(() => {
    setState({
      nodePlacementMode: null,
      junctionPlacementMode: false,
      startNodePlacement: vi.fn(),
      cancelNodePlacement: vi.fn(),
      cancelPlacement: vi.fn(),
      startJunctionPlacement: vi.fn(),
      cancelJunctionPlacement: vi.fn(),
    })
  })

  it('renders compact segmented selector', () => {
    render(<NodeSelector compact />)
    expect(screen.getByTestId('node-compact-selector')).toBeInTheDocument()
  })

  it('selects input mode from compact segmented control', () => {
    const startNodePlacement = vi.fn()
    setState({ nodePlacementMode: null, startNodePlacement })

    render(<NodeSelector compact />)
    fireEvent.click(screen.getByRole('radio', { name: 'Input' }))

    expect(startNodePlacement).toHaveBeenCalledWith('INPUT')
  })
})
