# Phase 12: Accessibility & Internationalization (Weeks 36-38)

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Priority:** 🟢 MEDIUM  
**Timeline:** Weeks 36-38  
**Dependencies:** Phase 9 complete (design system provides consistent theming)

---

## Overview

This phase implements comprehensive accessibility (WCAG 2.1 AA compliance) and internationalization support, expanding Nand2Fun's reach to global users with disabilities. It transforms the platform from English-only to supporting multiple languages while ensuring all interactive elements are fully accessible.

**Exit Criteria:**
- WCAG 2.1 AA compliance achieved with automated testing
- Multi-language support for English, Spanish, Mandarin, and French
- Screen reader compatibility verified across all components
- Keyboard navigation fully functional without mouse dependency

---

## 12.1 Accessibility Implementation

**Requirements:** Full WCAG 2.1 AA compliance with comprehensive testing and automated validation.

### Accessibility Core Infrastructure

```typescript
// src/accessibility/config.ts
export const ACCESSIBILITY_CONFIG = {
  // WCAG compliance level
  complianceLevel: 'AA' as const,

  // Color contrast requirements
  contrastRatios: {
    normal: 4.5,  // WCAG AA normal text
    large: 3.0,   // WCAG AA large text (18pt+ or 14pt+ bold)
  },

  // Focus management
  focus: {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineOffset: '2px',
    transition: 'outline 150ms ease-in-out',
  },

  // Motion preferences
  motion: {
    reducedMotion: '(prefers-reduced-motion: reduce)',
    respectUserPreference: true,
  },

  // High contrast mode
  highContrast: {
    enabled: true,
    mediaQuery: '(prefers-contrast: high)',
  },
} as const;

// src/accessibility/hooks/useAccessibility.ts
import { useEffect, useState, useCallback } from 'react';

export interface AccessibilityState {
  screenReader: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorScheme: 'light' | 'dark' | 'high-contrast';
  textSize: 'small' | 'medium' | 'large';
}

export function useAccessibility(): AccessibilityState & {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  focusTrap: (containerRef: React.RefObject<HTMLElement>) => () => void;
} {
  const [state, setState] = useState<AccessibilityState>({
    screenReader: false,
    keyboardNavigation: false,
    reducedMotion: false,
    highContrast: false,
    colorScheme: 'light',
    textSize: 'medium',
  });

  // Detect screen reader
  useEffect(() => {
    const detectScreenReader = () => {
      // Multiple detection methods for better coverage
      const hasAriaLive = document.querySelector('[aria-live]') !== null;
      const hasScreenReaderClass = document.body.classList.contains('sr-only');
      const prefersScreenReader = window.navigator.userAgent.includes('NVDA') ||
                                  window.navigator.userAgent.includes('JAWS') ||
                                  window.navigator.userAgent.includes('VoiceOver');

      setState(prev => ({
        ...prev,
        screenReader: hasAriaLive || hasScreenReaderClass || prefersScreenReader,
      }));
    };

    detectScreenReader();
    // Re-check periodically as screen readers might be enabled/disabled
    const interval = setInterval(detectScreenReader, 5000);
    return () => clearInterval(interval);
  }, []);

  // Detect keyboard navigation
  useEffect(() => {
    let lastInteraction = 'mouse';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
        lastInteraction = 'keyboard';
        setState(prev => ({ ...prev, keyboardNavigation: true }));
      }
    };

    const handleMouseDown = () => {
      lastInteraction = 'mouse';
      setState(prev => ({ ...prev, keyboardNavigation: false }));
    };

    const handleFocus = () => {
      if (lastInteraction === 'keyboard') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleBlur = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Detect motion preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia(ACCESSIBILITY_CONFIG.motion.reducedMotion);
    const handleChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    setState(prev => ({ ...prev, reducedMotion: mediaQuery.matches }));
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detect high contrast
  useEffect(() => {
    const mediaQuery = window.matchMedia(ACCESSIBILITY_CONFIG.highContrast.mediaQuery);
    const handleChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, highContrast: e.matches }));
    };

    setState(prev => ({ ...prev, highContrast: mediaQuery.matches }));
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Focus trap utility
  const focusTrap = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

  return { ...state, announce, focusTrap };
}
```

### Accessible Component Patterns

