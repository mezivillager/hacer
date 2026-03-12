# HACER Repository Map

This document helps AI agents and developers understand the codebase structure and navigate the repository effectively across all development phases.

## ⚠️ IMPORTANT: Phase Tracking & Maintenance

**Last Updated:** 2026-03-12  
**Current Phase:** Phase 0.25 (Complete) ✅ → Phase 0.5 (In Progress)  
**Next Phase:** Phase 0.5: Nand2Tetris Foundation

### Phase Status Indicators
- ✅ **Current/Active** - Structure and files currently in use
- 🔄 **Next Phase** - Structure planned for immediate next phase
- ⏸️ **Future Phase** - Structure planned for later phases (not yet implemented)

### Maintenance Guidelines

**When to Update This File:**
1. **Starting a new phase** - Update "Current Phase" and mark new directories as active
2. **Completing a phase** - Move completed items from "Next" to "Current"
3. **Architecture changes** - Update structure when core architecture evolves
4. **New directories created** - Document new directories immediately
5. **Directory migrations** - Update when files move (e.g., simulation → core/simulation)

**How to Check Current Phase:**
- Check `docs/roadmap/implementation.md` → "Implementation Checklist" section
- Look for ✅ (complete), 🔄 (in progress), or ⏸️ (deferred) markers
- Verify actual directory structure matches documented structure

**AI Agent Instructions:**
1. **Always check "Current Phase" first** - Only use rules/patterns for current phase
2. **Verify structure exists** - Don't assume future directories exist
3. **Check phase indicators** - Look for ✅/🔄/⏸️ markers to know what's active
4. **Update this file** - If you create new directories, document them here immediately

## Directory Structure

### Current Structure (Phase 0.25 - Complete, Phase 0.5 - In Progress)

