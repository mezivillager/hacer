# HACER Repository Map

This document helps AI agents and developers understand the codebase structure and navigate the repository effectively across all development phases.

## Common tasks → start here (LLM / human)

| Task | Start here |
|------|------------|
| **Current phase / checklist** | `docs/roadmap/implementation.md` → *Implementation Checklist*; `.cursorrules` → *Phase Tracking* |
| **Phase 0.5 (Nand2Tetris) spec** | `docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md` |
| **Phase 0.5 ticket checklist (P05-01…28, P05-29)** | `docs/plans/phase-0.5-tickets-CHECKLIST.md` · plan: `docs/plans/2026-03-22-phase-0.5-tickets.md` |
| **Observed bugs (informal log)** | `docs/development/observed-bugs.md` |
| **New Zustand state or action** | `src/store/circuitStore.ts`, `src/store/types.ts`, `src/store/actions/<domain>/` |
| **Builtin chip definitions** | `src/core/chips/appRegistry.ts`, `src/core/chips/builtins/project01.ts` |
| **3D chip body & icons** | `src/components/scene/ChipBody3D.tsx`, `src/components/scene/chipBodyLayout.ts`, `src/components/ui/icons/ChipIcons.tsx` |
| **Gate placement / renderer** | `src/gates/GateRenderer.tsx`, `src/gates/common/BaseGate.tsx`, `HACER_LLM_GUIDE.md` |
| **Simulation / boolean logic** | `src/simulation/` · specs: `src/simulation/gateLogic.test.ts` |
| **R3F canvas / scene** | `src/components/canvas/` |
| **Non-3D DOM shell / 3D⇄2D boundary** | `src/components/Shell.tsx` (`App = providers → <Shell scene={<CanvasArea/>} />`); the store is the contract |
| **RTL integration tests (non-3D UX)** | `src/test/renderShell.tsx` harness — render the shell with no Canvas; rigor in AGENTS.md §3 Step 4.1 |
| **Performance mode / render detail** | `src/components/canvas/Scene/renderConfig.ts`, `src/lib/performanceModeStorage.ts`, `src/store/actions/viewActions/` |
| **Scene-graph routing tests (3D geometry)** | `src/test/r3f/` harness + `src/components/canvas/routingScene.test.tsx` — GPU-free R3F scene-graph tests asserting rendered wire geometry; see ADR-0008 |
| **Unit / store tests** | Colocate `*.test.ts` next to code; reset pattern: `src/store/actions/gateActions/gateActions.test.ts` |
| **Playwright store E2E** | `e2e/specs/**/*.store.spec.ts`, `e2e/fixtures/store.fixture.ts` |
| **LLM workflow + harness tuning** | `docs/llm-workflow.md`, `docs/llm-harness.md`, `docs/llm-docs-sync.md` |
| **CI = definition of done** | `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` |

## ⚠️ IMPORTANT: Phase Tracking & Maintenance

**Last Updated:** 2026-06-20  
**Current Phase:** Phase 0.5 (In Progress)  
**Completed Infrastructure:** Phase 0.25 UI/canvas, Tailwind/shadcn design shell, semantic-release; P05-16 HDL compiler + evaluateChip seam  
**Next Product Phase:** Phase 0.6: Arithmetic & Sequential Logic

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

### Current Structure (Phase 0.5 - In Progress)

