import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CHIP_ICON_MAP, CHIP_ICON_FALLBACK } from './ChipIcons'

const REQUIRED_CHIPS = [
  'Nand', 'Not', 'And', 'Or', 'Xor', 'Mux', 'DMux',
  'Not16', 'And16', 'Or16', 'Mux16',
  'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way',
]

describe('ChipIcons', () => {
  it('exports an icon for every Project 1 chip', () => {
    for (const name of REQUIRED_CHIPS) {
      expect(CHIP_ICON_MAP[name]).toBeDefined()
    }
  })

  it('every icon renders without crashing', () => {
    for (const name of REQUIRED_CHIPS) {
      const Icon = CHIP_ICON_MAP[name]
      const { container } = render(<Icon />)
      expect(container.querySelector('svg')).toBeTruthy()
    }
  })

  it('CHIP_ICON_FALLBACK renders for unknown names', () => {
    const { container } = render(<CHIP_ICON_FALLBACK />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
