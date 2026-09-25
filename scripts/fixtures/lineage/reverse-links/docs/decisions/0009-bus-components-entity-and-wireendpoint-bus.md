# 0009. Bus components as a separate entity; `'bus'` WireEndpoint

- **Status:** Accepted — Superseded in the document by [ADR-0020](0020-spec-only-writes-read-only-projections.md) (§1.2: `BusComponent` and `WireEndpointType: 'bus'` leave the spec, dissolved into slices). Kept in the projection: `computeBusPinLayout` stays the single source of width-dependent pin geometry
- **Date:** 2026-06-27
- **Deciders:** P05-12a session (bus splitter/joiner)
- **Phase:** Phase 0.5 (0.5.2 — multi-bit buses)

## Fixture
The live header before #467: a partial supersession, which ADR-0020 now states as `Amends:`.
