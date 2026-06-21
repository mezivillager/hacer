# Wire Routing — Lane-Level Exclusivity (Nudging) Design

- **Date:** 2026-06-21
- **Branch:** `fix/multi-input-chip-wiring`
- **Builds on:** Stage-1 per-pin escape lanes + approach/confluence tags (commit `3e72c10`)
- **Closes:** CASE1 false-negative (an unrelated net's trunk rides collinearly over a
  chip's approach backbone on the same physical track → two nets visually merge) AND
  the transit-vs-transit collision (two distinct transit nets that hash to the same
  lane index merging with each other).
- **Scope:** lane-level exclusivity / nudging ON the existing coarse-grid + approach
  router. NOT the Stage-3 orthogonal-visibility-graph rewrite (ADR-0007).

## Problem

`isShareableConfluence` (overlap.ts) returns `true` whenever a **non-approach**
potential segment overlaps an existing **approach** backbone (the
`if (!potential.approach) return true` branch). That branch exists because the
coarse grid forces an unrelated trunk to *transit* a chip's backbone column when
no alternative corner exists (the `gateActions › arc segments lost after moving
gate` test relies on this). But "shareable" currently means **same physical
track** — so the transit trunk and the chip's fan-in bus collapse onto the exact
same line `x = sectionX` and render as one merged wire. That is CASE1.

The strict fix (forbid all non-approach overlap on a backbone) is infeasible: it
re-breaks the transit test ("all routing corners are blocked"). So we must
**separate, not reject**: give the transiting trunk its **own parallel lane** — a
small deterministic offset from the section line — so it physically coexists with
the backbone without merging. This is libavoid's *nudging* (research Finding 2).

## Mechanism — deterministic per-net transit lanes

A "track" is identified by `(axis, sectionCoord)` — e.g. `(vertical, x=-4)`.
The chip's approach backbone for a confluence owns **lane 0** (the exact section
line). A wire that must *transit* that track for a **different** net is nudged
onto a distinct parallel lane `sectionCoord + δ`.

### Lane index — per-net hash for the STARTING lane, then probe to a free lane

The nudge starts from a lane index derived purely from the net's **intrinsic,
stable identity** — its source exit point and destination (`start`/`end` passed to
`findPathAlongSectionLines`):

```
laneIndex(start, end) = 1 + (fmix(fnv1a(quantize(start.x,start.z,end.x,end.z))) mod TRANSIT_LANE_SLOTS)
```

An FNV-1a accumulation followed by a Murmur3 `fmix` avalanche gives a well-spread
index even for structured, near-identical inputs (pins a section apart) — a plain
`% SLOTS` over the un-avalanched FNV value samples only the poorly-mixed low bits
and systematically collides. `TRANSIT_LANE_PITCH` (0.06) is tiny so a nudged run
moves only just off the section line (corner topology and hops preserved).
`TRANSIT_LANE_SLOTS` (6) is the number of physical lanes available within the safe
offset cap (`TRANSIT_LANE_SLOTS · TRANSIT_LANE_PITCH = MAX_TRANSIT_LANE_OFFSET = 0.36`,
strictly under one pin spacing ≈0.4u). Lane 0 (the exact section line) is reserved
for the backbone owner, so laneIndex starts at 1.

A per-net hash alone is NOT sufficient: two distinct transit nets can hash to the
same index and merge with each other. So the lane index is only the **starting**
point — `nudgeTransitRun` then **probes** outward (index, index+1, …, wrapping
within `TRANSIT_LANE_SLOTS`) and picks the first lane that is actually FREE of every
other wire already on that track. "Occupied" is computed from ALL collinear
segments in `existingSegments` — both foreign approach backbones (lane 0) AND
already-placed transit runs (off-grid lanes) — whose range overlaps this run's
range. The chosen offset is `sign · index · TRANSIT_LANE_PITCH` (sign toward the
transiting wire's source side). This is deterministic for a given circuit state and
order-dependent across the initial build order — the accepted libavoid "ordering +
nudging" trade-off: order-dependent separation beats a silent merge.

### When the nudge fires — a post-pathfinding pass (low-risk integration)

The greedy pathfinder is left **untouched** — it still routes on the exact coarse
grid and still *permits* a transit over an existing approach backbone (so it never
throws "all corners blocked"; transit test stays green). Separation happens in a
**post-pass** (`nudgeTransitRun`) applied in `core.ts` after
`findPathAlongSectionLines` + `markConfluenceApproach`, which has access to both
`existingSegments` and this net's own `confluencePoint`:

For each maximal run of routing segments of the **new** path that lies on a single
track `(axis, sectionCoord)` and that:
  (a) is NOT this net's own backbone (its `confluenceCoord` ≠ this net's confluence
      on that track — i.e. this net does not *own* the track), AND
  (b) overlaps an existing **approach** backbone segment of a **different**
      `confluenceCoord` on that exact track,
