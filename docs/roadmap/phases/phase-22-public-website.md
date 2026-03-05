# Phase 22: Public Website & Documentation Platform (Weeks 68-72)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 68-72
**Dependencies:** Phase 23 complete (documentation automation working), Phase 13 complete (production deployment ready)
**Effort:** ~120 hours

---

## Overview

This phase establishes HACER's public presence with a professional website and comprehensive documentation platform. The website serves as the primary marketing and onboarding hub, while the integrated documentation system provides guides, tutorials, API references, and interactive examples. Both grow alongside the application development and are accessible from the main app.

**Exit Criteria:**
- Professional public website deployed and accessible at hacer.com
- Complete documentation system with guides, tutorials, and API references
- Integrated navigation between website, docs, and application
- SEO optimized with Lighthouse scores >90
- Mobile-responsive design across all devices
- Analytics and user feedback collection implemented

---

## 19.1 Public Website Architecture

**Requirements:** Modern, professional website that converts visitors to users while effectively communicating HACER's educational value proposition.

### Next.js 15 Website Implementation

```typescript
// apps/website/package.json
{
  "name": "@hacer/website",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "preview": "next build && next start",
    "analyze": "ANALYZE=true next build"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@hacer/ui": "workspace:*",
    "@hacer/docs": "workspace:*",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.344.0",
    "clsx": "^2.1.0",
    "tailwindcss": "^3.4.0",
    "next-themes": "^0.3.0",
    "next-intl": "^3.0.0",
    "@vercel/analytics": "^1.2.0",
    "@vercel/speed-insights": "^1.0.0",
    "react-intersection-observer": "^9.8.0",
    "react-markdown": "^9.0.0",
    "gray-matter": "^4.0.3",
    "prism-react-renderer": "^2.3.0",
    "react-syntax-highlighter": "^15.5.0",
    "react-share": "^5.1.0",
    "react-use": "^17.5.0"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

#### Website Configuration and Structure

```typescript
// apps/website/next.config.mjs
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'hacer.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3000'}/api/:path*`,
      },
      {
        source: '/docs/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer
    if (process.env.ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: './analyze/client.html',
        })
      );
    }

    // SVG optimization
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

#### Component Architecture

```typescript
// apps/website/src/components/layout/Layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { SkipToContent } from './SkipToContent';
import { CookieBanner } from '../legal/CookieBanner';
import { useAnalytics } from '@/hooks/useAnalytics';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { trackPageView } = useAnalytics();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    trackPageView(pathname);
  }, [pathname, trackPageView]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const isDocsPage = pathname?.startsWith('/docs');
  const isAppPage = pathname?.startsWith('/app');

  return (
    <>
      <SkipToContent />
      <Header variant={isDocsPage ? 'docs' : 'marketing'} />

      <main
        id="main-content"
        className={`${isDocsPage ? 'docs-layout' : 'marketing-layout'} ${
          isAppPage ? 'app-layout' : ''
        }`}
      >
        {children}
      </main>

      <Footer variant={isDocsPage ? 'docs' : 'marketing'} />
      <CookieBanner />
    </>
  );
}
```

#### Header Navigation Component

```typescript
// apps/website/src/components/layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Github, Twitter, DiscIcon as Discord } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface HeaderProps {
  variant: 'marketing' | 'docs';
}

