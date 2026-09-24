/**
 * #199 — parseHDL fuzz. No fast-check (#198 owns that dependency).
 *
 * Two input families, one seeded mulberry32 (the same generator as
 * `compiler.test.ts`):
 * - grammar programs in the Phase 0.5 chip grammar (valid chips, so the
 *   success path is exercised, not only errors)
 * - mutations of the official Project 1 HDL (parser fixtures and the
 *   bottom-up sources), plus a `@` suffix and an unclosed block comment
 *   on each official chip
 *
 * Property: `parseHDL` returns a result and never throws. On failure the
 * result carries at least one diagnostic, and every line/column lies in the
 * source. Column may be one past the last character of its line — the
 * insertion point at EOL / EOF.
 *
 * A checker that never fails proves nothing. The same checker must reject a
 * parser whose columns are shifted out of range, and a parser that throws
 * where the unexpected-character guard currently returns a diagnostic. The
 * corpus must also produce those diagnostics on its own; otherwise the span
 * half of the property never runs.
 */
import { describe, expect, it } from 'vitest'
import { parseHDL } from './parser'
import { project1HdlFixtures } from './project1HdlFixtures'
import { project1HdlSources } from './project1HdlSources'
import type { HDLParseError, HDLParseResult } from './types'

/** Issue number, so a failure replays from this file alone. */
const SEED = 0x199
const GRAMMAR_PROGRAMS = 80
const MUTATIONS_PER_OFFICIAL = 20
const MUTATIONS_PER_GRAMMAR = 1
/** Random mutations that are not the two forced suffixes. */
const MIN_RANDOM_DIAGNOSTICS = 200

const NAMES = ['a', 'b', 'in', 'out', 'sel', 'n', 'tmp', 'bus', 'Nand', 'Not', 'And', 'Or', 'Xor'] as const
const WIDTHS = ['1', '2', '3', '8', '16'] as const
const SURPRISE = ['@', '#', '$', '%', '&', '!', '~', '`', '|', '\\', '?', '<', '>', '"', "'", '.', '\n', '\0', '/'] as const
const KEYWORDS = ['CHIP', 'IN', 'OUT', 'PARTS', 'BUILTIN'] as const

type Rng = () => number
type SampleKind = 'official' | 'mutated-official' | 'grammar' | 'mutated-grammar' | 'adversarial'
type ViolationKind = 'throw' | 'shape' | 'span'

interface Sample {
  label: string
  kind: SampleKind
  source: string
}

interface Violation {
  label: string
  kind: ViolationKind
  detail: string
  source: string
}

type ParseFn = (source: string) => HDLParseResult