```
src/
├── components/        # React UI components
│   ├── canvas/       # React Three Fiber 3D components
│   │   ├── Scene/    # 3D scene components (Scene, renderConfig, SceneGrid, GroundPlane, PlacementPreview)
│   │   ├── handlers/ # Canvas event handlers
│   │   └── hooks/    # useThemeColor (CSS-var \u2192 THREE.Color resolver)
│   ├── ui/           # HACER shell components (CompactToolbar, RightActionBar,
│   │   │             #   PropertiesPanel, HelpBar, KeyboardShortcutsModal,
│   │   │             #   StatusBar, DemoOverlay, coming-soon helper, gate glyphs)
│   └── ui-kit/       # shadcn/ui primitives (button, tooltip, popover, dialog,
│                     #   tabs, switch, separator, input, label, card, kbd,
│                     #   theme-provider). Drop-in copies via `npx shadcn add`.
├── lib/              # notify (Sonner-backed), utils (cn helper), demoTour, performanceModeStorage
├── styles/           # globals.css (Tailwind v4 + OKLch tokens + Geist fonts)
├── gates/            # Gate placement plumbing (per-chip components and icons live elsewhere — see core/chips/ and components/scene/)
│   ├── GateRenderer.tsx  # Registry-driven 3D renderer dispatch for any placed chip
│   ├── common/       # Shared 3D primitives (BaseGate, GatePin, WireStub)
│   ├── handlers/     # Gate event handlers (selection, drag, rotate)
│   └── types.ts      # Gate-renderer prop types
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
│       ├── viewActions/        # Axes, properties panel, and performance mode UI actions
│       └── pinHelpers/         # Pin position calculation helpers
├── hooks/           # Custom React hooks (useKeyboardShortcuts, useGateDrag)
├── theme/           # Theme system (ThemeProvider, tokens - grid colors)
├── utils/           # Utility functions
│   ├── grid.ts      # Grid system (GRID_SIZE, worldToGrid, snapToGrid)
│   ├── wirePosition.ts  # Wire geometry helpers
│   ├── wireHitTest.ts   # Wire click detection
│   └── wiringScheme/    # Wire routing algorithm (pathfinding, branching, crossing, segments)
├── test/            # Test setup and utilities (testUtils.ts - createMockStore)
│   └── r3f/         # Scene-graph routing test harness (ADR-0008): linePoints, seedCircuit,
│                    #   TestScene, renderCircuitScene, wireGeometry (expectNoWireOverlaps etc.)
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
├── llm-docs-sync.md  # Living docs vs code (author & reviewer passes)
├── typescript-guidelines.md  # TypeScript best practices
└── roadmap/          # Project roadmap and phases

tasks/                # Task management for AI agents
├── README.md         # Purpose of todo.md and lessons.md
├── todo.md           # Current task plan (checkable items)
├── lessons.md        # Captured patterns and mistakes
├── todo.md.template  # Template for new task plans
└── lessons.md.template  # Template for lesson entries

.claude/              # Claude Code project rules
├── CONSTITUTION.md   # Non-negotiable behavioral boundaries (Step 0)
├── CLAUDE.md        # Project overview (references AGENTS.md + skills)
├── profiles/        # Loki mode and other execution profiles
└── skills/          # Composable skill files (21 skills, load on demand)
    ├── brainstorming/   # Design-first HARD GATE, visual companion, spec reviewer
    ├── code-review/
    ├── debugging/
    ├── dispatching-parallel-agents/
    ├── executing-plans/
    ├── finishing-a-development-branch/
    ├── git-operations/
    ├── hacer-patterns/
    ├── planning/
    ├── project-mapper/
    ├── receiving-code-review/
    ├── requesting-code-review/
    ├── subagent-driven-development/
    ├── systematic-debugging/
    ├── tdd/
    ├── test-driven-development/
    ├── using-git-worktrees/
    ├── using-superpowers/
    ├── verification-before-completion/
    ├── writing-plans/
    └── writing-skills/

scripts/
├── check-test-files.sh  # Pre-commit TDD verification script
├── stryker-changed.sh   # Run Stryker on changed files only (CI)
└── sync-superpowers.sh  # Sync skills from obra/superpowers (preserves hacer-patterns)

.github/
├── copilot-instructions.md       # GitHub Copilot quick-start
├── PULL_REQUEST_TEMPLATE.md      # PR template with TDD checklist
└── workflows/
    ├── ci.yml        # Main CI (lint + unit tests + build + E2E store tests)
    ├── mutation.yml  # Stryker mutation testing (PRs touching src/)
    ├── e2e-ui.yml    # Slow UI E2E tests (scheduled Wed + Sat 4am UTC)
    └── deploy.yml    # GitHub Pages deployment (push to main)
```

### 🔄 Next Phase Structure (Phase 0.5 — Project 1: Boolean Logic)

