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
| **Using the engine from outside it (CLI, MCP, harness, renderer)** | `src/core/index.ts` + `src/simulation/index.ts` — the two entry points. Import from these, never past them: `.dependency-cruiser.cjs`'s `core-through-index` rule is a shrink-only ratchet, and `src/core/index.test.ts` proves the surface stays headless |
| **Adding to the engine's public API** | Add the name to its module index (`src/core/chips/index.ts`, `src/core/hdl/index.ts`, `src/core/testing/index.ts`), then to `src/core/index.ts` and the list in `src/core/index.test.ts` — the test asserts an exact surface, so widening it is deliberate |
| **Builtin chip definitions** | `src/core/chips/appRegistry.ts`, `src/core/chips/builtins/project01.ts` |
| **3D chip body & icons** | `src/components/scene/ChipBody3D.tsx`, `src/components/scene/chipBodyLayout.ts`, `src/components/ui/icons/ChipIcons.tsx` |
| **Gate placement / renderer** | `src/gates/GateRenderer.tsx`, `src/gates/common/BaseGate.tsx`, `HACER_LLM_GUIDE.md` |
| **Bus splitter/joiner components** | entity: `src/store/types.ts` (`BusComponent`), actions `src/store/actions/busActions/` + `src/store/actions/busPlacementActions/`; logic `src/simulation/busLogic.ts`; layout `src/components/scene/busBodyLayout.ts`; render `src/nodes/BusSplitter3D.tsx`, `src/nodes/BusJoiner3D.tsx`, `src/nodes/BusComponentRenderer.tsx`; see ADR-0009 |
| **Simulation / boolean logic** | `src/simulation/topologicalEval.ts` (evaluates placed chips through `src/core/chips/evaluateChip.ts`) · specs: `src/simulation/topologicalEval.test.ts`, per-chip truth tables in `src/core/chips/builtins/project01.test.ts` |
| **R3F canvas / scene** | `src/components/canvas/` |
| **Non-3D DOM shell / 3D⇄2D boundary** | `src/components/Shell.tsx` (`App = providers → <Shell scene={<CanvasArea/>} />`); the store is the contract |
| **RTL integration tests (non-3D UX)** | `src/test/renderShell.tsx` harness — render the shell with no Canvas; rigor in AGENTS.md §3 Step 4.1 |
| **Performance mode / render detail** | `src/components/canvas/Scene/renderConfig.ts`, `src/lib/performanceModeStorage.ts`, `src/store/actions/viewActions/` |
| **Scene-graph routing tests (3D geometry)** | `src/test/r3f/` harness + `src/components/canvas/routingScene.test.tsx` — GPU-free R3F scene-graph tests asserting rendered wire geometry; see ADR-0008 |
| **Unit / store tests** | Colocate `*.test.ts` next to code; reset pattern: `src/store/actions/gateActions/gateActions.test.ts` |
| **Playwright store E2E** | `e2e/specs/**/*.store.spec.ts`, `e2e/fixtures/store.fixture.ts` |
| **LLM workflow + harness tuning** | `docs/llm-workflow.md`, `docs/llm-harness.md`, `docs/llm-docs-sync.md` |
| **Definition of done** | `docs/harness/implementer-brief.md` |

## ⚠️ IMPORTANT: Phase Tracking & Maintenance

