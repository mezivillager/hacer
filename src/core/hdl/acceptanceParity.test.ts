import { describe, expect, it } from 'vitest'
import corpusText from '../../../conformance/acceptance/hdl-shapes.json?raw'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { compileSpec } from '../spec/compileSpec'
import { parseSpec } from '../spec/parseSpec'
import { compileHDL } from './compiler'
import { parseHDL } from './parser'

type Verdict = 'accept' | 'grammar' | 'build'

interface Shape {
  id: string
  source: string
  verdict: Verdict
  message: string | null
  sha: string
  hdl: string
}

interface Cells {
  parseHDL: readonly string[] | null
  compileHDL: readonly string[] | null | 'unparsed'
  parseSpec: { doc: boolean; errors: readonly string[] }
  compileSpec: readonly string[] | null
}

type Reader = keyof Cells
// intended: a decision keeps it. inherited: a record names it and nothing decides it. open: a record proposes to change it.
type Kind = 'intended' | 'inherited' | 'open'
type Expected = Cells & { diverges?: Partial<Record<Reader, readonly [Kind, string]>> }

const REFERENCE_SHA = '91ef4285'
const RECORD = /^(ADR-\d{4} §\d+(\.\d+)*|R\d+|#\d+|FID-\d{3})$/
const corpus = JSON.parse(corpusText) as { sha: string; shapes: Shape[] }
const registry = getBuiltinChipRegistry()

const accepted: Cells = { parseHDL: null, compileHDL: null, parseSpec: { doc: true, errors: [] }, compileSpec: null }
// Every shape is one line: compileHDL puts a part's refusal on line 1, and compileSpec, which lowers without lines, on none.
const compileRefuses = (messages: string[]): Cells => ({ ...accepted, compileHDL: messages.map((message) => `Line 1: ${message}`), compileSpec: messages })
const cycleRefuses = (messages: string[]): Cells => ({ ...accepted, compileHDL: messages, compileSpec: messages })
const syntaxError = (messages: string[]): Cells => ({
  parseHDL: messages,
  compileHDL: 'unparsed',
  parseSpec: { doc: false, errors: messages.map(() => 'syntax') },
  compileSpec: messages,
})
const wireStatement = (parseHDLErrors: string[], invalidWire?: string): Cells => ({
  parseHDL: parseHDLErrors,
  compileHDL: 'unparsed',
  parseSpec: { doc: true, errors: invalidWire === undefined ? [] : ['invalid-wire'] },
  compileSpec: invalidWire === undefined ? null : [invalidWire],
})

const EXPECTED: Record<string, Expected> = {
  'part-output-fan-out': accepted,
  'internal-slice-write': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'internal-slice-read': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'part-reads-chip-out': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['inherited', 'ADR-0020 §1.11.5'] } },
  'part-output-to-literal': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" output "out" cannot connect to literal "true"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['p1.out is bound to true, but a part output cannot drive a constant'],
  },
  'one-part-writes-internal-twice': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "t" is driven by more than one part'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Signal "t" is driven by p1.out and p1.out'],
  },
  'two-parts-write-chip-out': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "o" is driven by more than one part'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Signal "o" is driven by p1.out and p2.out'],
  },
  'part-input-bound-twice': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" pin "in" bit 0 is bound by more than one connection'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['p1 pin "in" is bound by both "a" and "b"'],
  },
  'pin-slice-then-whole': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not16" pin "in" bit 0 is bound by more than one connection'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['p1 pin "in" is bound by both "a" and "b"'],
    diverges: { compileHDL: ['intended', 'R343'], compileSpec: ['intended', 'R343'] },
  },
  'pin-whole-then-slice': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not16" pin "in" bit 0 is bound by more than one connection'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['p1 pin "in" is bound by both "b" and "a"'],
  },
  'out-slice-then-whole': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "o" bit 0 is driven by more than one part'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Signal "o" has bits driven by both p1.out (net "o[0]") and p2.out (net "o")'],
    diverges: { compileHDL: ['intended', 'R343'], compileSpec: ['intended', 'R343'] },
  },
  'out-whole-then-slice': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "o" bit 0 is driven by more than one part'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Signal "o" has bits driven by both p1.out (net "o") and p2.out (net "o[0]")'],
  },
  'out-bits-from-two-parts': accepted,
  'literal-subscripted': {
    ...syntaxError(["Expected ')' but got '['"]),
    diverges: { parseHDL: ['inherited', '#725'], parseSpec: ['inherited', '#725'] },
  },
  'literal-capitalised': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "True" is read by part "And" but no part produces it'],
    parseSpec: { doc: true, errors: ['undriven'] },
    compileSpec: ['Signal "True" is read but nothing drives it'],
  },
  'literal-on-wide-pin': accepted,
  'unconnected-input': {
    ...compileRefuses(['Part "Nand" input pin "b" is not connected: the nand2tetris simulator reads it as 0; bind b=false to do the same']),
    diverges: { compileHDL: ['intended', 'ADR-0020 §1.1'], compileSpec: ['intended', 'ADR-0020 §1.1'] },
  },
  'undefined-internal-read': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "u" is read by part "Not" but no part produces it'],
    parseSpec: { doc: true, errors: ['undriven'] },
    compileSpec: ['Signal "u" is read but nothing drives it'],
  },
  'part-writes-chip-in': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out'],
  },
  'chip-out-never-written': accepted,
  'chip-in-whole-and-sliced': accepted,
  'self-part': compileRefuses(['Cannot use chip Not to implement itself']),
  'looping-wire': cycleRefuses(['Cyclic part dependency: parts cannot be topologically ordered (combinational cycle) through "t"']),
  'loop-across-parts': cycleRefuses(['Cyclic part dependency: parts cannot be topologically ordered (combinational cycle) through "v" → "u"']),
  'width-mismatch': compileRefuses(['Part "Not" pin "in" width 1 != signal "a" width 16']),
  'two-writers-of-internal': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "t" is driven by more than one part'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Signal "t" is driven by p1.out and p2.out'],
  },
  'internal-never-read': accepted,
  'overlapping-part-pin-slices': accepted,
  'tag-in-comment-spec': {
    parseHDL: null,
    compileHDL: null,
    parseSpec: { doc: false, errors: ['unknown-schema-version'] },
    compileSpec: ['"hacer-spec" at line 1 is not a "// hacer-spec <version>" header as the first thing in the file (after a BOM or blank lines); a tag anywhere else is refused, comments included'],
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.3'], compileSpec: ['intended', 'ADR-0020 §1.10.3'] },
  },
  'tag-in-comment-spec-upper': {
    parseHDL: null,
    compileHDL: null,
    parseSpec: { doc: false, errors: ['unknown-schema-version'] },
    compileSpec: ['"HACER-Spec" at line 1 is not a "// hacer-spec <version>" header as the first thing in the file (after a BOM or blank lines); a tag anywhere else is refused, comments included'],
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.3'], compileSpec: ['intended', 'ADR-0020 §1.10.3'] },
  },
  'tag-in-comment-sidecar': {
    parseHDL: null,
    compileHDL: null,
    parseSpec: { doc: false, errors: ['invalid-sidecar'] },
    compileSpec: ['"hacer-sidecar" at line 1 is not a /* hacer-sidecar */ block opening its own line at the end of the file'],
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.3'], compileSpec: ['intended', 'ADR-0020 §1.10.3'] },
  },
  'near-tag-specific': accepted,
  'near-tag-space': accepted,
  'near-tag-spanish': accepted,
  'part-id-invalid': accepted,
  'part-id-duplicate': accepted,
  'self-part-second': compileRefuses(['Cannot use chip Not to implement itself']),
  'unknown-part-before-self': {
    parseHDL: null,
    compileHDL: ['Line 1: Cannot use chip Not to implement itself'],
    parseSpec: { doc: true, errors: ['unknown-chip'] },
    compileSpec: ['Unknown chip "Foo"'],
    diverges: { compileHDL: ['inherited', '#740'] },
  },
  'self-part-alias-name': {
    parseHDL: null,
    compileHDL: ['Line 1: Cannot use chip XOr to implement itself'],
    parseSpec: { doc: true, errors: ['unknown-chip'] },
    compileSpec: ['Unknown chip "XOr"'],
    diverges: { compileSpec: ['intended', 'FID-008'] },
  },
  'builtin-alias': {
    parseHDL: null,
    compileHDL: ['Line 1: Unknown chip-part: "XOr"'],
    parseSpec: { doc: true, errors: ['unknown-chip'] },
    compileSpec: ['Unknown chip "XOr"'],
    diverges: { compileHDL: ['intended', 'FID-008'], compileSpec: ['intended', 'FID-008'] },
  },
  'part-name-wrong-case': {
    parseHDL: null,
    compileHDL: ['Line 1: Unknown chip-part: "not"'],
    parseSpec: { doc: true, errors: ['unknown-chip'] },
    compileSpec: ['Unknown chip "not"'],
  },
  'chip-name-lower-case': accepted,
  'self-part-not-builtin': {
    parseHDL: null,
    compileHDL: ['Line 1: Cannot use chip Foo to implement itself'],
    parseSpec: { doc: true, errors: ['unknown-chip'] },
    compileSpec: ['Unknown chip "Foo"'],
    diverges: { compileHDL: ['intended', 'ADR-0020 §1.11.4'] },
  },
  'writes-chip-in-graded': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Nand" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out'],
    diverges: { compileHDL: ['inherited', '#740'], compileSpec: ['inherited', '#740'] },
  },
  'writes-chip-in-whole': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out'],
  },
  'writes-chip-in-slice': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out'],
  },
  'writes-chip-in-part-slice': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not16" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out[0..1]'],
  },
  'writes-chip-in-second-binding': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out'],
  },
  'pin-named-like-chip-in': accepted,
  'internal-named-like-pin': accepted,
  'in-and-out-same-name': {
    parseHDL: null,
    compileHDL: ['Line 1: Part "Not" output "out" cannot write to chip input "a"'],
    parseSpec: { doc: true, errors: ['multiple-drivers'] },
    compileSpec: ['Chip input "a" is written by p1.out'],
    diverges: { compileHDL: ['inherited', '#740'], compileSpec: ['inherited', '#740'] },
  },
  'stub-not': accepted,
  'stub-mux16': accepted,
  'stub-dmux8way': accepted,
  'no-in-list': {
    ...syntaxError(["Expected 'IN' but got 'OUT'", "Expected 'IDENT' but got 'OUT'", "Expected ';' but got 'OUT'"]),
    diverges: { parseHDL: ['open', '#742'], parseSpec: ['open', '#742'], compileSpec: ['open', '#742'] },
  },
  'no-out-list': {
    ...syntaxError(["Expected 'OUT' but got 'PARTS'", "Expected 'IDENT' but got 'PARTS'", "Expected ';' but got 'PARTS'"]),
    diverges: { parseHDL: ['open', '#742'], parseSpec: ['open', '#742'], compileSpec: ['open', '#742'] },
  },
  'empty-in-list': syntaxError(["Expected 'IDENT' but got ';'"]),
  'underscore-in-names': {
    ...accepted,
    diverges: { parseHDL: ['inherited', '#722'], compileHDL: ['inherited', '#722'], parseSpec: ['inherited', '#722'], compileSpec: ['inherited', '#722'] },
  },
  'underscore-leading': {
    ...accepted,
    diverges: { parseHDL: ['inherited', '#722'], compileHDL: ['inherited', '#722'], parseSpec: ['inherited', '#722'], compileSpec: ['inherited', '#722'] },
  },
  'unicode-letters': {
    ...syntaxError(["Unexpected character 'Ñ'"]),
    diverges: { parseHDL: ['inherited', '#732'], parseSpec: ['inherited', '#732'], compileSpec: ['inherited', '#732'] },
  },
  'buffer-named-like-chip': compileRefuses(['Cannot use chip Or to implement itself']),
  'buffer-named-like-chip-wire': {
    ...wireStatement(["Expected '(' but got 'copy'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'literal-capitalised-internal': accepted,
  'literal-inputs': accepted,
  'w1-read-bit-0': accepted,
  'w1-read-bit-1': compileRefuses(['Part "Not" pin "in" is wired to "a[1]": sub-bus index out of range ("a" has width 1)']),
  'w1-write-bit-0': accepted,
  'w1-write-bit-1': compileRefuses(['Part "Not" pin "out" is wired to "o[1]": sub-bus index out of range ("o" has width 1)']),
  'w1-read-range-0-0': accepted,
  'w1-write-range-0-0': accepted,
  'w1-read-range-1-1': compileRefuses(['Part "Not16" pin "in[0]" is wired to "a[1]": sub-bus index out of range ("a" has width 1)']),
  'w1-write-range-1-1': compileRefuses(['Part "Not16" pin "out[0]" is wired to "o[1]": sub-bus index out of range ("o" has width 1)']),
  'w1-read-range-0-1': compileRefuses(['Part "Not16" pin "in[0..1]" is wired to "a[0..1]": sub-bus index out of range ("a" has width 1)']),
  'w1-write-range-0-1': compileRefuses(['Part "Not16" pin "out[0..1]" is wired to "o[0..1]": sub-bus index out of range ("o" has width 1)']),
  'w1-wire-whole': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w1-wire-last-bit': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w1-wire-target-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[1] = a[0]: sub-bus index out of range ("o" has width 1)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w1-wire-source-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[0] = a[1]: sub-bus index out of range ("a" has width 1)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w1-wire-range-above-zero': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w1-wire-range-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[1] = a[0]: sub-bus index out of range ("o" has width 1)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w2-read-bit-1': accepted,
  'w2-read-bit-2': compileRefuses(['Part "Not" pin "in" is wired to "a[2]": sub-bus index out of range ("a" has width 2)']),
  'w2-write-bit-1': accepted,
  'w2-write-bit-2': compileRefuses(['Part "Not" pin "out" is wired to "o[2]": sub-bus index out of range ("o" has width 2)']),
  'w2-read-range-0-1': accepted,
  'w2-write-range-0-1': accepted,
  'w2-read-range-1-2': compileRefuses(['Part "Not16" pin "in[0..1]" is wired to "a[1..2]": sub-bus index out of range ("a" has width 2)']),
  'w2-write-range-1-2': compileRefuses(['Part "Not16" pin "out[0..1]" is wired to "o[1..2]": sub-bus index out of range ("o" has width 2)']),
  'w2-read-range-2-2': compileRefuses(['Part "Not16" pin "in[0]" is wired to "a[2]": sub-bus index out of range ("a" has width 2)']),
  'w2-write-range-2-2': compileRefuses(['Part "Not16" pin "out[0]" is wired to "o[2]": sub-bus index out of range ("o" has width 2)']),
  'w2-wire-whole': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w2-wire-last-bit': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w2-wire-target-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[2] = a[0]: sub-bus index out of range ("o" has width 2)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w2-wire-source-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[0] = a[2]: sub-bus index out of range ("a" has width 2)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w2-wire-range-above-zero': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w2-wire-range-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[1..2] = a[0..1]: sub-bus index out of range ("o" has width 2)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w4-read-bit-3': accepted,
  'w4-read-bit-4': compileRefuses(['Part "Not" pin "in" is wired to "a[4]": sub-bus index out of range ("a" has width 4)']),
  'w4-write-bit-3': accepted,
  'w4-write-bit-4': compileRefuses(['Part "Not" pin "out" is wired to "o[4]": sub-bus index out of range ("o" has width 4)']),
  'w4-read-range-0-3': accepted,
  'w4-write-range-0-3': accepted,
  'w4-read-range-1-4': compileRefuses(['Part "Not16" pin "in[0..3]" is wired to "a[1..4]": sub-bus index out of range ("a" has width 4)']),
  'w4-write-range-1-4': compileRefuses(['Part "Not16" pin "out[0..3]" is wired to "o[1..4]": sub-bus index out of range ("o" has width 4)']),
  'w4-read-range-3-4': compileRefuses(['Part "Not16" pin "in[0..1]" is wired to "a[3..4]": sub-bus index out of range ("a" has width 4)']),
  'w4-write-range-3-4': compileRefuses(['Part "Not16" pin "out[0..1]" is wired to "o[3..4]": sub-bus index out of range ("o" has width 4)']),
  'w4-read-range-4-4': compileRefuses(['Part "Not16" pin "in[0]" is wired to "a[4]": sub-bus index out of range ("a" has width 4)']),
  'w4-write-range-4-4': compileRefuses(['Part "Not16" pin "out[0]" is wired to "o[4]": sub-bus index out of range ("o" has width 4)']),
  'w4-wire-whole': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w4-wire-last-bit': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w4-wire-target-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[4] = a[0]: sub-bus index out of range ("o" has width 4)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w4-wire-source-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[0] = a[4]: sub-bus index out of range ("a" has width 4)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w4-wire-range-above-zero': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w4-wire-range-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[1..4] = a[0..3]: sub-bus index out of range ("o" has width 4)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w8-read-bit-7': accepted,
  'w8-read-bit-8': compileRefuses(['Part "Not" pin "in" is wired to "a[8]": sub-bus index out of range ("a" has width 8)']),
  'w8-write-bit-7': accepted,
  'w8-write-bit-8': compileRefuses(['Part "Not" pin "out" is wired to "o[8]": sub-bus index out of range ("o" has width 8)']),
  'w8-read-range-0-7': accepted,
  'w8-write-range-0-7': accepted,
  'w8-read-range-1-8': compileRefuses(['Part "Not16" pin "in[0..7]" is wired to "a[1..8]": sub-bus index out of range ("a" has width 8)']),
  'w8-write-range-1-8': compileRefuses(['Part "Not16" pin "out[0..7]" is wired to "o[1..8]": sub-bus index out of range ("o" has width 8)']),
  'w8-read-range-7-8': compileRefuses(['Part "Not16" pin "in[0..1]" is wired to "a[7..8]": sub-bus index out of range ("a" has width 8)']),
  'w8-write-range-7-8': compileRefuses(['Part "Not16" pin "out[0..1]" is wired to "o[7..8]": sub-bus index out of range ("o" has width 8)']),
  'w8-read-range-8-8': compileRefuses(['Part "Not16" pin "in[0]" is wired to "a[8]": sub-bus index out of range ("a" has width 8)']),
  'w8-write-range-8-8': compileRefuses(['Part "Not16" pin "out[0]" is wired to "o[8]": sub-bus index out of range ("o" has width 8)']),
  'w8-wire-whole': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w8-wire-last-bit': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w8-wire-target-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[8] = a[0]: sub-bus index out of range ("o" has width 8)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w8-wire-source-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[0] = a[8]: sub-bus index out of range ("a" has width 8)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w8-wire-range-above-zero': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w8-wire-range-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[1..8] = a[0..7]: sub-bus index out of range ("o" has width 8)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w16-read-bit-15': accepted,
  'w16-read-bit-16': compileRefuses(['Part "Not" pin "in" is wired to "a[16]": sub-bus index out of range ("a" has width 16)']),
  'w16-write-bit-15': accepted,
  'w16-write-bit-16': compileRefuses(['Part "Not" pin "out" is wired to "o[16]": sub-bus index out of range ("o" has width 16)']),
  'w16-read-range-0-15': accepted,
  'w16-write-range-0-15': accepted,
  'w16-read-range-1-16': compileRefuses(['Part "Not16" pin "in" is wired to "a[1..16]": sub-bus index out of range ("a" has width 16)']),
  'w16-write-range-1-16': compileRefuses(['Part "Not16" pin "out" is wired to "o[1..16]": sub-bus index out of range ("o" has width 16)']),
  'w16-read-range-15-16': compileRefuses(['Part "Not16" pin "in[0..1]" is wired to "a[15..16]": sub-bus index out of range ("a" has width 16)']),
  'w16-write-range-15-16': compileRefuses(['Part "Not16" pin "out[0..1]" is wired to "o[15..16]": sub-bus index out of range ("o" has width 16)']),
  'w16-read-range-16-16': compileRefuses(['Part "Not16" pin "in[0]" is wired to "a[16]": sub-bus index out of range ("a" has width 16)']),
  'w16-write-range-16-16': compileRefuses(['Part "Not16" pin "out[0]" is wired to "o[16]": sub-bus index out of range ("o" has width 16)']),
  'w16-wire-whole': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w16-wire-last-bit': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w16-wire-target-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[16] = a[0]: sub-bus index out of range ("o" has width 16)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w16-wire-source-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[0] = a[16]: sub-bus index out of range ("a" has width 16)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w16-wire-range-above-zero': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'w16-wire-range-past-end': {
    ...wireStatement(["Expected '(' but got 'o'", "Expected ')' but got ';'"], 'wire o[1..16] = a[0..15]: sub-bus index out of range ("o" has width 16)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'both-sliced-external-past-end': compileRefuses(['Part "Not16" pin "in[0]" is wired to "a[8]": sub-bus index out of range ("a" has width 8)']),
  'both-sliced-pin-past-end': {
    ...compileRefuses(['Part "Not16" pin "in[16]" is out of range; "in" has width 16', 'Part "Not16" input pin "in" is not connected: the nand2tetris simulator reads it as 0; bind in=false to do the same']),
    diverges: { compileHDL: ['open', 'FID-025'], compileSpec: ['open', 'FID-025'] },
  },
  'pin-slice-past-end-1-bit': {
    ...compileRefuses(['Part "Not" pin "in[1]" is out of range; "in" has width 1', 'Part "Not" input pin "in" is not connected: the nand2tetris simulator reads it as 0; bind in=false to do the same']),
    diverges: { compileHDL: ['open', 'FID-025'], compileSpec: ['open', 'FID-025'] },
  },
  'pin-slice-past-end-2-bit': compileRefuses(['Part "Mux4Way16" pin "sel[2]" is out of range; "sel" has width 2']),
  'pin-slice-past-end-output': compileRefuses(['Part "Not16" pin "out[16]" is out of range; "out" has width 16']),
  'one-bit-in-as-range': accepted,
  'one-bit-in-as-bit': accepted,
  'literal-on-sliced-pin': accepted,
  'internal-whole-bit-15': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'internal-whole-bit-16': {
    ...compileRefuses(['Part "Not" pin "in" is wired to "t[16]": sub-bus index out of range ("t" has width 16)']),
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] },
  },
  'internal-nib-bit-3': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'internal-nib-bit-4': {
    ...compileRefuses(['Part "Not" pin "in" is wired to "nib[4]": sub-bus index out of range ("nib" has width 4)']),
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] },
  },
  'internal-nib-range-0-3': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'internal-nib-range-1-4': {
    ...compileRefuses(['Part "Not16" pin "in[0..3]" is wired to "nib[1..4]": sub-bus index out of range ("nib" has width 4)']),
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] },
  },
  'internal-slice-only-bit-1': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'internal-slice-only-bit-2': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "t" bit 2 is read by part "Not" but no part drives it'],
    parseSpec: { doc: true, errors: ['undriven'] },
    compileSpec: ['Signal "t[2]" is read but nothing drives it'],
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] },
  },
  'internal-slice-only-bit-5': {
    parseHDL: null,
    compileHDL: ['Line 1: Signal "t" bit 5 is read by part "Not" but no part drives it'],
    parseSpec: { doc: true, errors: ['undriven'] },
    compileSpec: ['Signal "t[5]" is read but nothing drives it'],
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] },
  },
  'internal-slices-read-whole': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'chip-out-read-bit': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['inherited', 'ADR-0020 §1.11.5'] } },
  'chip-out-read-past-end': {
    ...compileRefuses(['Part "Not" pin "in" is wired to "o[2]": sub-bus index out of range ("o" has width 2)']),
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['inherited', 'ADR-0020 §1.11.5'] },
  },
  'wire-from-chip-out': {
    ...wireStatement(["Expected '(' but got 'o2'", "Expected ')' but got ';'"]),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'], compileSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'wire-from-chip-out-past-end': {
    ...wireStatement(["Expected '(' but got 'o2'", "Expected ')' but got ';'"], 'wire o2 = o1[2]: sub-bus index out of range ("o1" has width 2)'),
    diverges: { parseSpec: ['intended', 'ADR-0020 §1.10.6'] },
  },
  'or8way-control': accepted,
  'or8way-reads-in-8': compileRefuses(['Part "Or" pin "b" is wired to "in[8]": sub-bus index out of range ("in" has width 8)']),
  'or8way-reads-chip-out': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['inherited', 'ADR-0020 §1.11.5'] } },
  'or8way-internal-subscript': { ...accepted, diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['intended', '#355'] } },
  'or8way-reads-chip-out-past-end': {
    ...compileRefuses(['Part "Not" pin "in" is wired to "out[1]": sub-bus index out of range ("out" has width 1)']),
    diverges: { compileHDL: ['open', 'FID-021'], compileSpec: ['inherited', 'ADR-0020 §1.11.5'] },
  },
}

