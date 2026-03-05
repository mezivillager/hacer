# Phase 0: Critical Fixes (Week 1)

**Part of:** [Comprehensive Development Roadmap](../README.md)  
**Priority:** 🔴 CRITICAL  
**Timeline:** Week 1  
**Dependencies:** None - Must complete before ANY other work

---

## Overview

This phase addresses critical documentation and tooling issues that must be resolved before any development work begins. These fixes ensure the development environment is correctly configured and documentation accurately reflects the actual codebase.

**Exit Criteria:**
- All documentation accurate and consistent
- ESLint passes with React Compiler plugin
- .cursorrules file created and active
- README.md updated with correct technical stack
- Repository structure documented

---

## 0.1 Fix Documentation Truth Debt

**Problem:** `HACER_LLM_GUIDE.md` references Valtio patterns but the codebase uses Zustand.

| Documentation Says | Actual Codebase |
|-------------------|-----------------|
| `proxy()` from Valtio | `create()` from Zustand |
| `useSnapshot(store)` | `useCircuitStore(selector)` |
| `store.property = value` | `circuitActions.method()` |
| React 18 | React 19.2.0 |

**Action Items:**
```bash
# Find all incorrect references
grep -rn "valtio\|proxy()\|useSnapshot\|React 18" --include="*.md" .
```

**Replacement Patterns:**
```typescript
// ❌ WRONG (Valtio - documented but not used)
import { proxy, useSnapshot } from 'valtio';
const store = proxy({ gates: [], wires: [] });
const Component = () => {
  const snap = useSnapshot(store);
  return <div>{snap.gates.length}</div>;
};

// ✅ CORRECT (Zustand - actual implementation)
import { useCircuitStore, circuitActions } from '@/store/circuitStore';
const Component = () => {
  const gates = useCircuitStore(state => state.gates);
  return <div>{gates.length}</div>;
};
```

---

## 0.2 Add ESLint Plugin for React Compiler

Since React Compiler handles memoization automatically, we need the ESLint plugin to catch violations:

```bash
npm install eslint-plugin-react-compiler --save-dev
```

```javascript
// eslint.config.js
import reactCompiler from 'eslint-plugin-react-compiler';

export default [
  // ... existing config
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
];
```

**What This Catches:**
- Mutations during render
- Side effects that prevent optimization
- Hook patterns that can't be auto-memoized

**What We Remove:** Manual `useMemo`, `useCallback`, `React.memo` calls become unnecessary with React Compiler. The ESLint plugin ensures we don't break compiler assumptions.

---

## 0.3 Remove Manual Memoization

Audit the codebase and remove all manual memoization since React Compiler handles this automatically:

1. **Find manual memoization:**
   ```bash
   grep -rn "useMemo\|useCallback\|React\.memo" --include="*.tsx" --include="*.ts" src/
   ```

2. **Remove unnecessary patterns:**
   - `const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);`
   - `const memoizedCallback = useCallback(() => { doSomething(a); }, [a]);`
   - `export default React.memo(Component);`

3. **Keep only when necessary:**
   - Referential equality for context providers
   - Expensive computations not handled by React Compiler
   - Stable references for third-party libraries

---

## 0.4 Create `.cursorrules` File

```markdown
# .cursorrules

## Project: HACER

## Stack
- React 19 with React Compiler (NO manual memoization)
- TypeScript 5.9 strict mode
- Zustand for state (NOT Valtio)
- React Three Fiber for 3D
- Vitest + Playwright for testing

## Critical Rules

### State Management
- Read state: `useCircuitStore(state => state.property)`
- Mutate state: `circuitActions.methodName()`
- NEVER mutate store directly
- NEVER use Valtio patterns (proxy, useSnapshot)

### React Compiler
- NO manual useMemo, useCallback, React.memo
- React Compiler handles memoization automatically
- Don't mutate during render
- Keep renders pure

### Architecture
- Pure logic goes in `src/core/` (no React imports)
- UI components go in `src/components/`
- Public API in `src/api/index.ts`
- Plugins in `src/plugins/`

### File Organization
- One component per file (max 200 lines)
- Co-locate tests with implementation
- Use barrel exports (index.ts)

### Testing
- Unit tests for all `src/core/` functions
- E2E tests for user workflows
- Property-based tests for gate logic

### Adding a New Gate
1. Add to GateType in `src/core/gates/types.ts`
2. Add definition in `src/core/gates/registry.ts`
3. Create renderer in `src/components/gates/`
4. Add tests (truth table + visual)
```

---

## 0.5 Update README.md

```markdown
## Tech Stack

- **Framework:** React 19 with React Compiler
- **Language:** TypeScript 5.9 (strict mode)
- **State:** Zustand with Immer middleware
- **3D Rendering:** React Three Fiber + Drei
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Build:** Vite

## Quick Start

```bash
npm install
npm run dev      # Start development server
npm test         # Run unit tests
npm run test:e2e # Run E2E tests
```

## Adding a New Gate Type

1. Define the gate type and logic
2. Create the visual renderer
3. Add truth table tests
4. Update documentation

See `docs/ADDING_GATES.md` for detailed instructions.
```

---

## 0.6 Create Repository Map Documentation

Create `REPO_MAP.md` (at repository root) to help AI agents and developers understand the codebase structure:

```markdown
# HACER Repository Map

## Directory Structure

```
src/
├── core/           # Pure logic, no UI dependencies
├── api/            # Public programmatic interface
├── plugins/        # Plugin system
├── store/          # Zustand state management
├── components/     # React UI components
└── workers/        # Web Workers
```

## Key Files

- `src/core/gates/registry.ts` - Single source of truth for gate definitions
- `src/api/index.ts` - Public API entry point
- `src/store/circuitStore.ts` - Main application state
```

---

## Phase 0 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Fix HACER_LLM_GUIDE.md | 2h | - | - | All Valtio references removed |
| Install eslint-plugin-react-compiler | 30m | - | <100ms lint time | ESLint passes without manual memoization |
| Remove manual memoization | 2h | ESLint plugin | - | No manual useMemo/useCallback/React.memo |
| Create .cursorrules | 1h | - | - | File exists and is active |
| Update README.md | 1h | - | - | Tech stack accurately described |
| Create REPO_MAP.md | 1h | - | - | Directory structure documented |

**Total Estimated Effort:** ~7.5 hours  
**Performance Budget:** <100ms lint time, <50MB bundle size

---

## Risk Mitigation

**Documentation Drift:** Regular audits to ensure documentation stays current with codebase changes.

**Tooling Inconsistency:** Automated checks in CI to ensure ESLint and TypeScript configurations are correct.

**Developer Onboarding:** Clear documentation and .cursorrules to reduce ramp-up time for new developers.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)  
**Next:** [Phase 0.25: UI/UX Improvements & Grid-Based Circuit Design](phase-0.25-ui-improvements.md)
