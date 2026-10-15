import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'
import type { CircuitSpec, SpecDiagnostic } from './types'

const SAFE_ID = /^p[1-9][0-9]*$/

function parsed(parts: string[]): { doc: CircuitSpec; diagnostics: SpecDiagnostic[] } {
  const result = parseSpec(`CHIP X { IN a; OUT out;\nPARTS:\n${parts.join('\n')}\n}\n`)
  if (result.doc === null) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result
}

function expectUniqueSafeIds(doc: CircuitSpec): void {
  const ids = doc.parts.map((p) => p.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids) {
    expect(id).toMatch(SAFE_ID)
    expect(Number(id.slice(1))).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER)
  }
}

/** Deterministic PRNG (mulberry32), as in hdl/parser.fuzz.test.ts. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A marker is a bounded safe integer (ADR-0020 §1.9's p<n>); anything else is a named diagnostic and the
// part is keyed as unmarked, by a counter that never depends on how large a marker was.
describe('parseSpec — part-id markers of any size', () => {
  it('returns with unique ids when a marker is past 2^53 and a positional id is taken', () => {
    const { doc, diagnostics } = parsed(['Not(in=a, out=t);', 'Not(in=t, out=out); // #p1', 'Not(in=a, out=u); // #p9007199254740992'])
    expectUniqueSafeIds(doc)
    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'invalid-part-id', severity: 'warning' })]))
  })

  it.each([
    ['a 310-digit marker', ['Not(in=a, out=t);', 'Not(in=t, out=u);', `Not(in=u, out=out); // #p${'9'.repeat(310)}`]],
    ['a 1e21-sized marker', ['Not(in=a, out=t);', 'Not(in=t, out=u);', 'Not(in=u, out=out); // #p1000000000000000000000']],
    ['a duplicated marker beside one past 2^53', ['Not(in=a, out=t); // #p2', 'Not(in=t, out=u); // #p2', 'Not(in=u, out=out); // #p9007199254740992']],
  ])('returns with unique safe ids for %s', (_shape, parts) => {
    expectUniqueSafeIds(parsed(parts).doc)
  })

  it.each([['p0'], ['p007']])('treats the marker #%s, which is not a canonical positive integer, as unmarked by name', (marker) => {
    const { doc, diagnostics } = parsed([`Not(in=a, out=out); // #${marker}`])
    expect(doc.parts).toEqual([{ id: 'p1', chip: 'Not' }])
    expect(diagnostics.map((d) => d.code)).toEqual(['invalid-part-id'])
  })

  it('names a repeated marker once, on the part that lost it', () => {
    const { doc, diagnostics } = parsed(['Not(in=a, out=t); // #p2', 'Not(in=t, out=out); // #p2'])
    expect(doc.parts.map((p) => p.id)).toEqual(['p2', 'p1'])
    expect(diagnostics).toEqual([expect.objectContaining({ code: 'duplicate-part-id', partId: 'p1' })])
  })

  it('always returns quickly with unique safe ids, over 400 seeded documents of random markers', () => {
    const rng = mulberry32(0x374)
    const digits = (n: number): string => Array.from({ length: n }, () => String(Math.floor(rng() * 10))).join('')
    let slowest = 0
    for (let doc = 0; doc < 400; doc++) {
      const used: string[] = []
      const parts = Array.from({ length: 1 + Math.floor(rng() * 12) }, (_, i) => {
        const roll = rng()
        const marker =
          roll < 0.25 ? '' : roll < 0.4 && used.length > 0 ? used[Math.floor(rng() * used.length)] : roll < 0.55 ? `p${digits(15 + Math.floor(rng() * 300))}` : `p${digits(1 + Math.floor(rng() * 3))}`
        if (marker) used.push(marker)
        return `Not(in=a, out=t${i});${marker ? ` // #${marker}` : ''}`
      })
      const started = performance.now()
      const result = parsed(parts)
      slowest = Math.max(slowest, performance.now() - started)
      expectUniqueSafeIds(result.doc)
    }
    expect(slowest).toBeLessThan(100)
  })
})
