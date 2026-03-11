# Contributing to HACER

Thank you for your interest in contributing! HACER is a first-principles computing platform -- from NAND gates to a complete software stack. This document covers how to set up, develop, test, and submit changes.

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/mezivillager/hacer.git
cd hacer
```

2. **Prerequisites**: Node.js 20 or higher. Use `nvm use` if you have [nvm](https://github.com/nvm-sh/nvm) (`.nvmrc` is provided).

3. **Install dependencies**

```bash
npm install
```

4. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the simulator locally.

## TDD Workflow

This project follows **Test-Driven Development**. All new features and bug fixes must follow the Red-Green-Refactor cycle:

1. **RED** - Write a failing test that defines the expected behavior
2. **GREEN** - Write minimal code to make the test pass
3. **REFACTOR** - Clean up code while keeping tests green

**For every feature or bug fix:**
- Create the test file BEFORE the implementation
- Run tests to confirm they FAIL (Red phase)
- Implement minimal code to pass (Green phase)
- Refactor while keeping tests green

See [docs/testing/standards.md](docs/testing/standards.md) for the detailed workflow, examples, and copy-paste templates in [docs/testing/templates/](docs/testing/templates/).

### TDD by Code Layer

| Layer | Test type | Location | Example |
|-------|-----------|----------|---------|
| Pure logic (`src/simulation/`, `src/store/actions/`) | Unit (Vitest) | Co-located `.test.ts` | `gateLogic.test.ts` |
| Components (`src/gates/`, `src/components/`) | Component (RTL) | Co-located `.test.tsx` | `AndGate.test.tsx` |
| Workflows | E2E (Playwright) | `e2e/specs/` | `gate-placement.store.spec.ts` |

## Code Style and Linting

- **Lint before committing**: `npm run lint` (runs both typecheck and ESLint)
- **Fix auto-fixable issues**: `npm run lint:fix`
- **TypeScript strict mode** is enforced; run `npm run typecheck` to verify
- **React Compiler** handles memoization -- do NOT use manual `useMemo`, `useCallback`, or `React.memo`
- Avoid `any` types -- use proper generics or `unknown` with type guards

## Commit Message Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation. Commit messages are validated using commitlint.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature (triggers minor version bump)
- **fix**: A bug fix (triggers patch version bump)
- **perf**: Performance improvements (triggers patch version bump)
- **revert**: Reverts a previous commit (triggers patch version bump)
- **docs**: Documentation only changes (no release)
- **style**: Code style changes (formatting, missing semi colons, etc.) (no release)
- **refactor**: Code refactoring without feature changes (no release)
- **test**: Adding or updating tests (no release)
- **build**: Build system or dependency changes (no release)
- **ci**: CI/CD configuration changes (no release)
- **chore**: Other changes that don't modify src or test files (no release)

### Examples

```bash
feat: add wire color customization
fix: resolve gate deletion memory leak
docs: update installation instructions
refactor: extract wire routing logic
test: add unit tests for gate rotation
```

### Breaking Changes

To trigger a major version bump, add `BREAKING CHANGE:` in the commit body or append `!` after the type:

```bash
feat!: redesign state management architecture

BREAKING CHANGE: The store API has been completely redesigned.
Migration guide: https://...
```

### Scope (optional)

You can add a scope to provide more context:

```bash
feat(gates): add multiplexer gate type
fix(simulation): correct XOR gate logic
docs(readme): add deployment section
```

## Testing Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `npm run test:run` | Run unit tests (Vitest) once | Before committing |
| `npm run test` | Run unit tests in watch mode | During development |
| `npm run test:coverage` | Run unit tests with coverage | Checking coverage |
| `npm run test:e2e:store` | Run fast E2E tests (store-based) | Before committing |
| `npm run test:e2e:ui` | Run full UI E2E tests (slower) | Manual / CI only |

## Pull Request Process

1. Create a branch from `main`
2. Follow the TDD workflow for all new code
3. Ensure all tests pass: `npm run test:run`
4. Ensure lint passes: `npm run lint`
5. Run store E2E tests: `npm run test:e2e:store`
6. Open a PR and fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md)

The PR template includes a TDD checklist. All items must be checked for approval.

## Architecture Overview

HACER is organized in layers that separate pure logic from UI:

```
src/
├── simulation/       Pure gate logic (no React/browser deps)
├── store/actions/    State mutations organized by domain
├── components/       React UI and 3D canvas
├── gates/            Gate components, icons, configs
├── nodes/            I/O and junction node components
├── hooks/            Custom React hooks
├── utils/            Wiring, pathfinding, grid utilities
└── theme/            Design tokens and theme system

e2e/                  Playwright E2E tests
  ├── specs/          Test specs (store + UI pairs)
  ├── fixtures/       Test fixtures and setup
  ├── helpers/        Actions, assertions, waits
  └── scenarios/      Reusable test scenarios
```

**Key architectural rules:**
- `src/simulation/` has zero UI dependencies -- pure functions only
- State reads via `useCircuitStore(state => state.property)`, mutations via `circuitActions.methodName()`
- Never mutate the store directly
- One component per file, max 200 lines
- Co-locate tests with implementation

For the full repository map including planned directories, see [REPO_MAP.md](REPO_MAP.md). For the target architecture (core layer, API layer, plugin layer), see [docs/roadmap/vision.md](docs/roadmap/vision.md).

## Where to Contribute

| Area | Skill level | Description |
|------|-------------|-------------|
| Bug fixes | Beginner | Fix issues labeled `bug` |
| Gate types | Beginner | Add new gate types (NOR, XNOR, etc.) |
| Tests | Beginner | Improve test coverage for existing code |
| Documentation | Beginner | Improve docs, fix typos, add examples |
| HDL support | Intermediate | HDL parser/generator (Phase 0.5) |
| Sequential logic | Intermediate | DFF, Register, RAM components (Phase 0.5) |
| Performance | Advanced | Simulation optimization, rendering |
| Architecture | Advanced | Core layer refactoring (Phase 5+) |

## Questions?

- Open an [issue](https://github.com/mezivillager/hacer/issues) for bugs or feature requests
- Check the [roadmap](docs/roadmap/README.md) for planned work
- Review [REPO_MAP.md](REPO_MAP.md) for navigating the codebase
