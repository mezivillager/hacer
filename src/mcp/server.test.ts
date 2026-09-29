// `hacer_hdl` through a real MCP Client, in-process: the handler serves every request, no socket.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { project1HdlSources, testChip } from '@/core'
import { connectInProcess, type InProcessClient } from './inProcessClient'
import { HDL_TOOL } from './server'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const vector = (chip: string, ext: 'hdl' | 'tst' | 'cmp'): string =>
  readFileSync(path.join(ROOT, 'conformance/vectors/01', `${chip}.${ext}`), 'utf8')
const xor = { hdl: vector('Xor', 'hdl'), tst: vector('Xor', 'tst'), cmp: vector('Xor', 'cmp') }

let mcp: InProcessClient

beforeAll(async () => {
  mcp = await connectInProcess()
})

afterAll(async () => {
  await mcp.close()
})

const call = (args: Record<string, string>) => mcp.client.callTool({ name: HDL_TOOL, arguments: args })

describe('hacer_hdl over an in-process client', () => {
  it('is the one tool, and it is read-only', async () => {
    const { tools } = await mcp.client.listTools()
    expect(tools.map((tool) => tool.name)).toEqual([HDL_TOOL])
    const [tool] = tools
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, idempotentHint: true, openWorldHint: false })
    expect(tool.inputSchema.required).toEqual(['hdl', 'tst', 'cmp'])
    expect(tool.outputSchema?.required).toEqual(['status', 'chip', 'rows', 'failure', 'error'])
  })

  it('fails the empty Xor template: its builtin namesake never stands in', async () => {
    const result = await call(xor)
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toMatchObject({
      status: 'fail',
      chip: 'Xor',
      failure: { row: 2, column: 'out', expected: '1', actual: '0' },
    })
  })

  it('gives the verdict the engine path gives, as structured output and as JSON text', async () => {
    const report = testChip({ path: 'hdl', source: xor.hdl }, { path: 'tst', source: xor.tst }, { path: 'cmp', source: xor.cmp })
    const result = await call(xor)
    expect(result.structuredContent).toEqual(report)
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(report) }])
  })

  it('passes a correct Xor', async () => {
    const result = await call({ ...xor, hdl: project1HdlSources.Xor })
    expect(result.structuredContent).toEqual({
      status: 'pass',
      chip: 'Xor',
      rows: { passed: 4, expected: 4 },
      failure: null,
      error: null,
    })
  })

  it('refuses a BUILTIN stand-in for the chip under test', async () => {
    const result = await call({ ...xor, hdl: 'CHIP Xor { IN a, b; OUT out; PARTS: BUILTIN Xor; }' })
    expect(result.structuredContent).toMatchObject({ status: 'error', chip: 'Xor', rows: null })
    expect((result.structuredContent as { error: string }).error).toMatch(/^BUILTIN Xor in Xor: /)
  })

  it('names the argument a parse error is in', async () => {
    const result = await call({ ...xor, tst: 'load Xor.hdl, bogus;' })
    expect(result.structuredContent).toMatchObject({ status: 'error', chip: 'Xor' })
    expect((result.structuredContent as { error: string }).error).toMatch(/^tst:1:/)
  })

  it('answers a call missing an argument with an error result, not a throw', async () => {
    const result = await call({ hdl: xor.hdl, tst: xor.tst })
    expect(result.isError).toBe(true)
  })
})

describe('the MCP sources', () => {
  const dir = fileURLToPath(new URL('.', import.meta.url))
  const sources = readdirSync(dir).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  const specifiers = sources.flatMap((file) =>
    [...readFileSync(path.join(dir, file), 'utf8').matchAll(/\bfrom\s+'([^']+)'/g)].map((match) => match[1]),
  )
  const allowed = (specifier: string): boolean =>
    specifier === '@/core' || /^(\.\/|node:|@modelcontextprotocol\/)/.test(specifier)

  it('import the engine through @/core only, never the store or anything else of src/', () => {
    expect(sources).toEqual(expect.arrayContaining(['index.ts', 'server.ts']))
    expect(specifiers).toContain('@/core')
    expect(specifiers.filter((specifier) => !allowed(specifier))).toEqual([])
  })
})
