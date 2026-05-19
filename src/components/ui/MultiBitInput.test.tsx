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

describe('MultiBitInput (width > 8 — numeric input)', () => {
  it('renders a display button (not bit toggles) for width=16', () => {
    render(
      <MultiBitInput nodeId="n2" currentValue={0x1234} width={16} onValueChange={vi.fn()} />,
    )
    expect(screen.queryAllByTestId(/^bit-toggle-n2-/)).toHaveLength(0)
    expect(screen.getByTestId('multibit-display-n2')).toBeTruthy()
  })

  it('clicking display reveals a text input pre-filled with the current value', () => {
    render(
      <MultiBitInput nodeId="n2" currentValue={0xAB} width={16} onValueChange={vi.fn()} />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    const input = screen.getByTestId('multibit-text-input-n2')
    expect(input.value).toBe('171')
  })

  it('committing an edit (Enter -> blur) calls onValueChange with the parsed value', () => {
    const onChange = vi.fn()
    render(
      <MultiBitInput nodeId="n2" currentValue={0} width={16} onValueChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    const input = screen.getByTestId('multibit-text-input-n2')
    fireEvent.change(input, { target: { value: '0xFF' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('n2', 255)
  })

  it('invalid input on blur does not call onValueChange', () => {
    const onChange = vi.fn()
    render(
      <MultiBitInput nodeId="n2" currentValue={0} width={16} onValueChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    const input = screen.getByTestId('multibit-text-input-n2')
    fireEvent.change(input, { target: { value: 'not a number' } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('readOnly prop disables editing on wide-bus path', () => {
    render(
      <MultiBitInput
        nodeId="n2"
        currentValue={0xAB}
        width={16}
        onValueChange={vi.fn()}
        readOnly
      />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    expect(screen.queryByTestId('multibit-text-input-n2')).toBeNull()
  })
})