export function Header({ variant }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = {
    marketing: [
      { name: 'Features', href: '#features' },
      { name: 'Learn', href: '#learn' },
      { name: 'Documentation', href: '/docs' },
      { name: 'Community', href: '#community' },
    ],
    docs: [
      { name: 'Guides', href: '/docs/guides' },
      { name: 'API Reference', href: '/docs/api' },
      { name: 'Tutorials', href: '/docs/tutorials' },
      { name: 'Community', href: '/community' },
    ],
  };

  const headerClasses = `fixed top-0 w-full z-50 transition-all duration-300 ${
    scrolled || scrollDirection === 'up'
      ? 'bg-background/80 backdrop-blur-md border-b shadow-sm'
      : 'bg-transparent'
  } ${scrollDirection === 'down' && scrolled ? '-translate-y-full' : 'translate-y-0'}`;

  return (
    <header className={headerClasses}>
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="font-bold text-xl">HACER</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation[variant].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <LanguageSwitcher />

            {/* Social Links */}
            <div className="hidden sm:flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://github.com/hacer/hacer" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://discord.gg/hacer" target="_blank" rel="noopener noreferrer">
                  <Discord className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* CTA Button */}
            <Button asChild>
              <Link href="/app">
                Launch App
              </Link>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t bg-background/95 backdrop-blur-md"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation[variant].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Mobile Social Links */}
                <div className="flex space-x-2 px-3 py-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://github.com/hacer/hacer" target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://discord.gg/hacer" target="_blank" rel="noopener noreferrer">
                      <Discord className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
```

### Marketing Pages Implementation

```typescript
// apps/website/src/components/sections/HeroSection.tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CircuitAnimation } from '@/components/animations/CircuitAnimation';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export function HeroSection() {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <CircuitAnimation />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/70 z-10" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isIntersecting ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Build Computers from
            <br />
            First Principles
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Learn computer science by building complete computing systems from NAND gates.
            Interactive circuit design, software stack integration, and AI-powered learning.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-4" asChild>
              <Link href="/app">
                Start Building
              </Link>
            </Button>

            <Button size="lg" variant="outline" className="text-lg px-8 py-4" asChild>
              <Link href="/docs/getting-started">
                View Documentation
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Trusted by developers and educators worldwide
            </p>

            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-bold text-2xl text-foreground">10K+</div>
                <div>Circuits Built</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-foreground">50K+</div>
                <div>Students</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-foreground">100+</div>
                <div>Educators</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
      >
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 h-3 bg-muted-foreground/50 rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  );
}
```

#### Features Section with Interactive Demos

```typescript
// apps/website/src/components/sections/FeaturesSection.tsx
'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { CircuitBoard, Cpu, Code2, Users, BookOpen, Zap, Shield, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InteractiveDemo } from '@/components/demos/InteractiveDemo';

const features = [
  {
    icon: CircuitBoard,
    title: 'Interactive Circuit Design',
    description: 'Build and simulate digital circuits with drag-and-drop components. Real-time evaluation and debugging.',
    demo: 'circuit-builder',
    tags: ['Visual', 'Real-time', 'Educational'],
  },
  {
    icon: Cpu,
    title: 'Complete Computer Architecture',
    description: 'From basic gates to ALU, CPU, and memory systems. Learn how computers work at the hardware level.',
    demo: 'cpu-architecture',
    tags: ['Architecture', 'Hardware', 'Systems'],
  },
  {
    icon: Code2,
    title: 'Software Stack Integration',
    description: 'Assembler, VM, compiler, and high-level language support. See the full software-hardware connection.',
    demo: 'software-stack',
    tags: ['Assembler', 'Compiler', 'VM'],
  },
  {
    icon: Users,
    title: 'Collaborative Learning',
    description: 'Work together on complex circuits. Real-time collaboration with voice/video and shared editing.',
    demo: 'collaboration',
    tags: ['Real-time', 'Teamwork', 'Communication'],
  },
  {
    icon: BookOpen,
    title: 'AI-Powered Learning',
    description: 'Personalized learning paths, intelligent hints, and adaptive difficulty based on your progress.',
    demo: 'ai-learning',
    tags: ['AI', 'Personalized', 'Adaptive'],
  },
  {
    icon: Zap,
    title: 'Performance & Scale',
    description: 'Handle complex circuits with WebAssembly acceleration and optimized rendering.',
    demo: 'performance',
    tags: ['WebAssembly', 'Optimization', 'Scale'],
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level security with end-to-end encryption, audit trails, and compliance features.',
    demo: 'security',
    tags: ['Security', 'Compliance', 'Enterprise'],
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform Access',
    description: 'Seamlessly work on desktop, tablet, or mobile with responsive design and offline capabilities.',
    demo: 'mobile',
    tags: ['Responsive', 'Offline', 'Cross-platform'],
  },
];

