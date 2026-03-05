# Phase 1.5: Design System & Visual Consistency (Weeks 5-7)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 5-7
**Dependencies:** Phase 0.5 complete (nand2tetris foundation established)

---

## Overview

This **foundation phase** establishes HACER's design system as the visual and interaction foundation for all development. It replaces ad-hoc component styling with a consistent, scalable visual foundation that enables AI-assisted design workflows and ensures all UI components follow unified design principles from the earliest development stages.

**Exit Criteria:**
- Complete design system foundation with tokens, components, and patterns established
- Figma integration with AI-assisted design capabilities operational
- Theme system (light/dark mode) ready for immediate development use
- Design tokens implemented and available across all future components
- Design system documentation ready for development teams
- Performance: <50ms theme switching, <200KB design system bundle

---

## 9.1 Figma Integration & Design System Architecture

**Requirements:** Professional design system with Figma integration for collaborative UI development.

### Design System Structure

```
design-system/
├── foundations/
│   ├── colors.ts          # Color palette and semantic colors
│   ├── typography.ts      # Font families, sizes, weights
│   ├── spacing.ts         # Spacing scale and utilities
│   ├── shadows.ts         # Shadow definitions
│   └── borders.ts         # Border radius and styles
├── components/
│   ├── Button/
│   ├── Input/
│   ├── Modal/
│   └── CircuitCanvas/
├── themes/
│   ├── light.ts           # Light theme definitions
│   ├── dark.ts            # Dark theme definitions
│   └── high-contrast.ts   # Accessibility theme
├── tokens.ts              # Unified token exports
└── index.ts               # Main exports
```

### Figma Integration Setup

```typescript
// src/design-system/figma/config.ts
export interface FigmaConfig {
  fileId: string;
  token: string;
  nodes: {
    colors: string;
    typography: string;
    spacing: string;
    components: string;
  };
}

export const figmaConfig: FigmaConfig = {
  fileId: process.env.VITE_FIGMA_FILE_ID!,
  token: process.env.VITE_FIGMA_TOKEN!,
  nodes: {
    colors: '0:1',        // Figma node IDs
    typography: '0:2',
    spacing: '0:3',
    components: '0:4',
  },
};

// src/design-system/figma/sync.ts
export class FigmaSync {
  private api = new FigmaAPI(figmaConfig.token);

  async syncDesignTokens(): Promise<void> {
    try {
      const file = await this.api.getFile(figmaConfig.fileId);

      // Extract design tokens from Figma
      const colors = this.extractColors(file);
      const typography = this.extractTypography(file);
      const spacing = this.extractSpacing(file);

      // Generate TypeScript token files
      await this.generateTokenFiles({ colors, typography, spacing });

      console.log('✅ Design tokens synchronized from Figma');
    } catch (error) {
      console.error('❌ Failed to sync design tokens:', error);
      throw error;
    }
  }

  private extractColors(file: any): ColorTokens {
    // Extract color tokens from Figma file
    const colorNodes = file.document.children.find(
      (node: any) => node.id === figmaConfig.nodes.colors
    );

    return this.parseColorNodes(colorNodes);
  }

  private extractTypography(file: any): TypographyTokens {
    // Extract typography tokens
    const typographyNodes = file.document.children.find(
      (node: any) => node.id === figmaConfig.nodes.typography
    );

    return this.parseTypographyNodes(typographyNodes);
  }

  private extractSpacing(file: any): SpacingTokens {
    // Extract spacing tokens
    const spacingNodes = file.document.children.find(
      (node: any) => node.id === figmaConfig.nodes.spacing
    );

    return this.parseSpacingNodes(spacingNodes);
  }

  private async generateTokenFiles(tokens: DesignTokens): Promise<void> {
    const colorsContent = `export const colors = ${JSON.stringify(tokens.colors, null, 2)} as const;`;
    const typographyContent = `export const typography = ${JSON.stringify(tokens.typography, null, 2)} as const;`;
    const spacingContent = `export const spacing = ${JSON.stringify(tokens.spacing, null, 2)} as const;`;

    await fs.writeFile('src/design-system/foundations/colors.ts', colorsContent);
    await fs.writeFile('src/design-system/foundations/typography.ts', typographyContent);
    await fs.writeFile('src/design-system/foundations/spacing.ts', spacingContent);
  }
}
```

