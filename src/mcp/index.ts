#!/usr/bin/env node
// The MCP stdio server. stdout is the protocol channel, so anything else goes to stderr.
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createServer } from './server'

serveStdio(createServer)
console.error('hacer MCP server on stdio')
