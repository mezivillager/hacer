# Phase 13: Deployment & Production (Weeks 45-47)

**Part of:** [Comprehensive Development Roadmap](../../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 45-47
**Dependencies:** Phase 12 complete (backend working), Phase 4.5 complete (release management established)

---

## Overview

This phase establishes production-ready deployment infrastructure with monitoring, error tracking, and analytics. It evaluates deployment platforms and implements automated deployment pipelines with comprehensive production monitoring.

**Exit Criteria:**
- Production deployment pipeline operational with automated deployments
- Error tracking and performance monitoring implemented
- Privacy-focused analytics configured
- Performance: <2s Lighthouse scores, <100ms API response times

---

## 11.1 Deployment Platform Analysis & Selection

**Requirements:** Choose cost-effective, feature-rich deployment platform for hobby project with production scaling potential.

### Platform Comparison Matrix

| Platform | Free Tier | Build Time | Bandwidth | Custom Domain | Database | Functions | CDN | Recommendation |
|----------|-----------|------------|-----------|---------------|----------|-----------|-----|----------------|
| **Vercel** | 100GB bandwidth<br>$0/month | <30s | 100GB | ✅ | ❌ (external) | ✅ Edge | ✅ | 🥇 **Primary** |
| **Netlify** | 100GB bandwidth<br>$0/month | <45s | 100GB | ✅ | ❌ (external) | ✅ | ✅ | 🥈 **Secondary** |
| **Railway** | $5/month credit | <60s | Unlimited | ✅ | ✅ PostgreSQL | ❌ | ❌ | ❌ Expensive |
| **Render** | 750 hours/month | <90s | Unlimited | ✅ | ✅ PostgreSQL | ✅ | ❌ | ❌ Limited hours |
| **Fly.io** | $5/month credit | <45s | Unlimited | ✅ | ✅ PostgreSQL | ✅ | ✅ | ❌ Expensive |
| **GitHub Pages** | Unlimited | <60s | 100GB | ✅ (custom) | ❌ | ❌ | ✅ | ❌ No functions |
| **Surge** | Unlimited static | <30s | Unlimited | ✅ | ❌ | ❌ | ✅ | ❌ No SSR/functions |

### Selected Platform: Vercel

**Rationale:**
- **Free tier generous enough** for initial development and testing
- **Excellent performance** with global CDN and edge functions
- **React/Vite optimized** with automatic deployments
- **Analytics and monitoring** built-in
- **Easy scaling path** to paid tiers when needed
- **Developer experience** with preview deployments

**Migration Path:**
1. Start with free tier for development
2. Upgrade to Pro ($20/month) for production traffic
3. Scale to Enterprise when needed for advanced features

---

## 11.2 Production Build Optimization

**Requirements:** Optimized production builds with performance monitoring and bundle analysis.

### Vite Production Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Optimize React for production
      jsxRuntime: 'automatic',
      fastRefresh: mode === 'development',
    }),

    // Bundle analysis
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    // Compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // PWA support (for future Phase 13)
    mode === 'production' && VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.nand2fun\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: mode === 'production' ? 'hidden' : true,

    rollupOptions: {
      output: {
        // Code splitting strategy
        manualChunks: {
          // Core libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-state': ['zustand', 'immer'],

          // 3D libraries
          'vendor-three': ['@react-three/fiber', '@react-three/drei'],

          // UI libraries
          'vendor-ui': ['@headlessui/react', 'framer-motion'],

          // Utilities
          'vendor-utils': ['lodash-es', 'date-fns'],

          // Large libraries
          'vendor-mdx': ['@mdx-js/react'],
        },

        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
      },
    },

    // Performance budgets
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false, // We use visualizer instead
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@react-three/fiber',
      'zustand',
      'immer',
      // Pre-bundle large dependencies
    ],
    exclude: [
      // Don't pre-bundle large libraries that are rarely used
      '@mdx-js/react',
    ],
  },
}));
```

### Performance Monitoring Configuration

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private observers: PerformanceObserver[] = [];
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.setupObservers();
    this.setupWebVitals();
  }

  private setupObservers(): void {
    // Core Web Vitals
    const cwvObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('cwv', entry.name, entry.value);
      }
    });
    cwvObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(cwvObserver);

    // Navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordMetric('navigation', 'loadTime', navEntry.loadEventEnd - navEntry.loadEventStart);
          this.recordMetric('navigation', 'domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
        }
      }
    });
    navObserver.observe({ entryTypes: ['navigation'] });
    this.observers.push(navObserver);

    // Resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordMetric('resource', resourceEntry.name, resourceEntry.duration);
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  private setupWebVitals(): void {
    // Load web-vitals library dynamically
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => this.sendToAnalytics('CLS', metric));
      getFID((metric) => this.sendToAnalytics('FID', metric));
      getFCP((metric) => this.sendToAnalytics('FCP', metric));
      getLCP((metric) => this.sendToAnalytics('LCP', metric));
      getTTFB((metric) => this.sendToAnalytics('TTFB', metric));
    });
  }

  private recordMetric(category: string, name: string, value: number): void {
    const key = `${category}.${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(value);

    // Keep only last 100 measurements
    if (this.metrics.get(key)!.length > 100) {
      this.metrics.get(key)!.shift();
    }
  }

  private sendToAnalytics(metricName: string, metric: any): void {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: {
          metric_value: metric.value,
          metric_delta: metric.delta,
          metric_rating: metric.rating,
        },
      });
    }

    // Send to error tracking if poor performance
    if (metric.rating === 'poor' && window.Sentry) {
      window.Sentry.captureMessage(`Poor ${metric.name}: ${metric.value}`, 'warning');
    }
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [key, values] of this.metrics.entries()) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      result[key] = {
        avg: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: values.length,
      };
    }

    return result;
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Initialize performance monitoring
export const performanceMonitor = new PerformanceMonitor();
```

---

## 11.3 Error Tracking & Monitoring

**Requirements:** Production error tracking with context and debugging information.

### Sentry Configuration

```typescript
// src/utils/error-tracking.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initErrorTracking(): void {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,

    // Performance monitoring
    integrations: [
      new BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/api\.nand2fun\.com\//,
        ],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance sample rate
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Error sample rate
    sampleRate: 1.0,

    // Session replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Error filtering
    beforeSend: (event, hint) => {
      // Don't send errors in development
      if (import.meta.env.DEV) {
        return null;
      }

      // Add custom context
      event.tags = {
        ...event.tags,
        circuit_count: getCircuitCount(),
        user_type: getUserType(),
      };

      event.extra = {
        ...event.extra,
        url: window.location.href,
        userAgent: navigator.userAgent,
        circuit_state: getCurrentCircuitState(),
      };

      return event;
    },

    // Performance filtering
    beforeSendTransaction: (transaction) => {
      // Filter out fast transactions
      if (transaction.duration < 100) {
        return null;
      }

      return transaction;
    },
  });

  // Capture console errors in production
  if (import.meta.env.PROD) {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);

      // Send to Sentry if it's an error
      if (args[0] instanceof Error) {
        Sentry.captureException(args[0]);
      } else if (typeof args[0] === 'string' && args[0].includes('Error')) {
        Sentry.captureMessage(args.join(' '), 'error');
      }
    };
  }
}

