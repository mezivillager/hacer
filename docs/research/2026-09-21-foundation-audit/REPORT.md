# Foundation audit — is HACER structured for the autonomous loop?

2026-09-21 · tracking issue #318 · **version 4.** Two fresh-context adversarial reviews shaped it:
`evidence/REVIEW-1.md` on version 1 ("sound with corrections"; 25 claims re-derived, 5 wrong or
stale) and `evidence/REVIEW-2.md` on version 2, which added the owner's read-only-surfaces decision
("sound with corrections, two load-bearing"). Both said the direction holds. Version 3 took their
corrections and, from the second review, made "freeze the legacy canvas, don't delete it" the
default. **The owner overruled that the same day** (§1, direction 4), and this version follows him.
Earlier versions are not committed; what each got wrong is in the reviews and in §1.

Evidence, all under `evidence/`: `MEASUREMENTS.md` (numbers re-derivable with `scripts/run.sh` at
`origin/main` `6e6e636`), `RESEARCH.md` (outside sources, dated, tagged evidence or opinion),
`TESTING.md` (the testing audit) and both reviews. Where this page infers rather than measures, it
says so. **The plan as issues: §6a.**

## 1. The owner's question and his directions

The question: "is the codebase today structured to support our rigorous more-or-less autonomous
process? Is it too tangled? Is it too monolithic? … we shouldn't build more on a wrong foundation
that would crumble soon, so we have to fix the foundation first, and have to keep maintaining the
foundation."

Directions followed the same day, each extending the last:

1. **Wiring is declared, not drawn.** "a human should instead be able to specify wiring requirements
   via simple English words or some other simpler interface, and then auto wiring should happen …
   prompt/config driven, and suitable for MCPs and agents."
2. **The refactor must make surface catch-up smoother** for HDL, MCP and 2D.
3. **Rendered surfaces are read-only.** "edits would be done via config specifications or prompts
   only, and surface re-renders, and only navigation actions would be allowed … if manual 2d/3d edits
   are ever needed we can consider that in the future."
4. **Remove, don't freeze — and 3D matters.** "I don't agree with freezing, working around a frozen
   code is hell … anything that should be removed should be removed, refactor deletion prs can be any
   size they need to be … and 3d render surface have huge value even if it doesn't allow editing,
   because of its visual appeal … humans want to see their circuits in 3d, and as platform grows, the
   3d rendering of complex components will be one of its differentiators."
5. **Rendering is never finished.** "continual research of ai suited 3d browser rendering should be an
   important work, the 3d rendering we have today might not be optimal, we might not be using the
   best libraries for the job … all that needs continual monitoring and improvement."

## 2. The answer

**Partly. The engine and the app shell are sound. The state layer is not — and most of what makes it
unsound exists to follow a person's hand on the canvas, which the owner has now decided to stop doing.**

- **Too monolithic? Not in files — in state.** Production files are small (median 76 lines, largest
  1,021). The monolith is one `CircuitState` of 32 fields, of which the circuit document is 6; one
  `store/types.ts` that 59 of 173 production files import and 14 PRs have changed, the highest in the
  repo on both counts; a store created at module scope with 40 direct importers; a hand-written
  125-entry `circuitActions` facade; and a 678-line slice factory, `createWiringActions`.
- **Too tangled? Concentrated, not pervasive.** `src/simulation` has zero side effects in production
  code. `src/core` has three: a browser-only, already-guarded `localStorage` read in
  `core/testing/chipCompletion.ts`, a `notify` import in `core/serialization/deserialize.ts`, and
  `new Date()` in `serialize.ts`. The tangle is at
  the state layer's edges: state imports UI modules and `three`, `core/serialization` imports store
  actions (a 7-file cycle), production code imports `e2e/` types. 16 cross-layer imports and 3 cycles
  pass a green `lint`, because nothing enforces direction. `src/utils/wiringScheme` also logs to the
  console unconditionally on every wire creation (about 31 `console.*` calls in `crossing.ts`).
- **Does it support the loop? Where it is sound, yes.** #315 and #217 have 4 and 2 files importing
  what they change, because `Shell` already takes an optional `scene` and `App.tsx` is 42 lines. #186
  and #185 are wide today (105 and 103 direct importers, production and test), and #188 and #189 are
  ADRs whose implementations would be. Change shape is the best-evidenced predictor of agent success
  (SWE-bench-Live: single-file small patches solved 48% of the time, three or more files under 10%,
  seven or more never — Python repositories, one attempt, no verifier; the direction transfers better
  than the magnitudes).
