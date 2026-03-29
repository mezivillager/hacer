import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'path'

const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    __BUILD_APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@gates': path.resolve(__dirname, './src/gates'),
      '@store': path.resolve(__dirname, './src/store'),
      '@simulation': path.resolve(__dirname, './src/simulation'),
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'e2e/',
      ],
    },
  },
})