// Helper functions for context
function getCircuitCount(): number {
  try {
    // Get from circuit store
    return 0; // Placeholder
  } catch {
    return 0;
  }
}

function getUserType(): string {
  // Determine user type (anonymous, registered, etc.)
  return 'anonymous';
}

function getCurrentCircuitState(): any {
  try {
    // Get sanitized circuit state for debugging
    return {}; // Placeholder
  } catch {
    return null;
  }
}
```

### Error Boundary Implementation

```typescript
// src/components/ErrorBoundary/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReport = (): void => {
    if (this.state.error) {
      Sentry.showReportDialog({
        title: 'Something went wrong',
        subtitle: 'Our team has been notified.',
        subtitle2: 'If you\'d like to help, tell us what happened below.',
        labelName: 'Name',
        labelEmail: 'Email',
        labelComments: 'What happened?',
        labelClose: 'Close',
        labelSubmit: 'Submit',
        errorGeneric: 'An unknown error occurred while processing your request.',
        successMessage: 'Your feedback has been sent. Thank you!',
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__content">
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>

            <div className="error-boundary__actions">
              <button
                className="error-boundary__retry-btn"
                onClick={this.handleRetry}
                type="button"
              >
                Try Again
              </button>

              <button
                className="error-boundary__report-btn"
                onClick={this.handleReport}
                type="button"
              >
                Report Issue
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary__details">
                <summary>Error Details (Development)</summary>
                <pre className="error-boundary__stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
```

---

## 11.4 Analytics & User Tracking

**Requirements:** Privacy-focused analytics that respects user consent and GDPR.

### Google Analytics 4 Configuration

```typescript
// src/utils/analytics.ts
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export class Analytics {
  private initialized = false;
  private consentGiven = false;

  init(): void {
    if (this.initialized) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];

    // Initialize gtag function
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Configure GA4
    window.gtag('js', new Date());
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      // Privacy-focused configuration
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_features: false,
      allow_ad_personalization_signals: false,

      // Custom settings
      send_page_view: false, // We'll send manually
      custom_map: {
        dimension1: 'user_type',
        dimension2: 'circuit_complexity',
        dimension3: 'theme_preference',
      },
    });

    this.initialized = true;

    // Check for existing consent
    this.checkConsent();
  }

  setConsent(consent: boolean): void {
    this.consentGiven = consent;

    if (consent) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        functionality_storage: 'granted',
        personalization_storage: 'denied',
        security_storage: 'granted',
      });

      // Send page view now that consent is given
      this.pageView();
    } else {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
        security_storage: 'denied',
      });
    }

    // Store consent preference
    localStorage.setItem('analytics-consent', consent.toString());
  }

  private checkConsent(): void {
    const storedConsent = localStorage.getItem('analytics-consent');
    if (storedConsent !== null) {
      this.setConsent(storedConsent === 'true');
    }
  }

  pageView(path?: string): void {
    if (!this.consentGiven) return;

    window.gtag('event', 'page_view', {
      page_path: path || window.location.pathname,
      page_title: document.title,
    });
  }

  trackEvent(
    eventName: string,
    parameters: Record<string, any> = {}
  ): void {
    if (!this.consentGiven) return;

    window.gtag('event', eventName, {
      ...parameters,
      timestamp: Date.now(),
    });
  }

  // Circuit-specific events
  trackCircuitEvent(
    action: 'created' | 'loaded' | 'saved' | 'simulated' | 'exported',
    circuitData: {
      gateCount: number;
      complexity: 'simple' | 'medium' | 'complex';
      hasSequential?: boolean;
    }
  ): void {
    this.trackEvent(`circuit_${action}`, {
      gate_count: circuitData.gateCount,
      complexity: circuitData.complexity,
      has_sequential: circuitData.hasSequential || false,
    });
  }

  trackSimulationEvent(
    duration: number,
    gateCount: number,
    success: boolean
  ): void {
    this.trackEvent('simulation_run', {
      duration_ms: Math.round(duration),
      gate_count: gateCount,
      success,
      performance_rating: duration < 16 ? 'excellent' :
                          duration < 50 ? 'good' : 'needs_improvement',
    });
  }

  trackError(
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>
  ): void {
    this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100), // Truncate for privacy
      ...context,
    });
  }

  // Performance tracking
  trackWebVitals(metric: {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  }): void {
    this.trackEvent('web_vitals', {
      metric_name: metric.name,
      metric_value: Math.round(metric.value),
      metric_rating: metric.rating,
    });
  }
}