- **A correction to version 1.** It said the state layer cannot be tested headless. That was
  measured wrongly. `three` imports fine in Node; with `environment: 'node'` and no setup file, **36
  of 42 test files (722 of 761 tests) across `src/store`, `src/core` and `src/simulation` pass today
  in under four seconds**, including 16 of 21 store files. The six failures are `localStorage`. The
  real obstacle is `src/test/setup.ts:43`, which patches `HTMLCanvasElement` for every test.
- **A caution about our own confidence.** Of 42 PRs merged since the loop began on 2026-09-18, two
  touched `src/` (#238, #312). What we know about small agent PRs comes almost entirely from docs,
  harness and CI changes.

## 3. What the read-only decision does to the question

`CircuitState`'s 32 top-level fields, sorted by purpose: the design, 6; running it, 6; **hand-editing
gestures, 9** (`placementMode`, `placementPreviewPosition`, `wiringFrom`, `isDragActive`,
`busPlacementMode`, `nodePlacementMode`, `junctionPlacementMode`, `junctionPreviewPosition`,
`junctionPreviewWireId` — and `wiringFrom` nests five more); selection and hover, 6, which one
`inspected` reference replaces; view and panels, 5.

What exists to follow the hand, in production lines of 22,513: the wiring, wire and junction actions
1,766; drag hooks 770; placement actions 303; selection and keyboard editing about 145 — about 3,000
lines. With parts of the other action slices, the canvas previews and the 3,640-line router if
automatic layout's own edge routing replaces it, the range is **3,000 to 6,600 production lines, 13%
to 29%**; the spike narrows it. `junction` is referenced in 47 production files.

The engine is not kept wholly intact, as version 2 claimed. Of its 4,266 production lines, about 3,440
(`hdl`, `chips`, `testing`) are kept whole; about 830 (`topologicalEval.ts` at 363 lines, the largest
file in `src/simulation`, plus `truthTable.ts`, `serialize.ts` and `deserialize.ts`) are shaped around
the canvas document and are replaced or re-typed.

The honest case is not line count. It is **state shape and test surface**: routed geometry and
crossing bookkeeping sit in the serialized document; junctions are domain entities the evaluator has
to trace through, with guards for malformed loops; 58 of the 82 `notify` calls inside state are
gesture validation; and the gesture e2e specs can never run on the owner's laptop. A headless caller
can already create a connection today by passing `segments: []` — and gets a document the 3D surface
cannot render. That is "porting, not exposing" in its purest form.

**What is given up, and what is not.**

- *The hand is given up, deliberately.* Its best advocate would say drawing a wire is the one act
  that makes the machine feel constructed rather than specified, and that ADR-0007 spent a 19-source
  research pass on keeping hand-drawn diagrams readable. The measurements cannot answer that — they
  count imports, not learners — and the owner has weighed it: in an AI-native tool a person says
  "wire me this". The plan's duty is narrower: never leave an interval where building a circuit is
  harder than before. So each legacy capability is removed only after its replacement is the default.
- *The third dimension is not given up; it is freed.* A read-only 3D view is a differentiator in its
  own right: people want to see their circuits in space, and as the platform grows, rendering complex
  and hierarchical components in 3D is something a schematic cannot offer. Today a large share of the
  3D code and nearly all of its test burden goes into following a hand. Read-only surfaces move that
  effort into what is seen: composite chips, levels of detail, signal flow. One constraint is
  unchanged and should be said plainly: anything that mounts the canvas still runs only in CI, never
  on the owner's laptop. What shrinks is the interaction surface to test, not where 3D can be tested
  — which is why most rendering behaviour moves into pure functions that *can* be tested anywhere.

## 4. Target structure

```
spec            HDL-shaped: parts + nets, chip IN/OUT, plus a small sidecar   ← the only thing edited
   │            edited by: a text editor in the shell · commands · prompts to an agent · MCP tools
   │            PARSED to render (an unfinished circuit still draws) · COMPILED only to evaluate
engine          compile · evaluate · run .tst/.cmp            src/core (hdl, chips, testing): sound
   │
layout(doc, surface) → placements              pure, deterministic, asynchronous
route(doc, placements) → wire paths            pure, deterministic, one pass, canonical net order
describeScene(doc, placements, paths, signals) pure → a serialisable scene description
   │
renderers       3D (R3F) · 2D (SVG): draw, pan, orbit, zoom, hover/click to inspect — nothing else
```

- **The spec is HDL-shaped, and the ADR settles its edges.** nand2tetris-native; the engine already
  parses, compiles and tests it; the reference web IDE has no graphical editing. Four things the
  canvas expresses today have no plain-HDL form, and the ADR must decide each: an unfinished circuit
  (`compileHDL` rejects an unconnected input, an unproduced signal and a combinational cycle — every
  intermediate state of building a chip), which is why the spec is *parsed* to render and *compiled*
  only to evaluate; bus splitters and joiners, which ADR-0009 made first-class entities, where HDL uses
  slice notation on a connection; chip metadata and `.tst` bindings; and layout hints.
- **The sidecar is decided, not left as a question.** Version 2 denied #188's layout sidecar in one
  paragraph and relied on "optional layout hints" in another. Version 3: the sidecar exists from the
  first version of the spec, as a stable `part-id → hint` map, empty by default. It is also the only
  place a future drag could write, so it is what keeps "manual edits later" possible.
- **Layout is asynchronous and its determinism has preconditions**: stable part ids, a canonical part
  and net order, and a pinned layout library version and options — or the golden tests flake. `elkjs`
  is not a dependency today, its API is promise-based, and it has no layered 3D algorithm: nothing in
  the plan or the backlog yet names how parts are placed in 3D. The spike must name one and measure a
  16-part chip headless. A layered layout also reflows the whole diagram when one part is added; the
  ADR weighs that against a learner's mental map.
- **The router is replaced, not moved.** Today's routes each wire against wires already placed and
  says so itself, so a one-pass `route` in canonical order is new control flow with re-baselined
  goldens. With no dragging, ADR-0007's worry about routing in real time disappears.
- **Two test seams for geometry, not one.** ADR-0008 exists because "a routing fix passed 1490+ unit
  tests while a render-level merge hole survived". Its seven assertions become properties of `route`
  and `describeScene`, checked in Node — and its existing suite, which renders the production wire
  component through `@react-three/test-renderer` (no GPU, runs locally), is kept and pointed at the
  new renderer, because a golden over the description cannot catch a description-to-mesh bug.
- **A new, small store**, built right from the first line: a factory with injected ids, clock,
  storage and scheduler; spec, run state and session as separate slices. Two consequences the ADR
  must write down. The e2e window bridge (`window.__CIRCUIT_*`, 36 e2e files) is published at module
  scope today *because* the store is a module singleton; a factory store publishes it from a
  mount-time effect, which changes the readiness contract. And undo as "the spec's own history" needs
  one serialisation point, keystroke coalescing, and a rule for an agent's forty-command batch, since
  four writers (editor, commands, CLI, MCP) will share it.
- **A renderer is a plug-in behind the scene description, so the library is swappable.** The
  description is the contract; React Three Fiber and three.js are today's implementation of one side
  of it, not an assumption baked into the document, the store or the tests. That is what makes the
  owner's fifth direction practical: a better library, a WebGPU path or a different approach to large
  circuits can be tried as a second renderer behind the selector and compared on the same scenes,
  instead of being a rewrite. It is also the vision's "plugin-first" principle applied to rendering.
- **Two judgment calls inside the owner's instruction.** Inspecting is not editing: hover and click
  to read a part's pins and values stays. Driving the simulation is not editing the design, but it
  moves off the canvas to the shell's pins panel and to commands, as in the web IDE. *Cost if wrong:*
  clicking a 3D input node to toggle it is pleasant; it can return as a shortcut that emits `setInput`.

## 5. Working rules

1. **Replace, switch, delete — per capability, and no frozen code.** The new path is built beside
   the legacy one and never imports it. As soon as a capability's replacement is the default, the
   legacy machinery it replaced is deleted, so the old tree shrinks continuously instead of sitting
   there to be worked around. Until its turn comes, legacy code gets no new work and no refactoring:
   don't improve what is about to be removed.
2. **Guards before moves**, and a guard prefers false negatives: a gate that cries wolf makes agents
   argue with it.
3. **Characterization before change, in its own earlier PR** — including what the legacy renderer
   draws today, recorded before anything replaces it. In a controlled study 19–35% of LLM refactorings
   changed behaviour and about 21% of those passed the existing tests. Its models were CodeLlama,
   Codestral, StarChat2, Qwen-2.5, Olmo-3 and GPT-4o — none current — so treat the rate as an upper
   bound and the mechanism as real.
4. **A refactor PR does not modify existing test files.** Mechanise it after Phase 1.
5. **One atomic change per PR; interface moves go expand → migrate → contract.**
6. **A throwaway spike before each wide change**; the list of what broke becomes the issue list.
7. **Deletion PRs are as large as they need to be** (owner, 2026-09-21). The line budget does not
   apply to a PR that only deletes, plus the import fix-ups the deletion forces. It must be green on
   all five gates, remove one coherent consumer group, and add no behaviour.
8. **Design first still holds.** Surface code lands after its ADR. One recorded exception: #208's
   hand-written read-only MCP tool goes ahead of #209's ADR because it is engine-only — and it is
   disposable, to be regenerated once #209 decides tool names, count and schema generation.

## 6. The ordered queue

Exit tests are commands. Existing issues are re-used, not re-filed.

**Phase 0 — Guards, a baseline, and the surfaces work that is already unblocked**
- 0.1 `dependency-cruiser` (18.x; the one tool with a native shrink-only baseline): the layer rules,
  no cycles, no `three` / React / Zustand / DOM / `console.*` in the engine, `src/utils` scanned too.
  Today's 16 edges, 3 cycles and 8 test-only violations recorded as known, shrink-only. Wired into
  `pnpm run lint`. Its violation count is the plan's one tracked metric.
- 0.2 Vitest `projects`: a `node` project with its own setup file, shipping with the ~36 files that
  already pass; `jsdom` for the rest (#323 — merged the same day: 66 files, 1,583 tests, 5.3 s, totals
  unchanged). A partial fix for the load timeouts in #313.
- 0.3 `scripts/blast-radius.mjs` from the audit's script, and the triage rule that uses it.
- 0.4 The gate (§7).
- 0.5 **A baseline of what the legacy renderer draws** (rule 3): #217's `describe()` and goldens for
  a few reference circuits, so the new pipeline's output can be diffed against something.
- 0.6 **Surfaces, now.** Nothing on the compile → run `.tst` → truth-table path touches a blocking
  area. So: #279 (scenario ids and drivers) → #204 (`hacer test <hdl> <tst> <cmp>`) → #205 (CLI
  run-tst and the cli scenario driver) → #208 (read-only MCP tool, disposable). These import
  `core/hdl`, `core/testing` and `core/chips`, never `@/store`. None is `agent-ready` today; this plan
  makes them so. The scenario suite is the capability matrix — scenario × driver — so no matrix file.
  #210 is a spike whose deliverable is a note; the layout implementation is a new issue after it.
