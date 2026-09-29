import path from 'node:path'
import { defineConfig } from 'vite'

// The `hacer` CLI: one Node ESM file, `dist/cli/index.js`, with the `@/` alias resolved so plain
// `node` runs it. None of the app's plugins or public assets. `vite build` empties `dist/`, so run
// this after the app build (`pnpm run build:cli`), never before it.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  publicDir: false,
  build: { ssr: 'src/cli/index.ts', outDir: 'dist/cli', target: 'node22' },
})
