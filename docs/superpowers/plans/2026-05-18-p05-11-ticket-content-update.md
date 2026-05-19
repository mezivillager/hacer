# P05-11 Ticket Content Update Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the P05-11 ticket so it matches the current HACER codebase, prior completed tickets, and nand2tetris web-ide bus semantics before implementation begins.

**Architecture:** This is a documentation-only plan for tightening ticket scope and acceptance criteria. The updated ticket should make bus value helpers, width metadata, direct pass-through wiring, and propagation tests explicit enough that the implementation worker does not have to rediscover current store and simulator invariants.

**Tech Stack:** Markdown planning docs, HACER TypeScript source references, Vitest/store E2E verification commands.

---

## Review Findings

- P05-10 is implemented on main: `PinoutPanel` is integrated in `RightActionBar`, has component coverage, and has a store E2E spec. The Phase 0.5 checklist was stale and has now been marked complete.
- P05-11 currently says a 16-bit input can wire directly to a 16-bit output, but `src/store/actions/wireActions/wireActions.ts` throws for input-to-output wires and `src/store/actions/wiringActions/wiringActions.ts` rejects that UI flow.
- `InputNode` and `OutputNode` already have `width`, but store `Pin` and `Wire` do not. A `Wire.width` invariant cannot be derived for gate endpoints unless the ticket also specifies how gate pin width is represented or defaulted.
- `src/simulation/topologicalEval.ts` copies raw numeric values from source endpoints to gate inputs and output nodes. It does not clamp to source, wire, or destination width.
- `src/simulation/gateLogic.ts` is raw numeric bitwise logic. `AND`, `OR`, and `XOR` are naturally bitwise for wider values, but `NOT`, `NAND`, `NOR`, and `XNOR` need width-aware masking if the ticket intends primitive gates to accept bus-width inputs. If primitive gates stay scalar, P05-11 should document width mismatch behavior instead.
- nand2tetris web-ide uses `Bus.busVoltage` as the integer bitmask, with `InSubBus` and `OutSubBus` wrappers for range reads/writes in `simulator/src/chip/chip.ts`. P05-11's `readSubBus` and `writeSubBus` API aligns with that model.
- P05-12 and P05-13 should consume the P05-11 `busOps` API. P05-11 should commit to stable exported names (`maskForWidth`, `readSubBus`, `writeSubBus`, `clampToWidth`) and define edge cases.

## File Structure

- Modify: `docs/plans/phase-0.5-tickets/P05-11.md` - refresh the ticket text, code snippets, tests, pitfalls, and verification guidance.
- No planned modification: `docs/plans/phase-0.5-tickets/P05-12.md` - leave adjacent ticket content unchanged unless P05-11's public API names change.
- No planned modification: `docs/plans/phase-0.5-tickets/P05-13.md` - leave adjacent ticket content unchanged unless the formatter plan should import `busOps` directly.

---

## Chunk 1: Ticket Scope And Current-State Corrections

### Task 1: Refresh P05-11 context and dependency notes

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/P05-11.md`

- [x] **Step 1: Re-read current code references**

Check these source files before editing the ticket:

```bash
sed -n '1,220p' src/store/types.ts
sed -n '1,260p' src/simulation/topologicalEval.ts
sed -n '1,260p' src/store/actions/wireActions/wireActions.ts
sed -n '1,560p' src/store/actions/wiringActions/wiringActions.ts
sed -n '1,220p' src/simulation/gateLogic.ts
```

- [x] **Step 2: Update the Context section**

Replace the current context summary with text that says:

```markdown
After P05-02, store values are `number` bitmasks and input/output nodes carry a `width`. After P05-10, `PinoutPanel` can display multi-bit node widths but deliberately leaves multi-bit editing to P05-13.

The remaining bus-simulation gap is not value storage; it is width-aware propagation. `Wire` has no width metadata, store `Pin` has no width metadata, `topologicalEval` copies raw numbers without clamping, and the UI/store currently reject direct input-node to output-node wiring.
```

- [x] **Step 3: Make the direct pass-through decision explicit**

Recommended ticket update: P05-11 should allow direct input-node to output-node wires for pass-through chips and bus propagation tests. Add this to the Goal section:

```markdown
6. Direct input-node to output-node pass-through wiring is supported for matching-width endpoints, so a no-gate bus pass-through circuit is representable.
```

Also add a note that if the implementer rejects this scope, they must rewrite the manual and automated acceptance tests to avoid direct input-to-output examples.

- [x] **Step 4: Verify the edited Markdown diff**

Run:

```bash
git diff -- docs/plans/phase-0.5-tickets/P05-11.md
```

Expected: Context and goal text mention P05-10, `Wire.width`, `Pin.width`, clamping, and direct input-to-output wiring.

---

## Chunk 2: Width Model And Bus Operations

### Task 2: Specify width metadata and inference

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/P05-11.md`

- [x] **Step 1: Replace the type-change snippet**

Update the ticket so width metadata is not only on `Wire`. Use this snippet:

```typescript
export interface Pin {
  id: string
  name: string
  type: 'input' | 'output'
  value: number
  width?: number // default 1 for existing primitive gate pins
}

export interface Wire {
  id: string
  signalId?: string
  from: WireEndpoint
  to: WireEndpoint
  segments: WireSegment[]
  crossesWireIds: string[]
  width?: number // default 1; inferred from endpoint widths at creation when omitted
}
```

- [x] **Step 2: Add endpoint width rules**

Document these invariants in the ticket:

```markdown
- `InputNode.width` and `OutputNode.width` are authoritative for node endpoints.
- `Pin.width ?? 1` is authoritative for gate endpoints.
- `Wire.width` should be inferred as `Math.min(sourceWidth, destinationWidth)` unless a future HDL/sub-bus compiler provides a narrower explicit width.
- Existing wires without `width` behave as `width: 1` for backward compatibility.
```

- [x] **Step 3: Add busOps edge cases**

Keep the existing `busOps` API names, but add edge-case expectations:

```markdown
- Widths less than or equal to 0 produce mask `0`.
- Widths from 1 through 31 use `(1 << width) - 1` with unsigned coercion.
- Widths 32 and above produce `0xFFFFFFFF >>> 0`; HACER Project 1 only requires up to 16 bits.
- `clampToWidth(value, width)` is the shared helper for propagation, gate inputs, output-node writes, and future UI formatters.
```

- [x] **Step 4: Verify the edited Markdown diff**

Run:

```bash
git diff -- docs/plans/phase-0.5-tickets/P05-11.md
```

Expected: The ticket no longer suggests `Wire.width` alone is sufficient for width-aware propagation.

---

## Chunk 3: Propagation And Tests

### Task 3: Tighten simulation requirements and acceptance tests

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/P05-11.md`

- [x] **Step 1: Add files that must change during implementation**

Add these implementation files to the ticket's Files to Modify section:

```markdown
| `src/store/actions/gateActions/gateActions.ts` | Add `width: 1` to primitive gate pins, or document `Pin.width ?? 1` if leaving serialized pins unchanged. |
| `src/store/actions/wireActions/wireActions.ts` | Infer and store `wire.width`; allow input-node to output-node wires when widths match or clamp behavior is documented. |
| `src/store/actions/wiringActions/wiringActions.ts` | Update UI wiring completion so input-node to output-node pass-through is possible, or explicitly keep it rejected and remove direct pass-through acceptance criteria. |
| `src/simulation/topologicalEval.ts` | Clamp values to wire and destination widths when propagating to gate inputs and output nodes. |
```

- [x] **Step 2: Replace impossible integration examples**

If direct pass-through is in scope, replace the current sample test with one that first updates `addWire` behavior and then verifies:

```typescript
it('propagates a 16-bit input directly to a 16-bit output', () => {
  const state = useCircuitStore.getState()
  const input = state.addInputNode('in', { x: 0, y: 0, z: 0 }, 16)
  const output = state.addOutputNode('out', { x: 4, y: 0, z: 0 }, 16)
  state.updateInputNodeValue(input.id, 0x1234)
  state.addWire(
    { type: 'input', entityId: input.id },
    { type: 'output', entityId: output.id },
    []
  )
  state.simulationTick()
  expect(useCircuitStore.getState().outputNodes.find(n => n.id === output.id)?.value).toBe(0x1234)
})
```

If direct pass-through remains out of scope, remove this example and make the acceptance test use the first legal bus-aware component that exists in the same implementation plan.

- [x] **Step 3: Add mismatch and clamp tests**

Add test requirements for:

```markdown
- A 16-bit input with value `0x1FFFF` feeding a 16-bit output stores `0xFFFF`.
- A 16-bit source feeding a 1-bit primitive gate input clamps to `0` or `1` according to the least significant bit, or the wire is rejected. The ticket must pick one behavior.
- A missing `wire.width` on old fixtures behaves as width `1`.
```

- [x] **Step 4: Update manual verification**

Replace the current console-only manual check with:

```markdown
Manual: Create a 16-bit input and 16-bit output, connect them directly, set the input value through devtools or PinoutPanel once P05-13 lands, click Eval, and confirm the output preserves the full value. Then repeat with a value above `0xFFFF` and confirm it clamps to `0xFFFF`.
```

---

## Chunk 4: Web-IDE Alignment And Verification

### Task 4: Add source comparison and final checks

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/P05-11.md`

- [x] **Step 1: Add web-ide semantic reference**

Add a short note to the Pitfalls or Context section:

```markdown
nand2tetris web-ide represents a bus as bit storage plus a numeric `busVoltage` bitmask. `InSubBus` and `OutSubBus` in `simulator/src/chip/chip.ts` implement range reads and writes using the same masking model as `readSubBus` and `writeSubBus`. HACER should store values as bitmasks and keep sub-bus helpers pure until the HDL compiler maps ranges to concrete wires.
```

- [x] **Step 2: Update verification commands**

Make P05-11's Verification section require the focused tests before the full gates:

```bash
pnpm run test:run -- --run src/simulation/busOps.test.ts src/simulation/topologicalEval.test.ts
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

- [x] **Step 3: Check documentation formatting**

Run:

```bash
git diff --check
```

Expected: no trailing whitespace or whitespace errors.

- [x] **Step 4: Review final ticket content**

Run:

```bash
sed -n '1,260p' docs/plans/phase-0.5-tickets/P05-11.md
```

Expected: P05-11's story is internally consistent: P05-02 provides numeric values, P05-10 provides display, P05-11 provides bus helpers and width-aware propagation, P05-12/P05-13 consume the bus foundation later.

---

## Docs Sync Notes

Living-doc rows touched by executing this plan:

| Surface | Expected update | Notes |
|---------|-----------------|-------|
| `docs/plans/phase-0.5-tickets/P05-11.md` | Updated | Main target of the plan. |
| `docs/plans/phase-0.5-tickets-CHECKLIST.md` | Updated | P05-11 is marked complete after implementation and verification on this branch. |
| `docs/roadmap/implementation.md` | N/A | No phase transition or public roadmap claim changes. |
| `REPO_MAP.md` | N/A | No repo layout change. |

Plan complete when `P05-11.md` has no direct-input/output contradiction, has explicit width metadata rules, has clamped propagation acceptance tests, and passes `git diff --check`.