/** Deterministic PRNG (mulberry32), copied from compiler.test.ts. */
function mulberry32(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function int(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[int(rng, items.length)]
}

function ident(rng: Rng): string {
  const base = pick(rng, NAMES)
  return rng() < 0.3 ? `${base}${int(rng, 4)}` : base
}

function pin(rng: Rng): string {
  const name = ident(rng)
  return rng() < 0.45 ? `${name}[${pick(rng, WIDTHS)}]` : name
}

function pinList(rng: Rng): string {
  const count = 1 + int(rng, 4)
  const pins: string[] = []
  for (let n = 0; n < count; n++) pins.push(pin(rng))
  return pins.join(', ')
}

function sliceOf(rng: Rng): string {
  if (rng() < 0.55) return ''
  const start = int(rng, 16)
  if (rng() < 0.5) return `[${start}]`
  return `[${start}..${start + int(rng, 8)}]`
}

function connection(rng: Rng): string {
  const left = `${ident(rng)}${sliceOf(rng)}`
  const right = rng() < 0.2 ? pick(rng, ['true', 'false'] as const) : `${ident(rng)}${sliceOf(rng)}`
  return `${left}=${right}`
}

function part(rng: Rng): string {
  const count = int(rng, 5)
  const connections: string[] = []
  for (let n = 0; n < count; n++) connections.push(connection(rng))
  return `${ident(rng)}(${connections.join(', ')});`
}

/** One chip in the Phase 0.5 grammar: CHIP / IN / OUT / PARTS, optional BUILTIN. */
function grammarChip(rng: Rng): string {
  let body: string
  if (rng() < 0.2) {
    body = `BUILTIN ${ident(rng)};`
  } else {
    const count = int(rng, 4)
    const parts: string[] = []
    for (let n = 0; n < count; n++) parts.push(part(rng))
    body = parts.join('\n')
  }
  const lineComment = rng() < 0.35 ? `// ${ident(rng)}\n` : ''
  const blockComment = rng() < 0.2 ? `/* ${ident(rng)} */\n` : ''
  return `${lineComment}${blockComment}CHIP ${ident(rng)} {\nIN ${pinList(rng)};\nOUT ${pinList(rng)};\nPARTS:\n${body}\n}`
}

function mutate(source: string, rng: Rng): string {
  if (source.length === 0) return pick(rng, ['', ' ', '\n', '@', '/*', 'CHIP'] as const)
  const i = int(rng, source.length)
  const op = int(rng, 12)
  switch (op) {
    case 0:
      return source.slice(0, i) + source.slice(i + 1)
    case 1:
      return source.slice(0, i) + pick(rng, SURPRISE) + source.slice(i)
    case 2:
      return source.slice(0, i) + pick(rng, SURPRISE) + source.slice(i + 1)
    case 3:
      return source.slice(0, int(rng, source.length + 1))
    case 4: {
      const j = int(rng, source.length)
      const start = Math.min(i, j)
      const end = Math.max(i, j)
      return source + source.slice(start, end)
    }
    case 5: {
      if (i + 1 >= source.length) return source.slice(0, -1)
      const next = source[i + 1]
      return source.slice(0, i) + next + source[i] + source.slice(i + 2)
    }
    case 6: {
      const lines = source.split('\n')
      lines.splice(int(rng, lines.length), 1)
      return lines.join('\n')
    }
    case 7:
      return `${source.slice(0, i)}/*${source.slice(i)}`
    case 8:
      return source.replace(pick(rng, KEYWORDS), pick(rng, ['CLOCKED', 'FOO', ''] as const))
    case 9:
      return source.replace(/\[(\d+)\.\.(\d+)\]/, '[$2..$1]')
    case 10:
      return `${source}\n${source}`
    case 11:
      return source.replace('PARTS:', 'CLOCKED x;\nPARTS:')
    default:
      return source
  }
}

function officialSamples(): Sample[] {
  const samples: Sample[] = []
  for (const [name, source] of Object.entries(project1HdlFixtures)) {
    samples.push({ label: `fixture:${name}`, kind: 'official', source })
  }
  for (const [name, source] of Object.entries(project1HdlSources)) {
    samples.push({ label: `source:${name}`, kind: 'official', source })
  }
  return samples
}

const ADVERSARIAL: readonly Sample[] = [
  { label: 'empty', kind: 'adversarial', source: '' },
  { label: 'whitespace', kind: 'adversarial', source: ' \n\t ' },
  { label: 'at-sign', kind: 'adversarial', source: '@' },
  { label: 'unterminated-comment', kind: 'adversarial', source: '/* oops' },
  { label: 'single-dot', kind: 'adversarial', source: 'CHIP X { IN a; OUT b; PARTS: Not(in=a., out=b); }' },
  {
    label: 'reversed-range',
    kind: 'adversarial',
    source: 'CHIP X { IN in[16]; OUT out; PARTS: Not(in=in[7..0], out=out); }',
  },
  { label: 'clocked', kind: 'adversarial', source: 'CHIP X { IN a; OUT b; CLOCKED a; PARTS: }' },
  { label: 'missing-name', kind: 'adversarial', source: 'CHIP { IN a; OUT b; PARTS: }' },
  {
    label: 'two-chips',
    kind: 'adversarial',
    source: 'CHIP A { IN a; OUT b; PARTS: } CHIP B { IN a; OUT b; PARTS: }',
  },
  { label: 'unclosed', kind: 'adversarial', source: 'CHIP X { IN a; OUT b; PARTS:' },
]

function buildCorpus(seed: number): Sample[] {
  const rng = mulberry32(seed)
  const official = officialSamples()
  const samples: Sample[] = [...official]
  for (const sample of official) {
    for (let n = 0; n < MUTATIONS_PER_OFFICIAL; n++) {
      samples.push({
        label: `${sample.label}#m${n}`,
        kind: 'mutated-official',
        source: mutate(sample.source, rng),
      })
    }
    samples.push(
      { label: `${sample.label}#at`, kind: 'mutated-official', source: `${sample.source}@` },
      { label: `${sample.label}#unclosed`, kind: 'mutated-official', source: `${sample.source}/*` },
    )
  }
  for (let n = 0; n < GRAMMAR_PROGRAMS; n++) {
    const source = grammarChip(rng)
    samples.push({ label: `grammar:${n}`, kind: 'grammar', source })
    for (let m = 0; m < MUTATIONS_PER_GRAMMAR; m++) {
      samples.push({
        label: `grammar:${n}#m${m}`,
        kind: 'mutated-grammar',
        source: mutate(source, rng),
      })
    }
  }
  samples.push(...ADVERSARIAL)
  return samples
}

/** 1-based. Column may sit one past the end of the line. */
function spanInsideSource(source: string, line: number, column: number): boolean {
  if (!Number.isInteger(line) || !Number.isInteger(column)) return false
  const lines = source.split('\n')
  if (line < 1 || line > lines.length) return false
  const text = lines[line - 1] ?? ''
  return column >= 1 && column <= text.length + 1
}

function invalidSpan(source: string, error: HDLParseError): string {
  const lines = source.split('\n')
  return `line ${error.line} column ${error.column} outside source (${lines.length} lines, line length ${(lines[error.line - 1] ?? '').length})`
}

function checkOne(parse: ParseFn, sample: Sample): Violation | null {
  let result: HDLParseResult
  try {
    result = parse(sample.source)
  } catch (error: unknown) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    return { label: sample.label, kind: 'throw', detail, source: sample.source }
  }
  if (result.success) {
    if (typeof result.chip.name !== 'string' || !Array.isArray(result.chip.parts)) {
      return { label: sample.label, kind: 'shape', detail: 'success result missing chip', source: sample.source }
    }
    return null
  }
  if (!Array.isArray(result.errors) || result.errors.length === 0) {
    return { label: sample.label, kind: 'shape', detail: 'failure returned no diagnostics', source: sample.source }
  }
  for (const error of result.errors) {
    if (typeof error.message !== 'string' || error.message.length === 0) {
      return { label: sample.label, kind: 'shape', detail: 'diagnostic missing message', source: sample.source }
    }
    if (!spanInsideSource(sample.source, error.line, error.column)) {
      return { label: sample.label, kind: 'span', detail: invalidSpan(sample.source, error), source: sample.source }
    }
  }
  return null
}

