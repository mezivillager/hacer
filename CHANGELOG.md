# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Phase 0.5 (Nand2Tetris Foundation) is in progress: HDL parser, test script engine, sequential logic, chip hierarchy.

## Phase 0.25 -- UI/UX Improvements & Grid-Based Circuit Design

### Added

- 3D logic gate simulator with React Three Fiber
- Gate types: NAND, AND, OR, NOT, XOR
- Grid-based gate placement, movement, and rotation
- Wire connections between gates with grid-aligned routing
- Junction nodes and I/O nodes for circuit building
- Wire selection and deletion
- Real-time logic simulation with visual feedback (red = 0, green = 1)
- Zustand state management with React Compiler (automatic memoization)
- TDD workflow with Vitest unit tests and Playwright E2E tests
- Mutation testing with Stryker
- Pre-commit hooks via Husky (lint-staged, typecheck, test file checks)
- Comprehensive roadmap documentation (25 phases)

## Phase 0 -- Critical Fixes

### Added

- Project foundation and architecture
- TypeScript strict mode configuration with project references
- ESLint with React Compiler plugin
- `.cursorrules` for AI agent development workflow
- `REPO_MAP.md` for codebase navigation
- Documentation: testing standards, roadmap, TypeScript guidelines
