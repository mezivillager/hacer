# Wire Routing — Lane-Level Exclusivity (Nudging) Design

- **Date:** 2026-06-21
- **Branch:** `fix/multi-input-chip-wiring`
- **Builds on:** Stage-1 per-pin escape lanes + approach/confluence tags (commit `3e72c10`)
- **Closes:** CASE1 false-negative (an unrelated net's trunk rides collinearly over a
  chip's approach backbone on the same physical track → two nets visually merge).
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

### Lane offset δ — pure function of net identity (order-independent)

The nudge offset must NOT depend on routing order. It is derived purely from the
net's **intrinsic, stable identity** — its source exit point and destination
(`start`/`end` passed to `findPathAlongSectionLines`):

```
laneIndex(start, end) = 1 + (hash(quantize(start.x,start.z,end.x,end.z)) mod LANE_SLOTS)
δ = sign * laneIndex * TRANSIT_LANE_PITCH        // sign = toward the transiting wire's approach side
```

`TRANSIT_LANE_PITCH` (≈0.18) is small (well under SECTION_SIZE/2 so the lane stays
strictly inside the section cell and cannot reach the neighbouring section line)
yet visually distinct. `LANE_SLOTS` (16) makes hash collisions between two
distinct transit nets negligible. Lane 0 is reserved for the backbone owner, so
laneIndex starts at 1 — owner and transit can NEVER share lane 0 → CASE1 closed.

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
→ shift the whole run to the net's lane `sectionCoord + δ`, moving the two adjoining
corners with it so the path stays orthogonal and connected. The on-grid routing
*decision* is preserved; only the stored/rendered geometry of the transit run is
nudged off the backbone line. The owner's approach segments (lane 0) are never
touched (they fail test (a)).

Result:
- owner approach segments → lane 0 (unchanged; multi-input fan-in unchanged).
- transit trunk for a different net → lane δ ≠ 0 (no longer merges).

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
5. **Deterministic + performant** — δ is a pure hash of net identity → same
   circuit, same lanes, independent of routing order (for the owner-vs-transit
   case the bug targets); re-routes are stable. Cost: the nudge adds an O(existing
   approach segments) scan per candidate segment — same order as the existing
   overlap check, no graph rebuild. Well within real-time drag budget.

## Residual boundary (documented, not silently weakened)

Full order-independence holds for the owner-vs-transit case (the CASE1 bug) and
transit-vs-transit (distinct hashes). The one pathological ordering — a transit
trunk routed **before** the chip's own approach exists, landing on lane 0, then
the chip approach routing afterward — degrades to the **pre-existing
reject-and-reroute** (greedy picks another corner), never to a silent merge.
Making that case also order-independent requires knowing a column is "some chip's
backbone" without the chip being wired yet — i.e. the Stage-3 global
visibility graph. Out of scope; CASE1 (silent merge) is fully closed regardless.

## Files changed

| File | Change |
|------|--------|
| `wiringScheme/types.ts` | `TRANSIT_LANE_PITCH`, `LANE_SLOTS` constants |
| `wiringScheme/lanes.ts` | **new** — `laneOffsetForNet` (deterministic hash), `nudgeTransitRun` (post-pass), `isApproachBackbone` |
| `wiringScheme/core.ts` | call `nudgeTransitRun` after pathfinding for pin destinations, passing this net's start/end + own confluence |
| `wiringScheme/*.test.ts` | CASE1 negative test (RED→GREEN), lane determinism tests |
| `docs/development/observed-bugs.md` | CASE1 note under the routing-engine entry |
