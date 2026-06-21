# Wire Routing — Industrial & Academic Approaches, and an Adaptation Roadmap for HACER

- **Date:** 2026-06-21
- **Status:** Research reference (informs [ADR-0007](../decisions/0007-wire-routing-engine-direction.md))
- **Method:** deep-research harness — 5 search angles, 19 sources fetched, 94 claims extracted, 25 adversarially verified (3-vote), 20 confirmed / 5 refuted.
- **Trigger:** observed bugs **B-003/B-004** — chips with 3+ input pins can't be fully wired; the wire router rejects inner pins as "overlapping," and node-drag re-route drops wires.

## Problem in one line

HACER's router does **uniform-grid maze running**: it snaps wire paths to a fixed coarse grid (`SECTION_SIZE = 4.0`) and only makes 90° corner turns. Pins are ~`0.4`u apart, so on a 3+-input chip several pins' approach paths collapse onto the *same* grid line; the overlap check then rejects the inner ones. (Code map in the B-003/B-004 investigation: `chipBodyLayout.ts` `PIN_SPACING=0.4` vs `wiringScheme/types.ts` `SECTION_SIZE=4.0`; rejection in `wiringScheme/pathfinding.ts` + `overlap.ts`; drag-drop in `nodeActions.ts` `recalculateWiresForNode` catch-and-ignore.)

## The diagnosis — this is a known, solved anti-pattern

The diagram-routing literature **explicitly diagnosed and abandoned** uniform-grid maze running for free-placement layouts:

> "maze running in which objects are assumed to be laid out on a uniform grid… the grid needs to be very fine because the user is free to place elements where they like and so the time complexity is prohibitively high. Our approach … uses a non-uniform grid whose mesh size is tailored to the geometry of the diagram."
> — Wybrow, Marriott & Stuckey, *Orthogonal Connector Routing*, GD'09 (the paper behind **libavoid/Adaptagrams**). [3-0 confirmed]

Our failure is the inverse (fixed-*coarse* grid, not too-fine), but the remedy is identical: **decouple routing lines from a fixed cell size**.

## Confirmed findings (verified, cited)

