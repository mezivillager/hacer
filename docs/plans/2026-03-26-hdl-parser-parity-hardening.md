# HDL Parser Parity Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Phase 0.5 HDL parsing with explicit diagnostics and canonical Project 1 fixture parity coverage while keeping parser behavior strict and lean.

**Architecture:** Keep `parseHDL` API and default fail-fast parser flow unchanged. Improve coverage by consolidating Project 1 HDL fixtures into a single test fixture module and driving parser regression tests from that corpus. Preserve explicit diagnostics (`CLOCKED`, descending sub-bus ranges) and avoid broad recovery frameworks.

**Tech Stack:** TypeScript (strict), Vitest, existing HACER HDL parser/test modules, pnpm scripts.

---

## File Structure and Responsibilities

- Create: `src/core/hdl/project1HdlFixtures.ts`
  - Canonical Project 1 HDL fixture corpus (single source of truth for parser tests).
- Modify: `src/core/hdl/parser.test.ts`
  - Import fixtures module, add fixture-loop parity tests, tighten explicit diagnostic assertions.
- Optional Modify (only if required by tests): `src/core/hdl/parser.ts`
  - Keep strict/fail-fast behavior; only touch if exact diagnostic text mismatch is found.
- Create: `docs/plans/2026-03-26-hdl-parser-parity-hardening.md`
  - This implementation plan.

## Chunk 1: Fixture Consolidation and Parity Coverage

### Task 1: Create failing fixture-parity tests that require a canonical fixture module

**Files:**
- Modify: `src/core/hdl/parser.test.ts`
- Test: `src/core/hdl/parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { project1HdlFixtures } from './project1HdlFixtures'

it('contains exactly 16 Project 1 HDL fixtures', () => {
  expect(Object.keys(project1HdlFixtures)).toHaveLength(16)
})

for (const [name, hdl] of Object.entries(project1HdlFixtures)) {
  it(`parses ${name}.hdl fixture without errors`, () => {
    const result = parseHDL(hdl)
    expect(result.success).toBe(true)
  })
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: FAIL with module import not found (`./project1HdlFixtures`) and/or missing fixture symbol.

- [ ] **Step 3: Write minimal implementation scaffold (fixture module only)**

Create `src/core/hdl/project1HdlFixtures.ts` with an empty scaffold first:

```ts
export const project1HdlFixtures: Record<string, string> = {}
```

- [ ] **Step 4: Re-run tests to verify RED state on fixture count**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: FAIL with count assertion mismatch (`0` vs `16`).

- [ ] **Step 5: Populate canonical fixture map (all 16 keys)**

Expand `src/core/hdl/project1HdlFixtures.ts`:

```ts
/**
 * Project 1 `.hdl` fixtures adapted from official nand2tetris materials.
 */