**Last Updated:** 2026-09-18  
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
2. **Verify structure exists** - Don't assume future directories exist. Every path cited inline in this file
   (and in `AGENTS.md`) is checked by `pnpm run lint:docs`; fenced tree diagrams are not (ADR-0014)
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
│   ├── scene/        # ChipBody3D (generic 3D body for any registered chip), chipBodyLayout,
│   │                 #   busBodyLayout — pin-layout math the renderers share
│   ├── ui/           # HACER shell components (CompactToolbar, RightActionBar,
│   │   │             #   PropertiesPanel, HelpBar, KeyboardShortcutsModal,
│   │   │             #   StatusBar, DemoOverlay, coming-soon helper, gate glyphs)
│   └── ui-kit/       # shadcn/ui primitives (button, tooltip, popover, dialog,
│                     #   tabs, switch, separator, input, label, card, kbd,
│                     #   theme-provider). Drop-in copies via `npx shadcn add`.
├── core/             # Pure logic, no React (imports store *types* only)
│   ├── index.ts      # THE ENGINE'S FRONT DOOR — compile HDL, the chip registry, evaluate,
│   │                 #   the .tst/.cmp runner. Code outside src/core imports from here.
│   ├── chips/        # ChipDefinition types, ChipRegistry, appRegistry (builtin + user singletons),
│   │   │             #   evaluateChip seam, combineRegistries
│   │   └── builtins/ # project01.ts — the 16 Project 1 builtins (definition + evaluate + test)
│   ├── hdl/          # HACK HDL parser + compiler, Project 1 HDL sources/fixtures
│   ├── serialization/ # Circuit document save/load format (wired via persistenceActions)
│   └── testing/      # .tst/.cmp parsers, test engine, implementation sources, chip completion
├── lib/              # notify (Sonner-backed), utils (cn helper), demoTour, performanceModeStorage
├── styles/           # globals.css (Tailwind v4 + OKLch tokens + Geist fonts)
├── gates/            # Gate placement plumbing (per-chip components and icons live elsewhere — see core/chips/ and components/scene/)
│   ├── GateRenderer.tsx  # Registry-driven 3D renderer dispatch for any placed chip
│   ├── common/       # Shared 3D primitives (BaseGate, GatePin, WireStub)
│   ├── handlers/     # Gate event handlers (selection, drag, rotate)
│   └── types.ts      # Gate-renderer prop types
├── nodes/            # Circuit I/O nodes, junctions (HDL-level pins), and bus components
│   ├── components/   # InputNode3D, OutputNode3D, JunctionNode3D
│   ├── BusSplitter3D.tsx / BusJoiner3D.tsx / BusComponentRenderer.tsx  # bus components (ADR-0009)
│   └── config/       # Node configuration (nodeConfig.ts)
├── simulation/       # Circuit simulation engine (pure logic)
│                     #   index.ts — the other half of the engine's front door: bus operations.
│                     #   topologicalEval/truthTable/busLogic walk the canvas document and are
│                     #   deliberately not exported; signalDisplay/multiBitFormat format
│                     #   values for display and are imported directly by the UI.
├── scenarios/        # Recovered circuits and truth tables, no browser imports (#195)
│   └── drivers/      # core.ts runs every scenario via compileHDL. No store driver (ADR-0020).
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
│       ├── busActions/ + busPlacementActions/ # Bus splitter/joiner CRUD and placement (ADR-0009)
│       ├── persistenceActions/ # Circuit save/load (localStorage)
│       ├── statusActions/      # Status bar messages
│       ├── testActions/        # runChipTest — Test Lab store action
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
│   ├── standards.md  # TDD workflow, test quality
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
├── rules/           # workflow.md (pointer to docs/llm-workflow.md)
└── skills/          # Composable skill files (24 skills, load on demand)
    ├── brainstorming/   # Design-first HARD GATE, visual companion, spec reviewer
    ├── code-review/
    ├── debugging/
    ├── dispatching-parallel-agents/
    ├── docs-sync/       # Session-end ADR capture + living-doc reconciliation (ours)
    ├── executing-plans/
    ├── finishing-a-development-branch/
    ├── git-operations/
    ├── ha-next/ · ha-prompt-it/   # Harness loop skills (ours)
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
├── backlog.mjs          # `ready` / `projects` — the backlog over GitHub Issues, pick rule from docs/portfolio.md (ADR-0013)
├── blast-radius.mjs     # production importers and the reverse closure of seed files; the triage threshold is in blast-radius.logic.mjs (#333)
├── peer-range.mjs       # CI: installed react / react-dom / three / @react-three/* peer ranges (#455)
├── check-doc-paths.mjs  # lint:docs — no absolute paths (all docs) + cited paths exist (REPO_MAP, AGENTS)
├── check-test-files.sh  # Pre-commit TDD verification script
├── hooks/               # Pure logic + tests behind the hooks (docPaths, docPathExists, docsSyncStop)
├── sync-superpowers.sh  # Sync skills from obra/superpowers (preserves hacer-patterns, docs-sync)
├── sync-vectors.sh      # Clone nand2tetris/web-ide at a pinned commit; write conformance/vectors/
└── protected-paths.logic.mjs  # conformance/vectors/** is a protected path (#193, #151 extends it)

