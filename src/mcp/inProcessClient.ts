/**
 * A real MCP `Client` connected to `createServer` in-process: `createMcpHandler` serves every
 * request through `handler.fetch`, so nothing listens on a port and the URL is never dialled.
 */
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { createServer } from './server'

export interface InProcessClient {
  client: Client
  /** The client first, then the handler, which aborts any call still in flight. */
  close: () => Promise<void>
}

export async function connectInProcess(): Promise<InProcessClient> {
  const handler = createMcpHandler(createServer)
  const transport = new StreamableHTTPClientTransport(new URL('http://hacer.invalid/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  })
  const client = new Client({ name: 'hacer-in-process', version: '0.1.0' }, { versionNegotiation: { mode: 'auto' } })
  await client.connect(transport)
  return {
    client,
    close: async () => {
      await client.close()
      await handler.close()
    },
  }
}
