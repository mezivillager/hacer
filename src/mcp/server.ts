/**
 * HACER's MCP server: one read-only tool, `hacer_hdl`, on the same engine path as `hacer test`.
 * Hand-written and disposable: the tool surface is to be generated from the command registry
 * (ADR-0020 §4). The factory serves stdio (`./index.ts`) and in-process HTTP alike, so the tool
 * takes the files' text rather than paths.
 */
import { fromJsonSchema, McpServer } from '@modelcontextprotocol/server'
import { testChip, type TestReport } from '@/core'

export const HDL_TOOL = 'hacer_hdl'

type HdlSources = { hdl: string; tst: string; cmp: string }

const text = (description: string) => ({ type: 'string', description }) as const
const nullable = (schema: object) => ({ anyOf: [{ type: 'null' }, schema] })

const input = fromJsonSchema<HdlSources>({
  type: 'object',
  properties: {
    hdl: text('The .hdl source. The chip it defines is the one tested; its parts resolve to the Project 1 builtins.'),
    tst: text("The .tst script. Its `load` must name the .hdl's chip."),
    cmp: text("The .cmp the script's output rows are compared with."),
  },
  required: ['hdl', 'tst', 'cmp'],
  additionalProperties: false,
})

const output = fromJsonSchema<TestReport>({
  type: 'object',
  properties: {
    status: { enum: ['pass', 'fail', 'error'] },
    chip: { type: ['string', 'null'], description: 'The chip the .hdl defines; null when it did not parse.' },
    rows: nullable({
      type: 'object',
      description: '.cmp rows matched before the run stopped, of how many.',
      properties: { passed: { type: 'integer' }, expected: { type: 'integer' } },
      required: ['passed', 'expected'],
    }),
    failure: nullable({
      type: 'object',
      description: "The first mismatch; `row` counts the .cmp's data rows from 1.",
      properties: { row: { type: 'integer' }, column: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' } },
      required: ['row', 'column', 'expected', 'actual'],
    }),
    error: { type: ['string', 'null'], description: 'Why the test could not run: a parse error, or a refused BUILTIN.' },
  },
  required: ['status', 'chip', 'rows', 'failure', 'error'],
})

export function createServer(): McpServer {
  const server = new McpServer({ name: 'hacer', version: '0.1.0' })
  server.registerTool(
    HDL_TOOL,
    {
      title: 'Test an HDL chip',
      description:
        'Load a nand2tetris .hdl, run its .tst on the chip it defines, and compare the output with the .cmp. ' +
        'The chip under test is always the .hdl\'s own, never a builtin of the same name, so an empty template ' +
        'fails; only a primitive such as Nand may be BUILTIN. Returns pass, fail with the first mismatching row, ' +
        'or error. Nothing is written or kept.',
      inputSchema: input,
      outputSchema: output,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ hdl, tst, cmp }) => {
      const report = testChip({ path: 'hdl', source: hdl }, { path: 'tst', source: tst }, { path: 'cmp', source: cmp })
      return { content: [{ type: 'text', text: JSON.stringify(report) }], structuredContent: report }
    },
  )
  return server
}
