# Phase 2.5: Developer Tooling & DX Foundation (Weeks 8-10)

**Part of:** [Comprehensive Development Roadmap](../../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 8-10
**Dependencies:** Phase 1.5 complete (design system foundation established)

---

## Overview

This phase establishes comprehensive developer tooling and quality infrastructure to ensure consistent, high-quality code across the entire codebase. It implements Storybook for component development, CI/CD pipelines for automated testing and deployment, and commit quality gates.

**Exit Criteria:**
- Storybook integration complete with all components documented
- Comprehensive CI/CD pipeline operational with automated testing
- Code quality gates enforced with commit hooks
- Performance: <30s Storybook startup, <5min CI pipeline, 90%+ coverage

---

## 10.1 Storybook Integration

**Requirements:** Visual component development environment with accessibility testing and comprehensive documentation.

### Storybook Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../docs/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    '@storybook/addon-docs',
    '@storybook/addon-storysource',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    'storybook-addon-themes',
    'storybook-addon-pseudo-states',
    '@storybook/addon-mdx-gfm',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      // Custom Vite config for Storybook
      optimizeDeps: {
        include: [
          '@nand2fun/core',
          '@nand2fun/design-system',
          '@nand2fun/hooks',
        ],
      },
      define: {
        __DEV__: true,
      },
    });
  },
};

export default config;
```

### Storybook Preview Configuration

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { withThemeProvider } from './decorators/theme';
import { withRouter } from './decorators/router';
import { withI18n } from './decorators/i18n';
import { withPerformance } from './decorators/performance';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      toc: true,
      autodocs: 'tag',
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
        { name: 'gray', value: '#f5f5f5' },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },
    themes: {
      default: 'light',
      list: [
        { name: 'light', class: 'theme-light', color: '#ffffff' },
        { name: 'dark', class: 'theme-dark', color: '#1a1a1a' },
        { name: 'high-contrast', class: 'theme-high-contrast', color: '#000000' },
      ],
    },
  },
  decorators: [
    withThemeProvider,
    withRouter,
    withI18n,
    withPerformance,
  ],
  tags: ['autodocs'],
};

export default preview;
```

### Custom Decorators

```typescript
// .storybook/decorators/theme.tsx
import { ThemeProvider } from '../../src/design-system/themes/provider';
import { useState } from 'react';

export const withThemeProvider = (Story, context) => {
  const [theme, setTheme] = useState(context.globals.theme || 'light');

  return (
    <ThemeProvider theme={theme}>
      <Story {...context} />
    </ThemeProvider>
  );
};

// .storybook/decorators/router.tsx
import { BrowserRouter } from 'react-router-dom';

export const withRouter = (Story) => (
  <BrowserRouter>
    <Story />
  </BrowserRouter>
);

// .storybook/decorators/i18n.tsx
import '../../src/i18n/config'; // Initialize i18n

export const withI18n = (Story) => <Story />;

// .storybook/decorators/performance.tsx
import { useEffect } from 'react';

export const withPerformance = (Story) => {
  useEffect(() => {
    // Performance monitoring for stories
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`Story performance: ${entry.name} - ${entry.duration}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    // Mark story start
    performance.mark('story-start');

    return () => {
      // Mark story end and measure
      performance.mark('story-end');
      performance.measure('story-render', 'story-start', 'story-end');

      observer.disconnect();
    };
  }, []);

  return <Story />;
};
```

### Component Story Examples

```typescript
// src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and states.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'button-name',
            enabled: true,
          },
          {
            id: 'button-has-visible-text',
            enabled: true,
          },
        ],
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'success'],
      description: 'The visual style variant of the button',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether to show a loading spinner',
    },
    children: {
      control: 'text',
      description: 'The button content',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler function',
    },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    children: 'Click me',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {},
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Processing...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithInteractionTest: Story = {
  args: {
    children: 'Test Interaction',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /test interaction/i });

    // Test click interaction
    await userEvent.click(button);

    // Verify accessibility
    await expect(button).toBeInTheDocument();
    await expect(button).toHaveAttribute('aria-disabled', 'false');
  },
};

