import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import type { Snapshot, Task } from './snapshot'
import { stagesOf } from './stages'

// `collect.mjs --json` at origin/main 561dcf1, 2026-09-25 03:16Z — see scripts/mission-control/collect.logic.test.mjs.
const snapshot = fixture as Snapshot
const task = (number: number, reason: string | null): Task =>
  ({ number, title: `Task ${number}`, labels: [], project: 'harness', pickable: reason === null, reason })

describe('stagesOf', () => {
  // #531: `ready` gives an issue holding an open claim ref the reason `claimed`, labelled `in-progress` or not, and
  // `stale-claim` once the claim is 48 h old with no open PR — which is a claim to release, not a build.
  it('counts a claimed task as building, beside an in-progress one, and never a stale claim', () => {
    const items = [task(1, 'in-progress'), task(2, 'claimed'), task(3, 'stale-claim'), task(4, null), task(5, 'needs-human')]
    const building = stagesOf({ ...snapshot, tasks: { ...snapshot.tasks, items } }).find((stage) => stage.id === 'building')
    expect(building?.counts).toEqual([{ label: 'building', value: 2 }])
    expect(building?.items.map((item) => item.number)).toEqual([1, 2])
  })

  it('counts only tasks with no reason as ready, even when pickable', () => {
    const items = [{ ...task(1, null) }, { ...task(2, 'on-request'), pickable: true }, { ...task(3, 'not-pulled'), pickable: true }]
    const ready = stagesOf({ ...snapshot, tasks: { ...snapshot.tasks, items } }).find((stage) => stage.id === 'ready')
    expect(ready?.counts).toEqual([{ label: 'ready', value: 1 }])
    expect(ready?.items.map((item) => item.number)).toEqual([1])
  })
})
