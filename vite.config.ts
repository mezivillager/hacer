import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { configDefaults, defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import path from 'path'

const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}

// ── Vitest projects ────────────────────────────────────────────────────────────────────────────
// Every test file belongs to exactly one project: `node` (no browser environment, no setup file)
// or `jsdom` (today's environment and setup). See docs/testing/vitest-projects.md.
// #313: `.mts`/`.js` test files anywhere in `src/` were collected by neither project (verified
// with throwaway files) — this glob only matched `.ts`/`.tsx`, so such a file would silently
// never run. Widening it here is a full fix for `.js`; `.mts` in a NODE_TEST_DIR still lands in
// `jsdom` rather than `node` (the node-project regex below stays `.ts`/`.mjs` only, since
// widening it too needs a `.mts` vs `.mtsx`-shaped rule this repo has no example of yet) — run,
// just not in the strictest project, which is still strictly better than not run at all.
const ALL_TESTS = ['src/**/*.{test,spec}.{ts,tsx,mts,js}', 'scripts/**/*.{test,spec}.mjs']

// Membership is by directory: the layers that must stay headless — pure logic, state, and the
// repo's own tooling — plus the `.ts`/`.mjs` extension rule (a `.tsx` test renders JSX, so it
// belongs with a DOM). A new test file under one of these joins `node` with no config change,
// and fails loudly if it reaches for `window`, `document` or `localStorage`. That is the point.
const NODE_TEST_DIRS = ['src/core', 'src/simulation', 'src/store', 'src/utils', 'src/lib', 'scripts']
const NODE_TEST_FILE = /\.(test|spec)\.(ts|mjs)$/

// The exceptions: files in those directories that still need a DOM. Measured 2026-09-21 (#323) —
// each fails under `node` with `ReferenceError: localStorage is not defined`. They stay in `jsdom`
// until the persistence they exercise reaches `localStorage` through a port instead of directly.
const NEEDS_DOM = [
  'src/core/testing/chipCompletion.test.ts', // localStorage: completed-chip persistence
  'src/lib/performanceModeStorage.test.ts', // localStorage: the performance-mode preference itself
  'src/store/circuitStore.autosave.test.ts', // localStorage: autosave slot round-trip
  'src/store/actions/persistenceActions/autosave.test.ts', // localStorage: debounced autosave writes
  'src/store/actions/persistenceActions/persistenceActions.test.ts', // localStorage + Blob/document: save, load, export
  'src/store/actions/testActions/testActions.test.ts', // localStorage: marks a chip completed on a passing run
  'src/store/actions/viewActions/viewActions.test.ts', // localStorage: persists the performance mode
]

for (const file of NEEDS_DOM) {
  if (!existsSync(path.join(__dirname, file))) {
    throw new Error(`vite.config.ts: NEEDS_DOM lists a file that does not exist: ${file}`)
  }
}

// Resolved from disk at config load so the two projects are exact complements — `jsdom` excludes
// precisely what `node` runs, so no test file can land in both projects or in neither.
const nodeTestFiles = NODE_TEST_DIRS.flatMap((dir) =>
  readdirSync(path.join(__dirname, dir), { recursive: true, encoding: 'utf-8' })
    .map((entry) => `${dir}/${entry.split(path.sep).join('/')}`)
    .filter((file) => NODE_TEST_FILE.test(file) && !NEEDS_DOM.includes(file)),
)

// An empty `include` falls back to Vitest's default glob, which would hand every test file to the
// `node` project — fail here instead, where the cause is obvious.
if (nodeTestFiles.length === 0) {
  throw new Error(`vite.config.ts: no test files found under ${NODE_TEST_DIRS.join(', ')}`)
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    __BUILD_APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    tailwindcss(),
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
    // `include` lives on each project, never here: `extends: true` concatenates arrays, so a root
    // `include` would be merged back into the `node` project and hand it every test file again.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          // No setup file on purpose: src/test/setup.ts polyfills the DOM, and a `node` test that
          // needs a polyfill has stopped being headless. Such a file joins NEEDS_DOM instead.
          setupFiles: [],
          include: nodeTestFiles,
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: './src/test/setup.ts',
          include: ALL_TESTS,
          exclude: [...configDefaults.exclude, ...nodeTestFiles],
        },
      },
    ],
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
