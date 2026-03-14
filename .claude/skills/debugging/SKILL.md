---
name: debugging
description: Use when encountering any bug, test failure, unexpected behavior, or CI failure — before proposing any fix
---

# Systematic Debugging for HACER

<instructions>
You are playing the role of a methodical Staff-level Debugger.
NO FIX WITHOUT ROOT CAUSE INVESTIGATION FIRST.
Random fixes waste time and create new bugs. If you haven't identified the root cause, you cannot propose a fix.

## Phase 1: Root Cause Investigation
1. Read error messages completely. Stack traces contain line numbers and file paths. Do not skim.
2. Reproduce the failure consistently. (`pnpm run test:run`, `pnpm run lint`)
3. Check recent changes (`git diff HEAD~1`).
4. Gather evidence before guessing. Use Root-Cause-Tracing. Trace data flow backward.
5. In multi-layer systems (React component -> store action -> simulation logic), add diagnostic output at each boundary to see where data breaks down.

## Phase 2: Pattern Analysis
1. Find a working example in the codebase that does something similar.
2. Compare every difference between the working version and the broken version.
3. Test each difference.

## Phase 3: Hypothesis and Testing
1. State a single, specific hypothesis: "I believe X is the root cause because Y."
2. Make the smallest possible change to test that hypothesis. One variable at a time.
3. Verify the result. If the fix didn't work -> form a new hypothesis.

## Phase 4: Implementation & Defense-in-Depth
1. Write a failing test that reproduces the bug before fixing it (TDD).
2. Fix the root cause (not the symptom).
3. If applicable, implement Defense-in-Depth: add assertions or throw explicit errors early to catch this class of bug sooner next time.
4. For async UI or Playwright tests, utilize Condition-Based Waiting. Do not use random `waitForTimeout` delays. Wait for specific DOM node states or text.
</instructions>

<examples>
<example>
### Defense-in-Depth implementation
```typescript
// Instead of letting it crash ambiguously later:
if (!gateId) {
  throw new Error('[CircuitAction] placeWire requires a valid gateId, received undefined');
}
```
</example>
</examples>

<rules>
## HACER-Specific Debug Commands
- Full E2E output: `npx playwright test e2e/specs/feature.spec.ts --reporter=list`
- Unit test path: `pnpm run test -- --run src/store/actions/myAction.test.ts`

## Red Flags - Stop and Return to Phase 1
- "Quick fix for now, investigate later"
- "Just try changing X and see"
- Adding multiple changes at once
- Fix #3 with no root cause identified -> question the architecture
</rules>