export const project1HdlFixtures: Record<string, string> = {
  Nand: `CHIP Nand {\n    IN a, b;\n    OUT out;\n    BUILTIN Nand;\n}`,
  Not: `CHIP Not {\n    IN in;\n    OUT out;\n    PARTS:\n    // ...\n}`,
  // ... include all Project 1 chips listed below
}
```

Required keys (exact):
- `Nand`
- `Not`
- `And`
- `Or`
- `Xor`
- `Mux`
- `DMux`
- `Not16`
- `And16`
- `Or16`
- `Mux16`
- `Mux4Way16`
- `Mux8Way16`
- `DMux4Way`
- `DMux8Way`
- `Or8Way`

Implementation notes:
- Populate fixtures from existing inline constants in `parser.test.ts` first, then normalize/complete where needed.
- Keep fixture names exactly aligned with other Project 1 maps.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS for fixture count and fixture-loop parse coverage.

- [ ] **Step 7: Commit**

```bash
git add src/core/hdl/project1HdlFixtures.ts src/core/hdl/parser.test.ts
git commit -m "test: add canonical project1 HDL fixture parity coverage"
```

Mandatory follow-through in Chunk 1:
- Remove duplicated inline Project 1 fixture bodies from `src/core/hdl/parser.test.ts` once imported fixture usage is in place.

### Task 2: Remove fixture duplication in parser tests

**Files:**
- Modify: `src/core/hdl/parser.test.ts`
- Test: `src/core/hdl/parser.test.ts`

- [ ] **Step 1: Write the failing test/assertion for single fixture source**

Add a guard assertion that verifies expected fixture keys come from imported map and no local fallback map is used.

```ts
it('uses canonical fixture map as single source of truth', () => {
  expect(project1HdlFixtures.Nand).toBeDefined()
  expect(project1HdlFixtures.Mux8Way16).toBeDefined()
})
```

- [ ] **Step 2: Run test to verify baseline behavior**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS/FAIL acceptable as baseline before refactor; use this run to confirm safety.

- [ ] **Step 3: Refactor test file to consume imported fixtures**

- Replace inline Project 1 fixture constants with imported values from `project1HdlFixtures`.
- Keep specialized malformed HDL literals local to test cases (for negative parsing scenarios).

Example pattern:

```ts
const NAND_HDL = project1HdlFixtures.Nand
const NOT_HDL = project1HdlFixtures.Not
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS with no regression in existing parser tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/hdl/parser.test.ts
git commit -m "refactor: centralize HDL parser fixtures via project1 fixture module"
```

## Chunk 2: Strictness and Diagnostic Contract Tests

### Task 3: Tighten explicit diagnostic contracts for CLOCKED and descending ranges

**Files:**
- Modify: `src/core/hdl/parser.test.ts`
- Test: `src/core/hdl/parser.test.ts`

- [ ] **Step 1: Write failing exact-message assertions**

Replace substring-only checks with exact message assertions:

```ts
expect(result.errors[0]?.message).toBe("Unsupported section 'CLOCKED' in Phase 0.5 parser scope")
```

And for descending range:

```ts
expect(result.errors[0]?.message).toBe("Invalid sub-bus range '8..0'; expected start <= end")
```

- [ ] **Step 2: Run test to verify it fails if message differs**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: FAIL if diagnostic text differs or ordering assumptions are wrong.

- [ ] **Step 3: Implement minimal updates**

- Prefer adjusting tests to robust exact-match on the targeted error instance.
- Modify `src/core/hdl/parser.ts` only if the current string contract is inconsistent.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS with explicit diagnostic contract locked.

- [ ] **Step 5: Commit**

```bash
git add src/core/hdl/parser.test.ts src/core/hdl/parser.ts
git commit -m "test: lock explicit HDL parser diagnostics for CLOCKED and sub-bus ranges"
```

### Task 4: Keep parser lean by proving strict/fail-fast behavior is preserved

**Files:**
- Modify: `src/core/hdl/parser.test.ts`
- Optional Modify: `src/core/hdl/parser.ts`
- Test: `src/core/hdl/parser.test.ts`

- [ ] **Step 1: Write failing guard test for structural errors**

Add a case ensuring structural syntax errors are not masked:

```ts
it('fails clearly on missing closing brace even with other malformed content', () => {
  const result = parseHDL(`CHIP Bad {\n  IN a;\n  OUT b;\n  PARTS:\n  Foo(a=a, out=b);`)
  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errors.some((e) => e.message.includes("Expected '}'"))).toBe(true)
})
```

- [ ] **Step 2: Run test to verify expected strict behavior baseline**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS if current parser already preserves strict behavior; otherwise FAIL indicating accidental masking.

- [ ] **Step 3: Apply minimal parser change only if needed**

- Do not add broad recovery.
- If needed, make the smallest fix to preserve clear structural error reporting.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/hdl/parser.test.ts src/core/hdl/parser.ts
git commit -m "test: preserve strict HDL parser structural error behavior"
```

## Chunk 3: Final Verification and Handoff

### Task 5: Run full verification gates and capture evidence

**Files:**
- Modify: `tasks/todo.md` (review evidence is required)

- [ ] **Step 1: Initialize evidence log**

- Add/update a `### Review (HDL parser parity hardening)` section in `tasks/todo.md`.
- Prepare placeholders for focused HDL parser test and full verification gates.

- [ ] **Step 2: Run focused HDL parser tests**

Run: `pnpm run test:run -- --run src/core/hdl/parser.test.ts`
Expected: PASS.

- [ ] **Step 3: Run lint gate**

Run: `pnpm run lint`
Expected: exit code 0.

- [ ] **Step 4: Run typecheck gate (fast TS signal)**

Run: `pnpm run typecheck`
Expected: exit code 0.

- [ ] **Step 5: Run unit test gate**

Run: `pnpm run test:run`
Expected: all tests PASS.

- [ ] **Step 6: Run build gate**

Run: `pnpm run build`
Expected: build succeeds.

- [ ] **Step 7: Run store E2E gate**

Run: `pnpm run test:e2e:store`
Expected: PASS.

- [ ] **Step 8: Record evidence and commit completion notes**

- Update `tasks/todo.md` review section with PASS/FAIL status for each command above.
- Include any notable diagnostics or deviations (if any).

```bash
git add tasks/todo.md
git commit -m "docs: record HDL parser parity hardening verification"
```

## Plan Review Checklist (for implementer)

- [ ] All fixture names are canonical and count is exactly 16.
- [ ] `parser.test.ts` no longer owns duplicated Project 1 fixture bodies.
- [ ] `CLOCKED` and descending-range diagnostics are asserted explicitly.
- [ ] No broad recovery framework added.
- [ ] `parseHDL` API/result shape unchanged.
- [ ] Full verification gates pass.