```
src/
├── components/        # React UI components
│   ├── canvas/       # React Three Fiber 3D components
│   │   ├── Scene/    # 3D scene components (Scene, SceneGrid, GroundPlane, PlacementPreview)
│   │   └── handlers/ # Canvas event handlers
│   └── ui/           # Ant Design based UI components (Sidebar, GateSelector)
│       └── handlers/ # UI event handlers
├── gates/            # Gate components and logic
│   ├── components/   # Individual gate components (NandGate, AndGate, etc.) - flat orientation
│   ├── common/       # Shared gate components (BaseGate, GatePin, WireStub)
│   ├── config/       # Gate configuration split into 3 files per gate:
│   │   ├── nand-constants.ts  # Colors, text, non-React constants
│   │   ├── nand-helpers.ts    # Pin/wire helpers, geometry utilities
│   │   └── nand.tsx           # React component (only export components here)
│   ├── handlers/     # Gate event handlers
│   ├── icons/        # Gate icon components
│   └── types.ts      # Gate type definitions (GateType: 'NAND'|'AND'|'OR'|'NOT'|'NOR'|'XOR'|'XNOR')
├── nodes/            # Circuit I/O nodes and junctions (HDL-level pins)
│   ├── components/   # InputNode3D, OutputNode3D, JunctionNode3D
│   └── config/       # Node configuration (nodeConfig.ts)
├── simulation/       # Circuit simulation engine (pure logic)
├── store/           # Zustand state management
│   ├── circuitStore.ts  # Store + circuitActions export + window globals for E2E
│   ├── types.ts         # All store types (GateInstance, Wire, WireEndpoint, InputNode, etc.)
│   └── actions/     # State mutation action slices (one folder per domain)
│       ├── gateActions/    # Gate CRUD and selection
│       ├── wireActions/    # Wire CRUD
│       ├── placementActions/   # Gate placement mode
│       ├── wiringActions/      # Wire-drawing interaction
│       ├── simulationActions/  # Simulation control
│       ├── nodeActions/        # I/O node CRUD
│       ├── nodePlacementActions/ # Node placement mode
│       ├── signalActions/      # Junction signal
│       ├── junctionPlacementActions/ # Junction placement
│       ├── viewActions/        # Camera/axes toggle
│       └── pinHelpers/         # Pin position calculation helpers
├── hooks/           # Custom React hooks (useKeyboardShortcuts, useGateDrag)
├── theme/           # Theme system (ThemeProvider, tokens - grid colors)
├── utils/           # Utility functions
│   ├── grid.ts      # Grid system (GRID_SIZE, worldToGrid, snapToGrid)
│   ├── wirePosition.ts  # Wire geometry helpers
│   ├── wireHitTest.ts   # Wire click detection
│   └── wiringScheme/    # Wire routing algorithm (pathfinding, branching, crossing, segments)
├── test/            # Test setup and utilities (testUtils.ts - createMockStore)
├── App.tsx          # Main application component
└── main.tsx         # React entry point

AGENTS.md             # Universal AI agent entry point (all agents read this first)

docs/
├── specs/            # Design spec artifacts (output of brainstorming skill)
├── plans/            # Implementation plan artifacts (output of planning skill)
├── testing/          # Testing documentation (consolidated)
│   ├── README.md     # Testing docs index
│   ├── standards.md  # TDD workflow, test quality, mutation testing
│   ├── structure.md  # Test file organization
│   └── templates/    # TDD templates for unit, component, E2E tests
├── llm-workflow.md   # Workflow orchestration for AI agents (plan, subagents, verification)
├── typescript-guidelines.md  # TypeScript best practices
└── roadmap/          # Project roadmap and phases

tasks/                # Task management for AI agents
├── README.md         # Purpose of todo.md and lessons.md
├── todo.md           # Current task plan (checkable items)
├── lessons.md        # Captured patterns and mistakes
├── todo.md.template  # Template for new task plans
└── lessons.md.template  # Template for lesson entries

.claude/              # Claude Code project rules
├── CLAUDE.md         # Project overview (references AGENTS.md + skills)
└── skills/           # Composable skill files (loaded on demand, ~5k tokens each)
    ├── tdd/SKILL.md              # Iron Law TDD
    ├── debugging/SKILL.md        # 4-phase systematic debugging
    ├── brainstorming/SKILL.md    # Design-first HARD GATE
    ├── planning/SKILL.md         # Bite-sized task plans
    ├── code-review/SKILL.md      # Pre-merge self-review
    └── hacer-patterns/SKILL.md   # HACER stack + architecture patterns

scripts/
├── check-test-files.sh  # Pre-commit TDD verification script
└── stryker-changed.sh   # Run Stryker on changed files only (CI)

.github/
├── copilot-instructions.md       # GitHub Copilot quick-start
├── PULL_REQUEST_TEMPLATE.md      # PR template with TDD checklist
└── workflows/
    ├── ci.yml        # Main CI (lint + unit tests + build + E2E store tests)
    ├── mutation.yml  # Stryker mutation testing (PRs touching src/)
    ├── e2e-ui.yml    # Slow UI E2E tests (scheduled Wed + Sat 4am UTC)
    └── deploy.yml    # GitHub Pages deployment (push to main)
```

### 🔄 Next Phase Structure (Phase 0.5 - Starting Soon)

**Expected additions:**
- `src/core/hdl/` - HDL parser and generator
- `src/core/testing/nand2tetris/` - Test script execution

### ⏸️ Future Structure (Phases 5-24 - Not Yet Implemented)