conformance/
└── vectors/             # Held-out nand2tetris oracle. Not covered by HACER's MIT license.
    ├── LICENSE          # CC BY-NC-SA 3.0 notice + the pinned web-ide commit
    └── 01/              # Project 1 .hdl/.tst/.cmp. Projects 2-5 are follow-ups.

.github/
├── copilot-instructions.md       # GitHub Copilot quick-start
├── PULL_REQUEST_TEMPLATE.md      # PR template with TDD checklist
└── workflows/
    ├── ci.yml        # Main CI (lint + docs paths + unit tests + build)
    ├── e2e.yml       # Playwright E2E — manual dispatch only (store | ui | all)
    ├── deploy.yml    # GitHub Pages deployment (push to main)
    ├── pr-preview.yml # PR preview deployment
    └── release.yml   # semantic-release
```

### 🔄 Phase 0.5 — Project 1: Boolean Logic (in progress)

Landed and shown in the tree above: `src/core/chips/` (registry, builtins, `evaluateChip` seam),
`src/core/index.ts` + `src/simulation/index.ts` (the engine's entry points, #336),
`src/core/hdl/` (parser + compiler), `src/core/testing/` (`.tst`/`.cmp` engine, fixtures in
`src/core/testing/project1TstFixtures.ts` and `src/core/testing/project1CmpFixtures.ts`), `src/simulation/topologicalEval.ts`,
`src/components/scene/ChipBody3D.tsx` + `src/components/scene/chipBodyLayout.ts`, `src/components/ui/icons/ChipIcons.tsx`,
`src/components/ui/TestResultsPanel.tsx`, `src/components/ui/PinoutPanel.tsx`, `src/components/ui/StatusBar.tsx`,
`src/store/actions/persistenceActions/`, and the bus components under `src/nodes/`.
Held-out oracle (#193): official Project 1 vectors in `conformance/vectors/01/`, refreshed by
`scripts/sync-vectors.sh`. The licence notice is `conformance/vectors/LICENSE`.
`conformance/vectors/` is a protected path (`scripts/protected-paths.logic.mjs`).

**Still to come (no files yet — do not cite paths for these until they exist):** an HDL editor panel,
a chip I/O definition panel, and a project/chip workflow browser. (User/composite chips already render
through `ChipBody3D`, which resolves `chipName` from the builtin *and* user registries.)
Spec: `docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md`; tickets: `docs/plans/phase-0.5-tickets-CHECKLIST.md`.

### 🔄 Phase 0.6 — Projects 2-3: Arithmetic & Sequential Logic (planned)

No files yet. Expect Project 2/3 builtins as siblings of `src/core/chips/builtins/project01.ts`, a
clock/DFF model and RAM in `src/core/`, and their `.tst`/`.cmp` fixtures next to the Project 1 ones in
`src/core/testing/`. Spec: `docs/roadmap/phases/phase-0.6-arithmetic-sequential.md`.

### 🔄 Phase 0.7 — Projects 4-5: Computer Architecture (planned)

No files yet. Expect the Hack CPU, memory-mapped I/O (Screen, Keyboard), ROM32K + `.hack` loading,
and an execution/debugging UI. Spec: `docs/roadmap/phases/phase-0.7-computer-architecture.md`.

Future directory layouts are specified in `docs/roadmap/`.

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
- `src/simulation/topologicalEval.ts` - Circuit evaluation (per-chip logic lives on `ChipDefinition.evaluate` in `src/core/chips/builtins/project01.ts`)
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
- `src/core/index.ts` / `src/simulation/index.ts` - The engine's public surface: compile HDL, the chip registry, evaluate, the `.tst`/`.cmp` runner, bus operations. Named re-exports only, sourced from the module indexes. `src/core/index.test.ts` (the `node` Vitest project) asserts the exact export list, runs one chip end to end with no DOM global defined, and walks the transitive import closure to prove it reaches no store, UI, package or browser global (#336).
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
- `src/scenarios/` - Headless circuits lifted from the deleted e2e scenario files. `src/scenarios/drivers/core.ts` runs each one through `compileHDL` and the chip registry (#195). Layout fields stay on the scenario for later drivers.
- `CircuitState.lastSimulationError` — combinational cycle metadata after a failed `simulationTick` (cleared on success / `clearCircuit`)
- Multi-bit bus support (data model, simulation, 3D splitter/joiner)
- Chip I/O definition workflow (node rename, name display, chip definition panel)
- HDL editor, test results, pinout, chip workflow browser UI panels
- Circuit persistence (localStorage save/load)
- Builtin implementations for all 15 Project 1 chips
- See [Gap Analysis](docs/compatibility/nand2tetris/project1/gap-analysis.md) for detailed requirements

### 🔄 Phase 0.6: Projects 2-3 — Arithmetic & Sequential Logic (Planned)
- No files yet — builtins will sit beside `src/core/chips/builtins/project01.ts`
- DFF, clock system, Register, PC; SparseMemory, RAM8 through RAM16K
- Clock signal propagation and two-phase simulation
- Project 2 chips (HalfAdder, FullAdder, Add16, Inc16, ALU)
- Project 3 chips (Bit, Register, RAM8..RAM16K, PC)

### 🔄 Phase 0.7: Projects 4-5 — Computer Architecture (Planned)
- No files yet
- Hack CPU, instruction decode, program counter; memory-mapped I/O (Screen, Keyboard); ROM32K, `.hack` file loading
- Execution and debugging UI (step, run, register/memory views)
- Screen display and keyboard input handling

### ⏸️ Phases 5-24 (Future)

No files yet — this map documents what exists. The planned layout (core/api/plugins/workers split,
software stack, monorepo) is specified per phase
in `docs/roadmap/phases/` (`docs/roadmap/phases/phase-5-core-architecture.md` through `docs/roadmap/phases/phase-24-ai-code-review.md`); see
`docs/roadmap/implementation.md` for the sequence. Two forward-looking files already exist:
`llms.txt` (AI document-discovery order) and `docs/roadmap/vision.md` (AI-Agent Parity, plugin-first).

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
- **API Layer**: Public programmatic interface (AI-Agent Parity surface; no files yet)
- **Plugin System**: Renderers, analyzers and tools behind stable APIs (no files yet)
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
- **Co-located tests** - Test files next to implementation (e.g. `src/utils/grid.ts` and `src/utils/grid.test.ts`)
- **Barrel exports** - Per-folder barrels for clean imports (e.g. `src/gates/index.ts`, `src/store/actions/index.ts`)
- **Type definitions** - Store types in `src/store/types.ts`; pure-logic types next to their module (e.g. `src/core/chips/types.ts`, `src/core/hdl/types.ts`)
- **Pure logic separation** - Pure logic in `src/core/` and `src/simulation/`, no React/browser dependencies

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

### Adding a new builtin chip (the "add a gate" recipe)

Canonical recipe: `HACER_LLM_GUIDE.md` → *Adding a builtin chip*. In one line: a gate is a
`GateInstance` with a `chipName`; add a `registerBuiltin(...)` call in `src/core/chips/builtins/project01.ts`
(definition + pure `evaluate`), a `.cmp` fixture + `CHIP_NAMES`/`PIN_SCHEMA` entry in
`src/core/chips/builtins/project01.test.ts`, and an icon in `src/components/ui/icons/ChipIcons.tsx`.
Toolbar, placement, the 3D body (`src/components/scene/ChipBody3D.tsx`) and evaluation
(`src/simulation/topologicalEval.ts`) are registry-driven — no per-chip component or logic file.

### Adding a plugin, an API function, or a software-stack component (Phase 5+)

Not possible yet — none of those seams exist. The intended shape is in
`docs/roadmap/phases/phase-5-core-architecture.md`, `docs/roadmap/phases/phase-6-plugin-system.md` and
`docs/roadmap/phases/phase-10-software-stack.md`.

## Testing Structure

### ✅ Current (Phase 0.5 - In Progress)
- **Unit Tests**: Co-located with source files (`*.test.ts` or `*.test.tsx`)
  - Grid utilities tests: `src/utils/grid.test.ts` (section line validation)
  - Gate action tests: Updated for flat orientation
  - Pin helper tests: Updated for Y offsets becoming horizontal
- **E2E Tests**: Located in `e2e/specs/` directory
  - **Store tests** (`@store`): Fast, use direct store actions - run before every commit
  - **UI tests** (`@ui`): Slow, use UI interactions - run manually or CI (twice weekly)
  - Store and UI tests come in pairs, sharing helpers from `e2e/helpers/`
  - **E2E Test Optimization**: Scene reuse, test reorganization ✅ (Phase 0.25.8)
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