function read(hdl: string): Cells {
  const parsed = parseHDL(hdl)
  const compiled = parsed.success ? compileHDL(parsed.chip, registry) : null
  const spec = parseSpec(hdl)
  const run = compileSpec(spec, registry)
  return {
    parseHDL: parsed.success ? null : parsed.errors.map((e) => e.message),
    compileHDL: compiled === null ? 'unparsed' : compiled.success ? null : compiled.errors.map((e) => e.message),
    parseSpec: { doc: spec.doc !== null, errors: spec.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code) },
    compileSpec: run.success ? null : run.diagnostics.map((d) => d.message),
  }
}

const cellsOf = ({ parseHDL, compileHDL, parseSpec, compileSpec }: Expected): Cells => ({ parseHDL, compileHDL, parseSpec, compileSpec })

/** Each reader against the reference at its own stage: the parsers against the grammar, the compilers against the builder. */
const AGREES: Record<Reader, (cells: Cells, shape: Shape) => boolean> = {
  parseHDL: (cells, shape) => (cells.parseHDL === null) === (shape.verdict !== 'grammar'),
  compileHDL: (cells, shape) => cells.compileHDL === 'unparsed' || (cells.compileHDL === null) === (shape.verdict === 'accept'),
  parseSpec: (cells, shape) => cells.parseSpec.doc === (shape.verdict !== 'grammar'),
  compileSpec: (cells, shape) => (cells.compileSpec === null) === (shape.verdict === 'accept'),
}

