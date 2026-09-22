# 0020. Spec-only writes, read-only projections

- **Status:** Proposed — pending the fresh-context adversarial review that #327 requires before acceptance
- **Date:** 2026-09-23
- **Deciders:** Builder agent for [#327](https://github.com/mezivillager/hacer/issues/327), on the owner's directions of 2026-09-21 (quoted below) and the measurements of spikes [#328](https://github.com/mezivillager/hacer/issues/328) and [#210](https://github.com/mezivillager/hacer/issues/210)
- **Phase:** Phase 0.5 · foundation plan [#318](https://github.com/mezivillager/hacer/issues/318), item P.1

## Context

The owner's directions, 2026-09-21, recorded verbatim in
`docs/research/2026-09-21-foundation-audit/REPORT.md` §1 and not relitigated here:

1. **Wiring is declared, not drawn.** *"a human should instead be able to specify wiring requirements
   via simple English words or some other simpler interface, and then auto wiring should happen …
   prompt/config driven, and suitable for MCPs and agents."*
2. **Rendered surfaces are read-only.** *"edits would be done via config specifications or prompts
   only, and surface re-renders, and only navigation actions would be allowed … if manual 2d/3d edits
   are ever needed we can consider that in the future."*
3. **Remove, don't freeze — and 3D matters.** *"I don't agree with freezing, working around a frozen
   code is hell … anything that should be removed should be removed, refactor deletion prs can be any
   size they need to be … and 3d render surface have huge value even if it doesn't allow editing,
   because of its visual appeal … humans want to see their circuits in 3d, and as platform grows, the
   3d rendering of complex components will be one of its differentiators."*

The audit found that most of what makes the state layer unsound exists to follow a person's hand:
9 of `CircuitState`'s 32 top-level fields are gesture state, and roughly 3,000–6,600 of 22,513
production lines serve hand editing. Removing the hand is therefore not a UI change; it is what makes
the document, the evaluator and the test surface simple enough to build on.

Two throwaway spikes measured the parts this ADR would otherwise have guessed at. Their notes are
local and uncommitted; their measured conclusions are on #327 as a comment dated 2026-09-23, and
every number cited below comes from there. Numbers are quoted, not re-derived.

**The pipeline this ADR fixes** (`REPORT.md` §4):

```
spec            HDL-shaped parts + nets, chip IN/OUT, plus a sidecar   ← the only thing edited
   │            edited by: the shell's text editor · commands · prompts to an agent · MCP
   │            PARSED to render (an unfinished circuit still draws) · COMPILED only to evaluate
engine          compile · evaluate · run .tst/.cmp           src/core (hdl, chips, testing)
   │
layout(doc, surface) → placements
route(doc, placements) → paths
describeScene(doc, placements, paths, signals) → a serialisable scene description
   │
renderers       3D (R3F) · 2D (SVG): draw, pan, orbit, zoom, hover/click to inspect — nothing else
```

## Reuse considered

| Candidate | Licence | Verdict | Date |
|---|---|---|---|
| tscircuit **`circuit-json`** + its three consumers (`@tscircuit/3d-viewer`, `circuit-to-canvas`, `circuit-json-to-gltf`) | ISC / MIT | **adopt the shape, reject the schema** — see below | 2026-09-23 |
| **DigitalJS** flat `devices`/`connectors`/`subcircuits` with `celltype` references | BSD-2 | **adopt the shape, reject the limit** — see below | 2026-09-23 |
| **CircuitVerse** | MIT | reject — `circuitElement.js` carries `saveObject()` and `draw()` together; no model/renderer separation at all, the exact coupling being removed | 2026-09-23 |
| **`elkjs` 0.12.0** | EPL-2.0 | reject as a dependency, **retain as a named future `LayoutStrategy`** — 439,672 B min+gzip against our 886 B, 21–1,271 ms against 0.09–3.6 ms, blocks the event loop for 1,688 ms on a 896-node graph, does not bundle for the browser (`Could not resolve "web-worker"`), determinism rests on `randomSeed` defaulting to 1, and output changes completely under a mere input permutation (195/198 nodes moved, median 3,336 px) | 2026-09-23 |
| **`@dagrejs/dagre` 3.1.1** | MIT | reject — **no port model at all**, so pin sides and pin order would be faked on top; no more stable than ELK (36–65% unmoved) and slower past ~200 nodes (1,853 ms at 906 nodes) | 2026-09-23 |
| **`@xyflow/react` 12.11.6** | MIT | reject — 59,281 B gzip on top of React, and it is an *editor* (drag, connect, select) of which the read-only ruling uses almost nothing; plain SVG from placements needed zero dependency bytes and produced every S210 golden | 2026-09-23 |
| **three.js `Object3D.toJSON()`** | MIT | reject as the scene description — `ObjectLoader` branches on `metadata.type` and **never on `metadata.version`**, so a format bump is silent; every object carries a random uuid; `matrix` is a flat 16-float array that hides which of position/rotation/scale moved | 2026-09-23 |
| **glTF 2.0** | Khronos | reject as source of truth, **adopt later as an export target** — zero ratified text/glyph extensions and labels are HACER's primary content; neither `.gltf` nor `.glb` is diffable. `KHR_node_visibility` and `EXT_mesh_gpu_instancing` (both ratified) are useful to a read-only viewer | 2026-09-23 |
| **OpenUSD on the web** (`@needle-tools/usd`) | PolyForm-Noncommercial | reject — 33.75 MB wasm, non-OSS licence, requires `SharedArrayBuffer` and COOP/COEP | 2026-09-23 |
| **`@react-three/test-renderer` `toGraph()`/`toTree()` as the golden format** | MIT | reject *as the golden* — `toGraph()` emits `{type, name, children}` with nothing numeric, so a chip at the origin and one 500 units away serialise identically; `toTree()` snapshots authored JSX props. **Retain the renderer** as the description→mesh seam (ADR-0008) | 2026-09-23 |
| **`@react-three/a11y` 3.0.0** | MIT | reject the package (published 2022-05-15, depends on `zustand ^3` against R3F 9's zustand 5); **adopt the pattern** for the fallback DOM tree | 2026-09-23 |
| **xeokit-sdk** (data-texture model, 73,203-object scene) | AGPL-3.0 | reject the code — AGPL is decisive for MIT HACER; adopt the convergent finding that every viewer reaching scale owns an explicit model layer separate from its renderer | 2026-09-23 |
| nand2tetris **`web-ide`** (`../web-ide/`) | MIT | **adopt two things** — (a) its simulator is UI-agnostic *by having no canvas at all*: the reference implementation of the whole 12-project curriculum has **no graphical editing**, which is direct evidence that spec-only authoring is sufficient; (b) its `.tst`/`.cmp` tooling as the conformance reference. Reject its course/project coupling | 2026-09-23 |
| **`src/utils/wiringScheme/branching.ts`**'s unused `Signal` / `signalId` net model (in-repo) | n/a | **adopt** — the spike's 217-line importer used it directly and converted all eleven hard cases | 2026-09-23 |
| **`src/core/hdl`, `src/core/chips`, `src/core/testing`** (in-repo, ~3,440 lines) | n/a | **adopt whole** — this is the engine; nothing here replaces it | 2026-09-23 |
| deck.gl `JSONConverter` class registry; Vega-Lite's two-tier spec→resolved-spec pattern | MIT / BSD-3 | **adopt the patterns** — an explicit registry of allowed node kinds makes a generated description validated rather than trusted | 2026-09-23 |

**`circuit-json` — what we take and what we do not.** Take: one flat array of typed, id-keyed
elements; a logical netlist (`source_component`, `source_port`, `source_net`, `source_trace`)
separated from **per-surface placement** (`schematic_component`, `pcb_component`, `cad_component`,
each carrying its own centre) — the direct precedent for a surface-keyed sidecar and for
`layout(doc, surface)`; and the existence proof that one spec can carry three independent consumers,
which is `describeScene` plus renderer plug-ins plus glTF-as-export, shipped, in this domain. Do not
take the schema: a `source_net` is an undirected set of ports with **no single-driver rule, no bit
widths and no slices**, and it has no notion of an unfinished design that must still render — every
one of the spike's cases C4, C5, C6, C9 and C11 falls outside it. Do not take the code path either:
its 3D viewer is raw three.js, so the R3F and drei layer HACER has is exactly the part that would
not port.

**DigitalJS — the limit we must not inherit.** Its documented limitation is *"subcircuits cannot
(currently) define their own subcircuits"*. Composite and hierarchical chips **are** HACER's product,
so the spec satisfies nesting from day one: a part references a chip by name in a registry that holds
builtins *and* user chips compiled from other specs, so nesting is the default rather than an
extension, and `describeScene` carries an explicit hierarchy path (`cpu/alu/adder3/nand1`) so
drill-down and level-of-detail are data rather than renderer state.

## Decision

### 1. The spec format

**One document, two parts: HDL-shaped text, and a JSON sidecar.** Both carry `schemaVersion`, set to
1 at their first commit. The legacy `CircuitDocument` keeps its own version 1 in its own namespace;
there is no shared version counter and no migration between the two — only the one-way importer.

```
CircuitSpec  { schemaVersion, name, ins: Port[], outs: Port[],
               parts: Part[],          // { id, chip, conns: Conn[] }
               aliases: Alias[] }      // { from: Ref, to: Ref }   — see 1.5
Sidecar      { schemaVersion,
               hints: { '3d': Record<PartId, Hint>, '2d': Record<PartId, Hint> },  // empty by default
               meta:  { title?, description?, tags? },
               tests: TestBinding[],   // { tst, cmp } — inline text or a repo-relative path
               notes: ImportNote[] }   // machine-readable, never `notify`
```

Seven things the canvas expresses today have no plain-HDL form. Each is decided here.

**1.1 An unfinished circuit — parse to render, compile to evaluate.** `compileHDL` rejects an
unconnected input, an unproduced signal and a combinational cycle: every intermediate state of
building a chip. The spec is therefore **valid if it parses**. `parseSpec` returns a document plus
diagnostics; `describeScene` carries those diagnostics attached to the ids they concern, so an
unfinished circuit renders *with its errors visible* rather than not at all. `compileSpec` is called
only to evaluate, and its failure is a state of the run panel, never of the drawing. Measured: case
C6 (`Nand(a=a); Nand();`) parses and the compile rejects, exactly as intended.

**1.2 Bus splitters and joiners dissolve into slices; `BusComponent` leaves the document.**
ADR-0009 made them first-class entities with a `'bus'` wire endpoint. In the spec they are slice
notation on a connection, which is what HDL already has. Measured: C5 (4-bit splitter + joiner) and
C10 (joiner fed by two parts) both convert and hold evaluation parity; a joiner is dissolved by
rewriting its *producers* to write the slice, because HDL can only write a slice from a part output.
The visible consequence, stated plainly: **the bus component stops being a thing you can point at in
the document.** If the drawing should still show a joiner glyph where several sliced writes converge
on one signal, that is a *projection* decision made in `describeScene`, derived from the net, not an
entity anyone declared. ADR-0009's pin-layout work (`computeBusPinLayout` as the single source of pin
geometry) is kept and re-pointed at that derived glyph.

**1.3 Chip metadata and `.tst`/`.cmp` bindings live in the sidecar, not in HDL comments.** The
spike's printer is a fixed point for all eleven cases on *structure*; nothing measured whether
comments survive a round trip, and HACER's parser skips them today. Anything that must survive the
printer therefore goes in the sidecar, where it is typed and diffable.

**1.4 Layout hints are the sidecar's `hints` map — stable `part-id → hint`, empty by default, and
the only place a future manual edit could write.** They are **keyed by surface** from v1
(`'3d'`, `'2d'`), following `circuit-json`'s per-surface placement split: a position chosen on a
2D schematic is not a position in 3D, and one shared map would force one surface to lie. Both maps
start empty, so the cost of the second key is deferred until someone actually places something.
*Alternative considered:* one surface-neutral map that a 2D surface projects by dropping an axis —
simpler, and reopenable if the second map never fills.

**1.5 A pass-through (an input wired straight to an output, no part between) becomes an explicit
alias.** It is drawable and evaluable today, it has no HDL form, and on import it silently vanishes
(case C7 breaks). The spec gets an `aliases` list — `{ from: Ref, to: Ref }`, where a `Ref` may
carry a slice — and the shell's text form is `wire out = a;`. It is rendered natively as a wire with
no part on it.
*Rejected alternative:* importing it as `Or(a=x, b=x, out=y)`, which is plain HDL and evaluates
identically, but puts a gate on the screen that nobody declared — and a read-only projection's whole
promise is that what you see is what you declared.
*Rejected alternative:* rejecting it at import with a warning, which silently deletes a working
circuit; a learner's very first act ("connect this input to that output") would be unrepresentable.
*The cost, named:* the spec is now a strict superset of nand2tetris HDL text, and `compileSpec` needs
an alias table — binding an OUT signal to an IN signal with no producer — which nobody has attempted.
If that change turns out to disturb Kahn ordering, reject-with-warning is the fallback and the
importer records a note instead of dropping the wire. **What would settle it:** a one-day engine
spike that adds the alias table to `compileHDL` and re-runs the Project-1 vectors.

**1.6 A bus-joiner bit driven by a chip input node is the same construct.** Case C11 breaks today
because HDL can only write a slice from a part output. `wire out[0] = a;` is an alias with a slice on
its target, so 1.5 covers it with no second mechanism.

**1.7 Inferred slices are recorded, not silent.** v1 `addWire` sets `width = min(src, dst)` and the
evaluator clamps, so a 16-bit source into a 1-bit pin is silent today; HDL needs `a[0]`, and a 1-bit
source into a 16-bit OUT needs `out[0]` (case C4). The importer **must invent slices the user never
drew**, so it records each one in the sidecar as `{ kind: 'slice-inferred', partId, pin, detail }`
and the shell surfaces them once on import. Silence would make an importer bug indistinguishable
from a faithful import.

**1.8 A pin driven by two sources is illegal in the spec.** It is legal in v1, it is order-dependent,
and it survives import only because `compileHDL`'s evaluator is *also* last-wins (case C8) — nothing
guarantees those two coincidences stay aligned. `parseSpec` accepts it and marks a diagnostic (so the
drawing tells the truth about what was declared); `compileSpec` rejects it; the importer keeps the
first driver in canonical order and records a note.

**1.9 Part ids are emitted into the HDL text as a structured trailing comment, and read back.**
`Nand(a=a, b=b, out=t); // #p3`. The sidecar's `part-id → hint` binding does **not** survive a text
round trip otherwise: the printer is a fixed point for all eleven cases, but the text carries no ids,
so hints are lost the moment a spec passes through its own printer.
*Rejected alternative:* keying the sidecar by canonical part order — under which inserting one part
above another shifts every hint after it, which is precisely the instability the sidecar exists to
prevent.
Both HACER's parser and the reference `web-ide` grammar treat `//` to end-of-line as whitespace
(`base.ohm:68-73`), so the marker is invisible to nand2tetris tooling and to any other HDL consumer.
HACER's parser must read it with a dedicated rule attached to the part, not by retaining comments
generally, so ordinary comments stay ignorable. A spec hand-edited without ids falls back to
order-keying for the parts that lost theirs, and the shell says so.

### 2. The pipeline contracts

**`layout(doc, surface, options) → Placements` — pure, deterministic, and synchronous.**

*This amends `REPORT.md` §4 and #327, both of which say "asynchronous".* Async was a precaution
against `elkjs`'s promise API, and elkjs is rejected (Reuse considered). Our own layered placer runs
a 16-part chip in 0.23 ms median and 896 parts in 3.58 ms, so layout can re-run on a keystroke on the
main thread. A future strategy that genuinely needs a worker declares itself async and is driven
through a separate `layoutAsync`; the default contract stays a plain call, because a promise in the
common path buys nothing and makes every caller and every golden async for no reason.

Preconditions, which are part of the contract and each get a test:

- **stable part ids** (1.9);
- **canonical part and net order**, with a test asserting that permuting the input is a no-op — ELK
  moved 195 of 198 nodes on a permutation with no topology change;
- **a pinned strategy**: `Placements` records `{ strategyId, strategyVersion, options }`, so a golden
  knows what produced it;
- **fixed float precision at the boundary** — ELK returned `213.33333333333334`; our placements land
  on a fixed lattice and serialise at fixed precision.

**Stability under edit is the stated guarantee, not a hope.** A read-only view re-renders when the
spec changes; if a one-part edit reshuffles the drawing, the person watching loses their place.

> `layout` never moves a part that has a sidecar hint. Hint-less parts are placed by longest-path
> layering (layer → X, within-layer order → Z, hierarchy depth → Y) with a **stable within-layer
> order**. A full reflow is an explicit action and never a side effect of an edit.

The two spikes disagreed, and the disagreement is the design. A Sugiyama-style placer with a
**barycentre ordering sweep** moved 16 of 16 parts when one part was added (layers stable, Z
reflowed); the same layering with **id ordering** kept 100% of nodes fixed on every fixture — 8, 54,
198 and 906 nodes — against elkjs's 0–57%. So it is the ordering step that destabilises, not the
layering. Barycentre is worth something real: it cut crossings from 43 to 8 on a tangled layer. The
resolution:

- **`order: 'id'` is the default.** Stability wins in the path a person watches.
- **`order: 'barycentre'` is reachable only through an explicit `tidy` command**, whose result is
  written into the sidecar as hints — so the reflow happens once, visibly, on request, and then never
  again.

**`route(doc, placements) → RoutedNets` — one pass, canonical net order, no shared mutable
occupancy state. Channel routing, not search.**

Layer-channel orthogonal routing gives each net a lane whose index is its position in the canonical
net order *restricted to that channel*; no net's path depends on any other net's path. Measured
against sequential grid BFS on the same 16 placements and 22 nets:

| | channel | grid BFS |
|---|---|---|
| time | 0.48 ms | 17.1 ms |
| input order reversed | **0/22 nets change** | 14/22 change |
| one net added | **2/22 re-route** | 12/22 re-route |
| total wire length | 101.7 | 81 |
| segments | 66 | 47 |

Grid BFS draws nicer wires — 20% shorter, 30% fewer segments — and that is the price paid for
order-freedom. It is *reproducible* but not order-free, which is exactly what `route` was defined to
stop, and choosing it would keep ADR-0008's assertions 3, 4, 5 and 7 as goldens forever instead of
properties. **This replaces `src/utils/wiringScheme` (3,435 production lines) and
`src/utils/wireSharing.ts` (205) — 3,640 lines — it does not move them.**

**`describeScene(doc, placements, routes, signals, options) → SceneDescription` — pure, serialisable,
canonically ordered, fixed float precision, `schemaVersion`.** It must carry:

- stable part, net and pin ids, and an explicit **hierarchy path** so drill-down and level-of-detail
  are data, not renderer state;
- **declared intent separate from geometry** — `kind`, `chipName`, pin names, widths, signal values
  on one side; positions, sizes and route points on the other — so an agent can assert on meaning
  without parsing coordinates;
- per-net **ordered segments with explicit endpoints** (not a point soup), each carrying its `netId`,
  its `sourceKey` and the **channel/lane index** it used: that is what turns ADR-0008's assertions 4
  and 5 from geometry guesses into equalities, and lets the overlap oracle classify same-source
  versus different-source without re-deriving the circuit;
- resolved **pin world positions keyed by `partId:pinName`**;
- **an instancing form — `{ geometryKey, transforms[], colors[], instanceIds[] }` — together with an
  `instanceId → nodeId` map, mandatory in schema v1** even while the first renderer emits one node
  per mesh. The measured reason: a 16-part chip is already **148 draw calls and 23,736 triangles**; a
  48-part circuit is **724 draw calls and 98,520 triangles, of which 472 (65%) are wire lines**; 200
  chips reach **1,800 draw calls** against R3F's published maximum of 1,000, or roughly 3 if
  instanced. The real threshold past "a few hundred, optimally" is between **16 and 48 parts**, not
  near 100 — R1's scenario table understated draw calls about 3× by leaving wires out. And
  `InstancedMesh.raycast()` loops over every instance, so **picking breaks when instancing is
  retrofitted without that map**. Reserving the form now costs a field; adding it later re-baselines
  every golden.
- **label text as text**;
- diagnostics from parse and compile, attached to the ids they concern (1.1);
- an explicit **registry of allowed node kinds** (the deck.gl `JSONConverter` pattern), so a
  description generated from a prompt is validated rather than trusted.

### 3. Renderers as plug-ins — both read-only, both first-class

The plug-in boundary is the scene description plus the selector ADR-0019 already shipped: one
expression at `src/App.tsx`, `?renderer=`. A renderer is a component taking `{ scene, onInspect }`
plus one pure function, `toFallbackDom(scene)`.

- **Both surfaces are read-only**: pan, orbit, zoom, fit, hover, click-to-inspect, drill into a
  composite. Nothing else. **Inspecting is not editing** — reading a part's pins and values stays.
- **Driving the simulation is not editing the design, but it moves off the drawing** to the shell's
  pins panel and to commands, as the reference web IDE does. *Cost if wrong:* clicking a 3D input
  node to toggle it is pleasant; it returns as a shortcut that **emits `setInput`**, never as
  renderer state.
- **3D is the product's showcase and a differentiator, and this ADR does not demote it.** The
  reference nand2tetris IDE has no three.js, no WebGL and no 3D at all — the owner's differentiator
  claim is literally true within this field. Read-only frees the 3D effort from following a hand and
  puts it into what is seen: composite and hierarchical chips ([#172](https://github.com/mezivillager/hacer/issues/172)),
  levels of detail, signal flow.
- **2D (SVG) is first-class too, and may land first** because it is testable under jsdom and in a
  canvas-less browser on the owner's laptop (ADR-0019) — so it is usually the quickest end-to-end
  proof of the pipeline. First, never instead.
- **Both emit a fallback DOM tree** from the description. This satisfies the WHATWG canvas
  fallback-content MUST, gives agents and tests something to assert on without a canvas, and is the
  only thing DOM-first tooling can see at all — Playwright MCP is explicitly non-visual, so a bare
  canvas shows it nothing. It is part of the renderer contract, not a later accessibility retrofit.
- **The mesh layer is shared.** N.0's six prop-only components (985 of the 3D tree's 2,156 production
  lines) serve both renderers, so the 3D view's visual quality carries over intact.
- **A vision model may review the 3D view; it never gates it.** The gate is the description's
  goldens and `renderer.info`'s integer counters.

### 4. The command surface

One registry — `defineCommand({ id, input: schema, scope, apply })` — shared by the shell, the CLI
and MCP. `scope` is `'spec'`, `'run'` or `'session'`.

- **spec:** `addPart`, `removePart`, `connect`, `disconnect`, `rename`, `setHint`, `tidy`.
- **run:** `setInput`, `run`, `step`, `reset`, `runTest`.
- **session:** selection, inspection, camera, panels, renderer — excluded from undo and from MCP.

`connect(from, to)` is **semantic**: it names endpoints and never a path. Routing is `route`'s job,
and no user-authored geometry enters the document.

**Validation returns data.** `CommandResult = { ok: true, doc, notes } | { ok: false, errors }`.
58 of the 82 `notify` calls inside state today are gesture validation; they do not come back. The
flat `circuitActions` facade — 125 hand-written entries — is **generated** from the registry, and so
are the MCP tool schemas (which is why #208's hand-written read-only tool is explicitly disposable).

**What "prompts" means in the product: an in-app assistant and MCP, both of which call commands.**
There is never a model call in the engine, in `layout`, in `route`, in `describeScene`, or in any
store action — those stay deterministic and offline, which is what makes goldens possible at all.
The assistant is a shell feature that emits commands and renders their `CommandResult`. Whether to
build it, and against which provider, is a product decision deferred to its own ADR; MCP already
gives agents the entire surface without one.

### 5. The new store

`createCircuitStore({ ids, clock, storage, scheduler })` — a factory with injected effects, no
module-scope singleton. Three slices: **spec** (document + sidecar + history), **run** (signals,
running, tick), **session** (selection, inspection, view, panels, renderer, diagnostics visibility).

**The e2e bridge moves to a mount-time effect**, because it is published at module scope today only
*because* the store is a module singleton (36 e2e files depend on it). That changes the readiness
contract, so: one component `<TestBridge/>`, rendered by `App`, installs `__CIRCUIT_STORE__` /
`__CIRCUIT_ACTIONS__` and sets **`window.__CIRCUIT_READY__ = true` last**, so a spec waits on one
boolean instead of racing three globals. ADR-0019's canvas-less contract is unaffected:
`__SCENE_READY__` stays absent under `renderer=none`, and a spec that quietly needs the scene still
fails loudly.

**Undo is the spec's own history, with one serialisation point — the command dispatcher.**

- Every spec-scope command pushes one entry. **Run-scope commands are not undoable**: `setInput`,
  `run`, `step` and `reset` change `run`, not `spec`.
- **Keystroke coalescing:** consecutive text edits with the same command id and target coalesce while
  the gap is under 500 ms, measured on the *injected* clock so it is testable in Node.
- **An agent's batch is one entry.** `dispatchBatch(commands, { label })` pushes exactly one entry
  for the whole batch; a forty-command batch that needs forty undos is worse than any granularity
  argument for splitting it.
- **The sidecar is undoable with the spec** — one document, one history — because a `tidy` that
  cannot be undone is a trap.
- **v1 stores whole documents**, capped at 100 entries, because the spec is text and small.
  `produceWithPatches` (#189's proposal) is deliberately *not* adopted at v1 and is reopened on a
  measurement, not on principle.

### 6. The capability list the default switch is judged against — frozen here

Phase C.1 switches the default renderer only when every row passes through the spec path, each as a
scenario runnable through the CLI driver **and** at least one rendered view.

| # | Capability | Replaced by |
|---|---|---|
| 1 | Declare a chip with named IN/OUT of given widths | spec text |
| 2 | Add a part of a registered chip | `addPart` |
| 3 | Remove a part | `removePart` |
| 4 | Connect a part output to a part input, by name | `connect` |
| 5 | Connect a chip IN to a part input, or a part output to a chip OUT | `connect` |
| 6 | Connect through a bit slice (`a[0]`, `out[0..7]`) | `connect` with a slice ref (needs #357) |
| 7 | Fan one source out to many sinks | the net model — no junction entity |
| 8 | Pass an input straight to an output | alias (1.5) |
| 9 | Split or join a bus | slices (1.2) |
| 10 | Leave a circuit unfinished and still see it | parse-to-render (1.1) |
| 11 | Set an input value; run, step, reset | `setInput` / `run` / `step` / `reset` + pins panel |
| 12 | See live signal values on the drawing | `describeScene` signals |
| 13 | Inspect a part, pin or net (ids, widths, values) | hover / click → inspect panel |
| 14 | Run a `.tst`/`.cmp` and see the result | `src/core/testing` + the sidecar's test binding |
| 15 | Truth table for the current chip | `truthTable`, re-typed onto the spec |
| 16 | Save, load and autosave a design | spec + sidecar serialisation |
| 17 | Open a saved version-1 document | `fromLegacyCircuit` + `deserialize` |
| 18 | Navigate: pan, orbit, zoom, fit, drill into a composite | both renderers |
| 19 | Put a part where I want it | `setHint` |
| 20 | Tidy the drawing | `tidy` (one-shot barycentre → hints) |

**Non-goals — named here so the switch is never blocked on them.** Hand-chosen wire paths are
**dropped**: `route` owns every path and no user-authored geometry enters the document. So are
dragging a part with the mouse, click-on-canvas placement, the wire-drawing gesture, junction
placement, placement previews, marquee selection and keyboard nudging. The **junction as a domain
entity** is dropped — fan-out is a property of a net (`junction` is referenced in 47 production files
today). `BusComponent` as a document entity is dropped (1.2). Crossing and arc-hop bookkeeping stored
in the document is dropped; it is a renderer concern derived from `route` output, if it is wanted at
all. Toggling an input by clicking its 3D pin is dropped at the switch and reopenable as a shortcut
that emits `setInput`.

### 7. Removal — replace, switch, delete, in this order

1. **Before anything is replaced:** the characterization baseline (#331) records what the legacy
   renderer draws and what the legacy engine evaluates. This is the only irreversible step in the
   plan and it comes first.
2. **A corpus of real version-1 documents is captured and committed as fixtures** before
   `serialize.ts` is deleted. **No real saved circuit file exists anywhere in the repository today** —
   the spike's eleven cases were hand-built to `serialize.ts`'s exact shape, and the importer was
   never run against a *deserialized* document. Without a captured corpus the importer's only
   evidence is hand-built forever, and a genuine save could carry a shape none of the cases has
   (stale `crossesWireIds`, arc segments, orphaned junctions). This is a **precondition on C.1**, not
   a nice-to-have.
3. **The switch (C.1)** happens when §6's rows 1–18 all pass.
4. **Then delete, by consumer group, largest first, each PR as large as it needs to be:**
   a. gesture state, drag hooks, placement actions and previews — the 9 gesture fields of
      `CircuitState` and about 1,200 lines;
   b. the wiring, wire and junction actions (1,766 lines) and the `junction` entity;
   c. `src/utils/wiringScheme` and `src/utils/wireSharing.ts` — the legacy router, 3,640 lines;
   d. the canvas-shaped evaluator and serialisers: `topologicalEval.ts` (363 lines),
      `truthTable.ts` re-typed, `serialize.ts` deleted;
   e. the `BusComponent` entity and every `'bus'` endpoint switch;
   f. the gesture e2e specs, and the `@ui` rows that only exercised them;
   g. `CircuitState` itself.
5. **`deserialize` survives** as the importer's private reader of version-1 documents, with version
   dispatch and warnings returned as data (#181). It is the only legacy reader that outlives the
   switch.

Until its turn comes, legacy code gets no new work and no refactoring. The one exception is N.0's six
mesh components, which are kept and therefore may be refactored.

### 8. What this ADR supersedes and amends

**ADR-0007 (wire routing engine direction) — superseded.** Its staged roadmap to a gridless
orthogonal-visibility-graph router with A\* and nudging was designed for *interactive* re-routing:
its own caveat reads "budget the visibility-graph pass for real-time drag". With no drag, that
constraint is gone, and Stages 2–4 are cancelled. Stage 1 shipped and its ideas survive inside
channel routing. What is kept is ADR-0007's core finding — uniform-grid maze running collapses dense
pins onto one grid line — which channel routing avoids by construction, because a lane is a net's
position in the canonical order restricted to one channel.

**ADR-0008 (scene-graph routing testing layer) — amended, not superseded.** The layer stays, the
`@react-three/test-renderer` suite is kept and re-pointed at the new renderer, and the overlap oracle
(`expectNoWireOverlaps`, with its exempted same-confluence class) is kept and re-pointed at
`describeScene`'s segments, which carry `netId` and `sourceKey` so it no longer re-derives the
circuit. Its seven assertions become properties:

| # | Assertion | Becomes |
|---|---|---|
| 1 | render contract | property of `describeScene` + the test-renderer suite: one rendered line per described segment |
| 2 | connectivity | property of `describeScene`: pin world positions keyed by `partId:pinName` |
| 3 | dense chips reach distinct pins | property of `route` — lane disjointness |
| 4 | transit separation | property of `route` — lane disjointness |
| 5 | CASE1 off-backbone | property of `route` — lane disjointness |
| 6 | node-drag re-route | **does not survive read-only.** Restated: **"a spec edit re-routes only the nets that changed"**, a property of `route` over a pair of documents, measured at 2 of 22 |
| 7 | broad overlap sweep | property of `route` |

3, 4, 5 and 7 collapse into one invariant — *no two nets with different sources share a collinear
track* — which channel routing satisfies by construction rather than by test. ADR-0008's stated
limitation that "the oracle assumes junction-free test circuits" **dissolves**: there are no
junctions.

**ADR-0009 (bus components as an entity; `'bus'` WireEndpoint) — superseded in the document, kept in
the projection.** `BusComponent` and `WireEndpointType: 'bus'` leave the spec (1.2). Two things it
got right are kept: `computeBusPinLayout` as the single source of width-dependent pin geometry, and
the warning it recorded — that a `default:`-carrying endpoint switch fails *silently* with a wrong
value rather than at build. That is why the spec's ref kinds are a closed union with exhaustive
switches and **no `default` arm**.

**ADR-0019 (canvas-less shell mode) — unchanged and load-bearing.** `?renderer=` is the plug-in
selector; `renderer=none` is how the shell and the 2D renderer are tested on the owner's laptop.
**ADR-0016 and ADR-0012 — unchanged**: anything that mounts the canvas still runs only in CI.

### 9. The issues this absorbs

- **#188** (document / `layouts` sidecar / per-surface session split) — **absorbed; close as decided
  by this ADR.** Answers: one document is spec + sidecar (1); hints are keyed per surface from v1
  (1.4); session state is per surface, in the session slice, never in the document (5); and there is
  no shared version counter — two formats, two namespaces, one one-way importer (1).
- **#189** (command registry, `produceWithPatches`, undo/redo) — **absorbed; close as decided.**
  §4 is its registry, §5 its undo. Session-scope commands are excluded from undo and MCP. The
  trigger to build is now scheduled (N.10) rather than conditional. `produceWithPatches` is
  explicitly deferred (5).
- **#190** (one engine: lower the canvas circuit onto `compileHDL`; the `'circuit'` chip type) —
  **the ADR question is absorbed; the implementation stays as N.3.** There is one evaluator:
  `compileHDL` plus the chip registry. The canvas path in `topologicalEval` is deleted with the
  canvas (7d). The `'circuit'` chip type — a stub that throws today — becomes the **composite-chip
  evaluator**: a spec compiles into a chip definition and registers itself, which is what makes
  nesting the default and lifts DigitalJS's limit. #190's demand for a parity spike is satisfied by
  #328, with the correction in §10.
- **#217** (`__SCENE_HELPERS__.describe()`) — **kept as written until N.6, then superseded.** It is
  plan item 0.5's instrument: #331's characterization baseline needs a `describe()` over the *legacy*
  app before anything is replaced, and a scene-graph reader is the only way to get one. At N.6
  `describeScene` publishes the same shape from a pure function, which works under `renderer=none`
  and in Node — which a scene-graph reader cannot. One split survives the supersession: the bridge
  publishes `scene` (pure, golden-able) plus an optional `project(id)` that only the 3D renderer
  supplies, because projected *screen* coordinates need a camera.

### 10. N.2's acceptance test, restated

> **N.2 (`fromLegacyCircuit`) is accepted when, for every fixture, the spec's evaluation through
> `compileHDL` equals a *structurally traced* evaluation of the same legacy document** — where
> "structurally traced" means a junction's feed is resolved by finding the wire whose `to` is the
> junction, not by reading `junction.wireIds[0]`.

Parity against today's `topologicalEval` is **not** the test. #356 measured the two disagreeing: with
the branch wire first in the array — which a delete-and-re-add leaves behind — three wires trace
differently and the truth tables differ (legacy `0,0,1,1` against the correct `0,1,1,0`). A *correct*
importer would fail the acceptance test as it was written in `REPORT.md` §6. The structural trace is
about twenty lines, lives in the importer's test harness, and is itself covered by the case that
exposed the defect.

**Two engine defects are preconditions of N.2 and N.3**, not parallel work:
[#355](https://github.com/mezivillager/hacer/issues/355) — `compileHDL` keeps only the last writer of
a slice-written signal (measured: 65533 against the correct 65532 on a mere reorder), which is exactly
the shape a dissolved joiner produces (1.2); and
[#357](https://github.com/mezivillager/hacer/issues/357) — the parser rejects a slice on a part pin
(`Not16(in[0]=a)`), which is legal HDL, required from Project 2, and the only way to express capability
row 6 and cases C9 and C11.

### 11. The backlog sweep

Executed by [#340](https://github.com/mezivillager/hacer/issues/340), which walks every open issue
once. This ADR fixes the rule it applies:

- **Close against this ADR:** issues whose only beneficiary is hand editing — the wire-drawing
  gesture, junction placement, drag-to-move, placement previews and their polish. They are non-goals
  (§6), not deferred work.
- **Re-scope as spec → render:** the 13 of 15 open non-epic `project:spine` issues that are
  interactive-UI work (#165, #167, #169–#174, #176, #177, #235, #236 among them). Each becomes
  "declare it in the spec, project it read-only" or is closed. Only #175 is `agent-ready` today, so
  the spine row pauses for re-scoping rather than continuing as data.
- **Keep unchanged:** #166 and #168 (the scenario suite and the canonical HDL printer) — both are
  this work already filed. #172 (composite chip 3D rendering) is kept and *promoted*: it is where
  the 3D renderer's effort goes after N.8.
- **Keep, newly blocking:** #355, #356, #357 (§10), and #181 (`deserialize` returns data).

## Consequences

**Easier.** One document, one evaluator, one router, one history. Every capability in §6 becomes
reachable from the CLI and MCP by construction rather than by porting. `layout`, `route` and
`describeScene` are pure functions testable in Node in milliseconds, so most rendering behaviour can
be tested on a machine that must never render 3D. Nothing in the pipeline depends on a canvas
existing, so the 2D surface and the shell become locally testable (ADR-0019). Roughly 3,000–6,600
production lines leave the tree, and the test surface they carried leaves with them.

**Harder, and honestly.** A person can no longer draw. The best advocate for drawing would say it is
the one act that makes the machine feel constructed rather than specified; the owner has weighed that
and decided. The plan's duty is narrower and is kept: **never leave an interval where building a
circuit is harder than before** — each legacy capability is removed only after its replacement is the
default. Alternative C (§12) is the door back, and the sidecar plus the command API are what keep it
cheap to open.

**The weakest part of this decision.** It is not the spec format and not the router; it is
**`order: 'id'` as the default layout, which nobody has looked at.** Stability was measured
exhaustively — 100% of nodes fixed across 8, 54, 198 and 906-node fixtures — and readability was not.
The crossing evidence runs the other way: barycentre cut crossings 43 → 8 on a *deliberately tangled*
bipartite graph, and no one has rasterised an id-ordered 48-part `Mux4Way16` and judged whether it
reads. "The default drawing is unreadable" is not a failure any gate in §6 can catch, and it would
surface only after the switch. **What would settle it:** rasterise the id-ordered placer's output at
16, 48 and 192 parts and have the product role judge them, before N.4 is accepted. If it fails,
the fallback is already designed — run `tidy` once on import so the barycentre pass produces hints,
and let stability protect them from then on.

**Made without evidence, and what would settle each:**

| Decision | Why there is no evidence | What would settle it |
|---|---|---|
| The alias construct for pass-throughs and input-driven joiner bits (1.5, 1.6) | No one has tried binding an OUT signal with no producer in `compileHDL` | A one-day engine spike adding the alias table and re-running the Project-1 vectors |
| Part ids as `// #p3` in the text (1.9) | Both grammars tolerate the comment (verified), but no round trip through a *hand-edited* file was tried | A property test: print → hand-edit → parse → print, asserting hints survive |
| Surface-keyed hints rather than one neutral map (1.4) | Both maps are empty at v1, so nothing distinguishes them yet | The first real hand-placed position on a 2D surface |
| Whole-document undo entries, capped at 100 (5) | The spec's size on a realistic circuit was never measured | Measure a 200-part spec's serialised size; adopt patches only if it hurts |
| Keystroke coalescing at 500 ms (5) | A conventional number, not a measured one | Watch one person type into the spec editor |
| 3D draw-call budgets (2) | `renderer.info` was never read from a live renderer; "draw calls = meshes" is reasoned, not observed — culling, material sharing and render order are invisible to a headless count | The CI benchmark of `REPORT.md` §9a (#325), which is the only place this can be measured |

**Explicitly rejected.** Freezing the legacy canvas (§12 B, by the owner). Keeping hand drawing as a
client of `connect` (§12 C, reopenable). `circuit-json` as the schema, `elkjs`, `dagre`,
`@xyflow/react`, `Object3D.toJSON()`, glTF as source of truth, OpenUSD, and R3F's `toGraph()` as a
golden (Reuse considered). Two evaluators (§9, #190). `produceWithPatches` at v1 (§5). Search-based
routing (§2). And the whole class of user-authored geometry (§6).

### 12. The alternatives, with their costs

| | What it is | Cost | Status |
|---|---|---|---|
| **A. Spec-only writes, read-only projections** (this ADR) | Build the spec path; delete each legacy capability once its replacement is the default | The largest diffs are deletions; the switch needs a checkable capability list, frozen in §6 | **Default — the owner's decision** |
| **B. Freeze the legacy canvas and build beside it** | No new work on it, no deletion, decide later | ~6,000 frozen lines and their suites stay in CI and in the bundle, and every agent works around them | **Rejected by the owner, 2026-09-21:** *"I don't agree with freezing, working around a frozen code is hell … anything that should be removed should be removed, refactor deletion prs can be any size they need to be"* |
| **C. Keep hand drawing as a client of `connect`** | The gesture stays but emits commands and stores nothing | Keeps the gesture state machine, junction placement and the `@ui` suite alive — most of what is being removed — and the moment someone drags a *wire*, user-authored geometry is back in the document, which is the one thing `route` must own | **Reopenable later**, as the owner allowed: *"if manual 2d/3d edits are ever needed we can consider that in the future."* A drag then becomes `setHint` plus a command, not a new state machine |
| **D. Refactor the legacy state layer in place** | Store factory, `.position` migration, notify-to-results, on the legacy code | Wide changes to code that is being removed | Rejected: it improves what is being retired |
| **E. Adopt `circuit-json` wholesale as the spec** | Take the shipped schema rather than writing one | No single-driver rule, no bit widths, no slices, no unfinished designs — cases C4, C5, C6, C9 and C11 all fall outside it | Rejected; its *shape* is adopted (Reuse considered) |
| **F. Keep two evaluators** | The canvas `topologicalEval` beside `compileHDL` | tick/tock implemented twice, and #355/#356 show the canvas evaluator is already wrong where the HDL one is not | Rejected — this was #190's own question |

## Affected living docs

- `docs/decisions/README.md` — index row. ✅
- `docs/north-star.md` — "interactive 3D environment" restated as declared-and-projected. ✅
- `docs/roadmap/vision.md` — "Visual 3D Building: Intuitive drag-and-drop circuit construction"
  restated; the evolution-path diagram row restated. ✅
- `docs/portfolio.md` — the design-first paragraph records that #188/#189/#190 are absorbed here. ✅
- `docs/research/2026-09-21-foundation-audit/REPORT.md` — §4's "asynchronous" `layout` and §6's N.2
  acceptance test are amended **by this ADR**, which is the plan's own mechanism (P.1); the report is
  a dated research artefact and is not rewritten. Recorded in §2 and §10 above.
- `README.md` — **deliberately unchanged.** It describes what ships today, and today the app is still
  hand-driven. It changes at the Phase C switch, not at the decision.
- `REPO_MAP.md`, `HACER_LLM_GUIDE.md`, `.cursorrules`, `docs/testing/structure.md` — N/A until the
  paths and patterns exist (N.1 onward).

## Links

- Issues: [#327](https://github.com/mezivillager/hacer/issues/327) (this ADR) ·
  [#318](https://github.com/mezivillager/hacer/issues/318) (foundation plan) ·
  [#328](https://github.com/mezivillager/hacer/issues/328) and
  [#210](https://github.com/mezivillager/hacer/issues/210) (the spikes) ·
  absorbed: [#188](https://github.com/mezivillager/hacer/issues/188),
  [#189](https://github.com/mezivillager/hacer/issues/189),
  [#190](https://github.com/mezivillager/hacer/issues/190),
  [#217](https://github.com/mezivillager/hacer/issues/217) ·
  blocking: [#355](https://github.com/mezivillager/hacer/issues/355),
  [#356](https://github.com/mezivillager/hacer/issues/356),
  [#357](https://github.com/mezivillager/hacer/issues/357),
  [#181](https://github.com/mezivillager/hacer/issues/181) ·
  sweep: [#340](https://github.com/mezivillager/hacer/issues/340) ·
  baseline: [#331](https://github.com/mezivillager/hacer/issues/331) ·
  rendering R&D: [#325](https://github.com/mezivillager/hacer/issues/325)
- ADRs: [[0007-wire-routing-engine-direction]] (superseded) ·
  [[0008-scene-graph-routing-testing-layer]] (amended) ·
  [[0009-bus-components-entity-and-wireendpoint-bus]] (superseded in the document) ·
  [[0019-canvas-less-shell-mode]] · [[0016-browser-qa-in-the-cloud]] · [[0003-design-for-longevity]]
- Research: `docs/research/2026-09-21-foundation-audit/REPORT.md` ·
  `docs/research/2026-09-21-rendering/R1-rendering.md`
- Code the decision names: `src/core/hdl/`, `src/core/chips/`, `src/core/testing/`,
  `src/core/serialization/deserialize.ts`, `src/simulation/topologicalEval.ts`,
  `src/utils/wiringScheme/`, `src/utils/wireSharing.ts`, `src/store/types.ts`, `src/App.tsx`,
  `src/components/Shell.tsx`, `src/test/r3f/`