```typescript
// src/components/AccessibleButton/AccessibleButton.tsx
import React, { forwardRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    children,
    loading = false,
    loadingText = 'Loading...',
    disabled,
    onClick,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const { announce, keyboardNavigation } = useAccessibility();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;

      // Announce action for screen readers
      announce(`Button clicked: ${ariaLabel || children}`, 'polite');

      onClick?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      // Support Enter and Space for button activation
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick(event as any);
      }
    };

    const isDisabled = disabled || loading;
    const buttonText = loading ? loadingText : children;

    return (
      <button
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={props['aria-pressed']}
        role={props.role || 'button'}
        tabIndex={isDisabled ? -1 : 0}
        style={{
          // Ensure focus is visible
          outline: keyboardNavigation ? '2px solid currentColor' : 'none',
          outlineOffset: '2px',
        }}
        {...props}
      >
        {loading && <Spinner aria-hidden="true" />}
        <span aria-hidden={loading}>
          {buttonText}
        </span>
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// src/components/SkipLink/SkipLink.tsx
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="skip-link"
      onFocus={(e) => e.target.scrollIntoView({ block: 'start', behavior: 'smooth' })}
    >
      {children}
    </a>
  );
}

// Usage in main app
export function App() {
  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>

      <header>
        {/* Navigation */}
      </header>

      <main id="main-content">
        {/* Main content */}
      </main>
    </>
  );
}
```

### Circuit-Specific Accessibility

```typescript
// src/components/CircuitCanvas/AccessibleCircuitCanvas.tsx
import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';

interface AccessibleCircuitCanvasProps {
  circuit: CircuitDocument;
  onGateSelect: (gateId: string) => void;
  onWireSelect: (wireId: string) => void;
  selectedGateId?: string;
  selectedWireId?: string;
}

export function AccessibleCircuitCanvas({
  circuit,
  onGateSelect,
  onWireSelect,
  selectedGateId,
  selectedWireId,
}: AccessibleCircuitCanvasProps) {
  const { announce, keyboardNavigation } = useAccessibility();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Create accessible description of circuit
  const circuitDescription = React.useMemo(() => {
    const gateCount = circuit.gates.length;
    const wireCount = circuit.wires.length;
    const sequentialGates = circuit.gates.filter(gate => gate.internalState).length;

    return `Circuit with ${gateCount} gates and ${wireCount} wires. ${
      sequentialGates > 0 ? `${sequentialGates} sequential gates detected.` : ''
    }`;
  }, [circuit]);

  // Keyboard navigation for circuit elements
  useEffect(() => {
    if (!keyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canvasRef.current) return;

      switch (event.key) {
        case 'ArrowRight':
          // Navigate to next gate
          event.preventDefault();
          navigateToNextGate();
          break;
        case 'ArrowLeft':
          // Navigate to previous gate
          event.preventDefault();
          navigateToPreviousGate();
          break;
        case 'Enter':
          // Select current gate
          event.preventDefault();
          selectCurrentGate();
          break;
        case 'Delete':
          // Delete selected element
          event.preventDefault();
          deleteSelectedElement();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardNavigation, circuit.gates]);

  const navigateToNextGate = () => {
    const currentIndex = circuit.gates.findIndex(gate => gate.id === selectedGateId);
    const nextIndex = (currentIndex + 1) % circuit.gates.length;
    const nextGate = circuit.gates[nextIndex];
    onGateSelect(nextGate.id);
    announce(`Selected ${nextGate.type} gate`, 'polite');
  };

  const navigateToPreviousGate = () => {
    const currentIndex = circuit.gates.findIndex(gate => gate.id === selectedGateId);
    const prevIndex = currentIndex <= 0 ? circuit.gates.length - 1 : currentIndex - 1;
    const prevGate = circuit.gates[prevIndex];
    onGateSelect(prevGate.id);
    announce(`Selected ${prevGate.type} gate`, 'polite');
  };

  const selectCurrentGate = () => {
    if (selectedGateId) {
      const gate = circuit.gates.find(g => g.id === selectedGateId);
      if (gate) {
        announce(`${gate.type} gate selected. Press Delete to remove.`, 'assertive');
      }
    }
  };

  const deleteSelectedElement = () => {
    if (selectedGateId) {
      announce('Gate deleted', 'assertive');
      // Trigger delete action
    } else if (selectedWireId) {
      announce('Wire deleted', 'assertive');
      // Trigger delete action
    }
  };

  return (
    <div role="application" aria-label="Circuit design canvas">
      <div id="circuit-description" className="sr-only">
        {circuitDescription}
      </div>

      <canvas
        ref={canvasRef}
        aria-labelledby="circuit-description"
        aria-describedby="circuit-instructions"
        tabIndex={0}
        role="img"
        aria-live="polite"
      />

      <div id="circuit-instructions" className="sr-only">
        Use arrow keys to navigate gates. Press Enter to select. Press Delete to remove selected element.
        Use mouse to interact with gates and wires.
      </div>

      {/* Live region for dynamic updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {selectedGateId && `Gate ${selectedGateId} is selected`}
        {selectedWireId && `Wire ${selectedWireId} is selected`}
      </div>
    </div>
  );
}
```

