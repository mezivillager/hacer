---
name: systematic-debugging
description: Use when encountering any bug, test failure, unexpected behavior, or CI failure — before proposing any fix
---

# Systematic Debugging for HACER

## The Iron Law

```
NO FIX WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Random fixes waste time and create new bugs. If you haven't identified the root cause, you cannot propose a fix.

---

## Four Phases

### Phase 1 — Root Cause Investigation

**BEFORE attempting any fix:**

1. **Read error messages completely.** Stack traces contain line numbers and file paths. Do not skim.

2. **Reproduce the failure consistently.**
   ```bash
   npm run test:run              # unit test failure
   npm run test:e2e:store        # store/integration failure
   npm run lint                  # type or lint error
   npm run build                 # compile error
   ```

3. **Check recent changes.**
   ```bash
   git diff HEAD~1               # what changed in the last commit
   git log --oneline -10         # recent history
   ```

4. **Gather evidence before guessing.** In multi-layer systems (React component → store action → simulation logic), add diagnostic output at each boundary before proposing fixes:
   ```typescript
   console.debug('[Component] props:', props)
   console.debug('[Action] payload:', payload)
   console.debug('[Simulation] state before:', getState())
   ```
   Run once to see *where* the data breaks down. Then investigate that layer.

5. **Trace data flow backward.** Bad output? Find where the bad value came from. Keep tracing up the call stack until you find the origin. Fix at the origin, not at the symptom.

### Phase 2 — Pattern Analysis

1. Find a **working example** in the codebase that does something similar.
2. Compare **every difference** between the working version and the broken version.
3. Do not assume any difference "can't matter" — test each one.

HACER patterns to check:
- Is state being read with a selector? `useCircuitStore(state => state.x)` not `useCircuitStore().x`
- Is state being mutated through an action? `circuitActions.doX()` not direct store mutation
- Are Three.js resources disposed on unmount?
- Are hooks called at the top level (not inside conditions/loops)?

### Phase 3 — Hypothesis and Testing

1. **State a single, specific hypothesis:** "I believe X is the root cause because Y."
2. **Make the smallest possible change** to test that hypothesis. One variable at a time.
3. **Verify the result.** Did it fix the issue? Did it cause others?
4. If the fix didn't work → form a **new hypothesis**. Do not pile on more changes.

### Phase 4 — Implementation

1. Write a **failing test** that reproduces the bug before fixing it.
2. Fix the root cause (not the symptom).
3. Verify the test passes and no other tests regress.
4. **If 3+ fixes have failed**, stop. Question whether the architecture is the problem, not the code.

---

## HACER-Specific Debug Commands

```bash
# Find where a type is used
grep -rn "MyType" src/ --include="*.ts" --include="*.tsx"

# Check store shape at a point
npm run test -- --run src/store/actions/myAction.test.ts

# Inspect Playwright test failure with headed browser
npm run test:e2e:headed

# Full E2E output
npx playwright test e2e/specs/feature.spec.ts --reporter=list
```

---

## Red Flags — Stop and Return to Phase 1

- "Quick fix for now, investigate later"
- "Just try changing X and see"
- "I don't fully understand but this might work"
- Adding multiple changes at once
- Fix #3 with no root cause identified → question the architecture

---

## Connecting to TDD

After identifying the root cause, use the TDD skill to fix it:
1. Write a test reproducing the bug (RED)
2. Implement the minimal fix (GREEN)
3. Refactor if needed

This proves the fix works and prevents regression.
