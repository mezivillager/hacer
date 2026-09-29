import { McpServer } from '@modelcontextprotocol/server'

export const HDL_TOOL = 'hacer_hdl'

export function createServer(): McpServer {
  return new McpServer({ name: 'hacer', version: '0.1.0' })
}
