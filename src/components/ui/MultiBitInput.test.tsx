import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiBitInput } from './MultiBitInput'

describe('MultiBitInput (width ≤ 8 — bit toggles)', () => {
  it('renders one toggle per bit for width=4', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1010} width={4} onValueChange={vi.fn()} />,
    )
    expect(screen.getAllByTestId(/^bit-toggle-n1-/)).toHaveLength(4)
  })

  it('renders MSB on the left, LSB on the right', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1100} width={4} onValueChange={vi.fn()} />,
    )
    expect(screen.getByTestId('bit-toggle-n1-0').textContent).toBe('1')
    expect(screen.getByTestId('bit-toggle-n1-3').textContent).toBe('0')
  })

  it('clicking a bit calls onValueChange with the flipped value', () => {
    const onChange = vi.fn()
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1010} width={4} onValueChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('bit-toggle-n1-3'))
    expect(onChange).toHaveBeenCalledWith('n1', 0b1011)
  })

  it('shows the formatted value next to the toggles', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1010} width={4} onValueChange={vi.fn()} />,
    )
    expect(screen.getByTestId('multibit-display-n1').textContent).toBe('10')
  })

  it('switching format to X shows hex', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0xAB} width={8} onValueChange={vi.fn()} />,
    )
    fireEvent.click(screen.getByTestId('format-X-n1'))
    expect(screen.getByTestId('multibit-display-n1').textContent).toBe('0xAB')
  })
})
