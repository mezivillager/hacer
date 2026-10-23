import { describe, expect, it } from 'vitest'

import { project1HdlSources } from '../hdl'
import { emptySidecar, parseSpec } from '../spec'
import type { CircuitSpec, Hint, NodeId, Sidecar } from '../spec'
import { layout } from './layout'
import type { Placements, Surface } from './types'

function read(source: string): CircuitSpec {
  const { doc, diagnostics } = parseSpec(source)
  if (doc === null) throw new Error(diagnostics.map((d) => d.message).join('; '))
  return doc
}

function edited(from: RegExp | string, to: string): CircuitSpec {
  const source = project1HdlSources.Mux.replace(from, to)
  if (source === project1HdlSources.Mux) throw new Error(`Mux has no ${String(from)}`)
  return read(source)
}

// Barycentre puts Mux's p1 and p3 in layer 1 at cells 0 and 1; the appended Not (p5) sorts first in that layer.
const MUX = read(project1HdlSources.Mux)
const MUX_PLUS = edited(/\}\s*$/, 'Not(in=a, out=extra); }')
// p2 reads `sel` for `nsel`, which moves it to layer 1 of the drawn graph.
const MUX_REWIRED = edited('And(a=a, b=nsel, out=aw)', 'And(a=a, b=sel, out=aw)')

const at = (placed: Placements, id: NodeId): { x: number; y: number; z: number } | undefined => {
  const node = placed.nodes[id]
  return node === undefined ? undefined : { x: node.x, y: node.y, z: node.z }
}

describe('layout with hints (ADR-0020 §1.4, §2)', () => {
  it('never moves a hinted node, on either surface', () => {
    const hinted: Record<Surface, Partial<Record<NodeId, Hint>>> = {
      '3d': { p2: { x: 9, y: 1, z: -3, origin: 'user' }, 'in:sel': { x: -2, y: 0, z: 0.5, origin: 'tidy' } },
      '2d': { p2: { x: 9, y: -3, z: 0, origin: 'user' }, 'out:out': { x: 1, y: 7, z: 0, origin: 'tidy' } },
    }
    for (const surface of ['3d', '2d'] as const) {
      const hints = hinted[surface]
      const first = layout(MUX, surface, { hints })
      const drawings = [
        first,
        layout(MUX_PLUS, surface, { hints, previous: first }),
        layout(MUX_REWIRED, surface, { hints, previous: first }),
        // The previous puts p2 on its own lattice cell; the hint wins.
        layout(MUX, surface, { hints, previous: layout(MUX, surface) }),
      ]
      for (const placed of drawings) {
        for (const [id, hint] of Object.entries(hints)) {
          expect(at(placed, id as NodeId), `${surface} ${id}`).toEqual({ x: hint?.x, y: hint?.y, z: hint?.z })
        }
      }
    }
  })

  it('a hint-less part added among hinted ones takes the first free cell of its layer and lands on no hinted node', () => {
    // After a tidy, every node carries a hint at the place layout gave it.
    const tidied = layout(MUX, '3d')
    const hints = Object.fromEntries(
      Object.entries(tidied.nodes).flatMap(([id, n]) => (n === undefined ? [] : [[id, { x: n.x, y: n.y, z: n.z, origin: 'tidy' as const }]])),
    )
    const added = layout(MUX_PLUS, '3d', { hints, previous: tidied })
    expect(added.nodes.p5).toEqual({ x: 2, y: 0, z: 4, layer: 1, index: 2 })
    for (const [id, node] of Object.entries(tidied.nodes)) expect(added.nodes[id as NodeId], id).toEqual(node)
    expect(Object.values(tidied.nodes).map((n) => `${n?.layer}:${n?.index}`)).not.toContain('1:2')
  })

  it('a hint off the lattice places the node at the hint exactly and blocks the nearest cell', () => {
    // At pitch 2 the cell nearest (2.4, 0.6) is layer 1, slot 0: the cell barycentre gives p1.
    const solid = layout(MUX, '3d', { hints: { p3: { x: 2.4, y: 0.25, z: 0.6, origin: 'user' } } })
    expect(solid.nodes.p3).toEqual({ x: 2.4, y: 0.25, z: 0.6, layer: 1, index: 0 })
    expect(solid.nodes.p1).toEqual({ x: 2, y: 0, z: 2, layer: 1, index: 1 })

    const flat = layout(MUX, '2d', { pitch: 1, hints: { p3: { x: 1.3, y: 0.4, z: 0, origin: 'user' } } })
    expect(flat.nodes.p3).toEqual({ x: 1.3, y: 0.4, z: 0, layer: 1, index: 0 })
    expect(flat.nodes.p1).toEqual({ x: 1, y: 1, z: 0, layer: 1, index: 1 })
  })

  it('hints for the other surface are not read', () => {
    const sidecar: Sidecar = { ...emptySidecar(), hints: { '3d': { p3: { x: 2.4, y: 0, z: 0.6, origin: 'user' } }, '2d': {} } }
    const solid = layout(MUX, '3d', { hints: sidecar.hints['3d'] })
    expect(solid.nodes.p3).toEqual({ x: 2.4, y: 0, z: 0.6, layer: 1, index: 0 })
    expect(layout(MUX, '2d', { hints: sidecar.hints['2d'] })).toStrictEqual(layout(MUX, '2d'))
    // Nor through a previous drawn on the other surface: it is discarded whole, hinted placements included.
    expect(layout(MUX, '2d', { hints: sidecar.hints['2d'], previous: solid })).toStrictEqual({ ...layout(MUX, '2d'), previousDiscarded: true })
  })
})