---

## 12.2 Internationalization Implementation

**Requirements:** Multi-language support starting with English, Spanish, Mandarin, and French, with easy extensibility for additional languages.

### i18n Infrastructure

```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const resources = {
  en: {
    translation: {
      // Common UI elements
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.create": "Create",
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",

      // Circuit operations
      "circuit.title": "Circuit Design",
      "circuit.new": "New Circuit",
      "circuit.open": "Open Circuit",
      "circuit.save": "Save Circuit",
      "circuit.export": "Export Circuit",
      "circuit.simulate": "Run Simulation",
      "circuit.stop": "Stop Simulation",
      "circuit.reset": "Reset Circuit",

      // Gate types
      "gate.nand": "NAND Gate",
      "gate.and": "AND Gate",
      "gate.or": "OR Gate",
      "gate.not": "NOT Gate",
      "gate.xor": "XOR Gate",
      "gate.dff": "D Flip-Flop",

      // Error messages
      "error.circuitLoadFailed": "Failed to load circuit",
      "error.simulationFailed": "Simulation failed",
      "error.saveFailed": "Failed to save circuit",

      // Accessibility
      "a11y.skipToContent": "Skip to main content",
      "a11y.skipToNavigation": "Skip to navigation",
      "a11y.circuitDescription": "Interactive circuit design canvas",
    }
  },
  es: {
    translation: {
      "common.save": "Guardar",
      "common.cancel": "Cancelar",
      "common.delete": "Eliminar",
      "common.edit": "Editar",
      "common.create": "Crear",
      "circuit.title": "Diseño de Circuito",
      "circuit.simulate": "Ejecutar Simulación",
      // Complete Spanish translations...
    }
  },
  zh: {
    translation: {
      "common.save": "保存",
      "common.cancel": "取消",
      "common.delete": "删除",
      "circuit.title": "电路设计",
      "circuit.simulate": "运行仿真",
      // Complete Mandarin translations...
    }
  },
  fr: {
    translation: {
      "common.save": "Enregistrer",
      "common.cancel": "Annuler",
      "common.delete": "Supprimer",
      "circuit.title": "Conception de Circuit",
      "circuit.simulate": "Lancer la Simulation",
      // Complete French translations...
    }
  }
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    // Language detection
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'nand2fun-language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React integration
    react: {
      useSuspense: false,
    },
  });

export default i18n;
```

### Translation Management

```typescript
// src/i18n/hooks/useTranslation.ts
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useCallback } from 'react';

export function useTranslation(namespace?: string) {
  const { t, i18n } = useI18nextTranslation(namespace);

  const changeLanguage = useCallback(async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      localStorage.setItem('nand2fun-language', language);

      // Announce language change for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.textContent = t('language.changed', { lng: language });
      document.body.appendChild(announcement);

      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [i18n, t]);

  const getAvailableLanguages = useCallback(() => [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'zh', name: 'Mandarin', nativeName: '中文' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
  ], []);

  const isRTL = useCallback((language?: string) => {
    const lng = language || i18n.language;
    return ['ar', 'he', 'fa', 'ur'].includes(lng.split('-')[0]);
  }, [i18n.language]);

  return {
    t,
    changeLanguage,
    currentLanguage: i18n.language,
    getAvailableLanguages,
    isRTL: isRTL(),
    isRTLForLanguage: isRTL,
  };
}

// src/components/LanguageSwitcher/LanguageSwitcher.tsx
import { useTranslation } from '../../i18n/hooks/useTranslation';

export function LanguageSwitcher() {
  const { changeLanguage, currentLanguage, getAvailableLanguages } = useTranslation();
  const languages = getAvailableLanguages();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}
```

### Localized Content and Formatting

