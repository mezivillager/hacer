import { describe, expect, it } from 'vitest'

import { project1HdlSources } from '../hdl'
import { parseSpec } from '../spec'
import { layout } from './layout'
import type { LayoutOrder } from './types'

const GOLDENS: Array<[string, LayoutOrder]> = [
  ['Xor', 'barycentre'],
  ['Xor', 'id'],
  ['Mux4Way16', 'barycentre'],
  ['Mux4Way16', 'id'],
]

describe('layout goldens, previous-free (ADR-0020 §12 G)', () => {
  it.each(GOLDENS)('%s under order: %s on 3d', async (name, order) => {
    const { doc } = parseSpec(project1HdlSources[name])
    if (doc === null) throw new Error(`${name} does not parse`)
    const golden = `${JSON.stringify(layout(doc, '3d', { order }), null, 2)}\n`
    await expect(golden).toMatchFileSnapshot(`__snapshots__/${name}.${order}.3d.json`)
  })
})
