import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { NeedsHuman } from './NeedsHuman'
import type { Snapshot } from './snapshot'

const base = fixture as unknown as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'
// The fixture has none open, so label three tasks (one also in-progress: a label, not the pick reason, decides).
const marked = [base.tasks.items[0], base.tasks.items[1], base.tasks.items[2]]
const snapshot = { ...base, tasks: { ...base.tasks, items: base.tasks.items.map((task) =>
  marked.includes(task) ? { ...task, labels: [...task.labels, 'needs-human'] } : task) } } as Snapshot

describe('NeedsHuman', () => {
  it('the needs-human list shows every open needs-human issue with links', () => {
    render(<NeedsHuman snapshot={snapshot} />)
    const list = screen.getByRole('list', { name: 'Needs human' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    marked.forEach((task, index) => {
      expect(within(items[index]).getByRole('link', { name: `#${task.number}` }).getAttribute('href')).toBe(`${GITHUB}/issues/${task.number}`)
      expect(items[index].textContent).toContain(task.title)
    })
  })

  it('says so when nothing waits on the owner', () => {
    render(<NeedsHuman snapshot={base} />)
    expect(screen.getByText('Nothing is labelled needs-human.')).toBeTruthy()
  })
})