```typescript
// src/utils/localization.ts
export class LocalizationUtils {
  static formatNumber(num: number, locale: string): string {
    return new Intl.NumberFormat(locale).format(num);
  }

  static formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  static formatRelativeTime(date: Date, locale: string): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diff = date.getTime() - Date.now();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (Math.abs(diffDays) < 1) return rtf.format(0, 'day');
    return rtf.format(diffDays, 'day');
  }

  static getLocaleDirection(locale: string): 'ltr' | 'rtl' {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
    return rtlLanguages.includes(locale.split('-')[0]) ? 'rtl' : 'ltr';
  }

  static formatCircuitStats(stats: CircuitStats, locale: string): string {
    const gateCount = this.formatNumber(stats.gateCount, locale);
    const wireCount = this.formatNumber(stats.wireCount, locale);

    return `${gateCount} gates, ${wireCount} wires`;
  }
}

// Usage in components
export function CircuitStats({ stats }: { stats: CircuitStats }) {
  const { t, currentLanguage } = useTranslation();

  return (
    <div dir={LocalizationUtils.getLocaleDirection(currentLanguage)}>
      <p>
        {t('circuit.stats', {
          stats: LocalizationUtils.formatCircuitStats(stats, currentLanguage)
        })}
      </p>
      <p>
        {t('circuit.lastModified', {
          date: LocalizationUtils.formatRelativeTime(stats.lastModified, currentLanguage)
        })}
      </p>
    </div>
  );
}
```

### RTL Language Support

```typescript
// src/styles/rtl.css
/* RTL language support */
[dir="rtl"] {
  text-align: right;
}

[dir="rtl"] .circuit-canvas {
  /* Flip circuit layout for RTL languages */
  transform: scaleX(-1);
}

[dir="rtl"] .gate {
  /* Adjust gate positioning for RTL */
  transform: scaleX(-1);
}

[dir="rtl"] .menu {
  /* RTL menu positioning */
  left: auto;
  right: 0;
}

/* RTL-specific component styles */
[dir="rtl"] .button-group {
  flex-direction: row-reverse;
}

[dir="rtl"] .icon-text {
  flex-direction: row-reverse;
}

/* Animation adjustments for RTL */
[dir="rtl"] .slide-in-left {
  animation: slide-in-right 0.3s ease-out;
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

---

## 12.3 Accessibility Testing Integration

**Requirements:** Automated accessibility testing integrated into development workflow.

### axe-core Integration

```typescript
// src/testing/accessibility/axe-config.ts
export const axeConfig = {
  rules: [
    { id: 'color-contrast', enabled: true },
    { id: 'button-name', enabled: true },
    { id: 'image-alt', enabled: true },
    { id: 'link-name', enabled: true },
    { id: 'heading-order', enabled: true },
    { id: 'keyboard', enabled: true },
    { id: 'focus-order-semantics', enabled: true },
  ],
  disableOtherRules: false,
  reporter: 'v2',
};

// src/testing/accessibility/accessibility-test.ts
import axe from 'axe-core';

export class AccessibilityTester {
  static async testComponent(
    componentElement: HTMLElement,
    options: {
      rules?: axe.RuleObject[];
      include?: string[];
      exclude?: string[];
    } = {}
  ): Promise<axe.AxeResults> {
    const config = {
      ...axeConfig,
      rules: options.rules || axeConfig.rules,
    };

    return axe.run(componentElement, {
      ...config,
      include: options.include,
      exclude: options.exclude,
    });
  }

  static async testPage(): Promise<axe.AxeResults> {
    return axe.run(document);
  }

  static generateReport(results: axe.AxeResults): AccessibilityReport {
    const violations = results.violations.map(violation => ({
      rule: violation.id,
      description: violation.description,
      impact: violation.impact,
      elements: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
      help: violation.help,
      helpUrl: violation.helpUrl,
    }));

    const passes = results.passes.map(pass => ({
      rule: pass.id,
      description: pass.description,
      elements: pass.nodes.length,
    }));

    return {
      violations,
      passes,
      score: this.calculateAccessibilityScore(results),
      summary: {
        totalViolations: violations.length,
        totalPasses: passes.length,
        criticalIssues: violations.filter(v => v.impact === 'critical').length,
        seriousIssues: violations.filter(v => v.impact === 'serious').length,
      },
    };
  }

  private static calculateAccessibilityScore(results: axe.AxeResults): number {
    const totalChecks = results.passes.length + results.violations.length;
    const weightedScore = results.passes.reduce((score, pass) => {
      const weight = this.getRuleWeight(pass.id);
      return score + weight;
    }, 0);

    return Math.round((weightedScore / totalChecks) * 100);
  }