**Expected additions:**
- `src/core/chips/` - Chip hierarchy (ChipRegistry, ChipDefinition, composite chips)
- `src/core/hdl/` - HDL parser and compiler
- `src/core/testing/` - Test script and compare file execution
- `src/simulation/topologicalEval.ts` - Topological sort evaluation
- `src/components/ui/ChipDefinitionPanel.tsx` - Chip I/O definition UI
- `src/components/ui/TestResultsPanel.tsx` - Test results and diff display
- `src/components/ui/PinoutPanel.tsx` - Chip pin inspection
- `src/components/ui/ChipWorkflowBrowser.tsx` - Project/chip navigation
- `src/components/ui/HDLEditor.tsx` - HDL code editor
- `src/components/ui/StatusBar.tsx` - Error/status reporting
- `src/components/scene/ChipBody3D.tsx` - Generic 3D body for any registered chip (used by `GateRenderer`)
- `src/components/scene/chipBodyLayout.ts` - Pin-layout math (centers, body sizing) for `ChipBody3D`
- `src/components/ui/icons/ChipIcons.tsx` - 16 SVG icons keyed by chip name (toolbar buttons, pinout panel)
- `src/core/chips/appRegistry.ts` - Singleton builtin + user chip registries
- `src/core/chips/builtins/project01.ts` - Project 1 builtin registration (16 chips: Nand…DMux8Way)
- `src/gates/components/CompositeChip3D.tsx` - 3D composite chip rendering (planned)
- `src/gates/components/BusSplitter3D.tsx` - Bus splitter visual component (planned)
- `src/gates/components/BusJoiner3D.tsx` - Bus joiner visual component (planned)
- `src/store/actions/persistenceActions/` - Circuit save/load to localStorage
- `src/core/testing/project01/` - Provider-backed test fixtures (.hdl, .tst, .cmp)

### 🔄 Phase 0.6 — Projects 2-3: Arithmetic & Sequential Logic

**Expected additions:**
- `src/core/gates/sequential/` - DFF, clock signal system
- `src/core/gates/memory/` - SparseMemory, RAM implementations
- `src/core/testing/project02/` - Project 2 test fixtures
- `src/core/testing/project03/` - Project 3 test fixtures

### 🔄 Phase 0.7 — Projects 4-5: Computer Architecture

**Expected additions:**
- `src/core/cpu/` - Hack CPU implementation
- `src/core/memory/` - Memory-mapped I/O (Screen, Keyboard)
- `src/core/rom/` - ROM32K, .hack file loader
- `src/components/ui/ScreenDisplay.tsx` - Screen I/O rendering
- `src/components/ui/DebugPanel.tsx` - Execution and debugging UI
- `src/core/testing/project04/` - Project 4 test programs
- `src/core/testing/project05/` - Project 5 test fixtures

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
│   ├── hdl/                # HDL parser (P05-04); compiler/generator later
│   │   ├── parser.ts       # Tokenize + parse HACK HDL → AST
│   │   ├── parser.test.ts  # Project 1 fixtures + grammar edge cases
│   │   ├── types.ts        # HDLChip, HDLPin, HDLPart, HDLConnection
│   │   └── index.ts        # Barrel: parseHDL + types
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
│   ├── ui/                  # HACER shell UI components
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

### ✅ Phase 0.25 (Completed Infrastructure)
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
- `src/components/ui/` - HACER shell UI components
- `src/gates/GateRenderer.tsx` + `src/components/scene/ChipBody3D.tsx` - Registry-driven 3D rendering (replaces per-gate `src/gates/components/{Nand,And,Or,Not,Xor}Gate.tsx` deleted 2026-05-24)
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

### 🔄 Phase 0.5: Project 1 — Boolean Logic (In Progress)
- `src/core/chips/` - Chip hierarchy system (registry, definitions, composite chips)
  - `src/core/chips/evaluateChip.ts` - Central dispatch seam: routes any `ChipDefinition` to its evaluator (builtin / HDL-compiled / unsupported); module-level `WeakMap` cache prevents recompilation per object. **HDL chips now evaluate on the canvas through this seam** (P05-16, ADR-0004).
  - `src/core/chips/combineRegistries.ts` - Merges two `ChipRegistry` instances (builtin + user) into a single lookup used by the HDL compiler.
- `src/core/hdl/` - HDL parser and compiler for HACK HDL
  - `src/core/hdl/compiler.ts` - Compiles a parsed HDL AST into an evaluable `CompiledEvaluator`; resolves part dependencies, builds topological order, validates connections, and returns `{success, evaluate}`.
  - `src/core/hdl/project1HdlSources.ts` - Canonical HDL source strings for all 15 Project-1 chips (Not → DMux8Way), used by acceptance tests.