1. **The canonical fix is a geometry-derived gridless "orthogonal visibility graph."** Routing lines are placed at the *actual* coordinates of connector ports/pins and obstacle bounding-box corners ("interesting points"), not at fixed intervals — so closely-spaced pins get their *own* lines and never collapse. Base stays orthogonal; A* runs over the graph. [GD'09 §4; Diagrams'14 "Seeing Around Corners"; Adaptagrams docs] — **3-0**
2. **Overlap is resolved by ordering + "nudging" + shared segments — not by rejecting paths.** libavoid's pipeline orders and nudges connectors apart within shared segments; crossings are forced to the ends of a shared path, never inside it. (yFiles productizes the same as **bus-style routing**: a shared backbone + short per-node connectors.) [GD'09; Diagrams'14; yFiles EdgeRouter docs] — **3-0**
3. **libavoid's full pipeline is three stages, keeping a Manhattan base:** (a) build the orthogonal visibility graph, (b) A* minimizing bends + length, (c) order/nudge to compute the visual route. The GD'09 abstract notes it is "fast enough to reroute connectors during interaction" — relevant to our real-time drag. [Diagrams'14; GD'09] — **3-0**
4. **EDA escape routing = two-stage escape-then-connect.** A *local* stage escapes each pin to the boundary of its dense array; a *global* stage connects the escaped endpoints. Maps directly to giving each HACER inner pin a short **escape stalk** off the pin before it joins the coarse grid. [PeerJ CS 2021, "dual model node based … simultaneous escape routing"; corroborated UCLA/NTU/Cadence] — **3-0**
5. **This problem class is named & studied: Simultaneous Escape Routing / BGA fan-out** — escaping pins from dense arrays (modern packages: ~2000 pins, 0.4 mm pitch, scarce routing resources). HACER's dense-pin collapse is an instance. [PeerJ; Yan & Wong] — **3-0**
6. **Grid/A* paths are inherently longer & less natural** — "paths formed by grid edges can be longer than true shortest paths … their headings are artificially constrained." A 90°-only Manhattan router is the most constrained instance. [Theta* paper, JAIR 2010 / arXiv:1401.3843; GameAIPro2 ch.16] — **3-0**
7. **Any-angle without abandoning the grid is a proven template: Theta\*.** Propagate along grid edges (fast) but let a vertex's parent be *any visible vertex* (line-of-sight), so the path goes off-grid; shorter than A*+smoothing, runtime ~A*. [Theta*; GameAIPro2] — **3-0**
8. **Octilinear (45°) routing is manufacturable & addable on top of a Manhattan grid** via a "line-shift" technique that snaps diagonal tracks onto nearest grid nodes *topologically* while their real positions stay put. [Wang & Cheng, *Octilinear Redistributive Routing*, GLSVLSI'09] — **3-0** (scope: RDL)
9. **Adapt wiring style to actual pin geometry**, not a uniform grid — the staggered-pin-array escape router uses an "orthogonal-side wiring" style along channels between offset pins. Supports a finer, geometry-aware sub-grid near dense pins. [Ho/Chang et al., ICCAD'11] — **3-0**
10. **Node-uniqueness formalizes our failure:** "a point should not be selected for more than one flow." This is a *correct* constraint — the fix is **finer/per-pin nodes** so distinct pins occupy distinct nodes, **not** relaxing exclusivity. [PeerJ Eq.17] — **2-1**

## Refuted / scoped-out (saves us from wrong turns)

- **Don't build an ILP/network-flow solver** — the node/flow ILP formulation is *not* directly transferable to a real-time UI. [0-3]
- The 45° grid-capacity discrepancy is **not** an open frontier; it's a known, solvable modeling detail (only matters if/when we add diagonal clearance). [0-3]
- Staggered-pin escape is **not** a fundamentally untransferable problem — grid techniques *do* adapt. [1-2]
- yFiles EdgeRouter is **not** fundamentally grid-based (it's gridless) — so "keep a fixed grid like everyone does" is a false premise. [0-3]

## Recommended staged roadmap (each stage keeps the grid base working)

- **Stage 1 — Minimal, principled fix (the B-003/B-004 fix).** Don't relax node-exclusivity; make distinct pins resolve to distinct lanes. (a) per-pin **escape stalk** leaving the pin at its true ~0.4u coord, (b) a **shared/confluent** segment that pins ride before merging onto the coarse grid, with a lightweight **ordering/nudging** pass; (c) fix the `recalculateWiresForNode` catch-and-ignore so a failed re-route repairs the wire instead of orphaning it. *(Findings 2, 4, 10.)*
- **Stage 2 — Hybrid grid→gridless near endpoints.** Replace the fixed coarse grid in the pin neighbourhood with a geometry-derived **local sub-grid** (one line per pin); escape to the cluster boundary, hand off to the coarse global grid. *(Findings 1, 4, 9.)*
- **Stage 3 — Orthogonal visibility graph + A\* + nudging (libavoid-style), still Manhattan.** Generalize to the whole canvas: graph from ports + obstacle corners (no `SECTION_SIZE`), A* min bends+length, nudging stage. The proven interactive pipeline. *(Findings 1, 2, 3.)*
- **Stage 4 — Optional non-90° turns.** Octilinear (45°) escape via line-shift snap (Finding 8) and/or Theta*-style any-angle segments (Finding 7); model diagonal clearance correctly if added (Yan & Wong).

## Caveats on the evidence

- **Domain transfer:** sources are 2D PCB/IC fabrication or 2D diagram routing; HACER is an interactive **3D UI** where wires are for *human readability*, not manufacturability. Adopt the **structure** (visibility graph, escape-then-connect, nudging, octilinear/Theta*) — **not** fab-specific cost/capacity models.
- The "directly analogous to HACER" framings are sound engineering inferences, not verbatim paper claims.
- One yFiles citation rests on vendor docs (a cited URL 404s; the mechanism is verified on current pages) — solid product evidence, slightly below peer-reviewed.

## Open questions (carried into the design)

1. Exact integration points in our router (already mapped by the B-003/B-004 code investigation) — validate before each stage.
2. Performance budget for a libavoid-style pass per drag frame vs the Stage-1 heuristic — do we need incremental/partial graph rebuild? At what wire count does the full pipeline get too slow?
3. Long-term turn model: octilinear (grid-snappable, simpler) vs full any-angle (smoothest) vs curved/spline for 3D readability?
4. How to represent & render shared/confluent stalks in our flat wire/segment model and in 3D so bundling is legible and re-routes deterministically (no 2D source addresses 3D depth).

## Sources (primary unless noted)

- Wybrow, Marriott, Stuckey — *Orthogonal Connector Routing*, GD'09: https://people.eng.unimelb.edu.au/pstuckey/papers/gd09.pdf
- Marriott, Wybrow et al. — *Seeing Around Corners*, Diagrams'14: https://users.monash.edu/~mwybrow/papers/marriott-diagrams-2014.pdf
- Daniel, Nash, Koenig, Felner — *Theta\* any-angle*, JAIR 2010: https://arxiv.org/pdf/1401.3843 ; GameAIPro2 ch.16: https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter16_Theta_Star_for_Any-Angle_Pathfinding.pdf
- *A dual model node based optimization algorithm for simultaneous escape routing in PCBs*, PeerJ CS 2021: https://pmc.ncbi.nlm.nih.gov/articles/PMC8056246/
- Yan & Wong — *A correct network flow model for escape routing*, DAC'09: https://www.researchgate.net/publication/224585568_A_correct_network_flow_model_for_escape_routing
- Wang & Cheng — *Octilinear Redistributive Routing in Bump Arrays*, GLSVLSI'09: https://dl.acm.org/doi/10.1145/1531542.1531591
- Ho/Chang et al. — *Escape Routing for Staggered-Pin-Array PCBs*, ICCAD'11: https://ieeexplore.ieee.org/document/6105346/
- libavoid/Adaptagrams docs: https://www.adaptagrams.org/documentation/libavoid.html ; yFiles EdgeRouter (bus routing): https://docs.yworks.com/yfiles-html/dguide/layout/ ; Shape-based autorouter: https://en.wikipedia.org/wiki/Shape-based_autorouter