export const AccessibilityTest: Story = {
  args: {
    children: 'Accessible Button',
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'button-name', enabled: true },
          { id: 'button-has-visible-text', enabled: true },
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};
```

### Automated Story Generation

```typescript
// src/tools/storybook/generate-stories.ts
import { Project, TypeChecker } from 'ts-morph';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class StoryGenerator {
  private project: Project;
  private typeChecker: TypeChecker;

  constructor(private sourcePath: string, private outputPath: string) {
    this.project = new Project({
      tsConfigFilePath: 'tsconfig.json',
    });
    this.typeChecker = this.project.getTypeChecker();
  }

  async generateAllStories(): Promise<void> {
    const sourceFiles = this.project.getSourceFiles();
    const componentFiles = sourceFiles.filter(file =>
      file.getFilePath().includes('/components/') &&
      file.getFilePath().endsWith('.tsx')
    );

    for (const file of componentFiles) {
      await this.generateStoryForComponent(file);
    }
  }

  private async generateStoryForComponent(sourceFile: SourceFile): Promise<void> {
    const componentName = this.extractComponentName(sourceFile);
    const propsInterface = this.extractPropsInterface(sourceFile);
    const componentPath = sourceFile.getFilePath();

    const storyContent = this.generateStoryContent({
      componentName,
      componentPath,
      propsInterface,
    });

    const storyPath = join(
      this.outputPath,
      componentName,
      `${componentName}.stories.tsx`
    );

    await mkdir(join(this.outputPath, componentName), { recursive: true });
    await writeFile(storyPath, storyContent);
  }

  private generateStoryContent({
    componentName,
    componentPath,
    propsInterface,
  }: {
    componentName: string;
    componentPath: string;
    propsInterface?: InterfaceDeclaration;
  }): string {
    const relativePath = componentPath.replace(this.sourcePath, '../src');
    const argTypes = this.generateArgTypes(propsInterface);

    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from '${relativePath.replace('.tsx', '')}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Auto-generated story for ${componentName} component.',
      },
    },
  },
  argTypes: ${argTypes},
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

export const Default: Story = {
  args: {},
};

export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Add variant examples here */}
      <${componentName} {...args} />
    </div>
  ),
};
`;
  }

  private generateArgTypes(propsInterface?: InterfaceDeclaration): string {
    if (!propsInterface) return '{}';

    const properties = propsInterface.getProperties();
    const argTypes: Record<string, any> = {};

    for (const prop of properties) {
      const propType = prop.getType();
      const propName = prop.getName();

      // Generate appropriate controls based on TypeScript type
      if (propType.isBoolean()) {
        argTypes[propName] = { control: 'boolean' };
      } else if (propType.isString()) {
        argTypes[propName] = { control: 'text' };
      } else if (propType.isNumber()) {
        argTypes[propName] = { control: 'number' };
      } else if (propType.isUnion() && propType.getUnionTypes().some(t => t.isStringLiteral())) {
        const options = propType.getUnionTypes()
          .filter(t => t.isStringLiteral())
          .map(t => t.getLiteralValue());
        argTypes[propName] = {
          control: { type: 'select' },
          options,
        };
      }
    }

    return JSON.stringify(argTypes, null, 2);
  }
}
```

---

## 10.2 CI/CD Pipeline Implementation

**Requirements:** Complete automated testing, building, and deployment pipeline.

### GitHub Actions CI Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type checking
        run: npm run type-check

      - name: Lint code
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage --maxWorkers=2

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unit,integration
          fail_ci_if_error: true

  e2e:
    name: End-to-End Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000

  accessibility:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npm run build:storybook

      - name: Run accessibility tests
        run: npm run test:a11y

  performance:
    name: Performance Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: http://localhost:3000
          configPath: .lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level high

      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  bundle-analysis:
    name: Bundle Analysis
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and analyze bundle
        run: npm run build:analyze

      - name: Upload bundle analysis
        uses: actions/upload-artifact@v3
        with:
          name: bundle-analysis
          path: dist/static
```

### Lighthouse Configuration

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local:.+(https?://.+)",
      "url": ["http://localhost:4173/"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.8 }],
        "categories:pwa": "off"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Bundle Analysis Configuration

```typescript
// scripts/analyze-bundle.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function analyzeBundle() {
  console.log('🔍 Analyzing bundle size...');

  // Build the application
  execSync('npm run build', { stdio: 'inherit' });

  // Analyze the dist folder
  const distPath = path.join(__dirname, '..', 'dist');
  const assetsPath = path.join(distPath, 'assets');

  if (!fs.existsSync(assetsPath)) {
    console.error('❌ Assets folder not found');
    process.exit(1);
  }

  const files = fs.readdirSync(assetsPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));

  let totalJS = 0;
  let totalCSS = 0;

  console.log('\n📦 JavaScript Files:');
  jsFiles.forEach(file => {
    const stats = fs.statSync(path.join(assetsPath, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  ${file}: ${sizeKB} KB`);
    totalJS += stats.size;
  });

  console.log('\n🎨 CSS Files:');
  cssFiles.forEach(file => {
    const stats = fs.statSync(path.join(assetsPath, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  ${file}: ${sizeKB} KB`);
    totalCSS += stats.size;
  });

  const totalJSKB = (totalJS / 1024).toFixed(2);
  const totalCSSKB = (totalCSS / 1024).toFixed(2);
  const totalKB = ((totalJS + totalCSS) / 1024).toFixed(2);

  console.log(`\n📊 Bundle Analysis:`);
  console.log(`  JavaScript: ${totalJSKB} KB`);
  console.log(`  CSS: ${totalCSSKB} KB`);
  console.log(`  Total: ${totalKB} KB`);

  // Check against budgets
  const BUDGET_JS = 500; // KB
  const BUDGET_CSS = 50;  // KB
  const BUDGET_TOTAL = 550; // KB

  const jsBudgetExceeded = totalJS / 1024 > BUDGET_JS;
  const cssBudgetExceeded = totalCSS / 1024 > BUDGET_CSS;
  const totalBudgetExceeded = (totalJS + totalCSS) / 1024 > BUDGET_TOTAL;

  if (jsBudgetExceeded || cssBudgetExceeded || totalBudgetExceeded) {
    console.error('\n❌ Bundle size exceeded budget!');
    if (jsBudgetExceeded) console.error(`  JS: ${totalJSKB}KB > ${BUDGET_JS}KB`);
    if (cssBudgetExceeded) console.error(`  CSS: ${totalCSSKB}KB > ${BUDGET_CSS}KB`);
    if (totalBudgetExceeded) console.error(`  Total: ${totalKB}KB > ${BUDGET_TOTAL}KB`);
    process.exit(1);
  } else {
    console.log('\n✅ Bundle size within budget');
  }
}

