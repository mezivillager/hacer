# Phase 13: Advanced Performance & PWA (Weeks 39-41)

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Priority:** 🟢 MEDIUM  
**Timeline:** Weeks 39-41  
**Dependencies:** Phase 11 complete (production deployment working)

---

## Overview

This phase transforms Nand2Fun into a Progressive Web App (PWA) with advanced performance optimizations, offline functionality, and service worker caching. It achieves sub-second loading times and enables the application to work offline for extended periods.

**Exit Criteria:**
- Progressive Web App fully installable and functional
- Offline circuit editing with automatic synchronization
- Advanced bundle optimization reducing load times by 60%
- Service worker caching all critical resources
- Performance scores >90 on Lighthouse audits

---

## 13.1 Progressive Web App Implementation

**Requirements:** Full PWA capabilities with offline support, installability, and background synchronization.

### PWA Manifest and Service Worker

```typescript
// public/manifest.json
{
  "name": "Nand2Fun - Digital Circuit Design",
  "short_name": "Nand2Fun",
  "description": "Build complete computers from NAND gates - Learn computer science through interactive circuit design",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "categories": ["education", "productivity", "developer tools"],
  "lang": "en-US",
  "dir": "ltr",

  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],

  "screenshots": [
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Circuit design interface on desktop"
    },
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Circuit design interface on mobile"
    }
  ],

  "shortcuts": [
    {
      "name": "New Circuit",
      "short_name": "New",
      "description": "Create a new circuit",
      "url": "/?action=new",
      "icons": [{ "src": "/icons/new-circuit.png", "sizes": "96x96" }]
    },
    {
      "name": "Open Circuit",
      "short_name": "Open",
      "description": "Open an existing circuit",
      "url": "/?action=open",
      "icons": [{ "src": "/icons/open-circuit.png", "sizes": "96x96" }]
    }
  ],

  "related_applications": [
    {
      "platform": "webapp",
      "url": "https://nand2fun.com/manifest.json"
    }
  ],

  "prefer_related_applications": false
}
```

### Advanced Service Worker Implementation

```typescript
// public/sw.js
const CACHE_VERSION = 'v2.1.0';
const STATIC_CACHE = `nand2fun-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `nand2fun-dynamic-${CACHE_VERSION}`;
const API_CACHE = `nand2fun-api-${CACHE_VERSION}`;
const CIRCUIT_CACHE = `nand2fun-circuits-${CACHE_VERSION}`;

// Critical resources that must be cached immediately
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Resources for offline functionality
const OFFLINE_RESOURCES = [
  '/offline.html',
  '/static/js/offline.js',
  '/static/css/offline.css',
  '/icons/offline-icon.png',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/circuits',
  '/api/components',
  '/api/user/profile',
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    Promise.all([
      // Cache critical resources
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),

      // Cache offline resources
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('[SW] Caching offline resources');
        return cache.addAll(OFFLINE_RESOURCES);
      }),
    ]).then(() => {
      console.log('[SW] All critical resources cached');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE &&
              cacheName !== CIRCUIT_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.includes('/circuits/') || url.pathname.endsWith('.circuit')) {
    event.respondWith(handleCircuitRequest(request));
  } else if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
  } else if (request.destination === 'script' ||
             request.destination === 'style' ||
             request.destination === 'image' ||
             request.destination === 'font') {
    event.respondWith(handleAssetRequest(request));
  } else {
    event.respondWith(fetch(request));
  }
});

// API request handling with background sync
async function handleApiRequest(request) {
  try {
    // Try network first for API calls
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);

    // Try cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If this is a mutation request, queue for later
    if (request.method !== 'GET') {
      await queueForSync(request);
    }

    throw error;
  }
}

// Circuit file handling
async function handleCircuitRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CIRCUIT_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return a basic circuit template for new circuits
    return new Response(JSON.stringify({
      schemaVersion: 1,
      metadata: {
        name: 'New Circuit',
        description: 'Created offline',
        createdAt: new Date().toISOString(),
      },
      gates: [],
      wires: [],
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Document request handling with offline fallback
async function handleDocumentRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    return cache.match('/offline.html') || new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Asset request handling with cache-first strategy
async function handleAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if we should update in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {
      // Ignore background update failures
    });

    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a placeholder for images, empty response for others
    if (request.destination === 'image') {
      return new Response('', { status: 404 });
    }
    throw error;
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(processQueuedRequests());
  }
});