- 0.7 #315 lands (the renderer selector the new path ships behind; its ADR-0019 merged on
  2026-09-21). A `merge=union` attribute for `docs/harness/ledger.md`: two PRs hit the same append-at-end
  conflict on 2026-09-21.
- 0.10 **Testing groundwork** (`TESTING.md` §5): the `HTMLCanvasElement` patch moves out of the
  shared test setup into the jsdom project's own; explicit timeouts on every wait (#313); delete the
  43 dead `e2e/` helper exports and add a no-dead-export check; Playwright's `testMatch` narrowed to
  `*.spec.ts`; `verifier-brief.md` gains "read the PR's own CI logs".
- 0.9 The rendering R&D role: its brief, its inbox, the first research note and the CI benchmark (§9a).
- 0.8 **Delete what is already dead**, now, since nothing depends on it: the render tracker that has
  counted zero for some time and the e2e wait helpers with no callers (#321; a PR repairing those
  helpers, #322, was closed in favour of deleting them), the unconditional
  `console.*` calls in `wiringScheme`, and anything the testing audit shows is never exercised.
- *Exit:* `pnpm run lint` fails on a new cross-layer import; `vitest --project node` is green;
  `hacer test` runs an official vector from the command line.

**Phase 1 — The engine is provably headless** (small radius; the loop's next real `src/` PRs)
- 1.1 Completed-chip tracking moves out of the engine into session state. (It is 24 lines whose
  `localStorage` access is already guarded; a storage port would be the wrong fix.)
- 1.2 #181: `deserialize` returns warnings as data and stops importing store actions and `notify`;
  the 7-file cycle closes. It survives the whole plan as the importer's private reader of version-1
  documents, and it gains version dispatch — today it throws on any version but 1.
- 1.3 `multiBitFormat` moves out of `components/ui`.
- 1.4 `src/core/index.ts` and `src/simulation/index.ts` are created (neither exists), with a
  node-project test that imports both.
- 1.6 **The held-out oracle** (`TESTING.md` §5): the official Project-1 `.hdl`/`.tst`/`.cmp` vendored
  from `web-ide` (MIT, attributed) into a protected path, asserting the 16 transcriptions match; the
  dev-only differential harness against `web-ide/simulator`, one CI job; #151's tamper flag extended
  to both and to characterization goldens.
- 1.5 After this phase: the `pr-hygiene` rule that a refactor PR may not modify existing test files,
  and ESLint bulk suppressions for function length (ESLint ≥ 9.24; the repo is on 9.39).
- Dropped from version 2: injecting a clock into `serialize.ts`, which only writes the legacy format.
- *Exit:* zero known violations on the engine rules.

**Phase P — The ADR and its spike** (design first; beside Phase 1)
- P.1 **ADR: spec-only writes, read-only projections.** It decides the spec's edges and the sidecar
  (§4); freezes the **capability list** the default switch is judged against, with its non-goals
  named (hand-chosen positions and wire paths are dropped); supersedes or amends ADR-0007, ADR-0008
  and ADR-0009; absorbs the scope of #188, #189, #190 and #217; records the alternatives in §9 with
  their costs; says what "prompts" means in the product (in-app assistant, MCP or both — no model
  call in the engine); and states that both renderers are first-class — 3D is the showcase and a
  differentiator, 2D may land first as the quickest proof, never instead of it. The vision, roadmap, north-star and
  portfolio documents that describe building by hand change in the same PR.
- P.2 **Spike**, throwaway, no PR: import real version-1 documents — junction chains, the malformed
  loops the evaluator guards against, mixed widths, `'bus'` endpoints — starting from the unused net
  model in `wiringScheme/branching.ts` (`Signal`, `signalId`) and from #168 (canonical HDL printer and
  round-trip property), which is this work already filed; name a 3D placement algorithm and measure a
  16-part chip headless; compare automatic layout's edge routing with the legacy router's primitives.
- P.3 The backlog sweep, with a count: 13 of the 15 open `project:spine` issues are interactive UI
  work (#167, #169–#174, #235, #236 among them) and only #175 is `agent-ready`, so the spine row
  pauses for re-scoping as spec → render rather than "continuing as data".
- *Exit:* the ADR is accepted; the spike's break list exists as issues.

**Phase N — The new path, and the deletions it earns** (N.1–N.3 need nothing from Phase 1 and may
start as soon as P.1 is accepted; each step that replaces a legacy capability is followed by the PR
that deletes it)
- N.0 **The six mesh components become prop-only and store-free** (`BaseGate`, `InputNode3D`,
  `OutputNode3D`, `BusSplitter3D`, `BusJoiner3D`, `Wire3D` with `deriveWire3DProps` — 985 of the 3D
  tree's 2,156 production lines, all importing the store and gesture state today). Six PRs, expand →
  migrate → contract. Both renderers then share one mesh layer instead of forking it, and the 3D
  view's visual quality carries over intact. This is the one place the plan refactors legacy code,
  because these components are kept, not removed.
- N.1 The spec model in `src/core`: parts, nets, sidecar; `fromHDL` / `toHDL`; versioned from day one.
- N.2 `fromLegacyCircuit`: a one-way importer, fixtures from P.2, evaluation parity as its test.
  Parity is asserted against a **structurally traced** legacy evaluation — a junction's feed wire
  found by structure, never by `junction.wireIds[0]` — because the positional trace read a
  branch-first junction as floating, so a *correct* importer would have failed the test (#356, now
  fixed in `topologicalEval`; any parity figure measured before that fix has to be re-taken).
- N.3 The spec evaluates through `compileHDL` — one engine.
- N.4 `layout`. · N.5 `route`, with ADR-0008's assertions as properties. · N.6 `describeScene`, with
  goldens in Node, diffed against 0.5's baseline.
- N.7 The new store, with the bridge and undo decisions from the ADR.
- N.8 **The read-only 3D renderer** on the shared meshes, behind the renderer selector, with the
  `@react-three/test-renderer` suite pointed at it. This is the product's showcase and keeps its
  place as such; composite and hierarchical chips in 3D (#172) are where its next effort goes.
- N.9 **The 2D SVG renderer** of the same scene description (#211's first stage). It is small, it is
  testable under jsdom and in a canvas-less browser on the owner's laptop, and it is usually the
  quickest end-to-end proof of the pipeline — so it may land before N.8 finishes, never instead of it.
- N.10 Commands over the spec — `addPart`, `removePart`, `connect`, `disconnect`, `setInput`, run,
  step, reset — shared by the shell, the CLI and MCP; the first mutating MCP tools arrive here.
- N.11 The shell: a spec editor, a pins panel, an inspect panel — DOM only, locally testable.
- *Exit:* one scenario runs green through three drivers (CLI, MCP, a rendered view), and an imported
  legacy circuit renders in 3D with every ADR-0008 property holding.

**Phase C — Switch, and finish deleting**
- C.1 **Gate, as a command:** every scenario in the ADR's capability list passes through the spec
  path. Then the default renderer switches and legacy documents import on load.
- C.2 **Delete everything the new path replaced** that was not already deleted along the way: hand
  wiring and junction entities, drag and placement, previews and gesture state, the legacy store
  slices and evaluator, the gesture e2e specs. By consumer group, each PR as large as it needs to be.
  `deserialize` stays, as the importer's reader of version-1 documents. The UI tour is rewritten for
  the read-only app, a `critical` change needing cloud browser QA under ADR-0016.
- *Exit:* `CircuitState` and `junction` no longer exist in `src/`; the known-violations file is empty.

**Deferred:** workspace packages until a second renderer ships; per-module `AGENTS.md` files; an API
report; a TypeScript 7 upgrade.

## 6a. The plan as issues

Filed 2026-09-21 under the tracking issue #318, label `project:foundation`. Existing issues were
re-used rather than re-filed; an issue pulled forward from another row keeps that row's label too.
`node scripts/backlog.mjs ready` is the live list — this table is the map, not the state.

| Plan item | Issue | Note |
|---|---|---|
| 0.1 layer rules as a ratchet | #329 | the plan's one tracked metric |
| 0.2 Vitest `node` project | #323 | merged (PR #324): 66 files, 1,583 tests, 5.3 s |
| 0.3 blast radius + triage rule | #333 | |
| 0.4 the gate (§7) | #330 | build first: until it lands a foundation-only issue has no portfolio row |
| 0.5 characterization baseline | #331 | before anything is replaced — the only irreversible step |
| 0.6 surfaces, now | #279 → #193 → #204 → #205 → #208; #210 | #204's blockers re-pointed (#185, #181 removed; #193 added) |
| 0.7 renderer selector; ledger | #315, #316; #334 | ADR-0019 merged |
| 0.8 delete what is dead | #321, #332 | #317 and PR #322 closed in favour of deletion |
| 0.9 rendering R&D | #325 | standing role (§9a) |
| 0.10 testing groundwork | #335, #313, #332, #334 | |
| deletion PRs exempt; evidence excluded | #326 | needed before the first large deletion PR |
| 1.1 chip completion out of the engine | #182 | re-scoped: moved out, not injected |
| 1.2 `deserialize` returns data | #181 | gains version dispatch |
| 1.3 `multiBitFormat` | #180 | |
| 1.4 engine entry points | #336 | |
| 1.5 refactor-PR rule; function length | #339 | deliberately after Phase 1 |
| 1.6 held-out oracle | #193, #338, #151 | vectors, differential harness, tamper flag |
| P.1 the ADR | #327 | absorbs #188, #189, #190, #217 (held) |
| P.2 the spike | #328 | its break list becomes the Phase N issues |
| P.3 backlog sweep | #340 | every open issue, once |
| Phase N, Phase C | not filed | the ADR and the spike produce them — filing now would pre-empt both |

Held, each with the reason on the issue: #183, #185, #186 (refactoring legacy code scheduled for
deletion — rule 1), #184 (kept code, but the ADR names its module), #188, #189, #190, #217.

## 7. The gate — per area, and it amends the portfolio's pick rule while it lasts

`docs/portfolio.md` rule 2 is `surfaces → harness → spine → aux → surfaces → harness`, set on
2026-09-18 when the owner said process work had equal priority. His 2026-09-21 instruction —
foundation first, process alongside — amends it until the default switches, and the portfolio says so.

- **Rotation:** `foundation, foundation, harness, foundation, spine, aux`. A rotation of only
  `foundation` and `harness` would not deprioritise the other rows, it would erase them:
  `scripts/backlog.logic.mjs` derives its bucket order from the rotation and files anything outside
  it as `on-request`. `foundation` joins `DESIGN_FIRST_SLUGS`, or the ADR this plan waits on loses
  design-first priority in its own slot. `backlog.logic.test.mjs` asserts both literally, so this
  change edits an existing test on purpose and says so.
- **Labels:** this plan's own issues carry `project:foundation`. The Phase 0.6 surfaces issues keep
  `project:surfaces`, so the surfaces epic's progress and the hand-in-hand rule still count them; they
  are pulled forward as enablers rather than relabelled.
- **Stops outright:** new work on hand editing — wire drawing, junction placement, dragging,
  previews, and polish or fixes whose only beneficiary is that machinery. A bug that corrupts
  evaluation is still fixed in the evaluation layer, as #312 was.
- **Waits for the ADR:** anything that changes `CircuitState`, a store action's signature or the
  serialization format; most of the spine row.
- **Mechanism:** the safe-to-proceed test is a `planReady` filter over `risk:2` — the label that
  already marks store, UI, R3F and architecture paths — rather than a second label.

## 8. Testing — reconsidered from the record, not from doctrine

The owner: "we need to completely reconsider our testing approaches also … are the existing e2es
optimal? Is there a better, more robust and faster testing approach?" The full audit is `TESTING.md`;
this is what it found and what follows.

**What has actually found defects here.** Sixteen real defects have a traceable discovery path.
Found by: a fresh-context verifier writing a repro and running the real thing, **7**; a person
looking, 3; an agent reading code, 3; an automated reviewer, 1; the `@store` browser suite, 1 (#312);
the unit suite, the scene-graph layer, the type checker, lint, `@ui` and the tour, **0 each**. The
unit suite's ~2,000 tests are why 38 of 38 scored CI runs are green — that is regression prevention
and it is real — but nothing in the record was *discovered* by an automated layer except #312, and
#312 was store-and-engine behaviour a Node test could have reached.

**What it costs.** CI is 158 s at the median. The unit step is 84 s, of which **running tests is
16.6 s**: over 80% is standing up jsdom and the import graph for every file. `browser-qa` executed
Playwright **twice in its last 40 runs** (24 were cancelled by concurrency churn); the UI tour
workflow has never run. #324 already shows the other side: 66 files and 1,583 tests run headless in
5.3 s.

**What the browser suites test.** 31 spec files, 114 static cases. **41 (36%) test a hand-editing
gesture and lose their subject; 40 (35%) are engine or store logic that belongs in Node; 28 (25%)
are DOM-shell behaviour a canvas-less browser can run on the owner's laptop; 5 (4%) are genuinely
about pixels or the 3D canvas.** All 43 store actions the `@store` suite drives are already named in
unit tests. And **43 of the 96 helper exports in `e2e/` (45%) have no caller anywhere** — the same
rot as #317 and #321, which nothing detects.

**The oracle nobody was using.** HACER's hand-transcribed Project-1 vectors match upstream 15 of 15.
The reference simulator in `../web-ide/simulator` has no DOM references at all, and the audit built a
differential harness against it in a temp directory: all 15 official vectors in **81 ms**, and it
correctly rejects the stub HDL 15 of 15. Two frictions, both solved: the packages are private, so
they are vendored as a dev-only harness that `src/` never imports ("adapt, don't couple"); and one
transitive dependency must be pinned (`@davidsouther/jiffies` 2.2.5 — 2.3.0 ships almost no `.js`).

**The target: a pyramid, almost entirely small tests**, because the read-only architecture makes
almost everything a pure function — and because layers 1–4 run in seconds on a 2019 laptop while
5–6 cannot run there at all.

| # | Layer | For | Runs | Budget | Oracle |
|---|---|---|---|---|---|
| 1 | Node unit + property tests | engine, spec, commands, store | locally, every save | under 10 s | assertions and `fast-check` properties |
| 2 | Official-vector conformance | nand2tetris semantics | local and CI | under 1 s | vendored `.tst`/`.cmp`, protected |
| 3 | Differential against the reference simulator | "is ours the same machine?" | CI and on demand | under 30 s | `web-ide/simulator`, vendored and pinned |
| 4 | Scene-description goldens | `layout`, `route`, `describeScene` | Node, inside layer 1 | in the 10 s | ADR-0008's seven assertions as properties |
| 5 | Canvas-less browser | the DOM shell | **locally** (#315, #316) | under 60 s | DOM roles and bounding boxes |
| 6 | 3D smoke and the tour | the canvas mounts; the product role's eyes | cloud only | 3 min | `describe()` (#217); screenshots for people |

The properties are named function by function in `TESTING.md` §2.1 — round-trips for the HDL parser
and printer, evaluation preserved by the importer, an undriven input reads 0 (#312 stated once, as a
law), no overlap and determinism for `layout`, lane exclusivity and endpoint connection for `route`,
a shadow model for commands. `fast-check` works with the repo's Vitest as it is; CI must pin its seed.

**How tests defend against the agents that write the code.** A passing suite is a weak oracle:
outside studies found about 30% of test-passing agent patches behave differently from the correct
one. So: the vectors and the differential harness live on a **protected path no implementer may
edit** (#151's tamper flag, extended); the verifier's repro stays the highest-yield layer and gains
one numbered step — read the PR's own CI logs, the only thing that caught #312; characterization goes
in its own earlier PR. **Mutation testing stays removed**: Stryker still has no diff-only mode, and
ADR-0011's reason stands. **Pixel diffing stays rejected**, now with Playwright's own warning that
rendering varies with OS, hardware and even power source. **No quarantine list**: there is nothing
to quarantine (0 CI failures re-run to green), and building one early invites masking real races;
instead, every wait gets an explicit timeout, since none has one today.

**What must be captured before the legacy app is replaced, because it is unrecoverable afterwards:**
the rendered-geometry behaviour ADR-0008 protects, as golden data from today's app for the circuits
that ADR names (noting that B-004b is still open and the old oracle shares its blind spot, so the
golden must not enshrine it); evaluation results on fixture circuits, including junction chains,
guarded loops, mixed widths and bus endpoints; and the 43 store actions the browser suite drives, as
Node fixtures, before `CircuitState` changes.

The audit's ordered issue list (`TESTING.md` §5) is merged into the phases of §6.

## 9. The alternatives, with their costs

| | What it is | Cost | Status |
|---|---|---|---|
| **A. Replace, switch, delete** (this plan) | Build the spec path; delete each legacy capability as soon as its replacement is the default; finish at the switch. Deletion PRs any size | The plan's largest diffs are deletions; the switch needs a checkable capability list (the ADR freezes it) | **Default — the owner's decision** |
| B. Freeze and build beside (version 3) | No new work on the legacy canvas, no deletion; decide later | About 6,000 frozen lines and their suites stay in CI and the bundle, and every agent works around them | **Rejected by the owner, 2026-09-21:** "working around a frozen code is hell … anything that should be removed should be removed" |
| C. Keep hand drawing as a client of `connect` | The gesture stays, but emits commands and stores nothing | Keeps the gesture state machine, junction placement and the `@ui` suite alive — most of what is being removed | Reopenable later through the sidecar and the command API, as the owner said |
| D. Refactor the legacy state layer in place (version 1) | Store factory, `.position` migration, notify-to-results, on the legacy code | Wide changes to code that is being removed | Rejected: it improves what is being retired |

## 9a. Rendering R&D — a standing workstream

The owner asked for continual research into 3D browser rendering suited to a product that AI agents
build: today's rendering may not be optimal and the libraries may not be the best for the job. It
becomes a standing role beside the fidelity role (engineering truth) and the product role (usability):

- **What "AI-suited" means here**, so the research has a target: a declarative scene an agent can
  generate, diff and inspect; rendering that is deterministic enough for golden and visual-regression
  tests; behaviour that is measurable in CI (frame time, draw calls, memory on reference circuits),
  since it cannot be measured on the owner's laptop; and a renderer that can be swapped or run
  side by side for comparison.
- **A first research note** before N.8 commits to anything: the state of 3D on the web in 2026 for
  this workload — three.js and React Three Fiber against the alternatives, the WebGPU path,
  instancing and levels of detail for large and hierarchical chips, text and wire rendering,
  headless and software rendering for tests — with dated sources and a recommendation per question.
- **A benchmark in CI**, riding the existing cloud UI-tour workflow: a few reference scenes, a few
  numbers, tracked over time. Without it "is the rendering getting better" has no answer.
- **A cadence**: change-triggered (a major release of the libraries in use, a new reference scene,
  a regression in the benchmark) and a periodic sweep. Improvements inside the renderer are filed as
  issues by the role itself, capped like the product role's; a change of library or approach is an
  ADR and the owner's decision.

## 10. Keeping it maintained

- The ratchet is in the definition of done, so decay fails a PR. Its violation count is the one
  number tracked; `depcruise`'s exit code already reports it.
- The layer rules apply to the new path from its first file; it never accumulates a baseline.
- A fresh-context architecture review at each phase exit, against that phase's exit test.

## 11. What would change this plan

- The spike cannot name an automatic 3D placement that reads acceptably for a 16-part chip: the plan
  invests in one — a purpose-built layered 3D placement, or layout hints in the sidecar — rather than
  demoting the 3D view, which is a differentiator.
- The importer cannot reach evaluation parity on real documents: the default does not switch.
- New-path PRs on `src/` fail their verifier more than about one time in three: slow down and look
  at the loop, not the code.
- The owner wants hand editing back: it returns as alternative C, writing to the sidecar and
  emitting commands, not as state.

## 12. Limits

- Blast radius is "files that directly import the seed files", a proxy; spikes give the real graph.
- Outside benchmarks are mostly Python, single-attempt and verifier-free. Several sources postdate
  the coordinator's training data; the first review fetched and confirmed the five the plan leans on.
- Nothing here measures who uses hand wiring today or what a spec-only model costs a learner.
- The unit suite was not timed locally, to keep load off the laptop; GitHub Actions wall-clock for
  install, lint, test and build is 2m09s–2m41s.
- This plan was reviewed twice by fresh-context agents and not a third time: the ADR (P.1) gets its
  own review, and the spike tests the riskiest assumptions directly.