analyzeBundle();
```

---

## 10.3 Commit Quality Gates

**Requirements:** Automated code quality checks before commits are allowed.

### Husky Configuration

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```javascript
// .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "${1}"
```

### Lint-Staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write",
      "tsc --noEmit --skipLibCheck"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.{css,scss}": [
      "stylelint --fix"
    ]
  }
}
```

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'wip'
      ]
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'scope-empty': [0, 'never'],
    'scope-case': [0, 'always', 'lower-case'],
  },
};
```

### Stylelint Configuration

```javascript
// .stylelintrc.js
module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-css-modules',
    'stylelint-config-prettier',
  ],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': null,
    'order/properties-order': [
      [
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'z-index',
        'display',
        'flex',
        'flex-grow',
        'flex-shrink',
        'flex-basis',
        'flex-direction',
        'flex-flow',
        'flex-wrap',
        'align-items',
        'align-content',
        'align-self',
        'justify-content',
        'order',
        'width',
        'min-width',
        'max-width',
        'height',
        'min-height',
        'max-height',
        'margin',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'border',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-radius',
        'background',
        'background-color',
        'background-image',
        'background-repeat',
        'background-position',
        'background-size',
        'color',
        'font',
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'text-align',
        'text-decoration',
        'text-transform',
        'letter-spacing',
        'line-height',
        'opacity',
        'visibility',
        'overflow',
        'cursor',
        'transition',
        'transform',
        'animation',
      ],
      {
        unspecified: 'bottomAlphabetical',
      },
    ],
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer',
        ],
      },
    ],
    'declaration-block-trailing-semicolon': null,
    'no-descending-specificity': null,
  },
};
```

---

## 10.4 Code Coverage and Quality Metrics

**Requirements:** Comprehensive code coverage with quality gates.

### Coverage Configuration

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/dist/**',
        '**/node_modules/**',
        '**/coverage/**',
        '**/*.config.*',
        '**/*.stories.*',
        '**/*.d.ts',
        '**/types/**',
        '**/stories/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        './src/core/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        './src/components/': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
      all: true,
      include: ['src/**/*.{ts,tsx}'],
    },
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

### Quality Gates Script

```typescript
// scripts/check-quality-gates.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface QualityGates {
  coverage: {
    global: number;
    core: number;
    components: number;
  };
  bundleSize: {
    total: number;
    js: number;
    css: number;
  };
  performance: {
    lighthouse: number;
    accessibility: number;
  };
}

