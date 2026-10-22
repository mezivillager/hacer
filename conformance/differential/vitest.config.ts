import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = path.resolve(import.meta.dirname, '../..')

// Its own config, so `pnpm run test:run` never collects it: `pnpm run test:differential` is the one way in.
export default defineConfig({
  root,
  resolve: { alias: { '@': path.join(root, 'src') } },
  test: {
    name: 'differential',
    environment: 'node',
    include: ['conformance/differential/**/*.test.ts'],
    globalSetup: ['conformance/differential/globalSetup.ts'],
    maxWorkers: 1,
    testTimeout: 30_000,
  },
})
