import path from 'node:path'
import { defineConfig } from 'vite'

// HACER's Node entries (ADR-0022), each one ESM file in `dist/cli` with the `@/` alias resolved so
// plain `node` runs it: the `hacer` bin (`index.js`) and the MCP stdio server (`mcp.js`). Packages
// stay external and load from node_modules. None of the app's plugins or public assets. `vite build`
// empties `dist/`, so run this after the app build (`pnpm run build:cli`), never before it.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  publicDir: false,
  build: {
    ssr: true,
    outDir: 'dist/cli',
    target: 'node22',
    rollupOptions: { input: { index: 'src/cli/index.ts', mcp: 'src/mcp/index.ts' } },
  },
})