export function FeaturesSection() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Build Computers
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            HACER provides the complete toolkit for learning computer science through hands-on building.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isSelected = selectedFeature === index;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                  onClick={() => {
                    setSelectedFeature(isSelected ? null : index);
                    setActiveDemo(isSelected ? null : feature.demo);
                  }}
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {feature.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {feature.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Interactive Demo Area */}
        {activeDemo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-lg border p-8"
          >
            <InteractiveDemo demo={activeDemo} />
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <h3 className="text-2xl font-bold mb-4">Ready to Start Building?</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of learners building the future of computing education.
          </p>
          <Button size="lg" asChild>
            <Link href="/app">
              Launch HACER
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
```

---

## 19.2 Integrated Documentation System

**Requirements:** Comprehensive documentation that serves both developers building on HACER and learners using the platform, with seamless integration between website and docs.

### Nextra Documentation Setup

```typescript
// packages/docs/package.json
{
  "name": "@hacer/docs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev -p 3002",
    "start": "next start -p 3002",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "generate-api-docs": "tsx scripts/generate-api-docs.ts",
    "generate-component-docs": "tsx scripts/generate-component-docs.ts",
    "validate-links": "remark docs --use remark-validate-links",
    "check-broken-links": "tsx scripts/check-broken-links.ts"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "nextra": "^3.0.0",
    "nextra-theme-docs": "^3.0.0",
    "@hacer/ui": "workspace:*",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "remark-validate-links": "^13.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-raw": "^7.0.0",
    "gray-matter": "^4.0.3",
    "@types/mdx": "^2.0.0",
    "prism-react-renderer": "^2.3.0",
    "react-syntax-highlighter": "^15.5.0",
    "lucide-react": "^0.344.0",
    "clsx": "^2.1.0"
  }
}
```

#### Enhanced Documentation Theme

```typescript
// packages/docs/theme.config.tsx
import { DocsThemeConfig, useConfig } from 'nextra-theme-docs';
import { useRouter } from 'next/router';
import { Logo } from './components/Logo';
import { Footer } from './components/Footer';
import { Search } from './components/Search';
import { ThemeToggle } from './components/ThemeToggle';

const config: DocsThemeConfig = {
  logo: <Logo />,
  project: {
    link: 'https://github.com/hacer/hacer',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  docsRepositoryBase: 'https://github.com/hacer/hacer/blob/main/docs',
  footer: {
    component: Footer,
  },
  navigation: {
    prev: true,
    next: true,
  },
  search: {
    component: Search,
  },
  sidebar: {
    titleComponent: ({ title, type }) => {
      if (type === 'separator') {
        return <span className="font-semibold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</span>;
      }
      return <>{title}</>;
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
    float: true,
    title: 'On this page',
  },
  editLink: {
    text: 'Edit this page on GitHub',
  },
  feedback: {
    content: 'Was this page helpful?',
    labels: 'feedback',
  },
  gitTimestamp: ({ timestamp }) => (
    <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
      Last updated: {new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </div>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Comprehensive documentation for HACER - Build computers from first principles" />
      <meta name="keywords" content="documentation, nand2tetris, circuit design, computer science, API, guides, tutorials" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </>
  ),
  useNextSeoProps: () => ({
    titleTemplate: '%s – HACER Documentation',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: 'https://hacer.com/docs',
      siteName: 'HACER Documentation',
      images: [
        {
          url: 'https://hacer.com/og-docs.png',
          width: 1200,
          height: 630,
          alt: 'HACER Documentation',
        },
      ],
    },
  }),
  banner: {
    key: 'beta-banner',
    text: (
      <a href="https://github.com/hacer/hacer/discussions" target="_blank" rel="noopener noreferrer">
        💬 Help us improve our documentation →
      </a>
    ),
  },
};

export default config;
```

#### Documentation Content Strategy

```
docs/
├── getting-started/
│   ├── index.mdx
│   ├── quick-start.mdx
│   ├── first-circuit.mdx
│   ├── interface-tour.mdx
│   └── troubleshooting.mdx
├── guides/
│   ├── circuit-design/
│   │   ├── basic-gates.mdx
│   │   ├── combinational-circuits.mdx
│   │   ├── sequential-circuits.mdx
│   │   └── debugging-circuits.mdx
│   ├── computer-architecture/
│   │   ├── memory-systems.mdx
│   │   ├── cpu-design.mdx
│   │   ├── instruction-set.mdx
│   │   └── io-devices.mdx
│   ├── software-stack/
│   │   ├── assembler.mdx
│   │   ├── virtual-machine.mdx
│   │   ├── compiler.mdx
│   │   └── high-level-language.mdx
│   ├── collaboration/
│   │   ├── real-time-editing.mdx
│   │   ├── voice-communication.mdx
│   │   ├── team-workspaces.mdx
│   │   └── conflict-resolution.mdx
│   └── deployment/
│       ├── hosting-options.mdx
│       ├── custom-domains.mdx
│       ├── backup-strategies.mdx
│       └── scaling.mdx
├── tutorials/
│   ├── beginner/
│   │   ├── build-and-gate.mdx
│   │   ├── create-half-adder.mdx
│   │   ├── make-flip-flop.mdx
│   │   └── design-counter.mdx
│   ├── intermediate/
│   │   ├── alu-construction.mdx
│   │   ├── memory-unit.mdx
│   │   ├── cpu-architecture.mdx
│   │   └── assembler-basics.mdx
│   └── advanced/
│       ├── compiler-design.mdx
│       ├── operating-system.mdx
│       ├── graphics-programming.mdx
│       └── network-protocols.mdx
├── api-reference/
│   ├── circuit-api.mdx
│   ├── simulation-api.mdx
│   ├── collaboration-api.mdx
│   ├── authentication-api.mdx
│   ├── webhooks-api.mdx
│   └── sdk-reference.mdx
├── advanced/
│   ├── custom-components.mdx
│   ├── plugin-development.mdx
│   ├── ai-integration.mdx
│   ├── performance-optimization.mdx
│   ├── security-best-practices.mdx
│   └── contributing.mdx
├── examples/
│   ├── circuit-examples/
│   │   ├── arithmetic-logic-unit.mdx
│   │   ├── random-access-memory.mdx
│   │   ├── central-processing-unit.mdx
│   │   └── complete-computer.mdx
│   ├── code-examples/
│   │   ├── basic-api-usage.mdx
│   │   ├── custom-plugin.mdx
│   │   ├── authentication-flow.mdx
│   │   └── webhook-integration.mdx
│   └── project-templates/
│       ├── educational-project.mdx
│       ├── research-project.mdx
│       └── enterprise-integration.mdx
├── changelog.mdx
├── roadmap.mdx
├── faq.mdx
└── community.mdx
```

#### Interactive Code Examples

```typescript
// docs/components/InteractiveExample.tsx
'use client';

import { useState, useEffect } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { Button } from '@hacer/ui';
import { Play, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface InteractiveExampleProps {
  title: string;
  description?: string;
  code: string;
  language?: 'javascript' | 'typescript' | 'python' | 'java';
  dependencies?: Record<string, string>;
  showConsole?: boolean;
  showPreview?: boolean;
}

export function InteractiveExample({
  title,
  description,
  code,
  language = 'typescript',
  dependencies = {},
  showConsole = true,
  showPreview = true,
}: InteractiveExampleProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the code manually',
        variant: 'destructive',
      });
    }
  };

  const defaultDependencies = {
    '@hacer/core': 'latest',
    '@hacer/ui': 'latest',
    'react': '^18.0.0',
    'react-dom': '^18.0.0',
  };

  const allDependencies = { ...defaultDependencies, ...dependencies };

  return (
    <div className="interactive-example border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      <Sandpack
        template="react-ts"
        files={{
          '/App.tsx': code,
        }}
        customSetup={{
          dependencies: allDependencies,
        }}
        options={{
          showNavigator: false,
          showTabs: false,
          showConsole: showConsole,
          showPreview: showPreview,
          showConsoleButton: showConsole,
          showRefreshButton: true,
          externalResources: [
            'https://cdn.tailwindcss.com',
          ],
        }}
        theme="dark"
        className="h-96"
      />
    </div>
  );
}
```

### API Documentation Generation

```typescript
// packages/docs/scripts/generate-api-docs.ts
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { OpenAPI } from 'openapi-types';
import { generateMarkdown } from './utils/markdown-generator';
import { extractEndpoints } from './utils/endpoint-extractor';