function collect(parse: ParseFn, samples: readonly Sample[]): Violation[] {
  const violations: Violation[] = []
  for (const sample of samples) {
    const violation = checkOne(parse, sample)
    if (violation) violations.push(violation)
  }
  return violations
}

function firstViolation(violations: readonly Violation[]): Violation | null {
  return violations[0] ?? null
}

/**
 * Mutated span calculation: every diagnostic column is pushed past the
 * source. If the corpus never fails a parse, this wrapper is invisible and
 * the test below fails — which is what we want.
 */
function withMutatedSpans(source: string): HDLParseResult {
  const result = parseHDL(source)
  if (result.success) return result
  return {
    success: false,
    errors: result.errors.map((error) => ({ ...error, column: error.column + source.length + 50 })),
  }
}

/**
 * Reverted guard: today's tokenizer returns a diagnostic for an unexpected
 * character. This wrapper throws instead, which is what that path does if
 * the guard is deleted.
 */
function withRevertedUnexpectedGuard(source: string): HDLParseResult {
  const result = parseHDL(source)
  if (!result.success && result.errors.some((error) => error.message.includes('Unexpected character'))) {
    throw new Error('reverted guard: unexpected character')
  }
  return result
}

const corpus = buildCorpus(SEED)

describe('parseHDL fuzz (#199)', () => {
  it('parses every official Project 1 HDL input', () => {
    const official = corpus.filter((sample) => sample.kind === 'official')
    const rejected: string[] = []
    for (const sample of official) {
      const result = parseHDL(sample.source)
      if (!result.success) rejected.push(sample.label)
    }
    expect(rejected).toEqual([])
    expect(collect(parseHDL, official)).toEqual([])
    expect(official.length).toBeGreaterThan(20)
  })

  it('accepts every grammar-generated chip', () => {
    const generated = corpus.filter((sample) => sample.kind === 'grammar')
    const rejected = generated.flatMap((sample) => {
      const result = parseHDL(sample.source)
      return result.success ? [] : [`${sample.label}\n${sample.source}`]
    })
    expect(rejected).toEqual([])
    expect(generated.length).toBe(GRAMMAR_PROGRAMS)
  })

  it('never throws, and every diagnostic span lies inside the source', () => {
    const violations = collect(parseHDL, corpus)
    expect({ count: violations.length, first: firstViolation(violations) }).toEqual({ count: 0, first: null })
  })

  it('mutated inputs actually yield diagnostics (the span property is not vacuous)', () => {
    const random = corpus.filter((sample) => sample.label.includes('#m'))
    let randomDiagnostics = 0
    let unexpected = 0
    let unterminated = 0
    for (const sample of random) {
      const result = parseHDL(sample.source)
      if (result.success) continue
      randomDiagnostics += 1
      for (const error of result.errors) {
        if (error.message.includes('Unexpected character')) unexpected += 1
        if (error.message.includes('Unterminated block comment')) unterminated += 1
      }
    }
    const atSuffixes = corpus.filter((sample) => sample.label.endsWith('#at'))
    const unclosedSuffixes = corpus.filter((sample) => sample.label.endsWith('#unclosed'))
    let atHits = 0
    let unclosedHits = 0
    for (const sample of atSuffixes) {
      const result = parseHDL(sample.source)
      if (!result.success && result.errors.some((error) => error.message.includes('Unexpected character'))) atHits += 1
    }
    for (const sample of unclosedSuffixes) {
      const result = parseHDL(sample.source)
      if (!result.success && result.errors.some((error) => error.message.includes('Unterminated block comment'))) {
        unclosedHits += 1
      }
    }
    expect(random.length).toBeGreaterThan(500)
    expect(randomDiagnostics).toBeGreaterThan(MIN_RANDOM_DIAGNOSTICS)
    expect(unexpected).toBeGreaterThan(10)
    expect(unterminated).toBeGreaterThan(10)
    expect(atHits).toBe(atSuffixes.length)
    expect(unclosedHits).toBe(unclosedSuffixes.length)
    expect(atSuffixes.length).toBeGreaterThan(20)
  })

  it('rejects a parser whose span calculation is shifted out of range', () => {
    const violations = collect(withMutatedSpans, corpus)
    const onMutation = violations.filter((violation) => violation.kind === 'span' && violation.label.includes('#m'))
    expect(onMutation.length).toBeGreaterThan(0)
  })

  it('rejects a parser that throws when the unexpected-character guard is reverted', () => {
    const violations = collect(withRevertedUnexpectedGuard, corpus)
    const thrown = violations.filter((violation) => violation.kind === 'throw' && violation.label.includes('#m'))
    expect(thrown.length).toBeGreaterThan(0)
  })
})
