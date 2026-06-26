# 0008. Scene-graph routing testing layer as DoD enforcer

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Repo owner / scene-graph-routing-testing session
- **Phase:** 0.5 (cross-cutting test infrastructure)

## Context

Prior 3D component tests were smoke-only: `Wire3D.test.tsx` explicitly notes its rendering is "covered in E2E". But the two E2E suites cover different concerns — `@store` Playwright tests assert store state and `@ui` tests assert DOM interactions — neither verifies that computed routing geometry actually renders at the correct world-space coordinates.

This gap was exposed concretely: a routing fix (B-003/B-004, PR #128) passed 1490+ unit tests while a render-level merge hole survived to adversarial review. A transit wire's path in the store was correct, but the rendered geometry collapsed wires onto a shared track. No existing test layer could catch this class of bug.

The scene-graph approach (`@react-three/test-renderer`) renders production R3F components headlessly (no WebGL/GPU), exposing the three.js scene graph. Routing geometry can then be read back and asserted directly: do wires render where the router says they should? Do distinct wires share a collinear track?

## Decision

Adopt `@react-three/test-renderer@^9` as a permanent GPU-free scene-graph testing layer (devDependency), housed in `src/test/r3f/`. A core routing suite (`src/components/canvas/routingScene.test.tsx`) seeds the live store with real chips, routes wires through the same `calculateWirePathFromConnection` the app uses, renders via the production `Wire3D` component, and asserts:
1. **Render contract** — one rendered line per computed segment, endpoints match the computed segment coordinates.
2. **Connectivity** — rendered wire endpoints reach the real pin world positions.
3. **B-004 dense chips** — all input wires of `Mux4Way16` (5 inputs) and `Mux8Way16` (9 inputs) render to distinct pins with no overlapping tracks.
4. **Transit separation** — two distinct transit wires that hash to the same lane render on distinct parallel tracks (B-004a/CASE1 regression guard).
5. **CASE1** — a transit wire crossing a chip's fan-in backbone renders off the backbone track.
6. **Node-drag re-route (B-003)** — after `updateInputNodePosition`, the re-routed wire renders with non-empty segments and connects the node's new pin position to the gate pin.
7. **Broad overlap sweep** — a mixed 5-gate circuit routes with no two distinct wires sharing a collinear track.

The suite runs inside `pnpm run test:run` (Vitest), so it is automatically part of the definition of done and gates every future routing-engine stage (ADR-0007 Stages 2–4).

### Emergent decision worth recording explicitly: the overlap oracle is STRONGER than `isShareableConfluence`

`expectNoWireOverlaps` (in `src/test/r3f/wireGeometry.ts`) is intentionally stricter than the production routing-time permissibility check `isShareableConfluence`.

`isShareableConfluence` is called at routing time to decide whether a new wire segment may share a track with an existing segment. It permits a transit to traverse a confluence backbone expecting a later lane-nudging pass to move it off. It is a *permissibility* predicate on partial routing state.

The oracle operates on the *final rendered geometry*. It distinguishes:
- A **backbone segment** — one whose `start` or `end` is a recorded `confluenceCoord` — from a benign non-backbone approach lane, which may share a track with another approach lane without being a routing error.
- **Flagged cases:** transit-vs-transit (two unrelated transit trunks on one track), transit-on-backbone (CASE1: a foreign transit merged onto a chip approach backbone), and different-confluence-on-one-track (CASE2).
- **Exempted cases:** genuine same-confluence multi-pin fan-in (multiple approach lanes converging to the same backbone are expected and correct), non-backbone lane sharing.

This classification was validated empirically against the real Mux4Way16/Mux8Way16 overlap classes and is locked in by 6 synthetic classification tests in `src/test/r3f/wireGeometry.test.tsx`.

**Assumption:** test circuits provide free lanes. A genuinely saturated single-column circuit (all lanes occupied) would trigger false positives — this is considered a useful signal, not a false positive, because such circuits are degenerate and the routing engine should not be tested in that state.

## Consequences

**Positive:**
- Render-level routing regressions are caught automatically in `test:run`.
- Every ADR-0007 routing-engine stage gets a render-level regression gate for free.
- `deriveWire3DProps` was extracted as a shared wire→props function consumed by both production `CanvasArea` and the test `TestScene`, eliminating the risk of the two drifting apart.
- `GATES_RENDER_UNDER_TEST = true` records that real gate meshes render cleanly under test-renderer (spike outcome).

**Negative / trade-offs:**
- New devDependency: `@react-three/test-renderer@^9` (must be kept in sync with `@react-three/fiber` major).
- The overlap oracle assumes junction-free test circuits. Junction-branched circuits are not covered by this oracle (a separate, harder problem).
- Gate mesh rendering under test may break if the R3F/drei/three.js major is bumped without updating the test-renderer peer.

**Explicit rejections:**
- Screenshot / pixel-diff tests — too brittle for a headless CI environment.
- Asserting crossing-hop geometry (arc/hop lines with >2 points) — intentionally excluded; crossing resolution has its own extensive unit coverage in `crossing.test.ts`.

**Limitations / honest scope:**
`Wire3D` renders straight segments verbatim from `wire.segments`, so for the current straight-segment circuits the rendered tracks mirror the stored tracks — the overlap oracle's signal on these scenarios is also derivable from store data. The rendering layer's distinct value is:
(a) proving `Wire3D`/`deriveWire3DProps` emit one rendered line per stored segment and resolve endpoints correctly (including the null-endpoint → no-render behavior), and
(b) being the enforcement substrate for FUTURE routing stages where rendering transforms geometry (e.g. arc/hop generation from crossing data).
A note on future coverage: an arc/hop render-only test (asserting that crossing-resolution produces the expected >2-point line geometry at render time) is a natural next enhancement once that stage is implemented, and would exercise the layer's divergence-detection value more strongly.

## Affected living docs

- `REPO_MAP.md` — added `src/test/r3f/` to the directory structure and common-tasks table. ✅
- `HACER_LLM_GUIDE.md` — added scene-graph testing layer row to the Test Type Selection Matrix and a new "Scene-Graph Tests" subsection in the Testing Strategy section. ✅
- `docs/decisions/README.md` — index row added. ✅
- `.cursorrules` — no enumeration of test layers; no change needed. N/A

## Links

- [[0007-wire-routing-engine-direction]] — this layer gates every ADR-0007 routing-engine stage.
- Spec: `docs/superpowers/specs/2026-06-21-scene-graph-routing-testing-design.md`
- Plan: `docs/superpowers/plans/2026-06-26-scene-graph-routing-testing.md`
- Key files: `src/test/r3f/` (harness), `src/components/canvas/routingScene.test.tsx` (core suite), `src/test/r3f/wireGeometry.test.tsx` (oracle classification tests), `src/components/canvas/deriveWire3DProps.ts` (shared wire→props extraction)
- Bugs fixed: `docs/development/observed-bugs.md` (B-003, B-004)