async function generateAPIDocs() {
  console.log('🔄 Generating API documentation...');

  try {
    // Load OpenAPI spec
    const openAPISpec: OpenAPI.Document = await loadOpenAPISpec();

    // Extract endpoints
    const endpoints = extractEndpoints(openAPISpec);

    // Generate documentation for each endpoint
    for (const endpoint of endpoints) {
      const markdown = generateMarkdown(endpoint);
      const filePath = join('docs', 'api-reference', `${endpoint.id}.mdx`);

      writeFileSync(filePath, markdown, 'utf8');
      console.log(`✅ Generated ${endpoint.id}.mdx`);
    }

    // Generate API overview
    const overviewMarkdown = generateAPIOverview(endpoints);
    writeFileSync(join('docs', 'api-reference', 'index.mdx'), overviewMarkdown, 'utf8');

    console.log('🎉 API documentation generated successfully');
  } catch (error) {
    console.error('❌ Failed to generate API docs:', error);
    process.exit(1);
  }
}

async function loadOpenAPISpec(): Promise<OpenAPI.Document> {
  // Load from API or local file
  const response = await fetch('http://localhost:3000/api/docs/openapi.json');
  if (!response.ok) {
    throw new Error('Failed to load OpenAPI spec');
  }
  return response.json();
}