- `src/core/testing/` - Test script execution (.tst/.cmp)
  - `src/core/testing/engine.ts` - `runTest(script, options)` runs a parsed `.tst` against a chip (via the `evaluateChip` seam), records output rows, and compares to `.cmp` data; returns a UI-agnostic `TestResult`. Never throws — structural problems (unknown chip, eval-before-load, eval throw, row-count mismatch, unresolvable `compare-to`) become `error`; value mismatches become `firstFailure` (P05-17, ADR-0005).
  - `src/core/testing/implementationSources.ts` - pluggable `ChipImplementationSource` registry (Test Lab's "what to test against"): `builtin` + `hdl-from-nand` today; user chips (P05-18) / canvas (P05-26) register later. (P05-22, ADR-0006)
  - `src/core/testing/chipCompletion.ts` - persists passed chips to `localStorage['hacer-completed-chips']` (the P05-19 completion contract).
  - `src/store/actions/testActions/` - `runChipTest(chipName, sourceId)` store action (AI-Agent-Parity surface) → writes `testResult`/`testColumns`/`completedChips`.
  - `src/components/ui/TestResultsPanel.tsx` - the Test Lab panel (RightActionBar `'tests'` drawer): chip/source selectors, Run, output table + diff highlight, ✓ on completed. Thin view over the store.
- `src/simulation/topologicalEval.ts` - Topological sort for correct evaluation; `evaluateCircuit` return + `getSignalSourceValue`; routes chip evaluation through `evaluateChipWithCtx` so HDL/composite chips evaluate on the canvas.
- `CircuitState.lastSimulationError` — combinational cycle metadata after a failed `simulationTick` (cleared on success / `clearCircuit`)
- Multi-bit bus support (data model, simulation, 3D splitter/joiner)
- Chip I/O definition workflow (node rename, name display, chip definition panel)
- HDL editor, test results, pinout, chip workflow browser UI panels
- Circuit persistence (localStorage save/load)
- Builtin implementations for all 15 Project 1 chips
- See [Gap Analysis](docs/compatibility/nand2tetris/project1/gap-analysis.md) for detailed requirements

### 🔄 Phase 0.6: Projects 2-3 — Arithmetic & Sequential Logic (Planned)
- `src/core/gates/sequential/` - DFF, clock system, Register, PC
- `src/core/gates/memory/` - SparseMemory, RAM8 through RAM16K
- Clock signal propagation and two-phase simulation
- Project 2 chips (HalfAdder, FullAdder, Add16, Inc16, ALU)
- Project 3 chips (Bit, Register, RAM8..RAM16K, PC)

### 🔄 Phase 0.7: Projects 4-5 — Computer Architecture (Planned)
- `src/core/cpu/` - Hack CPU, instruction decode, program counter
- `src/core/memory/` - Memory-mapped I/O (Screen, Keyboard)
- `src/core/rom/` - ROM32K, .hack file loading
- Execution and debugging UI (step, run, register/memory views)
- Screen display and keyboard input handling

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

### ✅ Phase 0.5: Current Architecture (Active)
- **State Management**: Zustand with Immer middleware
- **3D Rendering**: React Three Fiber with Drei helpers
- **UI Framework**: shadcn/ui-style primitives + Radix UI + Tailwind CSS v4 + OKLch design tokens
- **Toast notifications**: Sonner via `notify` helper (`@/lib/notify`)
- **Theme**: `next-themes` tri-state (light/dark/system); 3D canvas reads CSS vars via `useThemeColor`
- **Icons**: Lucide React + inline SVG chip icons (`@/components/ui/icons/ChipIcons` — keyed by registered chip name)
- **Font**: Geist Sans + Geist Mono (variable woff2 from `geist` npm package, served from `/public/fonts/`)
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

### 🔄 Phase 0.5: Project 1 — Boolean Logic (Next)
- **Chip Hierarchy**: Composite chips — define, package, instantiate, evaluate
- **Multi-bit Buses**: Data model, simulation, 3D splitter/joiner components
- **HDL Support**: Parser and compiler for HACK HDL (.hdl files)
- **Test Infrastructure**: .tst/.cmp test script execution and validation
- **Simulation**: Topological sort for correct single-pass evaluation
- **3D/UI**: Chip definition panel, test results, pinout, chip workflow browser, HDL editor
- **Persistence**: Circuit save/load via localStorage

### 🔄 Phase 0.6: Projects 2-3 — Arithmetic & Sequential (Planned)
- **Sequential Logic**: DFF, clock system, Register, PC
- **Memory**: SparseMemory, RAM8 through RAM16K
- **Arithmetic**: HalfAdder, FullAdder, Add16, Inc16, ALU

### 🔄 Phase 0.7: Projects 4-5 — Computer Architecture (Planned)
- **CPU**: Hack CPU, instruction decode, ALU integration
- **Memory I/O**: Screen display, keyboard input (memory-mapped)
- **ROM**: ROM32K, .hack program loading and execution
- **Debugging**: Step/run execution, register/memory inspection

### ⏸️ Phase 5-7: Core Architecture & Extensibility (Future)
- **Core Layer**: Pure logic in `src/core/` (ZERO React dependencies)
- **API Layer**: Public programmatic interface in `src/api/`
- **Plugin System**: Extensible architecture in `src/plugins/`
- **Type Safety**: Branded types, Zod validation
- **Event System**: Circuit modification events

### ⏸️ Phase 8-10: Testing & Software Stack (Future)
- **Testing**: Property-based testing tool selection, compatibility tests
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
import { CompactToolbar } from '@/components/ui/CompactToolbar';

// Gates (registry-driven; per-chip components were removed 2026-05-24)
import { GateRenderer } from '@/gates';
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry';

// Simulation (registry-driven; the per-primitive helpers in
// `@/simulation/gateLogic` were removed 2026-05-24 — every chip's
// evaluation now lives on its `ChipDefinition.evaluate` in
// `@/core/chips/builtins/project01.ts`).
import { evaluateCircuit } from '@/simulation/topologicalEval';

// Hooks
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'; // 90° rotation
```

### ⏸️ Phase 5+ (Future - Not Yet Active)
```typescript
// Core logic (pure, no React)
import { getGateDefinition } from '@/core/gates/registry';
import { evaluateCircuit } from '@/core/simulation/evaluate';
import { parseHDL } from '@/core/hdl'; // or `@/core/hdl/parser`
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

### Adding a New Builtin Chip (Phase 0.5 — registry-driven, as of 2026-05-24)
1. Add the chip's `BuiltinEvalFn` and `ChipDefinition` (signal names, widths) to `src/core/chips/builtins/project01.ts` (or a new `projectNN.ts`)
2. Register it in the singleton via `registerBuiltin(...)` so `getBuiltinChipRegistry().list()` exposes it
3. Add an SVG icon entry in `src/components/ui/icons/ChipIcons.tsx` keyed by chip name (toolbar/pinout panel will pick it up automatically)
4. Add the chip's truth-table fixture and a Vitest spec
5. The 3D body, pin layout, and toolbar button are produced automatically by `ChipBody3D` / `chipBodyLayout` / `CompactToolbar` — no per-chip component file is needed

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

### ✅ Current (Phase 0.5 - In Progress)
- **Unit Tests**: Co-located with source files (`.test.ts` or `.test.tsx`)
  - Grid utilities tests: `src/utils/grid.test.ts` (section line validation)
  - Gate action tests: Updated for flat orientation
  - Pin helper tests: Updated for Y offsets becoming horizontal
- **E2E Tests**: Located in `e2e/specs/` directory
  - **Store tests** (`@store`): Fast, use direct store actions - run before every commit
  - **UI tests** (`@ui`): Slow, use UI interactions - run manually or CI (twice weekly)
  - Store and UI tests come in pairs, sharing scenarios from `e2e/scenarios/`
  - **E2E Test Optimization**: Scene reuse, test reorganization ✅ (Phase 0.25.8)
- **Mutation Testing**: Stryker for test quality verification (`pnpm run stryker`)
- **Test Setup**: `src/test/setup.ts` - Global test configuration
- **TDD Templates**: `docs/testing/templates/` - Copy-paste templates for new tests
- **Testing Standards**: `docs/testing/standards.md` - TDD workflow documentation

### 🔄 Phase 0.5 (In Progress)
- **Compatibility Tests**: Nand2tetris Project 1 test script execution (.tst/.cmp)
- **Chip Hierarchy Tests**: Composite chip creation, packaging, instantiation
- **Bus Tests**: Multi-bit propagation, sub-bus slicing, bus splitter/joiner
- **HDL Tests**: Parser correctness, compiler chip resolution, round-trip accuracy
- **Persistence Tests**: Save/load circuit integrity

### ⏸️ Phase 3.5+ (Enhanced Testing - Future)
- **Property-Based Tests**: select and install a property-testing library before adding invariant suites
- **Integration Tests**: Cross-layer functionality
- **Compatibility Tests**: Nand2tetris chapter validation (Phase 8+)
- **Performance Tests**: Benchmark suites (Phase 9+)

## Technology Stack Evolution

See [Implementation Guide](docs/roadmap/implementation.md#current-stack) for detailed technology stack changes across phases.

## Related Documentation

- [`.cursorrules`](./.cursorrules) - **Start here!** Project rules, phase tracking, and quick reference
- [`AGENTS.md`](./AGENTS.md) - Universal agent entry, CI gates, rule precedence
- [`.cursor/rules/000-hacer-precedence.mdc`](./.cursor/rules/000-hacer-precedence.mdc) - Cursor: HACER overrides ECC generic rules
- [`docs/llm-harness.md`](./docs/llm-harness.md) - MCP, ECC hooks, session efficiency
- [`HACER_LLM_GUIDE.md`](./HACER_LLM_GUIDE.md) - Detailed development patterns, examples, and best practices
- [`docs/llm-workflow.md`](./docs/llm-workflow.md) - Workflow orchestration for AI agents (plan mode, subagents, verification)
- [`docs/llm-docs-sync.md`](./docs/llm-docs-sync.md) - Living docs vs code (author & reviewer passes)
- [`docs/testing/`](./docs/testing/) - Testing standards, TDD workflow, templates
- [`docs/typescript-guidelines.md`](./docs/typescript-guidelines.md) - TypeScript best practices
- [`docs/roadmap/`](./docs/roadmap/README.md) - Project roadmap and phases
- [`docs/roadmap/phases/phase-0.25-ui-improvements.md`](./docs/roadmap/phases/phase-0.25-ui-improvements.md) - Phase 0.25 documentation (completed)
- [`docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md`](./docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md) - Phase 0.5: Project 1 Boolean Logic
- [`docs/roadmap/phases/phase-0.6-arithmetic-sequential.md`](./docs/roadmap/phases/phase-0.6-arithmetic-sequential.md) - Phase 0.6: Projects 2-3
- [`docs/roadmap/phases/phase-0.7-computer-architecture.md`](./docs/roadmap/phases/phase-0.7-computer-architecture.md) - Phase 0.7: Projects 4-5
- [`docs/compatibility/nand2tetris/project1/gap-analysis.md`](./docs/compatibility/nand2tetris/project1/gap-analysis.md) - Project 1 gap analysis (reference for Phase 0.5)

## Document Relationship

This document focuses on **repository structure and file organization**. For:
- **Quick rules & phase status**: See [`.cursorrules`](./.cursorrules)
- **Rule precedence (Cursor)**: See [`.cursor/rules/000-hacer-precedence.mdc`](./.cursor/rules/000-hacer-precedence.mdc)
- **Harness / MCP / hooks**: See [`docs/llm-harness.md`](./docs/llm-harness.md)
- **Detailed patterns & examples**: See [`HACER_LLM_GUIDE.md`](./HACER_LLM_GUIDE.md)
- **Workflow orchestration**: See [`docs/llm-workflow.md`](./docs/llm-workflow.md)
- **Living docs vs code**: See [`docs/llm-docs-sync.md`](./docs/llm-docs-sync.md)
- **Testing standards & TDD**: See [`docs/testing/`](./docs/testing/)
- **TypeScript guidelines**: See [`docs/typescript-guidelines.md`](./docs/typescript-guidelines.md)
- **Where files go**: This document

All documents are kept in sync and should be consulted together.
