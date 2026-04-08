import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactCompiler from 'eslint-plugin-react-compiler'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'test-results',
    'playwright-report',
    'coverage',
    '.stryker-tmp',
    'design-system/**',
    '.cursor/**', // Vendored ECC / IDE harness — not application source
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
  // shadcn/ui components - allow exporting constants alongside components (standard pattern)
  {
    files: ['src/components/ui/shadcn/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
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