function checkQualityGates(): boolean {
  console.log('🔍 Checking quality gates...\n');

  let allPassed = true;

  // Check test coverage
  try {
    const coverageData = JSON.parse(
      fs.readFileSync('./coverage/coverage-summary.json', 'utf8')
    );

    const globalCoverage = coverageData.total.lines.pct;
    const coreCoverage = getCoverageForFolder('./src/core/', coverageData);
    const componentCoverage = getCoverageForFolder('./src/components/', coverageData);

    console.log(`📊 Test Coverage:`);
    console.log(`  Global: ${globalCoverage}% (target: 80%)`);
    console.log(`  Core: ${coreCoverage}% (target: 90%)`);
    console.log(`  Components: ${componentCoverage}% (target: 75%)`);

    if (globalCoverage < 80 || coreCoverage < 90 || componentCoverage < 75) {
      console.error('❌ Coverage requirements not met');
      allPassed = false;
    } else {
      console.log('✅ Coverage requirements met');
    }
  } catch (error) {
    console.error('❌ Failed to read coverage data');
    allPassed = false;
  }

  // Check bundle size
  try {
    const stats = JSON.parse(
      fs.readFileSync('./dist/static/stats.json', 'utf8')
    );

    const bundleSize = calculateBundleSize(stats);
    console.log(`\n📦 Bundle Size:`);
    console.log(`  Total: ${(bundleSize.total / 1024).toFixed(2)} KB (budget: 550 KB)`);
    console.log(`  JS: ${(bundleSize.js / 1024).toFixed(2)} KB (budget: 500 KB)`);
    console.log(`  CSS: ${(bundleSize.css / 1024).toFixed(2)} KB (budget: 50 KB)`);

    if (bundleSize.total > 550 * 1024 ||
        bundleSize.js > 500 * 1024 ||
        bundleSize.css > 50 * 1024) {
      console.error('❌ Bundle size exceeded budget');
      allPassed = false;
    } else {
      console.log('✅ Bundle size within budget');
    }
  } catch (error) {
    console.error('❌ Failed to read bundle stats');
    allPassed = false;
  }

  // Check for ESLint errors
  try {
    execSync('npm run lint -- --max-warnings 0', { stdio: 'pipe' });
    console.log('\n✅ ESLint passed with no warnings');
  } catch (error) {
    console.error('\n❌ ESLint failed');
    allPassed = false;
  }

  // Check TypeScript compilation
  try {
    execSync('npm run type-check', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    console.error('❌ TypeScript compilation failed');
    allPassed = false;
  }

  console.log(`\n${allPassed ? '🎉' : '💥'} Quality gates ${allPassed ? 'PASSED' : 'FAILED'}`);
  return allPassed;
}

function getCoverageForFolder(folderPath: string, coverageData: any): number {
  // Calculate coverage for specific folder
  // Implementation would filter coverage data by path
  return 85; // Placeholder
}

function calculateBundleSize(stats: any): { total: number; js: number; css: number } {
  // Calculate bundle sizes from webpack stats
  // Implementation would parse the stats JSON
  return { total: 450 * 1024, js: 400 * 1024, css: 50 * 1024 }; // Placeholder
}

if (!checkQualityGates()) {
  process.exit(1);
}
```

---

## 10.5 Phase 10 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Storybook setup and configuration | 6h | Phase 9 | <30s startup | Storybook running locally |
| Custom decorators for themes/i18n | 4h | Storybook setup | - | All decorators functional |
| Component story creation | 20h | Decorators | - | Stories for all major components |
| Automated story generation | 8h | Story stories | - | Tool generates basic stories |
| Accessibility testing in Storybook | 4h | Stories | - | a11y addon configured and working |
| Interactive story testing | 6h | Accessibility | - | Play functions working |
| GitHub Actions CI setup | 8h | - | <5min CI time | Basic CI pipeline working |
| Test automation (unit/integration) | 6h | CI setup | - | Tests run in CI |
| E2E test automation | 8h | Test automation | <10min E2E | Playwright in CI |
| Accessibility CI integration | 4h | E2E automation | - | a11y tests in CI |
| Performance testing setup | 6h | Accessibility CI | - | Lighthouse CI configured |
| Security scanning setup | 4h | Performance | - | CodeQL and npm audit in CI |
| Bundle analysis integration | 4h | Security | - | Webpack Bundle Analyzer in CI |
| Husky pre-commit hooks | 4h | - | - | lint-staged configured |
| Commitlint setup | 2h | Hooks | - | Conventional commits enforced |
| Code coverage configuration | 6h | Commitlint | 90% coverage | Coverage thresholds set |
| Quality gates implementation | 8h | Coverage | - | Automated quality checks |
| CI status badges | 2h | Quality gates | - | README badges updated |
| Contributor documentation | 4h | Badges | - | Development setup guides |

**Total Estimated Effort:** ~114 hours (5.5 weeks with 1 developer)  
**Performance Budget:** <30s Storybook startup, <5min CI pipeline, 90%+ coverage  
**Quality Gates:** All tests pass in CI, code coverage >80%, bundle size within budget, zero ESLint warnings

---

## Risk Mitigation

**CI Pipeline Complexity:** Start with simple pipeline and gradually add complexity to avoid initial failures.

**Storybook Performance:** Use lazy loading and code splitting to keep Storybook startup fast.

**Code Quality Enforcement:** Provide clear documentation and examples to help developers understand quality requirements.

**Tool Integration Conflicts:** Test all tools together early to identify and resolve conflicts.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 9: Design System](phase-9-design-system.md)  
**Next:** [Phase 11: Deployment & Production](phase-11-deployment-production.md)