### AI-Assisted Design Workflow

```typescript
// src/design-system/ai/assistant.ts
export class DesignAssistant {
  constructor(private openai: OpenAI) {}

  async suggestComponentVariants(
    componentName: string,
    context: ComponentContext
  ): Promise<ComponentVariant[]> {
    const prompt = `
Given the existing ${componentName} component in our design system:

Current props: ${JSON.stringify(context.currentProps)}
Usage context: ${context.usage}
User feedback: ${context.feedback}

Suggest 3-5 improved variants that would enhance usability and accessibility.
For each variant, provide:
1. New props structure
2. Visual changes
3. Accessibility improvements
4. Implementation considerations

Ensure suggestions align with our design tokens and WCAG AA standards.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return this.parseSuggestions(response.choices[0].message.content);
  }

  async generateComponentCode(
    componentSpec: ComponentSpec,
    targetFramework: 'react' | 'vue' | 'svelte'
  ): Promise<string> {
    const prompt = `
Generate production-ready ${targetFramework} component code for:

Name: ${componentSpec.name}
Purpose: ${componentSpec.purpose}
Props: ${JSON.stringify(componentSpec.props)}
Styling: Must use our design tokens
Accessibility: WCAG AA compliant

Include:
- TypeScript types
- Accessibility attributes
- Responsive design
- Error states
- Loading states
- Comprehensive documentation
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Lower temperature for code generation
    });

    return this.postProcessCode(response.choices[0].message.content);
  }

  async analyzeDesignConsistency(designFiles: File[]): Promise<ConsistencyReport> {
    // Analyze uploaded design files for consistency issues
    const analysis = await this.analyzeFiles(designFiles);

    return {
      score: analysis.consistencyScore,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      automatedFixes: analysis.automatedFixes,
    };
  }
}
```

---

## 9.2 Theme System Implementation

**Requirements:** Complete theme switching with persistence, system preference detection, and smooth transitions.

### Theme Provider Architecture

```typescript
// src/design-system/themes/provider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'high-contrast' | 'auto';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark' | 'high-contrast';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('hacer-theme', newTheme);

    // Update resolved theme
    updateResolvedTheme(newTheme);
  };

  const updateResolvedTheme = (theme: Theme) => {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(prefersDark ? 'dark' : 'light');
    } else {
      setResolvedTheme(theme);
    }
  };

  const toggleTheme = () => {
    const currentResolved = resolvedTheme;
    const newTheme = currentResolved === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('hacer-theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
      updateResolvedTheme(savedTheme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors = {
        light: '#ffffff',
        dark: '#1a1a1a',
        'high-contrast': '#000000',
      };
      metaThemeColor.setAttribute('content', colors[resolvedTheme]);
    }
  }, [resolvedTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

### Design Token System

```typescript
// src/design-system/tokens.ts
import { colors as colorTokens } from './foundations/colors';
import { typography as typographyTokens } from './foundations/typography';
import { spacing as spacingTokens } from './foundations/spacing';

export const tokens = {
  colors: {
    // Semantic color mappings
    background: {
      primary: colorTokens.neutral[50],
      secondary: colorTokens.neutral[100],
      tertiary: colorTokens.neutral[200],
    },
    foreground: {
      primary: colorTokens.neutral[900],
      secondary: colorTokens.neutral[700],
      tertiary: colorTokens.neutral[500],
    },
    border: {
      default: colorTokens.neutral[300],
      focus: colorTokens.blue[500],
      error: colorTokens.red[500],
    },
    // Component-specific colors
    button: {
      primary: {
        background: colorTokens.blue[600],
        foreground: colorTokens.white,
        hover: colorTokens.blue[700],
        active: colorTokens.blue[800],
      },
      secondary: {
        background: colorTokens.neutral[100],
        foreground: colorTokens.neutral[900],
        hover: colorTokens.neutral[200],
        active: colorTokens.neutral[300],
      },
    },
    // Interactive states
    interactive: {
      hover: colorTokens.blue[50],
      active: colorTokens.blue[100],
      focus: colorTokens.blue[200],
      disabled: colorTokens.neutral[200],
    },
  },

  typography: {
    fontFamily: {
      sans: typographyTokens.fontFamily.sans,
      mono: typographyTokens.fontFamily.mono,
    },
    fontSize: typographyTokens.fontSize,
    fontWeight: typographyTokens.fontWeight,
    lineHeight: typographyTokens.lineHeight,
    letterSpacing: typographyTokens.letterSpacing,
  },

  spacing: spacingTokens,

  // Component-specific tokens
  components: {
    button: {
      padding: {
        sm: `${spacingTokens[2]} ${spacingTokens[3]}`,
        md: `${spacingTokens[3]} ${spacingTokens[4]}`,
        lg: `${spacingTokens[4]} ${spacingTokens[6]}`,
      },
      borderRadius: '6px',
      fontSize: typographyTokens.fontSize.sm,
      fontWeight: typographyTokens.fontWeight.medium,
      transition: 'all 150ms ease-in-out',
    },

    input: {
      padding: `${spacingTokens[3]} ${spacingTokens[4]}`,
      borderRadius: '6px',
      borderWidth: '1px',
      fontSize: typographyTokens.fontSize.base,
      transition: 'border-color 150ms ease-in-out, box-shadow 150ms ease-in-out',
    },

    modal: {
      backdropOpacity: 0.5,
      borderRadius: '8px',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
    },
  },

  // Animation tokens
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },

  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Type-safe token access
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type TypographyToken = keyof typeof tokens.typography;
```

### Theme-Specific Overrides

```typescript
// src/design-system/themes/dark.ts
import { tokens } from '../tokens';

export const darkTheme = {
  colors: {
    background: {
      primary: tokens.colors.neutral[900],
      secondary: tokens.colors.neutral[800],
      tertiary: tokens.colors.neutral[700],
    },
    foreground: {
      primary: tokens.colors.white,
      secondary: tokens.colors.neutral[200],
      tertiary: tokens.colors.neutral[400],
    },
    border: {
      default: tokens.colors.neutral[700],
      focus: tokens.colors.blue[400],
      error: tokens.colors.red[400],
    },
    button: {
      primary: {
        background: tokens.colors.blue[600],
        foreground: tokens.colors.white,
        hover: tokens.colors.blue[500],
        active: tokens.colors.blue[700],
      },
      secondary: {
        background: tokens.colors.neutral[800],
        foreground: tokens.colors.neutral[200],
        hover: tokens.colors.neutral[700],
        active: tokens.colors.neutral[600],
      },
    },
    interactive: {
      hover: tokens.colors.neutral[800],
      active: tokens.colors.neutral[700],
      focus: tokens.colors.blue[300],
      disabled: tokens.colors.neutral[600],
    },
  },
} as const;

// src/design-system/themes/high-contrast.ts
export const highContrastTheme = {
  colors: {
    background: {
      primary: tokens.colors.white,
      secondary: tokens.colors.white,
      tertiary: tokens.colors.neutral[50],
    },
    foreground: {
      primary: tokens.colors.black,
      secondary: tokens.colors.black,
      tertiary: tokens.colors.neutral[700],
    },
    border: {
      default: tokens.colors.black,
      focus: tokens.colors.blue[700],
      error: tokens.colors.red[700],
    },
    // High contrast overrides for all interactive elements
  },
} as const;
```

---

## 9.3 Component Token Integration

**Requirements:** All components must use design tokens instead of hardcoded values.

### Tokenized Component Example

```typescript
// src/components/Button/Button.tsx
import { tokens } from '../../design-system';
import { useTheme } from '../../design-system/themes/provider';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
}: ButtonProps) {
  const { resolvedTheme } = useTheme();

  const buttonStyles = {
    // Use design tokens
    padding: tokens.components.button.padding[size],
    borderRadius: tokens.components.button.borderRadius,
    fontSize: tokens.components.button.fontSize,
    fontWeight: tokens.components.button.fontWeight,
    transition: tokens.components.button.transition,

    // Theme-aware colors
    backgroundColor: tokens.colors.button[variant].background,
    color: tokens.colors.button[variant].foreground,

    // Interactive states
    ':hover': {
      backgroundColor: tokens.colors.button[variant].hover,
    },
    ':active': {
      backgroundColor: tokens.colors.button[variant].active,
    },
    ':focus': {
      outline: `2px solid ${tokens.colors.interactive.focus}`,
      outlineOffset: '2px',
    },
    ':disabled': {
      backgroundColor: tokens.colors.interactive.disabled,
      color: tokens.colors.foreground.tertiary,
      cursor: 'not-allowed',
    },
  };

  return (
    <button
      style={buttonStyles}
      disabled={disabled || loading}
      onClick={onClick}
      aria-disabled={disabled || loading}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
```

### Design System Documentation

```typescript
// src/design-system/docs/generators.ts
export class DesignSystemDocs {
  async generateComponentDocs(componentName: string): Promise<string> {
    const component = await this.loadComponent(componentName);
    const variants = await this.generateVariants(component);
    const accessibility = await this.checkAccessibility(component);

    return `
# ${componentName}

${component.description}

## Usage

\`\`\`tsx
import { ${componentName} } from '@hacer/design-system';

function MyComponent() {
  return <${componentName} variant="primary">Click me</${componentName}>;
}
\`\`\`

## Props

${this.generatePropsTable(component.props)}

## Variants

${variants.map(variant => `
### ${variant.name}
${variant.description}

\`\`\`tsx
<${componentName} variant="${variant.name}" />
\`\`\`

${variant.preview}
`).join('\n')}

## Accessibility

${accessibility.score}/100 WCAG AA Score

${accessibility.issues.map(issue => `- ${issue}`).join('\n')}

## Design Tokens Used

${this.generateTokensTable(component.tokens)}
`;
  }

  async generateThemeDocs(): Promise<string> {
    const themes = await this.loadAllThemes();

    return `
# Theme System

## Available Themes

${themes.map(theme => `
### ${theme.name}

${theme.description}

#### Color Palette
${this.generateColorPalette(theme.colors)}

#### Usage
\`\`\`tsx
import { ThemeProvider, useTheme } from '@hacer/design-system';

function App() {
  return (
    <ThemeProvider theme="${theme.id}">
      <MyApp />
    </ThemeProvider>
  );
}
\`\`\`
`).join('\n')}
`;
  }
}
```

---

## 9.4 Theme Switching UI

**Requirements:** Intuitive theme switching with preview and persistence.

### Theme Switcher Component

```typescript
// src/components/ThemeSwitcher/ThemeSwitcher.tsx
import { useTheme, Theme } from '../../design-system';
import { Button } from '../Button';
import { Dropdown } from '../Dropdown';

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'auto', label: 'Auto', icon: '🖥️' },
  { value: 'high-contrast', label: 'High Contrast', icon: '🔍' },
];

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <Dropdown
      trigger={
        <Button variant="secondary" size="sm">
          {THEME_OPTIONS.find(opt => opt.value === theme)?.icon} Theme
        </Button>
      }
      align="end"
    >
      <div className="theme-options">
        {THEME_OPTIONS.map(option => (
          <button
            key={option.value}
            className={`theme-option ${theme === option.value ? 'active' : ''}`}
            onClick={() => setTheme(option.value)}
            aria-pressed={theme === option.value}
          >
            <span className="theme-icon">{option.icon}</span>
            <span className="theme-label">{option.label}</span>
            {option.value === 'auto' && (
              <span className="theme-current">
                (Currently {resolvedTheme === 'light' ? '☀️' : '🌙'})
              </span>
            )}
          </button>
        ))}
      </div>
    </Dropdown>
  );
}
```

### Theme Preview Component

```typescript
// src/components/ThemePreview/ThemePreview.tsx
import { useTheme } from '../../design-system';

export function ThemePreview() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="theme-preview" data-theme={resolvedTheme}>
      <div className="preview-header">
        <h3>Theme Preview</h3>
        <span className="current-theme">{resolvedTheme} mode</span>
      </div>

      <div className="preview-content">
        {/* Sample components to show theme */}
        <div className="sample-button-group">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
        </div>

        <div className="sample-input-group">
          <Input placeholder="Sample input" />
          <Select>
            <option>Option 1</option>
            <option>Option 2</option>
          </Select>
        </div>

        <div className="sample-card">
          <Card>
            <CardHeader>
              <CardTitle>Sample Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This is how content looks in the current theme.</p>
              <Badge variant="info">Info Badge</Badge>
              <Badge variant="success">Success Badge</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## 9.5 Performance Optimizations

**Requirements:** Theme switching and design system loading must be fast and smooth.

### Theme Loading Optimization

```typescript
// src/design-system/performance/theme-loader.ts
export class ThemeLoader {
  private loadedThemes = new Set<string>();
  private themeCache = new Map<string, ThemeDefinition>();

  async loadTheme(themeId: string): Promise<ThemeDefinition> {
    // Check cache first
    if (this.themeCache.has(themeId)) {
      return this.themeCache.get(themeId)!;
    }

    // Dynamic import for code splitting
    const themeModule = await import(`../themes/${themeId}.ts`);
    const theme = themeModule.default || themeModule[themeId];

    // Cache for future use
    this.themeCache.set(themeId, theme);
    this.loadedThemes.add(themeId);

    return theme;
  }

  async preloadThemes(themeIds: string[]): Promise<void> {
    const promises = themeIds
      .filter(id => !this.loadedThemes.has(id))
      .map(id => this.loadTheme(id));

    await Promise.all(promises);
  }

  getLoadedThemes(): string[] {
    return Array.from(this.loadedThemes);
  }

  clearCache(): void {
    this.themeCache.clear();
    this.loadedThemes.clear();
  }
}
```

### CSS Custom Properties Generation

```typescript
// src/design-system/build/generate-css.ts
export function generateThemeCSS(theme: ThemeDefinition): string {
  const cssVars: string[] = [];

  // Flatten theme object to CSS custom properties
  function flattenTheme(obj: any, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const varName = prefix ? `${prefix}-${key}` : key;

      if (typeof value === 'object' && value !== null) {
        flattenTheme(value, varName);
      } else {
        cssVars.push(`  --${varName}: ${value};`);
      }
    }
  }

  flattenTheme(theme);

  return `
:root {
${cssVars.join('\n')}
}

/* Theme-specific overrides */
[data-theme="dark"] {
${cssVars.map(var_ => var_.replace('--', '--dark-')).join('\n')}
}

[data-theme="high-contrast"] {
${cssVars.map(var_ => var_.replace('--', '--hc-')).join('\n')}
}
`;
}
```

---

## 9.6 Phase 9 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Figma integration setup | 6h | - | - | Figma API access configured |
| Design token extraction | 8h | Figma setup | <30s sync time | Tokens synced from Figma |
| Design system architecture | 8h | Token extraction | - | Folder structure established |
| Theme provider implementation | 6h | Architecture | <10ms theme switch | Context-based theming working |
| Light/dark theme definitions | 6h | Provider | - | Both themes visually complete |
| High-contrast theme | 4h | Light/dark | - | Accessibility theme added |
| Theme persistence | 4h | Definitions | - | localStorage integration |
| System preference detection | 2h | Persistence | - | Auto-detection working |
| Theme switcher UI | 6h | All themes | - | User can switch themes |
| Component token migration | 16h | Theme switcher | - | All components use tokens |
| Smooth transitions | 4h | Migration | <50ms transition | No jank during switching |
| Figma-to-code pipeline | 8h | Transitions | - | AI-assisted design workflow |
| Design system documentation | 6h | Pipeline | - | Complete component docs |
| Performance monitoring | 4h | Documentation | - | Theme switching metrics |
| Cross-browser testing | 4h | Monitoring | - | Themes work in all browsers |

**Total Estimated Effort:** ~92 hours (4.5 weeks with 1 developer)  
**Performance Budget:** <50ms theme switching, <200KB design system bundle  
**Quality Gates:** All components use design tokens, Figma integration operational, themes persist across sessions

---

## Risk Mitigation

**Design System Complexity:** Start with core components and expand gradually to avoid overwhelming the team.

**Figma Integration Reliability:** Implement fallbacks and caching to handle API outages gracefully.

**Theme Performance Impact:** Lazy load themes and use CSS custom properties for optimal performance.

**Component Migration Effort:** Migrate components incrementally with automated tooling to reduce manual work.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)  
**Previous:** [Phase 0.5: Nand2Tetris Foundation](phase-0.5-nand2tetris-foundation.md)  
**Next:** [Phase 2.5: Developer Tooling & DX](phase-2.5-developer-tooling.md)
