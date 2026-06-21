# 0007. Wire routing engine direction: gridless orthogonal-visibility-graph (staged)

- **Status:** Accepted
- **Date:** 2026-06-21
- **Deciders:** Repo owner / wire-routing research session
- **Phase:** 0.5 (cross-cutting engine; debt-paydown)

## Context
Observed bugs **B-003/B-004**: chips with 3+ input pins can't be fully wired and node-drag drops wires. A code investigation found the mechanism, and a deep-research pass
([`docs/research/2026-06-21-wire-routing-industrial-approaches.md`](../research/2026-06-21-wire-routing-industrial-approaches.md), 19 sources, 25 claims 3-vote-verified) found the root cause is **architectural, not a tuning bug**:

HACER's router performs **uniform-grid maze running** — wire paths snap to a fixed coarse grid (`SECTION_SIZE = 4.0`) with 90°-only turns. Pins are ~`0.4`u apart, so on a 3+-input chip multiple pins' approach paths collapse onto one grid line and the overlap check rejects the inner ones. The diagram-routing literature (Wybrow/Marriott/Stuckey, GD'09 — the basis of **libavoid/Adaptagrams**) explicitly identified and abandoned uniform-grid maze running for free placement, replacing it with a **gridless geometry-derived routing graph**.

The owner's directive: treat this as a fundamental routing-engine limitation; adopt good practices from industrial/diagram routing and loosen the strict grid/90° constraints, **without discarding the working grid base**.

## Decision
Adopt, as the **target architecture**, a **gridless orthogonal-visibility-graph router with A\* + a nudging/segment-sharing stage** (libavoid-style), reached via a **staged roadmap** that keeps the current grid-Manhattan router working at every step. We will NOT build an ILP/network-flow solver (research-refuted as a fit for a real-time UI), and we adopt the *structure* of EDA/diagram techniques, not their fabrication cost models (HACER wires are for readability, not manufacturability).

**Staged roadmap** (detail in the research doc):
- **Stage 1 (now, fixes B-003/B-004):** per-pin **escape stalk** at the pin's true coordinate + **shared/confluent** approach segment with lightweight **ordering/nudging** so distinct pins occupy distinct lanes (do **not** relax node-exclusivity); plus repair the `recalculateWiresForNode` catch-and-ignore so a failed re-route doesn't orphan the wire.
- **Stage 2:** hybrid grid→gridless near endpoints — geometry-derived **local sub-grid** per pin cluster (escape-then-handoff).
- **Stage 3:** full **orthogonal visibility graph + A\* + nudging** (no `SECTION_SIZE`), still orthogonal — the proper interactive engine.
- **Stage 4 (optional):** non-90° turns — octilinear (45°, line-shift snap) and/or Theta\* any-angle.

The "huge chips" stopgap (space pins to `SECTION_SIZE`) is **rejected** — it trades the bug for a worse UX regression and is not a step toward the target.

## Consequences
- **B-003/B-004** are fixed by Stage 1 *as a principled first step*, not a throwaway patch.
- Each stage is independently shippable and reversible; we de-risk the big engine change by proving the approach incrementally.
- Stages 2–3 become their own design+tickets (the routing-engine evolution); Stage 4 is a later aesthetic enhancement.
- Future chip/pin work (multi-input chips, splitter/joiner P05-12/P05-30) builds on a router that scales with pin density rather than fighting a coarse grid.
- **Caveat carried forward:** validate the per-stage integration points against the actual router code; budget the visibility-graph pass for real-time drag (may need incremental rebuild).

## Affected living docs
- `docs/research/2026-06-21-wire-routing-industrial-approaches.md` — the cited research (new).
- `docs/development/observed-bugs.md` — B-003/B-004 annotated as the routing-engine symptom; resolved by the Stage 1 PR.
- Stage 2–3 tickets to be filed under `docs/plans/phase-0.5-tickets/` (routing-engine evolution).

## Links
- [[0003-design-for-longevity]] — staged adoption of a more robust engine over an expedient stopgap.
- Research: `docs/research/2026-06-21-wire-routing-industrial-approaches.md`
- Bugs: `docs/development/observed-bugs.md` (B-003, B-004)
- Key code: `src/components/scene/chipBodyLayout.ts`, `src/utils/wiringScheme/` (`pathfinding.ts`, `overlap.ts`, `segments.ts`, `types.ts`), `src/store/actions/nodeActions/nodeActions.ts`