```
src/
├── core/                    # Pure logic, ZERO React/browser dependencies (Phase 5)
│   ├── gates/              # Gate definitions and registry
│   │   ├── types.ts        # GateType, GateDefinition, PinDefinition
│   │   ├── registry.ts     # Single source of truth for all gates
│   │   └── index.ts
│   ├── circuit/            # Circuit document types and schemas
│   │   ├── types.ts        # CircuitDocument, Wire, Gate, etc.
│   │   ├── schema.ts       # Zod validation schemas
│   │   └── index.ts
│   ├── simulation/         # Simulation engine (migrated from src/simulation/)
│   │   ├── evaluate.ts     # Main simulation entry point
│   │   ├── propagate.ts    # Signal propagation algorithm
│   │   └── scheduler.ts    # Tick scheduling for sequential logic
│   ├── hdl/                # HDL parser/compiler (Phase 0.5)
│   │   ├── parser.ts       # Parse .hdl files
│   │   ├── generator.ts    # Generate .hdl files
│   │   ├── types.ts        # HDLChip, HDLPin, HDLPart
│   │   └── index.ts
│   ├── testing/            # Testing infrastructure
│   │   ├── nand2tetris/    # .tst/.cmp test execution (Phase 0.5)
│   │   └── index.ts
│   ├── serialization/      # Data import/export (Phase 5)
│   │   ├── schema.ts       # Zod schemas for validation
│   │   ├── v1.ts           # Version 1 format handlers
│   │   └── migrate.ts      # Version migration functions
│   ├── events/             # Event system (Phase 5)
│   │   ├── types.ts        # CircuitEvent discriminated union
│   │   └── emitter.ts      # Event emission and handling
│   ├── analysis/           # Circuit analysis tools (Phase 5)
│   │   ├── cycle.ts        # Cycle detection
│   │   └── floating.ts     # Floating input detection
│   ├── software/           # Software stack (Phase 10)
│   │   ├── assembler/      # Hack assembler
│   │   ├── vm/             # VM interpreter
│   │   ├── compiler/       # Jack compiler
│   │   └── index.ts
│   ├── types/              # Shared type definitions
│   │   ├── branded.ts      # Branded ID types (GateId, WireId, etc.)
│   │   └── index.ts
│   └── index.ts
├── api/                     # Public programmatic interface (Phase 5)
│   ├── index.ts             # Main export (what AI agents import)
│   ├── circuit.ts           # Circuit manipulation API
│   ├── simulation.ts         # Simulation control API
│   ├── hdl.ts               # HDL import/export API
│   ├── software.ts           # Software stack API (Phase 10)
│   └── types.ts             # Re-exported public types
├── plugins/                 # Plugin system (Phase 6)
│   ├── types.ts             # Plugin interfaces
│   ├── registry.ts          # Plugin registry with security
│   ├── renderers/           # Built-in renderer plugins
│   │   ├── three/           # 3D renderer (converted from components)
│   │   └── data/            # Data table view
│   ├── analyzers/           # Built-in analyzer plugins
│   │   ├── cycle/           # Cycle detection
│   │   └── floating/        # Floating input detection
│   └── index.ts
├── workers/                 # Web Workers (Phase 9)
│   ├── simulation.worker.ts # Simulation worker
│   └── index.ts
├── components/              # React UI components (existing + new)
│   ├── canvas/              # 3D canvas (becomes plugin in Phase 6)
│   ├── ui/                  # Ant Design UI components
│   ├── gates/               # Gate renderers (Phase 5+)
│   └── software/            # Software stack UI (Phase 10)
│       ├── editor/          # Code editor
│       ├── debugger/        # Integrated debugger
│       └── terminal/        # Terminal/console
├── store/                   # Zustand state management (existing)
│   ├── circuitStore.ts      # Main circuit state
│   ├── actions/             # State mutation actions
│   └── uiStore.ts           # UI-only state (Phase 5)
├── gates/                   # Gate components (Phase 0-4, migrates in Phase 5)
├── simulation/              # Simulation logic (Phase 0-4, migrates to core/ in Phase 5)
├── hooks/                   # Custom React hooks
├── theme/                   # Theme system
├── types/                   # Shared TypeScript types (Phase 0-4, migrates in Phase 5)
└── utils/                   # Utility functions
```

### Monorepo Structure (Phase 12+)

```
hacer/
├── apps/
│   ├── web/                 # Frontend React app
│   │   └── src/            # (current src/ structure)
│   └── api/                 # NestJS backend
│       ├── src/
│       │   ├── graphql/     # GraphQL resolvers
│       │   ├── database/    # Database models and migrations
│       │   ├── auth/        # Authentication
│       │   └── collaboration/ # Real-time collaboration
│       └── ...
├── packages/
│   ├── core/                # Shared core logic (from src/core/)
│   ├── api/                 # Shared API types
│   └── ui/                  # Shared UI components
├── docs/                    # Documentation
└── e2e/                     # E2E tests
```

## Key Files by Phase

### ✅ Phase 0.25 (Current - Active)
- `src/utils/grid.ts` - Grid system utilities (GRID_SIZE, worldToGrid, snapToGrid, canPlaceGateAt)
  - Grid-based placement with section line validation
  - Gates can only be placed in section interiors (odd row/col)