const refuses = (cells: Cells, reader: Reader): boolean =>
  reader === 'parseSpec' ? !cells.parseSpec.doc : cells[reader] !== null && cells[reader] !== 'unparsed'

describe('conformance/acceptance/hdl-shapes.json', () => {
  it('records each shape once, at the pinned web-ide SHA, with a message exactly when the reference refuses it', () => {
    expect(corpus.sha).toBe(REFERENCE_SHA)
    expect(new Set(corpus.shapes.map((s) => s.id)).size).toBe(corpus.shapes.length)
    for (const shape of corpus.shapes) {
      expect(shape.sha, shape.id).toBe(REFERENCE_SHA)
      expect(['accept', 'grammar', 'build'], shape.id).toContain(shape.verdict)
      expect(shape.message === null, shape.id).toBe(shape.verdict === 'accept')
    }
  })

  it('has an expectation for every shape, and a shape for every expectation', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(corpus.shapes.map((s) => s.id).sort())
  })
})

describe.each(corpus.shapes)('$id', (shape) => {
  const expected = EXPECTED[shape.id] ?? accepted

  it('gives the verdict and messages recorded for each reader', () => {
    expect(read(shape.hdl)).toEqual(cellsOf(expected))
  })

  it('names a kind and a record for every cell that diverges from the reference, and for no other', () => {
    for (const reader of Object.keys(AGREES) as Reader[]) {
      const divergence = expected.diverges?.[reader]
      if (!AGREES[reader](expected, shape)) expect(divergence, `${reader} differs from the reference's ${shape.verdict}`).toBeDefined()
      // A refusal for a different cause than the reference's is the one agreeing cell that carries a record.
      else if (divergence !== undefined) expect(refuses(expected, reader) && shape.verdict !== 'accept', `${reader} agrees, so its record is stale`).toBe(true)
      if (divergence === undefined) continue
      expect(['intended', 'inherited', 'open']).toContain(divergence[0])
      expect(divergence[1]).toMatch(RECORD)
    }
  })
})