→ shift the whole run to a FREE lane `sectionCoord + δ` (chosen by the probe above),
moving the two adjoining corners with it so the path stays orthogonal and connected.
The on-grid routing *decision* is preserved; only the stored/rendered geometry of the
transit run is nudged off the backbone line. The owner's approach segments (lane 0)
are never touched (they fail test (a)).

Result:
- owner approach segments → lane 0 (unchanged; multi-input fan-in unchanged).
- transit trunk for a different net → lane δ ≠ 0, distinct from every other wire on
  the track (no longer merges with the backbone OR with another transit run).

### overlap.ts change

`isShareableConfluence` keeps permitting non-approach transit over an approach
backbone **at routing time** (so the greedy router still finds a route). The
visual/geometric exclusivity is enforced by the post-pass, not by rejection. The
same-`confluenceCoord`-only rule for approach-vs-approach is unchanged (CASE2
stays closed). A tiny helper `isApproachBackbone(seg)` (approach + has
confluenceCoord) is added for the post-pass trigger.

## How each constraint is met

1. **CASE1 closed** — a transiting non-owner trunk is forced to lane δ ≠ 0; the
   backbone owner holds lane 0. They are on different x (or z) → never one track.
   New negative test asserts the trunk's vertical run is NOT at the backbone
   section coordinate (RED on current code, GREEN after).
2. **CASE2 stays closed** — `isShareableConfluence` still requires matching
   `confluenceCoord` for approach-vs-approach sharing; different confluences
   remain a conflict (unchanged from `3e72c10`).
3. **Transit works** — the transit trunk is no longer rejected; it gets its own
   lane and routes through. `gateActions › arc segments lost after moving gate`
   and the full `wiringScheme`/`nodeActions` suites stay green.
4. **B-003/B-004 fixed** — all pins of one chip share one confluence (same
   `confluenceCoord`) → all owners on lane 0, sharing the fan-in bus exactly as
   before. `multiInputRouting.test.ts` acceptance unaffected (no transit there).
5. **Deterministic + performant** — the lane is a pure function of the net's
   identity AND the current circuit state (`existingSegments` is fixed at routing
   time): same state ⇒ same lane, so re-routes are stable. Across the *initial*
   build order it is order-dependent (the probe sees whichever wires were placed
   first), which is the accepted ordering+nudging trade-off — order-dependent
   separation beats a silent merge. Cost: one O(segments × existing) post-pass per
   wire, no graph rebuild — same order as the existing overlap check, well within
   the real-time drag budget.

## Residual boundary (documented, not silently weakened)

Transit-vs-transit collisions (two distinct nets hashing to the same starting lane)
are resolved by **probing** to the next free lane — they are NOT assumed away.
Two narrow residuals remain:

1. **Extreme single-column transit density** — if more transit runs contend for one
   column than there are free lanes within `MAX_TRANSIT_LANE_OFFSET` (the safe cap
   that keeps hops intact), the probe runs out of room and the last run stays on its
   last safe lane rather than being pushed far enough to reshape the path. This is a
   genuine Stage-3 (global orthogonal-visibility-graph) concern, not the general case.
2. **Order-of-construction** — a transit trunk routed **before** the chip's own
   approach backbone exists has no backbone to avoid yet, so it can land on lane 0;
   the later chip-approach routing then degrades to the **pre-existing
   reject-and-reroute** (greedy picks another corner). Making this order-independent
   requires knowing a column is "some chip's backbone" before the chip is wired —
   i.e. the Stage-3 global visibility graph. Out of scope.

## Files changed

| File | Change |
|------|--------|
| `wiringScheme/types.ts` | `TRANSIT_LANE_PITCH`, `TRANSIT_LANE_SLOTS`, `MAX_TRANSIT_LANE_OFFSET` constants |
| `wiringScheme/lanes.ts` | `laneIndexForNet` (FNV-1a + fmix hash), `probeLaneCoord` + `occupiedLaneCoords` (free-lane probing), `nudgeTransitRun` (post-pass), `isApproachBackbone` |
| `wiringScheme/core.ts` | call `nudgeTransitRun` after pathfinding for pin destinations, passing this net's start/end + own confluence |
| `wiringScheme/*.test.ts` | CASE1 negative test (RED→GREEN), lane determinism tests |
| `docs/development/observed-bugs.md` | CASE1 note under the routing-engine entry |
