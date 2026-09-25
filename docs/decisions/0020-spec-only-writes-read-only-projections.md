# 0020. Spec-only writes, read-only projections

- **Status:** Accepted — the fresh-context adversarial review [#359](https://github.com/mezivillager/hacer/issues/359) required by #327 returned `sound with corrections`, and the second pass over the four post-review deltas returned `accept with corrections` (both on [#358](https://github.com/mezivillager/hacer/pull/358), 2026-09-23). Both sets of corrections are applied below — the second pass's seven under "What the second pass changed" — and no further review round is required. **Amended 2026-09-24** by the spike this ADR scheduled for 1.5/1.6 ([#372](https://github.com/mezivillager/hacer/issues/372)), which ran, found the mechanism 1.5 describes does not work, and replaced it — "What the spike changed". The status does **not** move: the spine, the review's acceptance and every decision stand, and correcting a mechanism is what a scheduled spike is for.
- **Date:** 2026-09-23 · mechanism amended 2026-09-24 ([#372](https://github.com/mezivillager/hacer/issues/372))
- **Amends:** ADR-0008 §6, ADR-0009
- **Supersedes:** ADR-0007
- **Deciders:** Builder agent for [#327](https://github.com/mezivillager/hacer/issues/327), on the owner's directions of 2026-09-21 (quoted below) and the measurements of spikes [#328](https://github.com/mezivillager/hacer/issues/328) and [#210](https://github.com/mezivillager/hacer/issues/210); revised by a second fresh context against #359's review; mechanism amended by the builder agent for [#372](https://github.com/mezivillager/hacer/issues/372), on that spike's measurements and its own re-measurement against `origin/main`
- **Phase:** Phase 0.5 · foundation plan [#318](https://github.com/mezivillager/hacer/issues/318), item P.1

## What the review changed

The spine survived the review unaltered and is not restated here: spec-only writes, read-only
projections, pure `layout` / `route` / `describeScene`, renderers as plug-ins behind one serialisable
description, channel routing, `describeScene` reserving instancing, replace → switch → delete. Four
decisions changed, and both defects the review found are fixed.

| | Was | Is now | Why |
|---|---|---|---|
| **Layout ordering** (§2) | `order: 'id'` default; barycentre reachable only through `tidy` | `layout(doc, surface, { previous })` — barycentre on the first layout, then existing parts hold their relative order | The comparison the ADR skipped was run on the real fixtures. id order costs **2–3× the crossings** and its stability is an artefact of append-ordered ids. `evidence/LAYOUT-ORDER.md` |
| **`aliases`** (§1.5, §1.6) | A second top-level connectivity array for pass-throughs | **Removed.** Connectivity is one explicit `nets` list; a pass-through is an ordinary net | It fought the Reuse section: the ADR claimed circuit-json's and DigitalJS's shape, where connectivity is its own element kind, then attached connectivity to parts. One mechanism, not two |
| **Multi-driven pins** (§1.8, §10) | The importer keeps the **first** driver | The importer keeps **both** and records a note; §10 exempts the case from parity, with the reason | Keeping the first silently evaluates the *other* driver than the legacy document did, failing §10's own test on C8 — the one case whose parity was measured |
| **The switch gate** (§6, §7.3) | §6 said "every row", §7.3 said "rows 1–18" | Every row, and four capabilities the legacy app has that neither list named are added | As written the switch was allowed with no way to place a part |

Two of the review's statements are **corrected rather than adopted**, and both are noted where they
belong. (a) It says S328 reported *"`crossings=0` on the real Parity5 fixture, with no id-order
comparison at all"*; S328 did report one — `spike/out/q2.txt` prints "(id-order before sweeps: 0)"
for all four of its real fixtures. That makes the ADR's error worse, not better: it had the number
and generalised from a near-chain (§2). (b) The review asks for `layout(doc, surface, { previous })`
to get a row in §12 *"whatever the answer"*; the answer is that it wins on the measurement, so it is
the contract in §2 and §12 instead records the two pure comparators it beat. Everything else the
review raised — the preconditions, the supersession bookkeeping, the counts, the dating — is applied.

## What the second pass changed

The second pass over those four deltas returned `accept with corrections`: it sent none of the four
back, and found **one measured defect and six text-level gaps**. All seven are applied here and none
of them changes a decision.

| | Correction | Where |
|---|---|---|
| 1 | §1.8's safety argument was **measurably false and is replaced**. #362 refuses two part *outputs* on a bit; C8 is one part *input* pin bound twice, which compiles and silently evaluates last-binding-wins. The decision — keep both drivers — is unchanged; its ground is now the undefined legacy value plus a `compileSpec` rule, with the engine half filed as [#367](https://github.com/mezivillager/hacer/issues/367) | §1.8, §10 |
| 2 | The parity exemption said "a pin driven by two sources", which swallows C10 — the dissolved joiner whose parity §1.2 cites as measured. Narrowed to **"on the same bit"** | §1, §1.8, §10 |
| 3 | A net's id is its **sliced** signal reference, not its signal name, which collides on C10. Plus the empty-net normalisation, [#363](https://github.com/mezivillager/hacer/issues/363) as a precondition and as the thing the alias spike must run after, and alias cycles named as a checked property | §1, §1.5, §2, §10 |
| 4 | "Substitution before ordering" is **stronger** than the draft argued for 1.5 — it removes an in-edge — and is **not a rename** for 1.6. Both stated plainly | §1.5 |
| 5 | `previous`'s degenerate cases (stale, partial, foreign strategy) are defined; drift is **non-monotone**, not slow; and the hint-less-node-among-hinted-nodes rule that `tidy` still needs is stated | §2 |
| 6 | The gate rule now says what a **bundled** row does, because rows 13 and 18 name capabilities the legacy app does not have | §6 |
| 7 | `docs/decisions/README.md`'s index row and this status line move together | this file, the index |

The second pass's own suggestion is taken too: the spike's raw outputs are committed beside
`evidence/LAYOUT-ORDER.md` before the throwaway tree is deleted.

## What the spike changed

§1.5 scheduled its own spike to run before N.1, and
[#372](https://github.com/mezivillager/hacer/issues/372) ran it on 2026-09-24 — after
[#363](https://github.com/mezivillager/hacer/issues/363) and the input-side fix
([#375](https://github.com/mezivillager/hacer/pull/375)) had landed. It executed the mechanism §1.5
describes and **the mechanism does not work as written**: the ordering argument the ADR made is
correct, and the lowering it was attached to moves no value. That is what a scheduled spike is for,
so the status line does not move. The spine, §1's document shape and every decision the review
accepted are untouched; what follows amends the mechanism underneath them.

| | Was | Is now | Why |
|---|---|---|---|
| **§1.5's lowering** | "Substitution before ordering" — rewrite every read of `out` to read `a` | Substitution of the **binding**, keyed by the sliced net id: rename where a read lies inside one alias net, **split the pin binding** where it straddles — **plus a boundary write-back** over the alias DAG, in `compileSpec` | `compileHDL` ends `result[pin.name] = signals[pin.name] ?? 0`, so **a chip OUT is an extraction, not a read**, and rewriting reads can never reach it. 6 of 7 pass-through fixtures compiled clean and evaluated the OUT to **0**; the 7th "passed" only because 0 was the expected answer |
| **§1.5's Kahn argument** | The load-bearing claim | **Confirmed, unchanged** — and restated as conditional on the alias root being a chip **IN** | Measured: 1 node / **0** edges under substitution against 2 / 1 under the injected-buffer alternative. An OUT→OUT alias (`wire o2 = o1;`) keeps its edge, and that is where a cycle can live |
| **§1.6's limit** | Substitution "is not a rename" there, so §1.6 waits on a per-signal producer set (#355's shape) | Still not a rename — but a **rewrite** carries it: `out[0]` renames, and an unsliced read of a mixed `out` splits into two bindings on the part's own pin. §1.6 waits on nothing | Measured against `origin/main` (V5, V6 in §1.5). The spike's opposite conclusion is a property of its model, which keyed aliases by signal *name* and excluded every sliced net from substitution |
| **§1.8's ownership** | One `compileSpec` rule, handed to the engine once #367 lands | **Split, permanently.** Input side: the engine's, and free — #367 landed as #375. Output side: `compileSpec`'s, over **nets**, before lowering | A rewrite creates no writer, so one part and one alias on a bit compiles clean, while the injected-writer lowering of the same document is refused. Measured both ways |
| **§1's normalisation** | Drop a net with no driver and no sinks; that is the only rule | Plus: classify a net by its driver's **kind**, never by name equality | `wire x = x;` on a chip OUT is a 1-cycle that a name-equality rule eats silently, after which the document compiles with `x=0` |
| **§1.9's fallback** | Order-keying is the fallback when ids are lost | Plus: **an injected part has no id**, so the export dialect must append its buffers last and say so | The marker parses today and `printHDL` drops it, both measured; a synthetic part anywhere but last shifts every id after it |
| **Consequences, row 1** | "Made without evidence" | Settled, with a narrower successor: these fixtures have still never run through a real `parseSpec`/`compileSpec` | — |

**Two of the spike's findings are corrected rather than adopted.** (a) *"§1.6 read by a part is the
case no rewrite carries"* is **measurably too strong**. Its fixture could not be split because its
alias map was keyed by signal name, while §1 keys a net by its **sliced** reference; with that key the
read splits, and `Any2(in[0]=a, in[1]=out[1])` evaluates correctly on `origin/main`. What genuinely
cannot be carried is narrower, and is not a lowering question at all: a read that reaches the engine
**unsplit**, which the engine then fails to report
([#431](https://github.com/mezivillager/hacer/issues/431)). (b) The break list proposes adding
`Or4`/`Or8` builtins so the export desugar can reach every width; that is the per-case growth §1
exists to avoid, and the width-generic desugar carried by
[#374](https://github.com/mezivillager/hacer/issues/374) is taken instead.

**One thing the spike is right about and does not price.** Its boundary write-back is engine-external
only because an alias root is, by the `Ref` type, a `chip-in` or a `chip-out` — the caller's inputs or
the result record, with no third place a value could be hiding. If a later revision lets an alias
root be an internal signal, the write-back stops being expressible outside the engine. That is the
constraint to defend at N.1.

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
| **DigitalJS** flat `devices`/`connectors`/`subcircuits` with `celltype` references | BSD-2 | **adopt the shape, reject the limit** — see below | 2026-09-21 (R1) |
| **CircuitVerse** | MIT | reject — `circuitElement.js` carries `saveObject()` and `draw()` together; no model/renderer separation at all, the exact coupling being removed | 2026-09-21 (R1) |
| **`elkjs` 0.12.0** | EPL-2.0 | reject as a dependency, **retain as a named future `LayoutStrategy`** — 439,672 B min+gzip against our 886 B, 21–1,271 ms against 0.09–3.6 ms, blocks the event loop for 1,688 ms on a 896-node graph, does not bundle for the browser (`Could not resolve "web-worker"`), determinism rests on `randomSeed` defaulting to 1, and output changes completely under a mere input permutation (195/198 nodes moved, median 3,336 px) | 2026-09-23 |
| **`@dagrejs/dagre` 3.1.1** | MIT | reject — **no port model at all**, so pin sides and pin order would be faked on top; no more stable than ELK (36–65% unmoved) and slower past ~200 nodes (1,853 ms at 906 nodes) | 2026-09-23 |
| **`@xyflow/react` 12.11.6** | MIT | reject — 59,281 B gzip on top of React, and it is an *editor* (drag, connect, select) of which the read-only ruling uses almost nothing; plain SVG from placements needed zero dependency bytes and produced every S210 golden | 2026-09-23 |
| **three.js `Object3D.toJSON()`** | MIT | reject as the scene description — `ObjectLoader` branches on `metadata.type` and **never on `metadata.version`**, so a format bump is silent; every object carries a random uuid; `matrix` is a flat 16-float array that hides which of position/rotation/scale moved | 2026-09-21 (R1) |
| **glTF 2.0** | Khronos | reject as source of truth, **adopt later as an export target** — zero ratified text/glyph extensions and labels are HACER's primary content; neither `.gltf` nor `.glb` is diffable. `KHR_node_visibility` and `EXT_mesh_gpu_instancing` (both ratified) are useful to a read-only viewer | 2026-09-21 (R1) |
| **OpenUSD on the web** (`@needle-tools/usd`) | PolyForm-Noncommercial | reject — 33.75 MB wasm, non-OSS licence, requires `SharedArrayBuffer` and COOP/COEP | 2026-09-21 (R1) |
| **`@react-three/test-renderer` `toGraph()`/`toTree()` as the golden format** | MIT | reject *as the golden* — `toGraph()` emits `{type, name, children}` with nothing numeric, so a chip at the origin and one 500 units away serialise identically; `toTree()` snapshots authored JSX props. **Retain the renderer** as the description→mesh seam (ADR-0008) | 2026-09-21 (R1) |
| **`@react-three/a11y` 3.0.0** | MIT | reject the package (published 2022-05-15, depends on `zustand ^3` against R3F 9's zustand 5); **adopt the pattern** for the fallback DOM tree | 2026-09-21 (R1) |
| **xeokit-sdk** (data-texture model, 73,203-object scene) | AGPL-3.0 | reject the code — AGPL is decisive for MIT HACER; adopt the convergent finding that every viewer reaching scale owns an explicit model layer separate from its renderer | 2026-09-21 (R1) |
| nand2tetris **`web-ide`** (`../web-ide/`) | MIT | **adopt two things** — (a) its simulator is UI-agnostic *by having no canvas at all*: the reference implementation of the whole 12-project curriculum has **no graphical editing**, which is direct evidence that spec-only authoring is sufficient; (b) its `.tst`/`.cmp` tooling as the conformance reference. Reject its course/project coupling | 2026-09-23 |
| **`src/utils/wiringScheme/branching.ts`**'s unused `Signal` / `signalId` net model (in-repo) | n/a | **adopt** — the spike's 217-line importer used it directly and converted all eleven hard cases | 2026-09-23 |
| **`src/core/hdl`, `src/core/chips`, `src/core/testing`** (in-repo, ~3,440 lines) | n/a | **adopt whole** — this is the engine; nothing here replaces it | 2026-09-23 |
| deck.gl `JSONConverter` class registry; Vega-Lite's two-tier spec→resolved-spec pattern | MIT / BSD-3 | **adopt the patterns** — an explicit registry of allowed node kinds makes a generated description validated rather than trusted | 2026-09-23 |

*Dates are where the evidence is, not where the table was typed.* The rows marked **(R1)** were
assessed on 2026-09-21 in `docs/research/2026-09-21-rendering/R1-rendering.md` and neither spike
re-checked them; the rest were assessed on 2026-09-23 by the spikes. (The review's citation-hygiene
nit, applied.)

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
               parts: Part[],          // { id, chip }          — what exists
               nets:  Net[] }          // { id, driver: Ref | null, sinks: Ref[] }  — how it is connected
Ref          { kind: 'part-pin' | 'chip-in' | 'chip-out', partId?, pin, slice? }
Sidecar      { schemaVersion,
               hints: { '3d': Record<NodeId, Hint>, '2d': Record<NodeId, Hint> },  // empty by default
               meta:  { title?, description?, tags? },
               tests: TestBinding[],   // { tst, cmp } — inline text or a repo-relative path
               notes: ImportNote[] }   // machine-readable, never `notify`
```

**Connectivity is one mechanism: an explicit driver → sinks net list.** *This is the review's C5 and
it is right.* The first draft attached connectivity to parts as HDL-shaped `conns` and then needed a
second top-level array (`aliases`) for the one case that has no part to attach to — while the Reuse
section claimed to adopt `circuit-json`'s and DigitalJS's shape, in which **connectivity is its own
element kind** (`source_net` / `source_trace`; `connectors`). The second array was an artefact of not
adopting the shape this ADR says it adopted. With an explicit net list:

- a part-to-part connection is a net whose driver is a `part-pin` and whose sinks are `part-pin`s;
- **a pass-through is an ordinary net** whose driver is a `chip-in` and whose sink is a `chip-out`
  (1.5) — and capability row 5 already requires both of those ref kinds to exist;
- a joiner bit driven by a chip input is the same net with a `slice` on the sink ref (1.6);
- fan-out (row 7) is the sinks list, which is why there is no junction entity;
- an **unfinished** circuit is `driver: null` — a signal read by a part that nothing writes yet. That
  is exactly the shape `circuit-json` has no room for, and it is why its schema is rejected (1.1);
- a **multi-driven** pin is two nets naming the same sink, which is representable, diagnosable and —
  when the two overlap **on the same bit** — compile-rejected rather than inexpressible (1.8). Two
  nets naming the same sink on *disjoint* bits are ordinary and legal: that is C10, a dissolved
  joiner (1.2).

`Part` therefore carries only `{ id, chip }`. **The part syntax does not change**: it is still HDL,
and `parseSpec` lowers `Chip(pin=signal)` bindings to nets while `printSpec` raises them back. What
changes is the *lowering*, not the part form — 1.5 adds exactly one statement plain HDL has no form
for (`wire out = a;`) and names it there as a superset in one direction.

**A net's id is its *sliced* signal reference** — `t`, `out`, `out[0]`, `t[3..7]` — and not its
signal name. *The second pass is right that the name alone collides.* C10 is signal `out` written by
two parts on disjoint slices (1.2): keyed by name that is either two nets sharing one id or one net
with two drivers, which `driver: Ref | null` forbids — so "stable net ids" would fail on the very
case §1.2 cites as measured. The sliced reference is what the adopted code already keys by: the
spike's netlist uses `` const key = (r) => r.start === undefined ? r.name : `${r.name}[a..b]` `` and
carries `bus` and `width` beside it. A net is named by the **signal it carries**, so a pass-through
(1.5) is `out` — the OUT that `wire out = a;` defines — and the `chip-in` on the other side is its
driver, not its name. The text carries the name and the slice already, so net ids stay stable across
a round trip with no marker, which is what `route`'s canonical order, `describeScene`'s `netId` and
the overlap oracle all rest on. Only part ids need 1.9's marker.

**One normalisation clause, because the model admits a net that cannot be printed.** `disconnect` can
leave a net with neither a driver nor a sink; it has no printed form and would vanish on a round
trip. Every command and `parseSpec` therefore **drop a net that has no driver and no sinks**, and
that is the only normalisation. A net with a driver *or* a sink survives: the driverless one is 1.1's
unfinished circuit, the sinkless one a declared-but-unread signal. `driver: null` and "a net nobody
wrote" are not distinguishable and do not need to be — a net exists iff its reference appears in a
binding.

**And one classification clause the spike added: a net is classified by its driver's *kind*, never by
name equality.** `wire x = x;` where `x` is a chip OUT is an alias whose root is itself — a 1-cycle —
and a rule that drops a net whose driver *name* equals its signal name eats it silently: measured,
the alias map came back empty, the lowering produced an empty parts list, and the document compiled
with `x=0`. The name-equality shape that *is* ordinary is the other one — a net carrying signal `a`
whose driver is the `chip-in` `a`, unsliced, which is fan-out and no alias at all. So: `chip-in`
driver with the same name and no slice → an ordinary net; **any `chip-out` driver → an alias, and it
goes to the cycle check, self-reference included** (1.5).

*The cost, named:* the in-memory document no longer mirrors the text one-to-one, so the spike's
*"printer is a fixed point for all eleven cases"* was measured against a shape that is no longer the
shape. **That evidence does not transfer and is re-measured as part of N.1** — which it needed
anyway, because 1.9's id marker changes the printer's output too.

**The spec format's own migration policy** — the review's C6, and the gap it names is real. The rule
above covers only legacy↔spec. For the spec itself: **`schemaVersion` is read on every load and a
document whose version this build does not know is refused with a named error, never
best-effort-parsed**; a forward migration is a pure function `migrate(n → n+1)` with a fixture of a
real version-*n* document, and **no construct may be removed from a version without one**. Until the
first real spec is saved anywhere, v1 is free to change and the version does not move; the first
commit of a `.spec` fixture to this repository is the boundary, and N.1 is where it falls.

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

**1.4 Layout hints are the sidecar's `hints` map — stable `node-id → hint`, empty by default, and
the only place a future manual edit could write.** A `NodeId` is a part id **or a chip I/O terminal's
id** (`in:a`, `out:sel`). *The review's C5 caught this: the first draft keyed hints by `PartId`, and a
chip IN/OUT is not a part, so there was no way to hint the position of an I/O terminal at all* —
silently excluding from row 19 the very entities ADR-0008 assertion 6 is about, and the entities that
carry a third to a half of the crossings in a real drawing (`evidence/LAYOUT-ORDER.md` §1). A `Hint`
is `{ x, y, z, rotation? }` on the same fixed lattice `layout` places on, in the surface's own
coordinate space, plus `origin: 'user' | 'tidy'` so a later reflow can tell a position someone chose
from one a command wrote. They are **keyed by surface** from v1
(`'3d'`, `'2d'`), following `circuit-json`'s per-surface placement split: a position chosen on a
2D schematic is not a position in 3D, and one shared map would force one surface to lie. Both maps
start empty, so the cost of the second key is deferred until someone actually places something.
*Alternative considered:* one surface-neutral map that a 2D surface projects by dropping an axis —
simpler, and reopenable if the second map never fills.

**1.5 A pass-through (an input wired straight to an output, no part between) is an ordinary net —
driver `chip-in`, sink `chip-out`.** It is drawable and evaluable today, it has no HDL *text* form,
and on import it silently vanishes (case C7 breaks). In the document it needs **no new construct**:
it is a net like any other, so `layout`, `route`, `describeScene`, the overlap oracle, the command
registry and every golden handle it without a second code path. It is rendered natively as a wire
with no part on it, because that is what it is.

The **text** still needs a syntax, because HDL genuinely has none: the printed form is
`wire out = a;`, and `parseSpec` accepts it. *This is a named superset of nand2tetris HDL text, in
one direction only.* Reading official `.hdl` is unaffected. Writing it is covered by an **export
mode** — `printSpec(doc, { dialect: 'nand2tetris' })` desugars each driverless-OUT net to
`Or(a=x, b=x, out=y)`, which is plain HDL and evaluates identically — so `north-star.md`'s
compatibility promise stays true in both directions.

*The review's C5 is right that the first draft conflated two questions here.* `Or(a=x, b=x, out=y)`
was rejected on a **document** argument — it puts a gate on the screen that nobody declared, and a
read-only projection's whole promise is that what you see is what you declared. That argument is
correct and it does not apply to **export**, where nothing is on a screen. Document and export are
now two decisions, decided differently.
*Rejected alternative:* rejecting the pass-through at import with a warning, which silently deletes a
working circuit; a learner's very first act ("connect this input to that output") would be
unrepresentable. Still rejected.

*The engine change, named — and the spike this ADR scheduled for it replaced the mechanism
([#372](https://github.com/mezivillager/hacer/issues/372), 2026-09-24).* `compileSpec` must bind an
OUT signal whose producer is an IN signal. The draft said it does this by **substitution before
ordering** — every read of `out` rewritten to read `a` before the ordering runs. Executed, that
argument is **half right**, and the half that fails is the half the value depends on.

- **The Kahn half holds exactly as written.** `src/core/hdl/compiler.ts` excludes chip inputs from a
  part's read set *before* Kahn (`if (!chipInputNames.has(conn.external)) r.push(...)`), so rewriting
  a read of `out` into a read of `a` does not merely introduce no node: it **removes an in-edge**.
  Measured on the spike's fixture D — 1 node / **0** edges under substitution, against 2 nodes / 1
  edge under the injected-buffer alternative. No node, no edge, no cycle, as claimed.
- **The value half does not hold, and that is the finding.** `compileHDL` ends
  `for (const pin of ast.outputs) result[pin.name] = signals[pin.name] ?? 0` — **a chip OUT is an
  extraction from the signal table, not a read of it** — so a rule that rewrites *reads* can never
  reach it. A pass-through lowered by substitution alone becomes
  `CHIP P { IN a; OUT out; PARTS: }`, an empty parts list the compiler accepts, and it evaluates
  `out=0` for `a=1`. Measured on 6 of the spike's 7 pass-through fixtures — the 7th "passed" only
  because 0 was the expected answer — and re-measured here against `origin/main` (V1 below).
- **The in-edge claim is conditional on the alias root's kind**, which the draft did not say.
  `driver: Ref` admits `kind: 'chip-out'`, so `wire o2 = o1;` with `o1` part-driven is type-valid;
  there the rewrite redirects a read rather than removing one, and the edge stays. "No node, no edge"
  is a claim about **chip-IN-rooted** aliases only — and OUT→OUT aliases are exactly where the cycle
  below can live.

**Decided on that measurement: the lowering is a rewrite of the *binding* plus a boundary write-back,
and the document path injects no part.** Two rules, both `compileSpec`'s, neither touching an engine
file:

1. **Rewrite the binding, not just the name.** The alias map is keyed by the **sliced** net reference
   §1 already mandates, so a read resolves per bit: a read lying wholly inside one alias net is
   renamed to that net's root with the slices composed, and a read that **straddles** an alias
   boundary is split into several bindings on the part's own pin — `Any2(in=out)` becomes
   `Any2(in[0]=a, in[1]=out[1])`. Both forms are legal HDL since
   [#357](https://github.com/mezivillager/hacer/issues/357), and
   [#375](https://github.com/mezivillager/hacer/pull/375)'s per-pin bit claims make the two pieces
   disjoint claims rather than a clash (measured: V5, V6).
2. **Write the boundary back.** After `evaluate` returns, copy each alias root's value onto its
   `chip-out` sinks, over the alias DAG in dependency order, `writeSubBus` for a sliced sink. It can
   be engine-external because an alias root is, by the `Ref` type, either a `chip-in` (the caller's
   inputs) or a `chip-out` (the result record); there is no third place the value could be. Measured
   on the spike's round 3: whole-signal, sliced, 16-bit and OUT→OUT fixtures and a 3-long alias chain
   all evaluate correctly, and cycles and self-aliases are refused by name.
   **"After `evaluate` returns" is one boundary, and the write-back belongs to that chip — not to
   its caller.** It is invisible to nesting: measured, the V1 pass-through registered as a chip `P`
   and then instantiated, `CHIP Q { IN x; OUT y; PARTS: P(a=x, out=y); }`, gives **`y=0`** for
   `{x:1}`, because `evaluateChipWithCtx` (`src/core/chips/evaluateChip.ts`) calls `P`'s compiled
   evaluator directly and nothing `compileSpec` wrapped around `P` is in that path — while the same
   wrapper applied at the top level gives `out=1` for `{a:1}`. So the write-back has to live inside
   the chip definition a spec registers — §9 /
   [#190](https://github.com/mezivillager/hacer/issues/190)'s `'circuit'` composite evaluator,
   *"a spec compiles into a chip definition and registers itself"* — and a composed chip pays it
   again at its **own** boundary. Put in the caller of the outermost `evaluate`, it works once and
   stops working the moment the spec is instantiated as a part; that is N.1's constraint to hold,
   together with the engine-external one above.

*Why this and not the injected writer* — `Or(a=x, b=x, out=y)` in the **document** lowering, which
the spike measured correct on every fixture it ran. Both lowerings work on every fixture either
party ran, so this is a **chosen** trade and not a forced one, and three things pay for the injected
part nobody declared: 1.9's part ids shift unless synthetic parts are always appended last; the
engine's errors carry a synthetic part the author cannot see; and the buffer needs a chip of the
net's width, which the registry has at 1 and 16 and nowhere between. **Two of the three are soft,
and the third is the one that carries the decision.** The id shift is mitigable by exactly the rule
1.9 already requires of the export printer — append injected parts last. The width gap is neutralised
two paragraphs below by this ADR's own width-generic export rule, which is equally available to the
document path. What is left is the diagnostics cost, stated as the engine actually reports it: the
*printed* messages are in the author's own vocabulary — the cycle names signals
(`Cyclic part dependency: … through "y" → "x"`, `edgeCarries` being keyed by signal) and the clash
names the signal (`Signal "out" bit 0 is driven by more than one part`) — but the structured
`HDLCompileError` carries `partName: "Or"`, a part that is in no document, no sidecar and no part id
space, and 1.1's diagnostics are projected from that object and not from the string. That, plus the
document/export split already being the accepted spine (review C5), is what decides it; the binding
rewrite keeps all three intact and costs one check (below). The injected writer stays exactly where
this ADR already put it — the **export dialect**, where nothing is on a screen.

*What the document lowering gives up, and 1.8 pays for:* because no writer is injected, the engine
never sees an alias as a driver, so a document with two drivers on one bit — one part, one alias —
**compiles clean**, and a boundary write-back then silently overwrites the part's bit. Measured (V4):
the rewritten document compiles; the same document with a buffer injected is refused,
`Signal "out" bit 0 is driven by more than one part`. That check is `compileSpec`'s, unconditionally,
and 1.8 now says so.

*The export mode's width rule, corrected:* `Or(a=x, b=x, out=y)` above is the width-1 illustration,
not the rule. The registry has `Or` and `Or16` and nothing between (`src/core/chips/builtins/`), so a
4- or 8-bit pass-through has no buffer to desugar to. The export desugar is **width-generic** — per
bit, or the smallest covering buffer — and is carried by
[#374](https://github.com/mezivillager/hacer/issues/374). An `Or4`/`Or8` per width is rejected, and
the reason is stronger than per-case growth: `src/core/chips/builtins/project01.ts` registers
**exactly the sixteen** nand2tetris Project-1 chips, and `Or4`/`Or8` are not among them, so adding
them would put **invented chips into the compatibility baseline** the north star rests on — and after
paying that, two more builtins still would not cover a width above 16, while a width-generic desugar
needs no registry growth at any width.

**That argument carries 1.5 and not 1.6 — and the spike narrowed exactly which part of 1.6 it fails
to carry.** When bit 0 of `out` comes from `a` and bit 1 from a part, one read of `out` cannot be
rewritten into one read of `a`: substitution is not a **rename** there. What is measured is that it
is still a **rewrite**. Keyed by the sliced net id, a read of `out[0]` renames to `a` while `out[1]`
stands (V2); an unsliced read of `out` splits into two bindings on the part's own pin (V5); and so
does a read whose slice straddles the boundary (V6). So 1.6 needs no second mechanism and does
**not** wait on a per-signal producer set — the shape
[#355](https://github.com/mezivillager/hacer/issues/355) gave `producerOf`, which the draft named as
1.6's mechanism and this amendment withdraws. *The spike concludes the opposite — that no text
rewrite and no post-pass carries a 1.6 pass-through read by a part. That conclusion is corrected
rather than adopted:* its alias map was keyed by signal **name** and excluded every sliced net from
substitution by construction, so its fixture could only be renamed whole or not at all. That is a
property of the spike's model, not of the engine.

**The residual, stated precisely, because it is the one thing nothing catches.** A part reading an
alias-driven signal is carried — *provided `compileSpec` splits the binding*. If it fails to, the
engine will not say so: `producersOf` is keyed by signal **name** while the edges are bit-keyed, so a
read of a bit nothing produces compiles and evaluates 0 in silence (V3: `Any2(in=out)` over a mixed
`out` gives `any=0` where the truth is 1). That is a live `compileHDL` defect, filed by the spike as
[#431](https://github.com/mezivillager/hacer/issues/431) and outside this ADR; until it lands, the
split is `compileSpec`'s to **test**, not to assume.

**Alias cycles are type-expressible, so they are rejected rather than assumed away.** `driver: Ref`
admits `kind: 'chip-out'`, so `wire x = y; wire y = x;` types. Nothing makes the substitution graph
acyclic: `parseSpec` accepts such a document and marks a diagnostic (1.1 — it still draws), and
`compileSpec` refuses it by name with the cycle's members. **Acyclicity was asserted, not assumed,
and it is not free.** Measured: naive resolution over `{x ← y, y ← x}` does not terminate — it
exhausted a 10,000-step budget and came back to where it started — so an unguarded `compileSpec`
*hangs* before any HDL exists rather than reporting anything. The catch is a three-colour DFS over
the alias map in `parseSpec`: ~20 lines, O(nets), members in order (`["x", "y", "x"]`), needing no
HDL, no registry and no parts, so the diagnostic is available exactly where 1.1 wants it — and a
legal 3-long chain `x ← y ← z ← a` returns nothing and evaluates correctly. It has to be caught
there: under the decided rewrite the engine never sees the cycle at all, and under the injected
writer it does see it, but only once the HDL exists — too late for 1.1 — and the error it raises
carries a synthetic part the author never declared in its `partName`, even though the printed
message is in the author's own signals (`… through "y" → "x"`, measured).

**What settled it, and what it was measured on.** The spike ran on 2026-09-24, after
[#363](https://github.com/mezivillager/hacer/issues/363) landed and before N.1 — alias fixtures over
documents mixing driverless-OUT nets, slices and parts, both lowerings, with a four-line Kahn probe
in a throwaway worktree; *not* the Project-1 vectors, which cannot exercise it at all because no
nand2tetris HDL contains a `wire` statement (the review's C5, correct). Its note and fixtures are
local and uncommitted, as both earlier spikes' were. Because that model is not the shipped one, every
measurement this amendment rests on was re-run against `origin/main`'s real `compileHDL`, on HDL
lowered by hand:

```
V1  CHIP P { IN a; OUT out; PARTS: }                             compiles; {a:1} -> out=0
V2  Not(in=a, out=out[1]); Or(a=a, b=out[1], out=any)            {a:1} -> any=1   per-bit rename
V3  Not(in=a, out=out[1]); Any2(in=out, out=any)                 {a:1} -> any=0   truth 1 (#431)
V4  Not(in=a, out=out[0])                                        compiles
    Not(in=a, out=out[0]); Or(a=a, b=a, out=out[0])              refused: "out" bit 0 driven twice
V5  Not(in=a, out=out[1]); Any2(in[0]=a, in[1]=out[1], out=any)  {a:1} -> any=1   pin split
V6  Not x2 -> out[2..3]; Any4(in[0..1]=s, in[2..3]=out[2..3])    {s:0b01} -> any=1 straddling read
V7  Not(in=a, out=o1), with `wire o2 = o1`                       o1=1, o2=0       write-back needed
```

**1.6 A bus-joiner bit driven by a chip input node is the same net, with a slice on the sink ref.**
Case C11 breaks today because HDL can only write a slice from a part output. `wire out[0] = a;` is
that net printed; 1.5 covers it with no second mechanism and no second width rule — 1.7's rules apply
unchanged, because the ref is an ordinary ref. *Amended by the #372 spike:* "no second mechanism"
survived, but the mechanism 1.6 inherits is the amended one — the per-bit binding rewrite plus the
boundary write-back, not substitution alone — and the shape 1.6 has to be **tested** on is the mixed
signal **read by a part**, where the read is split rather than renamed, and where nothing but
`compileSpec` will notice a missed split until #431 lands.

**1.7 Inferred slices are recorded, not silent.** v1 `addWire` sets `width = min(src, dst)` and the
evaluator clamps, so a 16-bit source into a 1-bit pin is silent today; HDL needs `a[0]`, and a 1-bit
source into a 16-bit OUT needs `out[0]` (case C4). The importer **must invent slices the user never
drew**, so it records each one in the sidecar as `{ kind: 'slice-inferred', partId, pin, detail }`
and the shell surfaces them once on import. Silence would make an importer bug indistinguishable
from a faithful import.

**1.8 A pin driven by two sources *on the same bit* is illegal in the spec, and the importer keeps
both drivers.** It is legal in v1, it is order-dependent, and it survives import only because
`compileHDL`'s evaluator is *also* last-binding-wins (case C8, measured below) — nothing guarantees
those two coincidences stay aligned. `parseSpec`
accepts it and marks a diagnostic (so the drawing tells the truth about what was declared);
`compileSpec` rejects it; **the importer keeps every driver and records a note naming them.**

*The first draft said "keeps the first driver in canonical order", and the review's C1 is right that
this is a defect.* The legacy evaluator is last-wins, so keeping the first makes the spec evaluate
**the other driver** than the legacy document did — and §10's acceptance test then fails on C8, the
one case whose parity was actually measured. Keeping the *last* would pass that test, but only by
inheriting a legacy bug as a specification: the legacy document's value on a multi-driven pin is not
*last*, it is **undefined**, because it depends on array order, exactly as #356 showed for junctions.
There is no correct answer to be in parity with. So the importer chooses nothing, loses nothing, and
says so; §10 exempts the case from parity with that reason.

**What makes keeping both safe is the spec's own rule — not a refusal the engine already performs.**
*The first revision claimed the second, and the second pass measured it false; this is the corrected
ground, and the decision above is unchanged.* The engine's clash check is narrower than the case:
[#362](https://github.com/mezivillager/hacer/pull/362) (merged 2026-09-23) refuses a signal driven by
two part **outputs** on overlapping bits, and `drivenRanges` in `src/core/hdl/compiler.ts` is
populated only from part *output* connections. C8 is the other shape — one part **input** pin bound
to two signals — and that check never sees it. Measured against `origin/main` with #362 in:
`Not(in=a, in=b, out=out)` **compiles**, and evaluates `{a:1, b:0}` to `out=1`; the same document
with its bindings swapped evaluates it to `out=0`. Silently last-binding-wins — the exact
order-dependence the first revision said was impossible.

So the rule is `compileSpec`'s to carry and to test, today: a document reaching it with two drivers
on a bit is refused **by name**, with both drivers in the message, while the drawing has been showing
the diagnostic since it was parsed. **Once [#367](https://github.com/mezivillager/hacer/issues/367)
lands it is the engine's rule too** — #367 is the input-side twin of #355, filed against exactly the
measurement above, and it brings `compileHDL` in line with the reference simulator (`Cannot write to
pin x[i] multiple times`, `../web-ide/simulator/src/chip/builder.ts`); it is listed with the other
preconditions in §10. Keeping both drivers is safe because nothing on the spec path ever *chooses*
one of them — not because nothing could.

**Amended by the #372 spike: the two halves of this rule have different owners, and permanently.**
The **input** half arrived free: #367 landed as
[#375](https://github.com/mezivillager/hacer/pull/375) (merged 2026-09-23), and `claimBits` keys a
part's bound ranges by the *pin's own* bits, so a pin bit bound twice is now refused by the engine
(`Part "Not" pin "in" bit 0 is bound by more than one connection`) — and 1.5's rewrite can neither
create nor hide such a clash. **Not because it leaves the pin side alone:** 1.5's rule 1 splits a
straddling read into bindings on the part's **own** pin (`Any2(in=out)` →
`Any2(in[0]=a, in[1]=out[1])`), which is a pin-side change, as the summary table says too. The
reason is 1.5's own: #375 claims bits **per pin bit**, so the two pieces a split produces are
**disjoint** claims over bits the one binding already claimed together — no bit gains a second
claimant and none loses one. Measured both ways: a genuine double binding of `in` bit 0 is refused
identically unsplit and split, and a legitimate split compiles and evaluates correctly (as do two
aliases of one IN bound to two pins, and to two bits of one pin). The **output** half is
`compileSpec`'s and stays `compileSpec`'s: `drivenRanges` is populated only from part *output*
connections, and 1.5's decided lowering injects no part, so a bit driven by one part and one alias
never reaches the engine as two drivers — it compiles clean, and the boundary write-back then
overwrites the part's bit silently (measured, V4 in 1.5). So
`compileSpec` runs the overlap check over **nets**, before lowering, counting an alias net as a
driver of its sink's bits; the engine's part-side check is the second net, not the first.

**1.9 Part ids are emitted into the HDL text as a structured trailing comment, and read back.**
`Nand(a=a, b=b, out=t); // #p3`. The sidecar's `part-id → hint` binding does **not** survive a text
round trip otherwise: the printer is a fixed point for all eleven cases, but the text carries no ids,
so hints are lost the moment a spec passes through its own printer.
*Rejected alternative:* keying the sidecar by canonical part order — under which inserting one part
above another shifts every hint after it, which is precisely the instability the sidecar exists to
prevent.
Only **parts** need the marker. An I/O terminal's `NodeId` (1.4) is derived from its declared name —
`in:a`, `out:sel` — which the HDL text already carries in the `IN`/`OUT` lines, so those hints
survive a round trip with no marker and no ambiguity. Renaming a port moves its hint, which is
correct: it is a different port.
Both HACER's parser and the reference `web-ide` grammar treat `//` to end-of-line as whitespace
(`base.ohm:68-73`), so the marker is invisible to nand2tetris tooling and to any other HDL consumer.
HACER's parser must read it with a dedicated rule attached to the part, not by retaining comments
generally, so ordinary comments stay ignorable. **Concretely, and the review is right that this is
not a grammar change:** `src/core/hdl/parser.ts` discards comments in the *tokenizer*
(`skipWhitespaceAndComments()`), so the tokenizer has to emit `// #p<n>` as its own token kind and
the part rule consumes it. One clause, but it is the difference between a small change and a
confusing one. A spec hand-edited without ids falls back to order-keying for the parts that lost
theirs, and the shell says so.
*Evidence that no longer applies:* the printer's fixed point for all eleven cases was measured on
output **without** markers, and the shipped printer emits them. Together with the net lowering above,
that makes the round trip an N.1 measurement rather than an inherited fact — recorded in the
made-without-evidence table.
*Amended by the #372 spike — two measurements and one caveat.* `Nand(a=a, b=b, out=t); // #p3`
**parses today**, because the tokenizer already treats `//` to end of line as whitespace; `printHDL`
**drops it**, ids read back from its output being `["<lost>", "<lost>"]` while the text stays a fixed
point, so the loss is silent exactly as predicted. A spike-local id-preserving printer restored them
over two round trips, and 1.5's rewrite does not disturb the binding, because it rewrites a
connection's **externals** and never the part list. The caveat is the order-keyed fallback: **an
injected part has no id.** The export dialect's buffers (1.5) are unmarked parts, so a document that
passes through the export lowering loses positional recovery for every id after the first injected
one. It is safe **only** while injected parts are appended last, which the export printer must
guarantee and state — and that the document lowering injects nothing is one of the reasons it is the
decided one. The tokenizer rule itself is still unmeasured: the round trip was measured with a
spike-local printer and a regex reader over its output, so the parser change is N.1's to measure.

### 2. The pipeline contracts

**`layout(doc, surface, options) → Placements` — pure, deterministic, and synchronous. `options`
carries `previous?: Placements`.**

*This amends `REPORT.md` §4 and #327, both of which say "asynchronous".* Async was a precaution
against `elkjs`'s promise API, and elkjs is rejected (Reuse considered). Our own layered placer runs
a 16-part chip in 0.23 ms median and 896 parts in 3.58 ms, so layout can re-run on a keystroke on the
main thread. A future strategy that genuinely needs a worker declares itself async and is driven
through a separate `layoutAsync`; the default contract stays a plain call, because a promise in the
common path buys nothing and makes every caller and every golden async for no reason.

Preconditions, which are part of the contract and each get a test:

- **stable part ids** (1.9) and **stable net ids** (§1: a net's id is its sliced signal reference);
- **canonical part and net order**, with a test asserting that permuting the input is a no-op — ELK
  moved 195 of 198 nodes on a permutation with no topology change;
- **a pinned strategy**: `Placements` records `{ strategyId, strategyVersion, options }`, so a golden
  knows what produced it;
- **fixed float precision at the boundary** — ELK returned `213.33333333333334`; our placements land
  on a fixed lattice and serialise at fixed precision.

**Stability under edit is the stated guarantee, not a hope.** A read-only view re-renders when the
spec changes; if a one-part edit reshuffles the drawing, the person watching loses their place.

> `layout` never moves a node that has a sidecar hint. Hint-less nodes are placed by longest-path
> layering (layer → X, within-layer order → Z, hierarchy depth → Y) with a **stable within-layer
> order**. A full reflow is an explicit action and never a side effect of an edit.

**The default is `layout(doc, surface, { previous })`: barycentre ordering on the first layout, and
on every later one the parts `previous` already placed keep their relative order while only the new
ones are inserted.** It is still pure and still deterministic — `previous` is an ordinary argument,
not hidden state; with the same `(doc, surface, previous)` it returns the same placements, and with
no `previous` it returns exactly what `order: 'barycentre'` returns.

**`previous`'s edges, because it is a contract input and its degenerate cases are the ordinary
ones.** It is **advisory and never a source of truth**. An entry naming a part the document no longer
has is ignored; a part the document has with no entry in `previous` is new, and is inserted by the
first-layout rule among the parts that are held — which is the "one part added" row below. A
`previous` whose `strategyId` differs from the strategy being run, or whose `strategyVersion` this
build does not know, is **ignored whole**: the call degrades to a first layout rather than
half-honouring an ordering it cannot reproduce, and `Placements` records that it was discarded, so a
golden can tell a first layout from a dropped one. A `previous` belonging to the other surface is a
different argument rather than a stale one — placements and hints are keyed by surface from v1 (1.4).
None of this touches purity: the same `(doc, surface, previous)` returns the same placements,
degenerate cases included.

*This replaces the first draft's `order: 'id'` default, on measurement rather than judgement.* The
draft called that its weakest decision, measured stability and not readability, and proposed to
settle it by rasterising drawings for a human to judge. The review's C4 pointed out that a cheaper
experiment already existed in both spikes' throwaway code, and that it was cheap only while that
code existed. It was run on 2026-09-23 —
`docs/research/2026-09-21-foundation-audit/evidence/LAYOUT-ORDER.md`, full tables there:

| drawn graph | `order: 'id'` | barycentre | `{ previous }` |
|---|---|---|---|
| Parity5, 22 nodes | 50 crossings | **0** | **0** |
| Mux4Way16 → Mux, 54 nodes | 3 221 | **1 650** | **1 650** |
| Mux4Way16 → primitives, 198 nodes | 7 228 | **3 033** | **3 033** |
| Mux8Way16 → primitives, 906 nodes | 42 696 | **13 475** | **13 475** |
| stability, one part added (54 nodes) | 100% | 91% | **100%** |
| stability, one part added (906 nodes) | 100% | 93% | 93% |
| stability, **one connection rewired** (54) | 100% | 56% | **100%** |
| stability, **one part deleted** (54) | 72% | 81% | **87%** |
| after ten successive additions (54) | 3 383 crossings, 0 moves | 1 213, 195 moves | 2 384, **56 moves** |

Three things this settles, all against the first draft:

1. **id order costs 2–3× the crossings on every real circuit**, not nothing. The draft's
   `crossings=0` came from S328's **parts-only** graph on a near-chain; the chip's own I/O terminals
   are drawn (`src/nodes/`, row 5, ADR-0008 assertion 6), and with them Parity5 is 50 against 0.
   The draft's only contrary number — 43 → 8 on a graph *built* to be tangled — understated the real
   cost rather than overstating it.
2. **id order's stability belongs to the id convention, not to the ordering.** `addPart` appends, so
   a new id sorts last and displaces nothing. Give the same edit an id that sorts mid-list and id
   order falls to 70%, below barycentre's 91%; on a **delete** it is the worst of the three on both
   axes at 72%. Any renumbering, any importer assigning ids in canonical order, any
   delete-and-re-add, and the guarantee is gone.
3. **Barycentre was never 0% stable.** It holds 91–95% of nodes on the real fixtures. The draft's
   "16 of 16 moved" is a *coordinate* metric on the smallest fixture, where the priority pass shifts
   nodes whose order never changed. S210's own sketch — *"fewer crossings, 41–100% stable"* — was
   right, and the ADR quoted only the side that agreed with it. (The review says S328 reported no
   id-order comparison on the real fixture; it did, as "(id-order before sweeps: 0)" in
   `spike/out/q2.txt`. That is a correction to the review and it makes the draft's error worse.)

Consequences of the change, each stated:

- **`order` survives as an explicit option**, not as the default. With neither `previous` nor
  `order`, `layout` does the first-layout thing — barycentre. `order: 'id'` has to be asked for, and
  it is the right thing to ask for when a golden wants one canonical drawing from one document with
  no history.
- **`tidy` stops being the fallback for anything** and becomes what it says: one reflow, on request,
  written to hints with `origin: 'tidy'`. **Two** of the review's four objections to
  `tidy`-as-fallback are answered by not needing it: there is no import moment to find, and an
  agent-generated spec gets the good drawing with no command. **The third is not answered by
  `origin` (1.4) alone**, as the first revision claimed — `tidy` is still the drift reset, it writes
  a hint for **every** node (row 20), and the invariant above is that `layout` never moves a hinted
  node, so the case needing an answer is the ordinary one five minutes after the first `tidy`: a
  **hint-less node added among hinted ones**. The rule, stated: hinted nodes are placed first, at
  their hints, and are then **fixed occupants** of the lattice cells they land on; hint-less nodes
  are layered and ordered exactly as above and take the first free cell of their layer in canonical
  within-layer order — so a new part can never land on a hinted one, and no hinted node moves.
  `tidy` rewrites the hints it wrote (`origin: 'tidy'`) and leaves `origin: 'user'` hints alone, so
  the reset stays available after any number of additions.
- **The fourth objection — drift — is half answered, and "slowly" was the wrong word.** Drift is
  **non-monotone**: the same harness records *one* addition taking the 54-node fixture 1 650 →
  **2 681** (`docs/research/2026-09-21-foundation-audit/evidence/layout-order-q4.txt`), worse than
  the 2 384 it reaches after ten. Ten edits therefore do not bound a hundred, and no threshold is
  defined here. What survives is the claim that matters: incremental stays below `order: 'id'`'s
  **best** drawing (3 221) on every fixture measured, and `tidy` is the reset when someone wants one
  — which is a reasonable place for an explicit command, and not a place for a silent default.
- **`Placements` records `previous`'s `strategyId`/`strategyVersion`**, so a drawing that came from a
  chain of incremental layouts can say so and can be rebuilt from scratch on demand.
- **What is still not measured:** whether the barycentre drawing *reads* to a person. The number says
  it crosses 2–3× less than the alternative; it does not say it is good. That is still the
  rasterise-and-judge experiment, now at much lower stakes because it compares a good drawing against
  a better one rather than deciding the default.

**`route(doc, placements) → RoutedNets` — total, one pass, canonical net order, no shared mutable
occupancy state. Channel routing, not search.**

**`route` is total: every net in the document receives a non-empty path whose endpoints are the
declared pins, or a failure named against that net's id.** *This is the review's C3 and it is
right.* ADR-0008's assertion 6 was a **render-level no-orphan** guarantee — its reason for existing
is B-003, *"repair the `recalculateWiresForNode` catch-and-ignore so a failed re-route doesn't orphan
the wire"* — and the restatement in §8 (*"a spec edit re-routes only the nets that changed"*) is a
**minimality** property that a net re-routing to nothing satisfies. Assertions 1 and 2 do not cover
the gap either: "one rendered line per described segment" is vacuously true of a net with zero
segments. Totality restores it, and this ADR keeps both halves.

*Checked, because the review asked for it to be checked:* totality plus assertions 1 and 2 is
**sufficient** to carry assertion 6's force, and it carries it further than the original did — over
every spec edit rather than only over `updateInputNodePosition`. Totality supplies the non-empty
path; "whose endpoints are the declared pins" plus assertion 2's `partId:pinName` world positions
supplies "connects to the gate pin"; assertion 1 supplies "renders". The one loophole the review's
wording leaves is the escape clause, and it is closed here: **a named failure is a diagnostic
attached to that net id, carried by `describeScene` and drawn (1.1). It can never be a silent
absence** — which is the precise failure mode B-003 was.

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
- resolved **pin world positions keyed by `nodeId:pinName`**, where a `nodeId` is a part id **or**
  a chip I/O terminal's id (1.4) — an I/O terminal has a pin and it is drawn, and keying this by
  `partId` alone would leave assertion 6's own subject unaddressable;
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
- **session:** selection, inspection, camera, panels, renderer — excluded from undo, and **partly**
  exposed to MCP.

`connect(from, to)` is **semantic**: it names endpoints and never a path. Routing is `route`'s job,
and **no user-authored geometry enters the spec.** *The draft said "the document", which is false as
written and the review's C4 caught it:* §1 says the document is spec **plus sidecar**, §5 says the
sidecar is undoable with the spec as one document and one history, and `setHint` and `tidy` write
geometry into the sidecar on purpose. The line that matters is between the two halves, not around
both: the spec has no coordinates in it, ever.

**Session scope and MCP.** Excluding session from *undo* is plainly right — nobody wants ⌘Z to move
the camera back. Excluding it from *MCP* is not, and needs the sentence the review asked for.
`north-star.md` promises that *"every action a human can take, an AI agent can take
programmatically"*, and the owner's stated ambition includes AI that teaches by building and
showcasing: **an agent that cannot aim the camera cannot showcase.** So the carve-out is explicit —
`camera`, `inspect` and `renderer` are MCP commands; selection and panel chrome are not, because
they are the shell's own furniture and an agent reads the scene description instead. Session
commands return the same `CommandResult` and are still absent from history.

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

Phase C.1 switches the default renderer only when **every row marked "gates" passes** through the
spec path, each as a scenario runnable through the CLI driver **and** at least one rendered view.

**The gating rule, stated once so the list and the plan cannot drift apart again.** A row gates the
switch **unless** (a) the legacy app does not have that capability today, so it cannot regress, and
(b) no gating row depends on it. Exactly two rows qualify, each marked and reasoned in place.
**Rows bundle capabilities, so (a) is read across all of them: a row gates if the legacy app has
*any* of the capabilities that row names, and the row's runnable scenario then covers exactly those —
a capability bundled into a gating row that the legacy app does *not* have rides along as new work,
scheduled, never a gate.** Two rows need that clause and both are marked in place: row 18 bundles
*drill into a composite*, which the legacy app has no form of (no `drill`, `drillDown`, `enterChip`
or `subcircuit` anywhere in `src`, and [#172](https://github.com/mezivillager/hacer/issues/172) is
open and promoted in §11), and row 13 bundles *inspect a net*, where a net is not a legacy entity.
Without the clause two readers applying (a) literally reach different answers on both rows. *The
review's C2 is right that the first draft contradicted itself here* — §6 said "every row", §7.3 said
"rows 1–18", `REPORT.md` §6 said "every scenario", and the two rows that fell through the gap were
`setHint` and `tidy`: as written, the switch was allowed with **no way to place a part**. §7.3 and
`REPORT.md` §6 now both point at this rule instead of restating it.

Rows 21–23 are capabilities the legacy app **has today** that the first draft's list did not name at
all, and that its non-goals did not drop either — the review found all three. Row 24 is the opposite
omission it found: undo is designed in §5 and was never listed anywhere. A frozen list is worth
nothing if something people use today is neither on it nor deliberately dropped.

| # | Capability | Replaced by | Gates? |
|---|---|---|---|
| 1 | Declare a chip with named IN/OUT of given widths | spec text | gates |
| 2 | Add a part of a registered chip | `addPart` | gates |
| 3 | Remove a part | `removePart` | gates |
| 4 | Connect a part output to a part input, by name | `connect` | gates |
| 5 | Connect a chip IN to a part input, or a part output to a chip OUT | `connect` | gates |
| 6 | Connect through a bit slice (`a[0]`, `out[0..7]`) | `connect` with a slice ref (needs #357) | gates |
| 7 | Fan one source out to many sinks | the net's sinks list — no junction entity | gates |
| 8 | Pass an input straight to an output | an ordinary net, driver `chip-in` → sink `chip-out` (1.5) | gates |
| 9 | Split or join a bus | slices (1.2) | gates |
| 10 | Leave a circuit unfinished and still see it | parse-to-render (1.1) | gates |
| 11 | Set an input value; run, step, reset | `setInput` / `run` / `step` / `reset` + pins panel | gates |
| 12 | See live signal values on the drawing | `describeScene` signals | gates |
| 13 | Inspect a part, pin or net (ids, widths, values) | hover / click → inspect panel | gates — on part and pin; a net is not a legacy entity (bundled-row rule) |
| 14 | Run a `.tst`/`.cmp` and see the result | `src/core/testing` + the sidecar's test binding | gates |
| 15 | Truth table for the current chip | `truthTable`, re-typed onto the spec | gates |
| 16 | Save, load and autosave a design | spec + sidecar serialisation | gates |
| 17 | Open a saved version-1 document | `fromLegacyCircuit` + `deserialize` | gates |
| 18 | Navigate: pan, orbit, zoom, fit, drill into a composite | both renderers | gates — on pan/orbit/zoom/fit; drill-down is new work (#172), not a gate (bundled-row rule) |
| 19 | Put a part (or an I/O terminal) where I want it | `setHint` (1.4) | **gates** — replaces drag-to-place, which the legacy app has |
| 20 | Tidy the drawing | `tidy` (one reflow → hints, `origin: 'tidy'`) | no — no legacy equivalent, and §2's `{ previous }` removed its fallback role |
| 21 | Export / import a design as a JSON file you can commit or send | spec + sidecar as two files; `exportCircuitJSON` / `importCircuitJSON` retire with `serialize.ts` | gates — and §7.2 depends on it |
| 22 | The named circuit library | the library lists spec documents (`CircuitLibrary.tsx`) | gates |
| 23 | Record that a chip's `.tst` passed (`✓ <name>`) | `chipCompletion.ts` re-pointed at the session slice (plan item 1.1); §7.4g deletes `CircuitState` around it | gates |
| 24 | Undo / redo a design change | §5's spec history | no — the legacy app has none, so it cannot regress; scheduled at N.10 |

**Non-goals — named here so the switch is never blocked on them.** Hand-chosen wire paths are
**dropped**: `route` owns every path and no user-authored geometry enters the document. So are
dragging a part with the mouse, click-on-canvas placement, the wire-drawing gesture, junction
placement, placement previews, marquee selection and keyboard nudging. The **junction as a domain
entity** is dropped — fan-out is a property of a net (`junction` is referenced in **44** production
files today; 81 including tests — the draft said 47, and the review's count is the right one).
`BusComponent` as a document entity is dropped (1.2). Crossing and arc-hop bookkeeping stored
in the document is dropped; it is a renderer concern derived from `route` output, if it is wanted at
all. Toggling an input by clicking its 3D pin is dropped at the switch and reopenable as a shortcut
that emits `setInput`.

### 7. Removal — replace, switch, delete, in this order

1. **Before anything is replaced:** the characterization baseline (#331) records what the legacy
   renderer draws and what the legacy engine evaluates. It comes first, and it is **one of two**
   points of no return — see 2. **It can only be produced in CI.** It needs #217's `describe()` over
   the *legacy* app, which mounts the canvas, which ADR-0016 as amended (2026-09-19) forbids on the
   owner's laptop. Naming #331 "first" without naming that constraint hides the one thing that
   decides when it can happen; the run is a cloud job, and the plan waits on it.
2. **A corpus of real version-1 documents is captured and committed as fixtures** before
   `serialize.ts` is deleted — **the second point of no return**, which is the whole reason this
   precondition exists. **No real saved circuit file exists anywhere in the repository today** —
   the spike's eleven cases were hand-built to `serialize.ts`'s exact shape, and the importer was
   never run against a *deserialized* document (#181). Without a captured corpus the importer's only
   evidence is hand-built forever, and a genuine save could carry a shape none of the cases has
   (stale `crossesWireIds`, arc segments, orphaned junctions). This is a **precondition on C.1**, not
   a nice-to-have.
   **The mechanism, and its exit, because the draft named neither.** Capture is
   `exportCircuitJSON` (`persistenceActions`, wired to `RightActionBar`) plus each `localStorage`
   autosave slot; it is run by whoever holds a browser with saved designs in it — in practice the
   owner, once, from the legacy app before it is switched, which is the *only* window in which it can
   be run at all, since `exportCircuitJSON` dies with `serialize.ts` (capability row 21).
   **The exit, so the precondition cannot block the switch silently:** if the answer is "no saved
   circuits exist", that is recorded as a stated limit — *"the hand-built corpus is the only
   evidence; no real document was ever seen"* — in the N.2 PR and in `observed-bugs.md`, and C.1
   proceeds. A precondition with no exit is a deadlock, not a gate.
3. **The 36 e2e files that read `__CIRCUIT_STORE__` / `__CIRCUIT_ACTIONS__`** (measured: 36) migrate
   to §5's `__CIRCUIT_READY__` contract **with the store swap, in N.7's own PR** — not afterwards.
   §5 designs the bridge and the draft made nothing gate on the migration; a swapped store with 36
   specs still racing three globals is a broken suite, not a migration.
4. **The switch (C.1)** happens when every gating row of §6 passes, by the rule stated there.
5. **Then delete, by consumer group, largest first, each PR as large as it needs to be:**
   a. gesture state, drag hooks, placement actions and previews — the 9 gesture fields of
      `CircuitState` and about 1,200 lines;
   b. the wiring, wire and junction actions (1,766 lines) and the `junction` entity;
   c. `src/utils/wiringScheme` and `src/utils/wireSharing.ts` — the legacy router, 3,640 lines;
   d. the canvas-shaped evaluator and serialisers: `topologicalEval.ts` (363 lines),
      `truthTable.ts` re-typed, `serialize.ts` deleted;
   e. the `BusComponent` entity and every `'bus'` endpoint switch — **including
      `src/simulation/busLogic.ts`** (ADR-0009's `evaluateSplitter` / `evaluateJoiner`, first-class
      in the legacy topological sort), which the draft implied and never named;
   f. the gesture e2e specs, and the `@ui` rows that only exercised them;
   g. `CircuitState` itself — and capability row 23's completion tracking moves to the session slice
      *before* this step, not during it.
6. **`deserialize` survives** as the importer's private reader of version-1 documents, with version
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
| 2 | connectivity | property of `describeScene`: pin world positions keyed by `nodeId:pinName`, parts **and** chip I/O terminals |
| 3 | dense chips reach distinct pins | property of `route` — lane disjointness |
| 4 | transit separation | property of `route` — lane disjointness |
| 5 | CASE1 off-backbone | property of `route` — lane disjointness |
| 6 | node-drag re-route | **does not survive read-only** *as a drag*. Two properties replace it, and both are needed: **`route` is total** (§2 — every net gets a non-empty path between its declared pins, or a named, rendered failure), which carries B-003's no-orphan force over every spec edit rather than only over `updateInputNodePosition`; **and** *"a spec edit re-routes only the nets that changed"*, measured at 2 of 22. The draft kept only the second, which a net re-routing to nothing satisfies |
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
**ADR-0016 and ADR-0012 — unchanged**: anything that mounts the canvas still runs only in CI, which
is why §7.1's baseline is a cloud job.

**The supersession is written in both directions, as this repo already does it.** *The review's C6:
the draft announced all three supersessions in ADR-0020 and in the index, while ADR-0007, ADR-0008
and ADR-0009 each still read a bare `Accepted` with no pointer — and "Affected living docs" omitted
the one section that would have caught it.* The repo's own precedent is ADR-0012, whose status line
reads *"Accepted — Superseded in part by ADR-0016 (§1: …)"* with the index row mirroring it, and
ADR-0013's inline *Amended* note. So in this PR: **ADR-0007's status line records that it is
superseded by ADR-0020 and that Stages 2–4 are cancelled; ADR-0008's records that assertion 6 is
restated here; ADR-0009's records that it is superseded in the document and kept in the projection.**
Their index rows mirror the change, and all three are listed under "Affected living docs".

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

**One case is exempt from parity, by name and with its reason: a pin driven by two sources *on the
same bit* (C8).** The legacy document's value there is not *last-wins*, it is **undefined** — it
depends on array order, exactly as #356 showed for junctions — so there is nothing well-defined to be
in parity with. The importer keeps both drivers and records a note (1.8); `compileSpec` refuses the
document by name (1.8 — the engine half is
[#367](https://github.com/mezivillager/hacer/issues/367), not #362, which refuses only two part
*outputs* on a bit); the acceptance test asserts **that refusal and that note**, not a value. This is
the only exemption, and the review's C1 is the reason it is written down rather than papered over by
an importer that quietly picks one driver.

**"On the same bit" is load-bearing, and the first revision left it out.** Without it the exemption
literally covers C10 — `Not(in=a, out=out[0]); Not(in=b, out=out[1])`, where pin `out` has two
sources on *disjoint* bits — whose parity §1.2 cites as measured (`PARITY: HOLDS`) and which
capability row 9 gates. A dissolved joiner is the case this test most needs to keep, not one to
exempt. "On overlapping bit ranges" is the engine's own predicate and means the same thing.

**Six preconditions of N.2 and N.3**, not parallel work — the draft listed two, and §11 already
listed a third under "keep, newly blocking" without §10 naming it:
[#355](https://github.com/mezivillager/hacer/issues/355) — `compileHDL` keeps only the last writer of
a slice-written signal (measured: 65533 against the correct 65532 on a mere reorder), which is exactly
the shape a dissolved joiner produces (1.2); and
[#357](https://github.com/mezivillager/hacer/issues/357) — the parser rejects a slice on a part pin
(`Not16(in[0]=a)`), which is legal HDL, required from Project 2, and the only way to express capability
row 6 and cases C9 and C11. Two more, which belong here and not only in §11:
[#356](https://github.com/mezivillager/hacer/issues/356) — the junction-tracing defect that is the
reason this test is restated at all; and
[#181](https://github.com/mezivillager/hacer/issues/181) — `deserialize` throws on any version but 1
and imports store actions and `notify`, so **the importer has never once seen the output of the
reader it is specified to consume.** S328 ran it only against hand-built objects. That is the same
class of precondition as #355 and #357, and the draft left it in §11 alone.

**Two more, added by the second pass**, both engine defects this ADR's own text now rests on:
[#363](https://github.com/mezivillager/hacer/issues/363) — since #362, `compileHDL` tracks reads and
writes per *signal* rather than per bit, so it reports a **spurious** combinational cycle on disjoint
slices, which is every dissolved joiner (1.2) and every mixed slice/whole-signal document the alias
spike must contain (1.5); and
[#367](https://github.com/mezivillager/hacer/issues/367) — a part **input** pin bound twice compiles
and silently evaluates last-binding-wins, which is the C8 shape the importer now emits and the gap
the first revision wrongly believed #362 had closed (1.8). **Both have since landed** — #363 in time
for the alias spike to run on it, and #367 as
[#375](https://github.com/mezivillager/hacer/pull/375) (merged 2026-09-23), whose per-pin bit claims
the #372 spike then measured as the input half of 1.8's rule. Neither is outstanding; the **output**
half of 1.8 is `compileSpec`'s permanently, and that is the precondition that became a requirement.

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
- **Was: keep, newly blocking — now all closed.** #355, #356, #357, #363, #367 (§10) and #181
  (`deserialize` returns data) were the six preconditions this sweep added; every one of them closed
  on 2026-09-23, #367 as [#375](https://github.com/mezivillager/hacer/pull/375). None of them blocks
  the sweep or N.1 any longer; what §10 still books is the **output** half of 1.8, which is
  `compileSpec`'s permanently rather than a precondition.

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

**The weakest part of this decision — measured, and it is no longer the layout.** The first draft
named `order: 'id'` as its weakest point and proposed a human-judged experiment. That experiment was
replaced by the cheap one the review pointed at, run before both spikes' trees were collected, and
it went against the draft: id order costs **2–3× the crossings** on every real fixture, and its
stability is a property of append-ordered ids rather than of the ordering (§2,
`evidence/LAYOUT-ORDER.md`). The default is now `layout(doc, surface, { previous })`.

**And it is no longer the alias-free pass-through either.** That was the weakest part when this ADR
was accepted — the engine had to bind an OUT signal whose producer is an IN, nobody had run it, and
the substitution-before-ordering argument was an argument, not a measurement. Its spike
([#372](https://github.com/mezivillager/hacer/issues/372)) ran on 2026-09-24 and cost the mechanism
rather than the decision: the Kahn argument held, the substitution it was attached to moved no value,
and the lowering is now a per-bit binding rewrite plus a boundary write-back (1.5, and "What the
spike changed"). **What is weakest now is that `parseSpec` and `compileSpec` do not exist.** Every
number above was measured either against a spike-local spec model or — for the ones this ADR now
rests on — against the real `compileHDL` fed HDL lowered by hand, never against the pass that will do
the lowering. N.1's first obligation is to re-run these fixtures through the shipped one, and the
split rule is the part most likely to be got wrong, because nothing in the engine reports a missed
split until [#431](https://github.com/mezivillager/hacer/issues/431) lands.

One aesthetic question is still open and is honestly labelled: **whether the barycentre drawing reads
well to a person.** The measurement says it crosses 2–3× less than the alternative; it does not say
it is good. Rasterise at 16, 48 and 192 parts and have the product role judge, before N.4 is
accepted — the same experiment as before, at much lower stakes, because it now compares a good
drawing against a better one instead of choosing the default.

**Made without evidence, and what would settle each:**

| Decision | Why there is no evidence | What would settle it | When |
|---|---|---|---|
| A pass-through as a net with a `chip-in` driver, and the lowering `compileSpec` needs (1.5, 1.6) | **Settled 2026-09-24 by [#372](https://github.com/mezivillager/hacer/issues/372)**, and the mechanism changed with it: substitution holds for the ordering and moves no value, so the lowering is a per-bit binding rewrite plus a boundary write-back, and `compileSpec` carries 1.8's output side. What is still unevidenced is narrower — the fixtures have run against `compileHDL` by hand, never through a real `parseSpec`/`compileSpec` | Re-run the #372 fixtures against the shipped pass, the straddling-read split and the alias-cycle DFS included | N.1 |
| Part ids as `// #p3` in the text (1.9) | Both grammars tolerate the comment (verified), but no round trip through a *hand-edited* file was tried — **and** the printer's "fixed point for all eleven cases" was measured without markers and against the pre-`nets` shape, so it no longer applies | Re-measure print → parse → print on the shipped printer; then a property test: print → hand-edit → parse → print, asserting hints survive | N.1 |
| The importer keeping **both** drivers of a multi-driven pin, and §10's parity exemption (1.8) | Only C8 was ever measured, and it held by a coincidence of two last-wins evaluators. No real document with a multi-driven pin has been seen — and none exists in the repo (§7.2) | The captured corpus (§7.2), or the stated limit if it is empty. Until then the rule is chosen to lose nothing rather than to be right | §7.2, before C.1 |
| Surface-keyed hints rather than one neutral map (1.4) | Both maps are empty at v1, so nothing distinguishes them yet | The first real hand-placed position on a 2D surface | whenever it happens — reversible, alternative recorded |
| Whole-document undo entries, capped at 100 (5) | The spec's size on a realistic circuit was never measured | Measure a 200-part spec's serialised size; adopt patches only if it hurts | N.10 |
| Keystroke coalescing at 500 ms (5) | A conventional number, not a measured one | Watch one person type into the spec editor | N.10 |
| 3D draw-call budgets (2) | `renderer.info` was never read from a live renderer; "draw calls = meshes" is reasoned, not observed — culling, material sharing and render order are invisible to a headless count | The CI benchmark of `REPORT.md` §9a (#325), which is the only place this can be measured | standing — a reserved field, additive |

**Why the "when" column exists.** *The review's C6:* the first draft fixed a migration policy only
between legacy and spec, and none for the spec format itself, so the syntactic decisions were free to
reverse *only until the first real spec is saved* and nothing scheduled their settling before that
point. §1 now fixes the spec's own migration policy and names the boundary (the first committed
`.spec` fixture, at N.1); every row above now says when it is settled relative to it. The row the
review singled out — the alias — is settled *before* N.1, and the construct it was worried about no
longer exists as a construct.

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
| **G. A pure comparator: `order: 'id'` or `order: 'barycentre'`, one of the two** | Choose the within-layer comparator once and live with it | id order: 2–3× the crossings on every real circuit, and its stability is the append convention's, lost on a delete or a renumber (70–72%). Barycentre: 56% of the drawing re-sorts when one wire is rewired | **Rejected on measurement, `evidence/LAYOUT-ORDER.md`.** Superseded by `{ previous }` (§2), which is both. `order` survives as an explicit, `previous`-free option for goldens |
| **H. A second top-level `aliases` array for pass-throughs** | Keep connectivity on parts as HDL-shaped `conns`, add one more array for what has no part | Two connectivity mechanisms that `layout`, `route`, `describeScene`, the overlap oracle, the command registry, the generated MCP schemas and every golden each handle in parallel — and it contradicts the shape the Reuse section adopts | **Rejected after review** (#359 C5). Replaced by one explicit `nets` list (§1) |

## Affected living docs

- `docs/decisions/README.md` — the 0020 row, **and the 0007 / 0008 / 0009 rows**, which announce the
  supersessions from both ends. ✅
- `docs/decisions/0007-wire-routing-engine-direction.md` — status line: superseded by this ADR,
  Stages 2–4 cancelled. ✅
- `docs/decisions/0008-scene-graph-routing-testing-layer.md` — status line: assertion 6 restated
  here. ✅
- `docs/decisions/0009-bus-components-entity-and-wireendpoint-bus.md` — status line: superseded in
  the document, kept in the projection. ✅
- `docs/research/2026-09-21-foundation-audit/evidence/LAYOUT-ORDER.md` — **new**: the ordering
  measurement §2 rests on. ✅
- `docs/roadmap/phases/phase-22-public-website.md` — the marketing copy still pitching
  "drag-and-drop"; forward-looking copy, so the README rule does not cover it. ✅
- `docs/north-star.md` — "interactive 3D environment" restated as declared-and-projected. ✅
- `docs/roadmap/vision.md` — "Visual 3D Building: Intuitive drag-and-drop circuit construction"
  restated; the evolution-path diagram row restated. ✅
- `docs/portfolio.md` — the design-first paragraph records that #188/#189/#190 are absorbed here. ✅
- `docs/research/2026-09-21-foundation-audit/REPORT.md` — §4's "asynchronous" `layout` and §6's N.2
  acceptance test are amended **by this ADR**, which is the plan's own mechanism (P.1); the report is
  a dated research artefact and is not rewritten. **But the amendment is now recorded at both ends**:
  a one-line pointer sits at each amended place in the report, the way ADR-0013 carries its own
  inline *Amended* note. Recording it only in the amending document leaves a reader of REPORT §4
  looking at "asynchronous" with nothing to follow (the review's C6, same class). ✅
- `README.md` — **deliberately unchanged.** It describes what ships today, and today the app is still
  hand-driven. It changes at the Phase C switch, not at the decision.
- `REPO_MAP.md`, `HACER_LLM_GUIDE.md`, `.cursorrules`, `docs/testing/structure.md` — N/A until the
  paths and patterns exist (N.1 onward).

## Links

- Issues: [#327](https://github.com/mezivillager/hacer/issues/327) (this ADR) ·
  [#318](https://github.com/mezivillager/hacer/issues/318) (foundation plan) ·
  [#328](https://github.com/mezivillager/hacer/issues/328) and
  [#210](https://github.com/mezivillager/hacer/issues/210) (the spikes) ·
  [#372](https://github.com/mezivillager/hacer/issues/372) (the alias spike, which amended §1.5, §1.6,
  §1.8, §1.9 and §1's normalisation) ·
  [#374](https://github.com/mezivillager/hacer/issues/374) (N.1, which carries the lowering) ·
  [#375](https://github.com/mezivillager/hacer/pull/375) (the input-side rule, merged) ·
  [#431](https://github.com/mezivillager/hacer/issues/431) (the unproduced-bit defect the spike
  found) ·
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