generateAPIDocs();
```

---

## 19.3 Website Analytics & Performance Monitoring

**Requirements:** Comprehensive analytics for user behavior, performance monitoring, and continuous improvement insights.

### Advanced Analytics Implementation

```typescript
// apps/website/src/hooks/useAnalytics.ts
'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

interface UserProperties {
  userId?: string;
  userType?: 'student' | 'educator' | 'developer' | 'anonymous';
  experience?: 'beginner' | 'intermediate' | 'advanced';
  subscription?: 'free' | 'pro' | 'enterprise';
}

export function useAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views
  const trackPageView = useCallback((page: string) => {
    track('page_view', {
      page,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Track user interactions
  const trackInteraction = useCallback((event: AnalyticsEvent) => {
    track(`interaction_${event.name}`, {
      ...event.properties,
      page: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  // Track feature usage
  const trackFeatureUsage = useCallback((feature: string, properties?: Record<string, any>) => {
    track('feature_used', {
      feature,
      ...properties,
      page: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  // Track conversions
  const trackConversion = useCallback((conversion: string, value?: number) => {
    track('conversion', {
      conversion,
      value,
      page: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  // Track user properties
  const setUserProperties = useCallback((properties: UserProperties) => {
    // Store in localStorage for persistence
    localStorage.setItem('user_properties', JSON.stringify(properties));

    track('user_identified', {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Track errors
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    track('error_occurred', {
      error: error.message,
      stack: error.stack,
      ...context,
      page: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  // Track performance
  const trackPerformance = useCallback((metric: string, value: number, properties?: Record<string, any>) => {
    track('performance_metric', {
      metric,
      value,
      ...properties,
      page: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  // Track outbound links
  const trackOutboundLink = useCallback((url: string, properties?: Record<string, any>) => {
    track('outbound_link_clicked', {
      url,
      ...properties,
      page: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  // Auto-track page views
  useEffect(() => {
    trackPageView(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''));
  }, [pathname, searchParams, trackPageView]);

  // Track time on page
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const timeSpent = Date.now() - startTime;
      track('time_on_page', {
        page: pathname,
        timeSpent,
        timestamp: new Date().toISOString(),
      });
    };
  }, [pathname]);

  return {
    trackPageView,
    trackInteraction,
    trackFeatureUsage,
    trackConversion,
    setUserProperties,
    trackError,
    trackPerformance,
    trackOutboundLink,
  };
}
```

#### Performance Monitoring Dashboard

```typescript
// apps/website/src/components/analytics/PerformanceDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { LineChart, BarChart, PieChart } from '@/components/charts';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  interactionToNextPaint: number;
  lighthouseScore: number;
  coreWebVitals: {
    cls: number;
    fid: number;
    lcp: number;
  };
}

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number }>;
  userJourney: Array<{ step: string; dropoff: number }>;
  deviceBreakdown: Record<string, number>;
  geographicData: Array<{ country: string; visitors: number }>;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [metricsResponse, analyticsResponse] = await Promise.all([
        fetch('/api/analytics/performance'),
        fetch('/api/analytics/website'),
      ]);

      if (metricsResponse.ok) {
        setMetrics(await metricsResponse.json());
      }

      if (analyticsResponse.ok) {
        setAnalytics(await analyticsResponse.json());
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceGrade = (score: number): { grade: string; color: string } => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600' };
    if (score >= 80) return { grade: 'B', color: 'text-yellow-600' };
    if (score >= 70) return { grade: 'C', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="performance-dashboard space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Load Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.pageLoadTime.toFixed(1)}s</div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt;2.5s
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lighthouse Score</CardTitle>
                <Badge className={getPerformanceGrade(metrics.lighthouseScore).color}>
                  {getPerformanceGrade(metrics.lighthouseScore).grade}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.lighthouseScore}</div>
                <p className="text-xs text-muted-foreground">
                  Overall performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Core Web Vitals</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${metrics.coreWebVitals.cls > 0.1 || metrics.coreWebVitals.fid > 100 || metrics.coreWebVitals.lcp > 2500 ? 'text-red-500' : 'text-green-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>CLS:</span>
                    <span className={metrics.coreWebVitals.cls > 0.1 ? 'text-red-500' : 'text-green-500'}>
                      {metrics.coreWebVitals.cls.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>FID:</span>
                    <span className={metrics.coreWebVitals.fid > 100 ? 'text-red-500' : 'text-green-500'}>
                      {metrics.coreWebVitals.fid.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>LCP:</span>
                    <span className={metrics.coreWebVitals.lcp > 2500 ? 'text-red-500' : 'text-green-500'}>
                      {(metrics.coreWebVitals.lcp / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? (analytics.conversionRate * 100).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Sign-ups from visitors
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Page Views Over Time</CardTitle>
            <CardDescription>Daily page views for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={[]} // Would be populated with real data
              xKey="date"
              yKey="views"
              height={300}
            />
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.topPages.slice(0, 5).map((page, index) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    <span className="text-sm">{page.page}</span>
                  </div>
                  <Badge variant="secondary">{page.views}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Visitor traffic by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart
              data={Object.entries(analytics?.deviceBreakdown || {}).map(([device, count]) => ({
                name: device,
                value: count,
              }))}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Geographic Data */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Top countries by visitor count</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={analytics?.geographicData.slice(0, 10) || []}
              xKey="country"
              yKey="visitors"
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={loadDashboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
        <Button asChild>
          <a href="/admin/analytics" target="_blank">
            View Full Analytics
          </a>
        </Button>
      </div>
    </div>
  );
}
```

---

## 19.4 Phase 19 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Next.js website architecture | 12h | - | <3s initial page load | Website framework configured with all pages |
| Hero & marketing sections | 16h | Architecture | - | Professional landing page with compelling CTAs |
| Features showcase with demos | 14h | Marketing sections | <2s feature interactions | Interactive feature demonstrations working |
| Navigation & header system | 8h | Features | - | Responsive navigation with proper routing |
| Footer & legal pages | 6h | Navigation | - | Complete footer with links and legal compliance |
| Nextra docs integration | 10h | - | <2s docs page load | Documentation system fully integrated |
| Content structure & organization | 12h | Nextra | - | Complete documentation hierarchy with navigation |
| Getting started guides | 16h | Content structure | - | Comprehensive onboarding documentation |
| API reference generation | 14h | Guides | - | Auto-generated API docs with examples |
| Interactive tutorials | 20h | API reference | - | Step-by-step tutorials with live code examples |
| Search functionality | 8h | Tutorials | <500ms search response | Full-text search across all documentation |
| Version management | 6h | Search | - | Documentation versioning and branching |
| Analytics implementation | 10h | Version management | - | User behavior tracking and conversion analytics |
| Performance monitoring | 8h | Analytics | >90 Lighthouse scores | Website performance monitoring and optimization |
| SEO optimization | 8h | Performance | >90 Lighthouse SEO | SEO-optimized pages with proper meta tags |
| Mobile responsiveness testing | 6h | SEO | - | Cross-device compatibility verified |
| Accessibility audit | 6h | Mobile testing | WCAG AA compliant | Website accessibility verified |
| Content management system | 8h | Accessibility | - | Easy content updates and maintenance |
| Deployment pipeline | 6h | Content management | <5min deploy time | Automated deployment with previews |
| Error monitoring | 4h | Deployment | - | Error tracking and alerting configured |

**Total Estimated Effort:** ~120 hours (5 weeks)  
**Performance Budget:** <3s homepage, <2s docs, <500ms search, >90 Lighthouse scores  
**Quality Gates:** Professional website live, comprehensive documentation available, analytics collecting data, SEO optimized

---

## Risk Mitigation

**Content Maintenance:** Implement automated content validation and broken link detection to prevent documentation drift.

**SEO Performance:** Regular SEO audits and performance monitoring to maintain search rankings and user experience.

**Analytics Privacy:** Implement proper consent management and GDPR compliance for user tracking.

**Mobile Compatibility:** Test extensively across devices and browsers to ensure consistent experience.

**Documentation Accuracy:** Establish review processes and automated validation to keep documentation current with code changes. 

---

**Part of:** [Comprehensive Development Roadmap](../README.md)  
**Previous:** [Phase 21: Advanced Performance & PWA](phase-21-advanced-performance-pwa.md)  
**Next:** [Phase 23: Documentation Automation & AI Agents](phase-23-docs-automation.md)