- `src/components/canvas/Scene/SceneGrid.tsx` - Visual grid component (section lines every 4.0 units)
- `src/components/canvas/Scene/PlacementPreview.tsx` - Grid-aligned placement preview
- `src/components/canvas/Scene/GroundPlane.tsx` - Grid snapping for placement
- `src/store/actions/placementActions/` - Grid-based placement actions
- `src/store/circuitStore.ts` - Main Zustand store
- `src/store/actions/` - State mutation actions
- `src/simulation/gateLogic.ts` - Gate logic functions
- `src/components/canvas/Scene/` - 3D scene components
- `src/components/ui/` - Ant Design UI components
- `src/gates/components/` - Gate components with flat orientation (90° X rotation, text on top)
- `src/hooks/useKeyboardShortcuts.ts` - 90° rotation increments (Z axis for world Y rotation)
- `src/theme/tokens.ts` - Grid colors (uniform blue-tinted color for cell and section lines)

### ✅ Phase 0.25 (Completed)
- 0.25.1 Grid-based gate placement system ✅
- 0.25.2 Flat gate orientation (names facing up) ✅
- 0.25.3 Gate dragging and movement ✅
- 0.25.4 90-degree rotation system ✅
- 0.25.5 Grid-aligned wire routing ✅
- 0.25.6 Wire stub removal when connected ✅
- 0.25.7 Wire selection and deletion ✅
- 0.25.8 E2E test reorganization and optimization ✅

### 🔄 Phase 0.5: Nand2Tetris Foundation (In Progress)
- `src/core/hdl/parser.ts` - HDL parser for .hdl files
- `src/core/testing/nand2tetris/` - Test script execution (.tst/.cmp)
- Sequential logic support (DFF, Register, RAM)

### ⏸️ Phase 5: Core Architecture (Future)
- `src/core/gates/registry.ts` - Single source of truth for gate definitions
- `src/core/types/branded.ts` - Branded ID types (GateId, WireId, PinId, CircuitId)
- `src/core/circuit/schema.ts` - Zod validation schemas
- `src/core/events/types.ts` - Event system types
- `src/api/index.ts` - Public API entry point
- Migration: `src/simulation/` → `src/core/simulation/`

### ⏸️ Phase 6: Plugin System (Future)
- `src/plugins/types.ts` - Plugin interface definitions
- `src/plugins/registry.ts` - Plugin registry with security
- `src/plugins/renderers/three/` - 3D renderer as plugin
- `src/plugins/analyzers/` - Analyzer plugins

### ⏸️ Phase 7: AI Integration (Future)
- `src/api/` - Complete public API (all human actions)
- `.ai/context.yaml` - AI context file
- `llms.txt` - Quick reference for AI assistants

### ⏸️ Phase 9: Performance (Future)
- `src/workers/simulation.worker.ts` - Web Worker for simulation
- Performance monitoring and optimization

### ⏸️ Phase 10: Software Stack (Future)
- `src/core/software/assembler/` - Hack assembler
- `src/core/software/vm/` - VM interpreter
- `src/core/software/compiler/` - Jack compiler
- `src/components/software/` - Software development UI

### ⏸️ Phase 12: Backend & Collaboration (Future)
- `apps/api/` - NestJS backend application
- `apps/web/` - Frontend React app
- `packages/core/` - Shared core logic package
- Database migrations and models

## Architecture Evolution

### ✅ Phase 0.25: Current Architecture (Active)
- **State Management**: Zustand with Immer middleware
- **3D Rendering**: React Three Fiber with Drei helpers
- **UI Framework**: Ant Design components
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Logic Separation**: Pure logic in `src/simulation/`, state mutations in `src/store/actions/`
- **Grid System**: Grid-based placement with section line validation (`src/utils/grid.ts`)
  - GRID_SIZE = 2.0 units per cell
  - Section lines every 4.0 units (GRID_SIZE * 2)
  - Gates can only be placed in section interiors (odd row/col positions)
  - Minimum spacing: 1 cell between gates
- **Gate Orientation**: Flat gates (90° X rotation) with text on top surface
  - Default rotation: `{ x: Math.PI / 2, y: 0, z: 0 }`
  - Keyboard rotation: 90° increments around Z axis (local) for world Y rotation
  - Camera position: `[0, 6, 6]` for optimal initial view