async function queueForSync(request) {
  const db = await openIndexedDB('nand2fun-sync', 1);
  const store = db.transaction('requests', 'readwrite').objectStore('requests');

  await store.add({
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now(),
  });
}

async function processQueuedRequests() {
  const db = await openIndexedDB('nand2fun-sync', 1);
  const store = db.transaction('requests', 'readonly').objectStore('requests');
  const requests = await store.getAll();

  for (const queuedRequest of requests) {
    try {
      const response = await fetch(queuedRequest.url, {
        method: queuedRequest.method,
        headers: queuedRequest.headers,
        body: queuedRequest.body,
      });

      if (response.ok) {
        // Remove from queue
        const deleteStore = db.transaction('requests', 'readwrite').objectStore('requests');
        await deleteStore.delete(queuedRequest.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync request:', queuedRequest.url, error);
    }
  }
}

// IndexedDB helper
function openIndexedDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}
```

### PWA Installability and Updates

```typescript
// src/hooks/usePWA.ts
import { useState, useEffect } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export function usePWA(): PWAState & {
  install: () => Promise<void>;
  update: () => void;
} {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    updateAvailable: false,
    installPrompt: null,
  });

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;

    setState(prev => ({
      ...prev,
      isInstalled: isStandalone || isInWebAppiOS,
    }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e,
      }));
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    // Listen for service worker updates
    const handleUpdateAvailable = () => {
      setState(prev => ({ ...prev, updateAvailable: true }));
    };

    // Listen for online/offline status
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('updateavailable', handleUpdateAvailable);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    setState(prev => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('updateavailable', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async () => {
    if (!state.installPrompt) return;

    state.installPrompt.prompt();
    const { outcome } = await state.installPrompt.userChoice;

    if (outcome === 'accepted') {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    }
  };

  const update = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
      });
    }
    setState(prev => ({ ...prev, updateAvailable: false }));
    window.location.reload();
  };

  return { ...state, install, update };
}

// src/components/PWAInstallPrompt/PWAInstallPrompt.tsx
import { usePWA } from '../../hooks/usePWA';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isOffline, updateAvailable, install, update } = usePWA();

  if (isInstalled && !updateAvailable) return null;

  return (
    <div className="pwa-prompt">
      {updateAvailable && (
        <div className="update-banner">
          <p>A new version is available!</p>
          <button onClick={update}>Update Now</button>
        </div>
      )}

      {isInstallable && (
        <div className="install-banner">
          <p>Install Nand2Fun for the best experience!</p>
          <button onClick={install}>Install</button>
        </div>
      )}

      {isOffline && (
        <div className="offline-banner">
          <p>You're currently offline. Some features may be limited.</p>
        </div>
      )}
    </div>
  );
}
```

---

## 13.2 Advanced Bundle Optimization

**Requirements:** Sub-second loading times through intelligent code splitting, resource optimization, and caching strategies.

### Intelligent Code Splitting

```typescript
// src/utils/codeSplitting.ts
export class CodeSplittingManager {
  private loadedModules = new Set<string>();
  private moduleCache = new Map<string, any>();

  // Preload critical modules
  async preloadCriticalModules(): Promise<void> {
    const criticalModules = [
      'src/components/CircuitCanvas/CircuitCanvas.tsx',
      'src/components/GatePalette/GatePalette.tsx',
      'src/core/simulation/engine.ts',
    ];

    await Promise.all(
      criticalModules.map(module => this.preloadModule(module))
    );
  }

  // Dynamic import with caching
  async loadModule<T = any>(modulePath: string): Promise<T> {
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }

    if (this.loadedModules.has(modulePath)) {
      // Module is loading, wait for it
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (this.moduleCache.has(modulePath)) {
            resolve(this.moduleCache.get(modulePath));
          } else {
            setTimeout(checkLoaded, 10);
          }
        };
        checkLoaded();
      });
    }

    this.loadedModules.add(modulePath);

    try {
      const module = await import(/* @vite-ignore */ modulePath);
      this.moduleCache.set(modulePath, module.default || module);
      return module.default || module;
    } catch (error) {
      this.loadedModules.delete(modulePath);
      throw error;
    }
  }

  // Route-based code splitting
  async loadRouteComponent(route: string): Promise<React.ComponentType> {
    const routeMap: Record<string, string> = {
      '/': 'src/pages/Home/Home.tsx',
      '/circuit': 'src/pages/CircuitEditor/CircuitEditor.tsx',
      '/gallery': 'src/pages/Gallery/Gallery.tsx',
      '/tutorials': 'src/pages/Tutorials/Tutorials.tsx',
      '/settings': 'src/pages/Settings/Settings.tsx',
    };

    const modulePath = routeMap[route];
    if (!modulePath) {
      throw new Error(`No component found for route: ${route}`);
    }

    return this.loadModule(modulePath);
  }

  // Feature-based code splitting
  async loadFeature(feature: string): Promise<any> {
    const featureMap: Record<string, string> = {
      '3d-renderer': 'src/features/3DRenderer/3DRenderer.tsx',
      'simulation': 'src/features/Simulation/SimulationEngine.ts',
      'collaboration': 'src/features/Collaboration/CollaborationManager.ts',
      'export': 'src/features/Export/ExportManager.ts',
    };

    const modulePath = featureMap[feature];
    if (!modulePath) {
      throw new Error(`No feature found: ${feature}`);
    }

    return this.loadModule(modulePath);
  }

  // Clear cache (useful for development)
  clearCache(): void {
    this.loadedModules.clear();
    this.moduleCache.clear();
  }
}

// src/hooks/useCodeSplitting.ts
import { useState, useEffect } from 'react';
import { CodeSplittingManager } from '../utils/codeSplitting';

const splittingManager = new CodeSplittingManager();

export function useCodeSplitting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Preload critical modules on app start
    splittingManager.preloadCriticalModules().catch(console.error);
  }, []);

  const loadComponent = async <T,>(componentPath: string): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      const component = await splittingManager.loadModule<T>(componentPath);
      return component;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoute = async (route: string): Promise<React.ComponentType> => {
    return loadComponent<React.ComponentType>(`src/pages/${route}/index.tsx`);
  };

  const loadFeature = async (feature: string): Promise<any> => {
    return loadComponent(`src/features/${feature}/index.ts`);
  };

  return {
    loadComponent,
    loadRoute,
    loadFeature,
    isLoading,
    error,
  };
}
```

### Resource Optimization Pipeline

```typescript
// scripts/optimize-resources.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { minify } = require('terser');
const csso = require('csso');

class ResourceOptimizer {
  constructor(buildDir = 'dist') {
    this.buildDir = buildDir;
  }

  async optimizeAll() {
    console.log('🚀 Starting resource optimization...');

    await Promise.all([
      this.optimizeImages(),
      this.optimizeJavaScript(),
      this.optimizeCSS(),
      this.optimizeFonts(),
      this.generateWebP(),
      this.createResourceHints(),
    ]);

    console.log('✅ Resource optimization complete');
  }

  async optimizeImages() {
    console.log('🖼️ Optimizing images...');

    const imageDir = path.join(this.buildDir, 'images');
    if (!fs.existsSync(imageDir)) return;

    const images = this.findFiles(imageDir, /\.(jpg|jpeg|png|gif)$/i);

    for (const image of images) {
      const buffer = fs.readFileSync(image);
      const optimized = await sharp(buffer)
        .jpeg({ quality: 80, progressive: true })
        .png({ compressionLevel: 9 })
        .toBuffer();

      fs.writeFileSync(image, optimized);
      console.log(`  Optimized: ${path.basename(image)}`);
    }
  }