// Initialize analytics
export const analytics = new Analytics();
```

### Cookie Consent Implementation

```typescript
// src/components/CookieConsent/CookieConsent.tsx
import { useState, useEffect } from 'react';
import { analytics } from '../../utils/analytics';

export function CookieConsent(): JSX.Element | null {
  const [showConsent, setShowConsent] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: false,
    functional: true, // Always required
  });

  useEffect(() => {
    // Check if consent already given
    const consentGiven = localStorage.getItem('cookie-consent-given');
    if (!consentGiven) {
      // Show consent after a delay to not interrupt immediately
      const timer = setTimeout(() => setShowConsent(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = (): void => {
    setPreferences({ analytics: true, functional: true });
    applyConsent({ analytics: true, functional: true });
    setShowConsent(false);
  };

  const handleAcceptNecessary = (): void => {
    setPreferences({ analytics: false, functional: true });
    applyConsent({ analytics: false, functional: true });
    setShowConsent(false);
  };

  const handleCustomize = (): void => {
    // Could open a detailed preferences modal
    // For now, just toggle analytics
    setPreferences(prev => ({ ...prev, analytics: !prev.analytics }));
  };

  const applyConsent = (prefs: typeof preferences): void => {
    // Apply analytics consent
    analytics.setConsent(prefs.analytics);

    // Store consent
    localStorage.setItem('cookie-consent-given', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(prefs));

    // Track consent event
    if (prefs.analytics) {
      analytics.trackEvent('cookie_consent_given', {
        analytics_consent: true,
        consent_type: 'all',
      });
    }
  };

  if (!showConsent) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite">
      <div className="cookie-consent__content">
        <h3 className="cookie-consent__title">Cookie Preferences</h3>
        <p className="cookie-consent__description">
          We use cookies to enhance your experience. Analytics cookies help us understand
          how you use the site, while functional cookies are required for basic operation.
        </p>

        <div className="cookie-consent__options">
          <div className="cookie-option">
            <input
              type="checkbox"
              id="functional-cookies"
              checked={preferences.functional}
              disabled
              readOnly
            />
            <label htmlFor="functional-cookies">
              <strong>Functional Cookies</strong> - Required for the site to work
            </label>
          </div>

          <div className="cookie-option">
            <input
              type="checkbox"
              id="analytics-cookies"
              checked={preferences.analytics}
              onChange={handleCustomize}
            />
            <label htmlFor="analytics-cookies">
              <strong>Analytics Cookies</strong> - Help us improve the site
            </label>
          </div>
        </div>

        <div className="cookie-consent__actions">
          <button
            className="cookie-consent__btn cookie-consent__btn--secondary"
            onClick={handleAcceptNecessary}
          >
            Accept Necessary Only
          </button>
          <button
            className="cookie-consent__btn cookie-consent__btn--primary"
            onClick={handleAcceptAll}
          >
            Accept All
          </button>
        </div>

        <button
          className="cookie-consent__close"
          onClick={() => setShowConsent(false)}
          aria-label="Close cookie preferences"
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

---

## 11.5 Deployment Pipeline Implementation

**Requirements:** Automated deployment with preview environments and rollback capabilities.

### Vercel Deployment Configuration

```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": null,
  "functions": {
    "src/pages/api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

### GitHub Actions Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging

concurrency:
  group: production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment || 'production' }}
      url: ${{ steps.deploy.outputs.url }}

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

      - name: Run type checking
        run: npm run type-check

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test:unit -- --coverage

      - name: Build application
        run: npm run build
        env:
          VITE_APP_VERSION: ${{ github.sha }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          VITE_GA_MEASUREMENT_ID: ${{ secrets.GA_MEASUREMENT_ID }}

      - name: Deploy to Vercel
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./

      - name: Run E2E tests on production
        run: npm run test:e2e:ci
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

      - name: Notify deployment success
        if: success()
        run: |
          curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚀 Nand2Fun deployed successfully to ${{ steps.deploy.outputs.url }}"}' \
            ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify deployment failure
        if: failure()
        run: |
          curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"❌ Nand2Fun deployment failed"}' \
            ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 11.6 Phase 11 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Deployment platform analysis | 2h | Phase 7 complete | - | Vercel selected with migration plan |
| Vercel project setup | 2h | Analysis | - | Account configured, domains set |
| Environment variables setup | 3h | Project setup | - | Secrets configured securely |
| Build optimization | 6h | Variables | <2MB bundle | Production build tuned |
| Performance monitoring setup | 4h | Optimization | - | Web Vitals tracking active |
| Error tracking configuration | 3h | Monitoring | - | Sentry configured with context |
| Error boundary implementation | 4h | Error tracking | - | Production error handling |
| Analytics setup | 4h | Error boundaries | - | GA4 configured with consent |
| Cookie consent implementation | 3h | Analytics | - | GDPR-compliant consent flow |
| Deployment pipeline creation | 4h | Cookie consent | <3min deploy | GitHub Actions working |
| Preview deployment setup | 2h | Pipeline | - | PR previews functional |
| Rollback strategy | 2h | Preview setup | - | Deploy rollback working |
| Health checks implementation | 3h | Rollback | - | Automated monitoring |
| Production testing | 4h | Health checks | - | E2E tests on production |
| Documentation updates | 2h | Production testing | - | Deployment docs complete |
| Monitoring dashboard | 2h | Documentation | - | Production metrics visible |

**Total Estimated Effort:** ~50 hours (2.5 weeks with 1 developer)  
**Performance Budget:** <2s Lighthouse scores, <100ms API response times, <2MB bundle size  
**Quality Gates:** Automated deployment working, error tracking active, privacy compliance maintained

---

## Risk Mitigation

**Deployment Platform Limits:** Start with free tier and have clear upgrade path to paid plans when needed.

**Privacy Compliance:** Implement cookie consent and analytics controls from day one to avoid GDPR issues.

**Production Monitoring Gap:** Set up error tracking and performance monitoring before launch to catch issues early.

**Rollback Complexity:** Implement simple rollback mechanisms and test them regularly.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 10: Developer Tooling](phase-10-developer-tooling.md)  
**Next:** [Phase 12: Accessibility & Internationalization](phase-12-accessibility-i18n.md)