### 🔄 Phase 0.5: Nand2Tetris Foundation (Next)
- **HDL Support**: Parser and generator for .hdl files
- **Test Infrastructure**: .tst/.cmp test script execution
- **Sequential Logic**: DFF, Register, RAM components

### ⏸️ Phase 5-7: Core Architecture & Extensibility (Future)
- **Core Layer**: Pure logic in `src/core/` (ZERO React dependencies)
- **API Layer**: Public programmatic interface in `src/api/`
- **Plugin System**: Extensible architecture in `src/plugins/`
- **Type Safety**: Branded types, Zod validation
- **Event System**: Circuit modification events

### ⏸️ Phase 8-10: Testing & Software Stack (Future)
- **Testing**: Property-based testing (fast-check), curriculum tests
- **Software Stack**: Complete computing system (assembler, VM, compiler)
- **Performance**: Web Workers for simulation
- **Integration**: Hardware-software debugging

### ⏸️ Phase 11-12: Components & Backend (Future)
- **Component Library**: Built-in components system
- **Backend**: NestJS + GraphQL + PostgreSQL
- **Collaboration**: Real-time multi-user editing
- **Monorepo**: Turborepo workspace structure

### ⏸️ Phase 13-16: Production & Platform (Future)
- **Deployment**: Production pipeline and monitoring
- **Security**: Enterprise-grade security measures
- **Authentication**: Better Auth with social login
- **API Ecosystem**: Developer platform and integrations

### ⏸️ Phase 17-24: Polish & Ecosystem (Future)
- **Mobile**: Touch optimization and responsive design
- **PWA**: Offline support and service workers
- **Website**: Next.js + Nextra documentation platform
- **AI Tools**: Automated documentation and code review

## File Organization Conventions

- **One component per file** - Maximum 200 lines per component file
- **Co-located tests** - Test files next to implementation (e.g., `Component.tsx` and `Component.test.tsx`)
- **Barrel exports** - Use `index.ts` files for clean imports
- **Type definitions** - Co-locate types with components or in `src/types/` (Phase 0-4) or `src/core/types/` (Phase 5+)
- **Pure logic separation** - All pure logic in `src/core/` (Phase 5+), no React/browser dependencies

## Import Patterns

### ✅ Phase 0.25 (Current - Active)
```typescript
// State management
import { useCircuitStore } from '@/store/circuitStore';
import { circuitActions } from '@/store/actions';

// Grid utilities
import { snapToGrid, worldToGrid, canPlaceGateAt, GRID_SIZE } from '@/utils/grid';

// Components
import { Scene } from '@/components/canvas/Scene';
import { SceneGrid } from '@/components/canvas/Scene/SceneGrid';
import { PlacementPreview } from '@/components/canvas/Scene/PlacementPreview';
import { Sidebar } from '@/components/ui/Sidebar';

// Gates (flat orientation)
import { NandGate } from '@/gates/components';

// Simulation
import { nandGate } from '@/simulation/gateLogic';

// Hooks
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'; // 90° rotation
```

### ⏸️ Phase 5+ (Future - Not Yet Active)
```typescript
// Core logic (pure, no React)
import { getGateDefinition } from '@/core/gates/registry';
import { evaluateCircuit } from '@/core/simulation/evaluate';
import { parseHDL } from '@/core/hdl/parser';
import type { GateId, WireId } from '@/core/types/branded';

// Public API (for AI agents and programmatic access)
import { createCircuit, addGate, connectPins, simulate } from '@/api';

// Plugins
import { registerPlugin } from '@/plugins/registry';
import type { RendererPlugin } from '@/plugins/types';

// Components (React)
import { Scene } from '@/components/canvas/Scene';
```

## Adding New Features

### Adding a New Gate (Phase 0.25)
1. Add gate logic function to `src/simulation/gateLogic.ts`
2. Add unit tests to `src/simulation/gateLogic.test.ts`
3. Create gate component in `src/gates/components/`
   - Use flat orientation: default rotation `{ x: Math.PI / 2, y: 0, z: 0 }`
   - Position text on Z- face with 180° X rotation for flat appearance
   - Position pins with Y offsets (become horizontal after gate rotation)
4. Create gate icon in `src/gates/icons/`
5. Export from `src/gates/components/index.ts`
6. Add to gate selector in `src/components/ui/GateSelector.tsx`

