# HACER (Hardware Architecture and Constraints Explorer & Researcher)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 22+](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![CI](https://github.com/mezivillager/hacer/actions/workflows/ci.yml/badge.svg)](https://github.com/mezivillager/hacer/actions/workflows/ci.yml)

**[Play With It](https://mezivillager.github.io/hacer/)**
![hacer-demo](public/hacer-demo.gif)


A rudimentary first-principles computing platform. Build a basic computer from NAND gates up through a full software stack -- assembler, virtual machine, compiler, and high-level language -- all in an interactive 3D environment.

Inspired by [nand2tetris](https://www.nand2tetris.org/) and going beyond it: HACER enables custom hardware architectures, plugin-based extensibility, AI agent integration, and real-time collaboration.

## Vision

HACER takes you on the journey from a single NAND gate to a working computer:

```
NAND Gate --> Basic Gates --> Sequential Logic --> Computer Architecture --> Software Stack
    |              |              |                     |                       |
 Visual 3D     HDL/Text      Clock Signals         ALU/CPU/Memory        Assembler/VM/
 Building     Definitions    State Machines        I/O Systems          Compiler/HLL
```

The platform is designed for:

- **Learners** exploring digital logic and computer architecture from first principles
- **Educators** teaching computer architecture and digital logic
- **Tinkerers** designing custom hardware and experimenting with architectures
- **AI agents** building and debugging circuits programmatically

Every human action has a programmatic equivalent, so AI agents can build circuits from natural language, debug designs, generate code for custom hardware, and extend the platform.

## Current Status

HACER is in active development. Phase 0.25 (interactive 3D circuit building) is complete, and Phase 0.5 (nand2tetris Project 1 foundation) is in progress.

Completed Phase 0.5 building blocks include the chip registry/Nand primitive, numeric node values, topological evaluation, HACK HDL parsing, Project 1 HDL fixtures, `.tst` parsing, `.cmp` parsing, node rename/name display, and status messaging. Remaining Phase 0.5 work focuses on HDL compilation, test execution, chip workflow UI, pinout/test-results panels, persistence, buses, and composite chip rendering.

## Features

**Available now:**
- Interactive 3D circuit canvas powered by React Three Fiber
- Tailwind/shadcn UI shell with compact toolbar, right action drawer, properties panel, help bar, status bar, theme switching, and Low Power rendering mode
- Real-time logic simulation with visual feedback (red = 0, green = 1)
- Grid-aligned wire routing with junctions and I/O nodes
- Gate types: NAND, AND, OR, NOT, XOR, NOR, XNOR with placement controls
- Gate movement, rotation, selection, and deletion
- Wire selection and deletion
- HACK HDL parser for Project 1 syntax
- `.tst` and `.cmp` parsers plus Project 1 fixture corpora
- Automated CI, mutation testing workflow, scheduled UI E2E, and semantic-release

**Coming next:**
- HDL compiler for runnable chip definitions
- Test execution engine that runs `.tst` scripts against `.cmp` expectations
- Chip workflow browser, chip definition panel, pinout panel, HDL editor, and test results panel
- Circuit persistence and 3D/HDL interoperability
- Multi-bit bus rendering and composite chip rendering

## Prerequisites

- **Node.js** 22 or higher (`.nvmrc` provided -- run `nvm use` if you have [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 10.x (`packageManager` pins `pnpm@10.12.1`)

## Getting Started

```bash
git clone https://github.com/mezivillager/hacer.git
cd hacer
pnpm install
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the simulator locally, or try the [live demo](https://mezivillager.github.io/hacer/).

## Controls

| Action | Input |
|--------|-------|
| Select gate | Left-click on gate |
| Toggle input pins | Click on input pin (red = 0, green = 1) |
| Zoom | Scroll wheel |
| Rotate view | Click + drag on canvas |
| Move gate | Drag gate on grid |
| Delete wire | Right-click on wire |

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript 5.9 | Type safety (strict mode) |
| Vite 8 | Build tool |
| React Three Fiber 9 + Three.js | 3D rendering |
| Zustand 5 + Immer | State management |
| React Compiler | Automatic memoization |
| Tailwind CSS v4 + shadcn/ui primitives | UI styling and component primitives |
| Radix UI | Accessible headless primitives under shadcn components |
| lucide-react | Icon system |
| Sonner | Toast notifications through `@/lib/notify` |
| next-themes | Light/dark/system theme handling |
| Vitest | Unit testing |
| Playwright | E2E testing |
| Stryker | Mutation testing |
| semantic-release | Automated releases |

## Project Structure

```
src/
├── components/
│   ├── ui/           # HACER shell components (CompactToolbar, RightActionBar, PropertiesPanel, HelpBar, StatusBar)
│   ├── ui-kit/       # shadcn/ui-style primitives copied into the app
│   └── canvas/       # React Three Fiber 3D (Scene, Wire3D, handlers, hooks)
├── core/             # Chip registry, HDL parser, test parsers, Project 1 fixtures
├── gates/            # Gate components, icons, config, and handlers
├── nodes/            # Input, output, and junction nodes
├── simulation/       # Circuit simulation engine (pure logic)
├── store/            # Zustand state and domain-organized actions
├── hooks/            # Custom hooks (keyboard shortcuts, drag, release version)
├── lib/              # notify, utils, demo tour, GitHub release helpers, local UI preference storage
├── styles/           # Tailwind v4 globals and CSS variables
├── theme/            # Shared theme tokens consumed by canvas utilities
├── utils/            # Wiring, pathfinding, grid, hit-testing utilities
├── App.tsx           # Main application
└── main.tsx          # Entry point

e2e/                  # Playwright E2E tests (store + UI specs)
docs/                 # Testing standards, roadmap, TypeScript guidelines
```

## Architecture

HACER follows a layered architecture that separates pure logic from UI, enabling headless operation, plugin extensibility, and AI agent integration:

```
Plugin Layer        Renderers (3D, 2D, data), AI agents, analyzers, tools
      |
Public API Layer    Circuit operations, simulation control, HDL, events
      |
Core Layer          Gate registry, simulation engine, HDL compiler,
                    chip hierarchy, sequential logic, software stack
```

**Architecture principles:** core independence (zero UI deps in simulation), plugin-first extensibility, AI-agent parity, progressive complexity, nand2tetris compatibility, and deterministic execution.

See [docs/roadmap/vision.md](docs/roadmap/vision.md) for the full architecture vision.

## Roadmap

HACER is developed in phases, each building on the previous. The full roadmap spans 25 phases from basic gate simulation to a complete computing platform with collaboration, AI agents, and a public API ecosystem.

### Foundation (Phases 0 -- 0.5)

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | Complete | Critical fixes, documentation, tooling setup |
| 0.25 | Complete | Grid-based placement, wire routing, gate movement, E2E tests |
| 0.5 | In Progress | HDL parser/compiler, test scripts, buses, chip hierarchy |

### Core Platform (Phases 1.5 -- 7)

| Phase | Status | Description |
|-------|--------|-------------|
| 1.5 | Complete | Tailwind v4 + shadcn/ui shell, tokens, theme switching |
| 2.5 | Complete / maintain | Developer tooling, CI, hooks, and agent harness without a separate component explorer |
| 3.5 | Partially Complete | Vitest, Playwright, Stryker, CI, and scheduled UI E2E are active; property/visual regression tooling remains unselected |
| 4.5 | Complete | semantic-release, conventional commits, changelog, release workflow |
| 5 | Planned | Core architecture refactor, branded types, Zod schemas, event system |
| 6 | Planned | Plugin system, renderer/analyzer/agent plugin framework |
| 7 | Planned | AI agent integration, public API, programmatic circuit building |

### Full Computer (Phases 8 -- 11)

| Phase | Status | Description |
|-------|--------|-------------|
| 8 | Planned | Compatibility validation, integration tests, cross-browser testing |
| 9 | Planned | Web Worker simulation, instanced rendering, LOD, performance |
| 10 | Planned | Hack assembler, VM interpreter, Jack compiler, integrated debugger |
| 11 | Planned | Built-in component library (ALU, CPU, RAM), visual browser |

### Platform & Ecosystem (Phases 12 -- 24)

| Phase | Status | Description |
|-------|--------|-------------|
| 12 | Planned | Backend (NestJS, GraphQL, PostgreSQL), real-time collaboration |
| 13 | Planned | Production deployment, error tracking, monitoring |
| 14 | Planned | Security audit, CSP, GDPR compliance |
| 15 | Planned | Authentication (Better Auth, social login, MFA) |
| 16 | Planned | Public API, developer portal, SDKs |
| 17 | Planned | Mobile and touch optimization |
| 18 | Planned | Advanced collaboration (voice/video, team workspaces) |
| 19 | Planned | Learning analytics, AI-powered recommendations |
| 20 | Planned | Accessibility (WCAG AA), internationalization |
| 21 | Planned | Progressive Web App, offline support |
| 22 | Planned | Public website, Nextra documentation platform |
| 23 | Planned | AI-powered documentation generation |
| 24 | Planned | AI code review and automated quality gates |

For detailed phase specs, checklists, and dependencies, see the [full roadmap](docs/roadmap/README.md) and [implementation checklist](docs/roadmap/implementation.md).

## Documentation

| Document | Description |
|----------|-------------|
| [REPO_MAP.md](REPO_MAP.md) | Repository map, architecture, and navigation guide |
| [docs/roadmap/](docs/roadmap/) | Full roadmap with 25 phase documents |
| [docs/roadmap/vision.md](docs/roadmap/vision.md) | Vision statement, architecture principles, target architecture |
| [docs/roadmap/implementation.md](docs/roadmap/implementation.md) | Implementation checklist, metrics, risk assessment |
| [docs/testing/](docs/testing/) | TDD workflow, test standards, templates |
| [docs/typescript-guidelines.md](docs/typescript-guidelines.md) | TypeScript conventions |

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, TDD workflow, and PR guidelines.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

MIT -- see [LICENSE](LICENSE) for details.