  async optimizeJavaScript() {
    console.log('📜 Optimizing JavaScript...');

    const jsDir = path.join(this.buildDir, 'assets');
    const jsFiles = this.findFiles(jsDir, /\.js$/);

    for (const file of jsFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const minified = await minify(code, {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        mangle: true,
      });

      if (minified.code) {
        fs.writeFileSync(file, minified.code);
        console.log(`  Minified: ${path.basename(file)}`);
      }
    }
  }

  async optimizeCSS() {
    console.log('🎨 Optimizing CSS...');

    const cssDir = path.join(this.buildDir, 'assets');
    const cssFiles = this.findFiles(cssDir, /\.css$/);

    for (const file of cssFiles) {
      const css = fs.readFileSync(file, 'utf8');
      const minified = csso.minify(css).css;

      fs.writeFileSync(file, minified);
      console.log(`  Minified: ${path.basename(file)}`);
    }
  }

  async optimizeFonts() {
    console.log('🔤 Optimizing fonts...');

    const fontDir = path.join(this.buildDir, 'fonts');
    if (!fs.existsSync(fontDir)) return;

    const fonts = this.findFiles(fontDir, /\.(woff|woff2|ttf|otf)$/i);

    for (const font of fonts) {
      // Convert to WOFF2 if not already
      if (!font.endsWith('.woff2')) {
        const buffer = fs.readFileSync(font);
        const woff2Buffer = await this.convertToWoff2(buffer);

        const woff2Path = font.replace(/\.(woff|ttf|otf)$/, '.woff2');
        fs.writeFileSync(woff2Path, woff2Buffer);
        console.log(`  Converted to WOFF2: ${path.basename(woff2Path)}`);
      }
    }
  }

  async generateWebP() {
    console.log('🌐 Generating WebP images...');

    const imageDir = path.join(this.buildDir, 'images');
    if (!fs.existsSync(imageDir)) return;

    const images = this.findFiles(imageDir, /\.(jpg|jpeg|png)$/i);

    for (const image of images) {
      const webpPath = image.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      await sharp(image)
        .webp({ quality: 80 })
        .toFile(webpPath);

      console.log(`  Generated WebP: ${path.basename(webpPath)}`);
    }
  }

  async createResourceHints() {
    console.log('🔗 Creating resource hints...');

    const indexPath = path.join(this.buildDir, 'index.html');
    if (!fs.existsSync(indexPath)) return;

    let html = fs.readFileSync(indexPath, 'utf8');

    // Add preload hints for critical resources
    const preloadHints = `
    <link rel="preload" href="/static/js/bundle.js" as="script" crossorigin>
    <link rel="preload" href="/static/css/main.css" as="style">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="//api.nand2fun.com">
    `;

    // Insert before closing head tag
    html = html.replace('</head>', `${preloadHints}</head>`);

    fs.writeFileSync(indexPath, html);
    console.log('  Added resource hints to index.html');
  }

  findFiles(dir, pattern) {
    const files = [];

    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (pattern.test(item)) {
          files.push(fullPath);
        }
      }
    }

    traverse(dir);
    return files;
  }

  async convertToWoff2(buffer) {
    // Use a WOFF2 conversion library or tool
    // This is a placeholder implementation
    return buffer;
  }
}

