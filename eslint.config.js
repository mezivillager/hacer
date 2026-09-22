import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactCompiler from 'eslint-plugin-react-compiler'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/** Browser-only globals the engine layer (src/core, src/simulation) may not touch (#329). */
const ENGINE_FORBIDDEN_GLOBALS = [
  'window', 'document', 'localStorage', 'sessionStorage', 'navigator',
  'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame',
  'getComputedStyle', 'matchMedia', 'history', 'location',
]

export default defineConfig([
  globalIgnores([
    'dist',
    'test-results',
    'playwright-report',
    'coverage',
    'design-system/**',
    '.cursor/**', // Vendored ECC / IDE harness — not application source
    '.worktrees/**', // Sibling git worktrees — they lint themselves on their own branches
    '.claude/worktrees/**', // Legacy worktree location — same rationale
    'scripts/fixtures/layer-ratchet/**', // Deliberately wrong imports — the layer ratchet's test subject
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      'no-trailing-spaces': 'error', // Auto-fix trailing whitespace
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Type-checked rules for both source and e2e files
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    ignores: ['**/*.d.ts'], // Skip declaration files (they're included in tsconfig but don't need linting)
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enable TypeScript type checking in ESLint
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unsafe-assignment': 'off', // Too strict for now
      '@typescript-eslint/no-unsafe-member-access': 'off', // Too strict for now
      '@typescript-eslint/no-unsafe-call': 'off', // Too strict for now
      '@typescript-eslint/no-unsafe-return': 'error', // Catch unsafe returns
      '@typescript-eslint/unbound-method': 'off', // Too strict - React Compiler handles this
    },
  },
  // ── The engine layer, the half an import graph cannot see (#329) ─────────────────────────────
  // dependency-cruiser owns import direction (.dependency-cruiser.cjs). It only ever sees
  // dependencies, and `console.*` and the DOM are globals, so ESLint carries those. Today's uses
  // are recorded in eslint-suppressions.json — ESLint's own bulk suppressions, shrunk with
  // `pnpm run lint:layers:shrink`; a new one fails. `pnpm run lint:layers` prints the count.
  //
  // Deliberately narrow, because a guard that cries wolf makes agents argue with it. `no-console`
  // reaches src/utils, where the audit found 33 calls (26 in wiringScheme/crossing.ts); the DOM ban
  // does not, because src/utils is shared code with legitimate, guarded browser helpers. Neither
  // covers test files: the `node` Vitest project already fails them for touching a DOM global.
  {
    files: ['src/core/**/*.ts', 'src/simulation/**/*.ts', 'src/utils/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-console': 'error', // Pure logic returns errors as data; the UI decides how to show them.
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/simulation/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...ENGINE_FORBIDDEN_GLOBALS.map((name) => ({
          name,
          message: 'The engine must run headless in Node: take it as a parameter, or reach it through a port in src/lib.',
        })),
      ],
    },
  },
  // Test files - allow unsafe arguments for test mocks
  // Note: We use Vector3 in createMockThreeEvent, but still need type assertions for nativeEvent
  // since we can't create full native event objects in tests
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off', // Test mocks require type assertions for nativeEvent
    },
  },
])
