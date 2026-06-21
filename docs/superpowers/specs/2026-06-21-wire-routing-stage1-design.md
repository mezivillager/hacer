# Wire Routing — Stage 1 design (B-003/B-004 fix)

- **Date:** 2026-06-21
- **Status:** Design (implements [ADR-0007](../../decisions/0007-wire-routing-engine-direction.md), Stage 1)
- **Scope:** Fix the router so every input pin of dense multi-input chips (Mux4Way16, Mux8Way16)
  is routable, without widening pins. Repair the node-drag re-route so a routing failure never
  orphans a wire. Bounded to Stage 1 — no visibility-graph rewrite.

## Confirmed root cause (systematic-debugging Phase 1)

Reproduced with `Mux4Way16` (5 inputs) at the origin:

- All 5 input pins share world `X = -0.675`, differ only in `Z ∈ {-0.8,-0.4,0,0.4,0.8}`, face `-X`.
- `calculateEntrySegment` snaps each pin's approach to the **same** vertical section line
  `sectionX = floor(-0.675/4)*4 = -4`, at the pin's own Z. So `routingEnd = (-4, pinZ)`.
- `findPathAlongSectionLines` then travels **vertically along the single shared line `x=-4`**
  between the source's exit Z and each pin's Z. The second pin's vertical run overlaps the first's
  (overlapping Z-range on the same line) → `wouldOverlapWithExisting` rejects it →
  "all routing corners are blocked." (Pin at z=0 collides directly with the source exit point.)

This is the research's "pins collapse onto one coarse section line" failure (ADR-0007). The overlap
check is *correct* to reject co-linear same-line segments (Finding 10) — the bug is that the router
funnels every pin through one line instead of giving each pin its own approach lane.

B-003 is downstream: node-drag → `recalculateWiresForNode` → `calculateWirePath` throws → the
`catch` logs and moves on, leaving the wire's stale segments visually orphaned.

## Design — per-pin escape lane (escape-then-connect, Findings 2 & 4), exclusivity preserved (Finding 10)

Replace the single coarse entry segment with a **per-pin approach assembly** built in `core.ts`
(and reused by the node/extension/junction/branch paths). The greedy router
(`findPathAlongSectionLines`) is left untouched, so 1/2-input routing is unchanged.

### Lane geometry

For a `pin` destination at true `(pinX, pinZ)` facing `±X` (the dense-pin case is the horizontal
side; the vertical side is handled symmetrically):

- `sectionX = floor/ceil(pinX/SECTION_SIZE)*SECTION_SIZE` — the coarse line, as today.
- `dirToSection = sign(sectionX - pinX)` — points from the pin toward the section line.
- There is a wide gap between the pin and the section line (≈3.3u for Mux at origin).
- Assign each pin a **distinct vertical lane** inside that gap:
  `laneX = pinX + dirToSection * (LANE_BASE + laneIndex * LANE_PITCH)`, clamped to stay strictly
  between the pin and `sectionX`.
- `laneIndex` is **deterministic from the pin's position**, not from routing order: pins on a side
  are sorted by their offset axis (Z for a horizontal side) and indexed. This guarantees distinct
  pins → distinct lanes regardless of which wire routes first or concurrently (Finding 10).

### Approach assembly (as built)

The coarse router targets the chip-side section line **at the pin's own row**:
`routingEnd = (sectionX, pinZ)`. This is detour-free, so single-wire routing is unchanged. From
there the per-pin escape fans into the pin (short, pin-local segments):

1. **lane** `(sectionX, pinZ) → (laneX, pinZ)` — horizontal, onto the pin's distinct lane.
2. **entry** `(laneX, pinZ) → (pinX, pinZ)` — horizontal, into the pin (the existing `entry` type).

`laneX = pinX + dirToSection * (LANE_BASE + laneIndex * LANE_PITCH)`, clamped inside the gap.
`laneIndex` is derived deterministically from the pin's offset from its section line (a zigzag on the
in-cell offset), so distinct pins → distinct `laneX` regardless of routing order — exclusivity
preserved (Finding 10). Each pin reaches the chip on its **own row** (distinct Z) plus a distinct
lane offset, so approaches never collide.

### Shared confluence backbone (bus, Finding 2)

Multiple pins on one chip side all converge on the **section line of that side** (the column
`x = sectionX`). The coarse path's segments running *along that backbone line* are a legitimate
fan-in bus. `markConfluenceApproach` (in `core.ts`) tags those backbone routing segments
`approach: true`, and `wouldOverlapWithExisting` treats an overlap with an existing **approach**
segment on the same line as a *shareable confluence* rather than a conflict. The relaxation is
scoped to the backbone line only — segments off it stay fully exclusive, and unrelated wires are
unaffected. This is the minimal, targeted shared-segment relaxation the research prescribes, not a
global exclusivity relaxation.

### Representation in the segment model

No new rendered segment type. Approach segments reuse `horizontal`/`vertical`/`entry`; the renderer
draws all non-`arc` segments as straight `start→end` lines, so they render correctly as-is. Overlap
sharing is driven by an optional `approach?: boolean` marker on `WireSegment` (ignored by the
renderer and by length math). Lane constants live next to `SECTION_SIZE` in `types.ts`.

### Repair `recalculateWiresForNode` (B-003)

The per-pin `catch` currently logs and leaves stale segments. With the routing fix, inner-pin
re-routes now succeed. As defense-in-depth, on a genuine routing failure the wire's **existing
segments are preserved** (not dropped/orphaned) rather than silently left in an inconsistent state.

## Units & isolation

- `chipApproach` lane math: a small pure helper (deterministic, unit-testable in isolation).
- Approach assembly: in `core.ts`, exercised by `core`/`pathfinding`-level tests routing to every
  pin of Mux4Way16 / Mux8Way16, concurrently, with prior wires in `existingSegments`.
- Drag repair: `nodeActions` store test.

## Acceptance

- Every input pin of Mux4Way16 (5) and Mux8Way16 (9) routable, including concurrently with prior
  wires — non-empty path, no throw.
- 1- and 2-input routing unchanged (existing `wiringScheme/*` tests green).
- Node-drag preserves a wire to an inner pin (segments updated, not orphaned).
- DoD: lint · test:run · test:e2e:store · build all exit 0.

## Out of scope (Stage 2+)

Local sub-grid handoff, full orthogonal-visibility-graph + A* + nudging, octilinear/any-angle.
