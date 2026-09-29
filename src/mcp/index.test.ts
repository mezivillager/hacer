// The built stdio server, spawned by plain node through the SDK's StdioClientTransport.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HDL_TOOL } from './server'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
const vector = (ext: 'hdl' | 'tst' | 'cmp'): string =>
  readFileSync(path.join(ROOT, 'conformance/vectors/01', `Xor.${ext}`), 'utf8')
// Spawning node and a handshake can outrun vitest's 5 s default on a loaded machine.
const SPAWN_TIMEOUT = 30_000

let work = ''
let client: Client

// The repo's own `build:cli`, redirected under node_modules/.tmp: the entry loads the SDK from the
// repo's node_modules, which a directory outside the repo could not resolve. Never touches dist/.
beforeAll(async () => {
  const tmp = path.join(ROOT, 'node_modules/.tmp')
  mkdirSync(tmp, { recursive: true })
  work = mkdtempSync(path.join(tmp, 'hacer-mcp-'))
  const [tool, ...args] = pkg.scripts['build:cli'].split(' ')
  expect(tool).toBe('vite')
  const vite = path.join(ROOT, 'node_modules/vite/bin/vite.js')
  const build = spawnSync(process.execPath, [vite, ...args, '--outDir', work, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  expect(build.status, build.stderr).toBe(0)
  client = new Client({ name: 'hacer-stdio-smoke', version: '0.1.0' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(work, 'mcp.js')], stderr: 'pipe' }))
}, 120_000)

afterAll(async () => {
  await client?.close()
  rmSync(work, { recursive: true, force: true })
})

describe('the stdio server', { timeout: SPAWN_TIMEOUT }, () => {
  it('serves hacer_hdl, which fails the empty Xor template', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name)).toEqual([HDL_TOOL])
    const result = await client.callTool({
      name: HDL_TOOL,
      arguments: { hdl: vector('hdl'), tst: vector('tst'), cmp: vector('cmp') },
    })
    expect(result.structuredContent).toMatchObject({
      status: 'fail',
      chip: 'Xor',
      failure: { row: 2, column: 'out', expected: '1', actual: '0' },
    })
  })
})

describe('.mcp.json', () => {
  it('starts that server with a repo-relative command: the mcp script builds it, then runs it', () => {
    const config = JSON.parse(readFileSync(path.join(ROOT, '.mcp.json'), 'utf8')) as {
      mcpServers: Record<string, { command: string; args: string[] }>
    }
    expect(config.mcpServers.hacer).toEqual({ command: 'pnpm', args: ['--silent', 'run', 'mcp'] })
    expect(pkg.scripts.mcp).toBe('pnpm --silent run build:cli >&2 && node dist/cli/mcp.js')
  })
})