  private static getRuleWeight(ruleId: string): number {
    const weights: Record<string, number> = {
      'color-contrast': 1.0,
      'button-name': 1.0,
      'image-alt': 1.0,
      'keyboard': 1.0,
      // Add weights for other rules
    };

    return weights[ruleId] || 0.5;
  }
}
```

### Playwright Accessibility Tests

```typescript
// e2e/accessibility/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Circuit design page meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude(['.skip-link']) // Skip elements that are intentionally hidden
      .analyze();

    // Log results for debugging
    console.log('Accessibility violations:', accessibilityScanResults.violations);

    // Assert no critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);

    // Assert no serious violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'serious'
    );
    expect(seriousViolations).toHaveLength(0);

    // Allow minor violations but log them
    const minorViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'minor'
    );
    if (minorViolations.length > 0) {
      console.warn(`Found ${minorViolations.length} minor accessibility violations`);
    }
  });

  test('Keyboard navigation works throughout the application', async ({ page }) => {
    await page.goto('/');

    // Start keyboard navigation
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Navigate through main interactive elements
    const tabbableElements = await page.locator('[tabindex]:not([tabindex="-1"]), button, [href], input, select, textarea');
    const elementCount = await tabbableElements.count();

    // Test tab navigation through all elements
    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      await expect(focused).toBeVisible();
    }
  });

  test('Screen reader announcements work correctly', async ({ page }) => {
    await page.goto('/');

    // Test circuit creation announcement
    await page.click('[data-testid="new-circuit-button"]');

    // Check for aria-live announcements
    const liveRegion = await page.locator('[aria-live]');
    await expect(liveRegion).toBeVisible();

    // Test keyboard navigation announcements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100); // Allow time for announcement

    // Verify screen reader content updates
    const announcement = await liveRegion.textContent();
    expect(announcement).toBeTruthy();
  });

  test('High contrast mode works correctly', async ({ page, context }) => {
    // Set high contrast preference
    await context.addInitScript(() => {
      Object.defineProperty(window.matchMedia, 'matches', {
        writable: true,
        value: true,
      });
    });

    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

    // Check that high contrast styles are applied
    const body = await page.locator('body');
    const hasHighContrast = await body.evaluate(el =>
      window.getComputedStyle(el).getPropertyValue('--high-contrast-mode') === 'true'
    );

    // This would require custom CSS properties for high contrast detection
    // expect(hasHighContrast).toBe(true);
  });
});
```

---

## 12.4 Phase 12 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| A11y infrastructure setup | 6h | - | - | Accessibility hooks and utilities working |
| WCAG AA audit baseline | 4h | Infrastructure | - | Current accessibility status documented |
| Keyboard navigation implementation | 8h | Audit | - | All interactive elements keyboard accessible |
| Screen reader support | 8h | Keyboard | - | ARIA labels complete, announcements working |
| Color contrast fixes | 6h | Screen reader | - | 4.5:1 contrast ratio across all components |
| Focus management | 6h | Contrast | - | Visible focus indicators, logical tab order |
| Skip links implementation | 2h | Focus | - | Navigation shortcuts added |
| Circuit canvas accessibility | 8h | Skip links | - | Keyboard navigation for circuit elements |
| i18n library setup | 4h | - | - | react-i18next configured with language detection |
| Translation files creation | 12h | Setup | - | English/Spanish/Mandarin/French translations |
| Language switcher UI | 4h | Files | - | Language selector with persistence |
| Localized formatting | 4h | Switcher | - | Numbers, dates, currencies localized |
| RTL language support | 6h | Formatting | - | Arabic/Hebrew layout support |
| Pluralization and context | 4h | RTL | - | Complex translation rules working |
| Translation testing | 6h | Context | - | Missing keys detected, consistency verified |
| Accessibility testing CI | 6h | All translations | - | axe-core integrated into test suite |
| Screen reader testing | 4h | CI | - | Automated screen reader compatibility |
| Manual accessibility testing | 8h | Screen reader | - | Human testing with assistive technologies |
| Accessibility documentation | 4h | Manual testing | - | Guidelines for developers |

**Total Estimated Effort:** ~116 hours (5.5 weeks with 1 developer)  
**Performance Budget:** <10ms language switching, <50ms accessibility checks  
**Quality Gates:** WCAG 2.1 AA compliance verified, multi-language support functional, screen reader compatibility confirmed

---

## Risk Mitigation

**Translation Quality:** Implement review process for translations and use native speakers for validation.

**Accessibility Complexity:** Start with automated testing and gradually improve based on user feedback.

**RTL Layout Challenges:** Test extensively with RTL languages to ensure proper layout and interaction.

**Screen Reader Compatibility:** Use multiple screen readers during testing (NVDA, JAWS, VoiceOver).

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 11: Deployment & Production](phase-11-deployment-production.md)  
**Next:** [Phase 13: Advanced Performance & PWA](phase-13-advanced-performance-pwa.md)
