---
name: brainstorming
description: Use before any non-trivial feature or architectural decision — before writing any code or tests
---

# Brainstorming and Design for HACER

## HARD GATE

```
DO NOT WRITE CODE UNTIL A DESIGN IS APPROVED
```

This applies to every non-trivial task (3+ implementation steps, any architectural decision). A simple task can have a short design — but you must present it and get approval before coding.

---

## Process

### 1. Explore Current State

Before asking questions, understand what already exists:

```bash
# Check recent work
git log --oneline -10

# Find related files
grep -rn "keyword" src/ --include="*.ts" --include="*.tsx" -l

# Check current phase
cat .cursorrules | head -30
```

Read relevant source files, tests, and the phase tracking section of `.cursorrules`.

### 2. Propose 2–3 Approaches

Present alternatives before committing. For each:
- What it does
- Trade-offs (complexity, performance, maintainability, phase fit)
- Your recommendation and why

*From Tree-of-Thoughts: explore the solution space before descending.*

### 3. Present the Design

Scale the design to its complexity:
- **Small change** (1–2 files): a few sentences + file paths
- **Medium feature**: architecture + component breakdown + data flow
- **Large feature**: full spec with interfaces, error handling, testing strategy

Cover:
- Which files change and why
- Component/function interfaces
- State changes (Zustand slices affected)
- Error cases
- How it will be tested

### 4. Write the Design Document

Save to `docs/specs/YYYY-MM-DD-<topic>.md`. Commit it before writing code.

```markdown
# Spec: <Feature Name>
Date: YYYY-MM-DD

## Goal
One sentence.

## Approach
Which of the 2–3 approaches was chosen and why.

## Files
- Create: `src/...`
- Modify: `src/...`

## Interfaces
Key types/functions with signatures.

## Testing Strategy
What tests will verify this.
```

### 5. Transition to Planning

After the design is approved, use the `planning` skill to create a bite-sized implementation plan.

---

## HACER Design Principles

- **Follow the current phase.** Check `.cursorrules` → Phase Tracking. Do not implement Phase 3 features when in Phase 0.5.
- **One component per file.** Never put two React components in one file.
- **Components under 200 lines.** If a design requires a component over 200 lines, break it into sub-components.
- **Pure, testable logic.** Keep gate simulation, store actions, and business logic free of React/Three.js side effects.
- **YAGNI.** Remove anything from the design that is not strictly needed for the current goal.

---

## Anti-Patterns to Flag in Any Design

| Pattern | Problem |
|---------|---------|
| Mutating Zustand state directly | Use `circuitActions.*()` |
| `useCircuitStore().property` | Always use selectors: `useCircuitStore(s => s.property)` |
| `useMemo` / `useCallback` / `React.memo` | React Compiler handles this — remove manually |
| `console.log` for user feedback | Use Ant Design `message` or `notification` |
| New 3D geometries in render loops | Create once, dispose on unmount |
| Valtio patterns (`proxy`, `useSnapshot`) | Use Zustand only |
