import { describe, it, expect } from 'vitest'
import ts from 'typescript'

// A store test builds a junction through the app's own actions (`@/test/junctionFixtures`), never by
// writing its `wireIds`: a fix proven on a shape no action writes says nothing about the app's documents.

interface JunctionWrite {
  line: number
  text: string
}

const MUTATORS = new Set(['push', 'unshift', 'splice'])

const isWireIdsName = (name: ts.Node): boolean =>
  (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === 'wireIds'

const isWireIdsAccess = (node: ts.Node): boolean =>
  (ts.isPropertyAccessExpression(node) && node.name.text === 'wireIds') ||
  (ts.isElementAccessExpression(node) &&
    ts.isStringLiteral(node.argumentExpression) &&
    node.argumentExpression.text === 'wireIds')

/** Every object-literal `wireIds` key, assignment to `.wireIds`, and in-place mutation of it in `source`. */
function findJunctionWrites(fileName: string, source: string): JunctionWrite[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const writes: JunctionWrite[] = []
  const record = (node: ts.Node) => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
    writes.push({ line: line + 1, text: node.getText(file).split('\n')[0].trim() })
  }
  const visit = (node: ts.Node) => {
    if (
      (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) &&
      ts.isObjectLiteralExpression(node.parent) &&
      isWireIdsName(node.name)
    ) {
      record(node)
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isWireIdsAccess(node.left)
    ) {
      record(node)
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      MUTATORS.has(node.expression.name.text) &&
      isWireIdsAccess(node.expression.expression)
    ) {
      record(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return writes
}

// Exact site counts. Only for a junction entry of a document the test loads through the deserializer,
// or a test of the type itself; a junction written into store state by hand migrates instead.
const ALLOWED: Record<string, { sites: number; reason: string }> = {
  'src/store/types.test.ts': {
    sites: 1,
    reason: 'A type-shape test: it builds a JunctionNode value to check the type itself and runs no store action.',
  },
  'src/store/actions/persistenceActions/persistenceActions.test.ts': {
    sites: 1,
    reason: 'A saved document fed to loadCircuit: the serialised junctions (left dangling by gates that cannot load) are the input under test.',
  },
  'src/store/actions/signalActions/signalActions.test.ts': {
    sites: 1,
    reason:
      'junctionRecord, the junction entry of the saved documents this file loads through importCircuitJSON: removeJunction ' +
      'on imported documents (#377), whose branches end at the junction and whose wireIds come in any order.',
  },
  'src/store/actions/simulationActions/simulationActions.test.ts': {
    sites: 3,
    reason:
      'Junction entries of saved documents loaded through importCircuitJSON: getSignalSourceValue on a wire id with no wire ' +
      'and on a junction cycle, which only an imported document carries.',
  },
}

const STORE_TESTS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('./**/*.test.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ).map(([key, source]) => [`src/store/${key.slice(2)}`, source]),
)

describe('findJunctionWrites', () => {
  it('finds a wireIds key, an assignment and a mutation, and nothing else', () => {
    const source = [
      "const j = { id: 'j1', wireIds: ['w1'] }",
      'const k = { wireIds }',
      "j.wireIds = ['w2']",
      "j['wireIds'] = []",
      "j.wireIds.push('w3')",
      'function attach(junctionId: string, wireIds: string[]) {}',
      'type T = { wireIds: string[] }',
      '// { wireIds: [] }',
      "const s = '{ wireIds: [] }'",
      'expect(j.wireIds).toEqual([])',
      "const ids = j.wireIds.slice(1)",
    ].join('\n')

    expect(findJunctionWrites('sample.ts', source).map((w) => w.line)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('store tests build junctions through the store actions', () => {
  it('scans the store test files', () => {
    expect(Object.keys(STORE_TESTS).length).toBeGreaterThan(20)
    expect(STORE_TESTS).toHaveProperty(['src/store/actions/signalActions/signalActions.test.ts'])
  })

  it('no store test writes a junction wireIds outside the allow-list', () => {
    const offences: string[] = []
    for (const [file, source] of Object.entries(STORE_TESTS)) {
      const writes = findJunctionWrites(file, source)
      const allowed = ALLOWED[file]?.sites ?? 0
      if (writes.length !== allowed) {
        offences.push(
          `${file}: ${writes.length} hand-written junction site(s), allow-list says ${allowed}\n` +
            writes.map((w) => `  ${file}:${w.line}  ${w.text}`).join('\n'),
        )
      }
    }
    expect(
      offences,
      'Build the junction with placeJunction/drawBranch from @/test/junctionFixtures. ' +
        'A listed file whose count fell needs its ALLOWED entry lowered.',
    ).toEqual([])
  })

  it('every allow-list entry names a store test file and a reason', () => {
    for (const [file, entry] of Object.entries(ALLOWED)) {
      expect(STORE_TESTS, file).toHaveProperty([file])
      expect(entry.reason.length, file).toBeGreaterThan(20)
    }
  })
})
