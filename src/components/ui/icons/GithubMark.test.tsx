import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { GithubMark } from './GithubMark'

describe('GithubMark', () => {
  it('renders a decorative SVG that inherits the text colour', () => {
    const { container } = render(<GithubMark />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('fill')).toBe('currentColor')
    expect(svg?.querySelector('path')).toBeTruthy()
  })

  it('defaults to the toolbar icon size', () => {
    const { container } = render(<GithubMark />)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('w-4 h-4')
  })

  it('accepts a className like the lucide icons do', () => {
    const { container } = render(<GithubMark className="w-6 h-6 text-primary" />)
    const cls = container.querySelector('svg')?.getAttribute('class') ?? ''
    expect(cls).toContain('text-primary')
    expect(cls).toContain('w-6')
    expect(cls).not.toContain('w-4')
  })
})