### Adding a New Gate (Phase 5+)
1. Add to `GateType` in `src/core/gates/types.ts`
2. Add definition in `src/core/gates/registry.ts`
3. Create renderer in `src/components/gates/` (or as plugin)
4. Add API function in `src/api/circuit.ts`
5. Add tests (truth table + visual + property-based)
6. Update AI context files if needed

### Adding a New Plugin (Phase 6+)
1. Implement plugin interface from `src/plugins/types.ts`
2. Add security sandboxing
3. Register in plugin registry
4. Document in plugin API docs
5. Add tests for plugin functionality

### Adding Software Stack Component (Phase 10+)
1. Implement in `src/core/software/` (pure logic)
2. Add API functions in `src/api/software.ts`
3. Create UI in `src/components/software/`
4. Add tests and documentation

## Testing Structure

### ✅ Current (Phase 0.25 - Complete, Phase 0.5 - In Progress)
- **Unit Tests**: Co-located with source files (`.test.ts` or `.test.tsx`)
  - Grid utilities tests: `src/utils/grid.test.ts` (section line validation)
  - Gate action tests: Updated for flat orientation
  - Pin helper tests: Updated for Y offsets becoming horizontal
- **E2E Tests**: Located in `e2e/specs/` directory
  - **Store tests** (`@store`): Fast, use direct store actions - run before every commit
  - **UI tests** (`@ui`): Slow, use UI interactions - run manually or CI (twice weekly)
  - Store and UI tests come in pairs, sharing scenarios from `e2e/scenarios/`
  - **E2E Test Optimization**: Scene reuse, test reorganization ✅ (Phase 0.25.8)
- **Mutation Testing**: Stryker for test quality verification (`npm run stryker`)
- **Test Setup**: `src/test/setup.ts` - Global test configuration
- **TDD Templates**: `docs/testing/templates/` - Copy-paste templates for new tests
- **Testing Standards**: `docs/testing/standards.md` - TDD workflow documentation

### 🔄 Phase 0.5 (In Progress)
- **Curriculum Tests**: Nand2tetris test script execution

### ⏸️ Phase 3.5+ (Enhanced Testing - Future)
- **Property-Based Tests**: fast-check for invariants
- **Integration Tests**: Cross-layer functionality
- **Curriculum Tests**: Nand2tetris chapter validation (Phase 8+)
- **Performance Tests**: Benchmark suites (Phase 9+)

## Technology Stack Evolution

See [Implementation Guide](implementation.md#technology-stack-evolution) for detailed technology stack changes across phases.

## Related Documentation

- [`.cursorrules`](../.cursorrules) - **Start here!** Project rules, phase tracking, and quick reference
- [`HACER_LLM_GUIDE.md`](../HACER_LLM_GUIDE.md) - Detailed development patterns, examples, and best practices
- [`docs/llm-workflow.md`](./docs/llm-workflow.md) - Workflow orchestration for AI agents (plan mode, subagents, verification)
- [`docs/testing/`](./docs/testing/) - Testing standards, TDD workflow, templates
- [`docs/typescript-guidelines.md`](./docs/typescript-guidelines.md) - TypeScript best practices
- [`docs/roadmap/`](./docs/roadmap/README.md) - Project roadmap and phases
- [`docs/roadmap/phases/phase-0.25-ui-improvements.md`](./docs/roadmap/phases/phase-0.25-ui-improvements.md) - Phase 0.25 documentation (completed)
- [`docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md`](./docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md) - Current phase documentation

## Document Relationship

This document focuses on **repository structure and file organization**. For:
- **Quick rules & phase status**: See [`.cursorrules`](./.cursorrules)
- **Detailed patterns & examples**: See [`HACER_LLM_GUIDE.md`](./HACER_LLM_GUIDE.md)
- **Workflow orchestration**: See [`docs/llm-workflow.md`](./docs/llm-workflow.md)
- **Testing standards & TDD**: See [`docs/testing/`](./docs/testing/)
- **TypeScript guidelines**: See [`docs/typescript-guidelines.md`](./docs/typescript-guidelines.md)
- **Where files go**: This document

All documents are kept in sync and should be consulted together.