// Run optimization
const optimizer = new ResourceOptimizer();
optimizer.optimizeAll().catch(console.error);
```

### Performance Monitoring Integration

```typescript
// src/utils/performance/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
    this.setupVitals();
  }

  private setupObservers() {
    // Navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordMetric('navigation', 'loadTime', navEntry.loadEventEnd - navEntry.loadEventStart);
          this.recordMetric('navigation', 'domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
          this.recordMetric('navigation', 'firstPaint', navEntry.responseStart - navEntry.fetchStart);
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
          this.recordMetric('resource', entry.name, resourceEntry.duration);
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);

    // Long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('longtask', 'duration', entry.duration);
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.push(longTaskObserver);
  }

  private setupVitals() {
    // Load web-vitals dynamically
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => this.reportWebVital('CLS', metric));
      getFID((metric) => this.reportWebVital('FID', metric));
      getFCP((metric) => this.reportWebVital('FCP', metric));
      getLCP((metric) => this.reportWebVital('LCP', metric));
      getTTFB((metric) => this.reportWebVital('TTFB', metric));
    });
  }

  private recordMetric(category: string, name: string, value: number) {
    const key = `${category}.${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const values = this.metrics.get(key)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  private reportWebVital(name: string, metric: any) {
    this.recordMetric('web-vitals', name, metric.value);

    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: name,
        value: Math.round(metric.value * 100) / 100,
        custom_map: {
          metric_rating: metric.rating,
        },
      });
    }

    // Log poor performance
    if (metric.rating === 'poor') {
      console.warn(`Poor ${name}: ${metric.value}`);
    }
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, any> = {};

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

  getPerformanceScore(): number {
    const metrics = this.getMetrics();

    // Calculate overall performance score based on key metrics
    const scores = [];

    // Core Web Vitals weights
    if (metrics['web-vitals.LCP']) {
      const lcp = metrics['web-vitals.LCP'].avg;
      scores.push(lcp < 2500 ? 100 : lcp < 4000 ? 75 : 50); // LCP score
    }

    if (metrics['web-vitals.FID']) {
      const fid = metrics['web-vitals.FID'].avg;
      scores.push(fid < 100 ? 100 : fid < 300 ? 75 : 50); // FID score
    }

    if (metrics['web-vitals.CLS']) {
      const cls = metrics['web-vitals.CLS'].avg;
      scores.push(cls < 0.1 ? 100 : cls < 0.25 ? 75 : 50); // CLS score
    }

    // Load time score
    if (metrics['navigation.loadTime']) {
      const loadTime = metrics['navigation.loadTime'].avg;
      scores.push(loadTime < 2000 ? 100 : loadTime < 4000 ? 75 : 50);
    }

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
```

---

## 13.3 Phase 13 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| PWA manifest creation | 2h | - | - | Web app manifest valid and comprehensive |
| Service worker implementation | 8h | Manifest | <50KB service worker | Advanced caching working |
| Offline fallback pages | 4h | Service worker | - | Graceful offline experience |
| Background sync setup | 6h | Fallback | - | Circuit saves sync when offline |
| PWA install prompts | 4h | Background sync | - | App installable on desktop/mobile |
| Bundle analysis tools | 4h | - | - | Webpack Bundle Analyzer integrated |
| Code splitting strategy | 8h | Analysis | <2MB initial bundle | Route/feature-based splitting |
| Image optimization pipeline | 6h | Splitting | <500KB images | WebP generation and lazy loading |
| Font optimization | 4h | Images | <50KB fonts | WOFF2 conversion and subsetting |
| Critical CSS inlining | 4h | Fonts | <14KB initial CSS | Above-the-fold optimization |
| Resource hints implementation | 3h | Critical CSS | <100ms first paint | Preload/prefetch configured |
| Compression setup | 2h | Resource hints | <1MB total gzip | Brotli + gzip compression |
| Performance monitoring | 6h | Compression | - | Real-time metrics collection |
| Web Vitals tracking | 4h | Monitoring | - | Core Web Vitals monitored |
| Lighthouse CI integration | 4h | Web Vitals | >90 Lighthouse score | Automated performance testing |
| Offline testing | 4h | Lighthouse | - | Offline functionality verified |
| PWA testing across devices | 6h | Offline testing | - | Cross-platform compatibility |

**Total Estimated Effort:** ~85 hours (4 weeks with 1 developer)  
**Performance Budget:** <2s Lighthouse scores, <200ms first paint, <2MB initial bundle, <1MB total gzip  
**Quality Gates:** PWA installable, offline functional, 90+ Lighthouse scores, Web Vitals monitored

---

## Risk Mitigation

**Service Worker Complexity:** Start with simple caching strategy and gradually add advanced features with thorough testing.

**Bundle Size Explosion:** Implement strict size budgets and regular analysis to prevent uncontrolled growth.

**Offline Synchronization Issues:** Design conflict resolution strategies and test extensively with network interruptions.

**Browser Compatibility:** Test PWA features across major browsers and provide fallbacks for unsupported features.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 12: Accessibility & Internationalization](phase-12-accessibility-i18n.md)  
**Next:** [Phase 14: Security & Privacy](phase-14-security-privacy.md)
