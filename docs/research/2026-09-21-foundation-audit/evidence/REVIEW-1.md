# Adversarial review — foundation audit + plan (REPORT.md)

**Verdict: sound with corrections.** The diagnosis — state layer is the problem, engine nearly clean — survives. Three load-bearing premises do not:
the claim that the state layer cannot be tested headless is measured wrongly and inverts Phase 2's priority; Phase W deletes `JunctionNode` across 47
production files without computing that blast radius; and §3b delays by a phase the CLI and read-only MCP work that is already unblocked today. §3a's
"24% of production lines" is arithmetically right and rhetorically misleading.

Re-derived at `origin/main` `6e6e636` in a throwaway detached worktree (removed), Node 22.19.0.

## Fact-check

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `store/types.ts` fan-in **59**; `circuitStore` **40** direct importers | confirmed | `metrics.mjs` rerun: `["src/store/types.ts",59,448]`, highest in repo; 43 non-`.test.` matches minus 3 `src/test/` helpers the script classes as test |
| 2 | **16** cross-layer edges, **3** cycles; 6 spot-checked by file:line | confirmed | `layers.mjs` rerun: 16 prod (4 type-only), 8 test-only, same 3 cycles. `deserialize.ts:2,3`, `pinHelpers.ts:1,3,4`, `wiringActions.ts:6` all exact |
| 3 | **21 of 21** store tests reach a DOM; **18** via `pinHelpers.ts:1 → three` | **wrong in substance** | `import('three')` succeeds in plain Node. With `environment:'node'`, `setupFiles:[]`, **36 of 42** files / **722 of 761** tests across `src/store`+`src/core`+`src/simulation` pass **today** in 3.68 s; **16 of 21 `src/store` files pass**. The 6 failures are `localStorage`, not `three` |
| 4 | `pinHelpers` uses `three` only for `Vector3` + Euler; the three layout modules are pure | confirmed / **partly** | 13 occurrences, 4 functions, all `new Vector3` / `new Euler(…,'XYZ')` / `applyEuler` — but `applyEuler` goes via quaternion, so plain math is **not** bit-identical and goldens need an epsilon. `chipBodyLayout.ts:1` imports only `core/chips/types` ✓; `busBodyLayout.ts:1` imports `@/store/types`; `calculateNodePinPosition` sits in `nodeConfig.ts:110`, whose module imports `@/theme` |
| 5 | Three `src/core` effect sites, `src/simulation` zero; **0** tests assert id shape | confirmed | `chipCompletion.ts:7,21`, `deserialize.ts:1`, `serialize.ts:99`; no `toMatch`/`toContain`/`startsWith` on an id in `src/` or `e2e/` |
| 6 | **7** identical private `generateId()` copies | **partly wrong** | 7 sites share the format; only 2 are a function named `generateId` (`signalActions.ts:27`, `junctionPlacementActions.ts:35`), 2 are `generateNodeId`, 1 `generateBusId`, 2 are inline literals at the use site (`gateActions.ts:34`, `wireActions.ts:121`) |
| 7 | **1 of 41** PRs since 2026-09-18 touched `src/` | **stale** | now **2 of 42**: #238 and #312, the latter merged `2026-09-21T10:53:35Z`, 46 min after the measured commit. REPORT §6 cites #312 itself |
| 8 | `.position` in **50 files / 212 sites**; blast radius #188 = 86 (59), #315 = 4 (1), #217 = 2 (1) | confirmed | 212 occurrences, 50 files — but **~116 sites are in test files** (27 prod files, 96 prod lines). `blast-all.mjs` rerun identical |
| 9 | Wiring **5,406** prod / **8,431** test lines, router 3,640, hand 1,766; ~58 of 82 `notify` in `wiringActions`; `CircuitState` 32 fields / document 6 | confirmed exactly | 3435+205+965+258+543 = 5406; 5146+569+1546+572+598 = 8431; 58 `notify.` calls; `CircuitDocument` already exists as a `Pick<>` |
| 10 | "the five `@ui` e2e specs … that drive hand wiring"; 34 e2e files on `window.__CIRCUIT_*`, 4 `src/` | **wrong / close** | `e2e/specs/wiring/` holds 6 files: **one** `.ui.spec.ts`, **five** `.store.spec.ts`, only 1 tagged `@ui`. Window contract: 36 e2e files, **3** `src/` files |
| 11 | §3 "Engine entry points: `src/core/index.ts` and a new `src/simulation/index.ts`" | **wrong** | `src/core/index.ts` does not exist either; F1 §8's "3 via index" counts the `serialization` and `testing` sub-barrels. 1.5 must create both |
| 12 | dep-cruiser `--baseline-mode shrink-only`; ESLint suppressions ratchet by default; Vitest `projects` | all confirmed | primary docs: "'shrink-only': makes --baseline only _remove_ existing violations"; "the rule will be enforced for new code, the existing violations will not be reported" (only `"error"` rules); `projects` replaced `workspace` in 3.2. Repo on eslint `^9.39.1`, vitest `^4.1.2` ✓ |
| 13 | SWE-bench-Live 48% / <10% at 3+ files / never at 7+ | confirmed | present in the v2 **full text**, not the abstract |
| 14 | 19–35% non-equivalent, ~21% undetected · SWE-Refactor 39.4% compound · METR 24.2 pp | confirmed / confirmed / **partly** | arXiv 2602.15761 verbatim — but its models are CodeLlama, Codestral, StarChat2, Qwen-2.5, Olmo-3, GPT-4o, none frontier-2026. arXiv 2602.03712 — the **atomic** rate is not in the abstract, so rule 4's contrast is unquantified. METR page says "about **24** percentage points (SE 2.7)"; drop the ".2" |
| 15 | §3b "After Phase 1, a thin CLI and read-only MCP … are safe to start" | **too cautious** | safe **now** — surfaces lens (b) |

**Could survive losing:** the SWE-bench-Live, SWE-Refactor and METR numbers; the small-PR rule is already the repo's own convention. **Load-bearing:**
the 19–35% / 21% refactoring study — §4 rules 2 and 3 exist only because of it. It holds; state its model set.

## Findings, by how much they should change the plan

**1. The headless-test premise is measured wrong; it re-orders Phases 0.2 / 1 / 2.** §2 calls the state layer blocking partly because "18 of 21 store
test files reach a DOM through that one import", and 2.5 waits for `three` to leave `pinHelpers`. Measured (row 3): 16 of 21 store test files already
pass in `environment:'node'` with no refactor. The actual blocker is `src/test/setup.ts:43` — `HTMLCanvasElement.prototype.getContext` at module
scope, applied to every test by `vite.config.ts:38` — which neither F1 nor REPORT mentions. **Edit:** 0.2 gives the `node` project its own
`setupFiles` and ships covering ~36 files including 16 store files; delete 2.5's "18 of 21 expected" and Phase 2's "≥18 store test files run in
`node`" exit clause, leaving the layer rule as Phase 2's only exit. §1 must stop implying Phase 2 gates headless tests. This also cuts jsdom and
`userEvent` out of 36 files — the cheapest argument for 0.2 and a partial fix for #313.

**2. Phase W deletes `JunctionNode` across 47 production files and never measures it.** `junction` appears in 47 prod files (92 with tests): both
evaluators (`topologicalEval.ts`, `truthTable.ts`), all three serialization files, `NodeRenderer`/`JunctionNode3D`, `wireSharing.ts`,
`wirePosition.ts`, `labelGeometry.ts`, `deriveWire3DProps.ts`, and eight store slices including `gateActions`, `busActions`, `busPlacementActions`,
`persistenceActions`. That is larger than #188's 59 prod direct importers — the number the plan uses to call #188 unlandable in one step. **Edit:**
run `blast.mjs` with `JunctionNode`/`junctions` as seeds and add the row to §1 before W is scheduled; W.8 is one bullet covering the largest diff in
the document and must split by consumer (evaluator / serialization / render / store), expand→contract per slice.

**3. The router is order-dependent by construction, so "keep the router" is a rewrite, not a move.** `calculateWirePath(…, {existingSegments})` routes
against wires already placed; `resolveCrossings(newWireSegments, existingWires)` gives the *new* wire the hop. `wiringScheme/types.ts` says so itself:
"The other residual is order-of-construction: a transit routed *before* its target chip's backbone exists has no backbone to avoid yet and falls back
to the pre-existing greedy reject-and-reroute." `route(nets, placements)` is deterministic only by fixing a canonical net order and routing in one
pass — changing geometry for every existing circuit and invalidating 5,715 lines of router tests written against the incremental API. **Edit:** W.5
must say the control flow is replaced and goldens re-baselined, and name the canonical order (stable — e.g. sorted by driver id — since insertion
order leaves the document). Name the skipped cost too: derived routes mean every gate move re-routes, and ADR-0007 already flags "budget the
visibility-graph pass for real-time drag".

**4. Evaluation parity is not a sufficient oracle — this repo proved it — and W silently supersedes two accepted ADRs it never names.** §3a: "The
oracle for this change is strong, which is why it is safe to attempt." ADR-0008's Context says the opposite, from here: "a routing fix (B-003/B-004,
PR #128) passed 1490+ unit tests while a render-level merge hole survived to adversarial review. A transit wire's path in the store was correct, but
the rendered geometry collapsed wires onto a shared track. No existing test layer could catch this class of bug." Parity catches nothing about
rendered geometry, lane exclusivity, hops, selection, undo or the tour — and ADR-0008 makes that scene-graph suite a DoD enforcer built on *stored*
segments. ADR-0007 commits to "a gridless orthogonal-visibility-graph router with A* + a nudging/segment-sharing stage… reached via a staged roadmap",
Stages 2–4 outstanding; W freezes Stage 1 and re-shapes the entry point silently; ADR-0009 (`'bus'` WireEndpoint) is in scope once nets carry widths.
**Edit:** gate W's exit on `routingScene.test.tsx` (all 7 assertions), write W.1 as explicitly superseding/amending ADR-0007 and ADR-0008, and add all
three to §3a's "weigh" list.

**5. "24% of production lines" overstates what W removes by ~3×.** §3a keeps the router — 3,640 of the 5,406 lines (67%). Actually deleted: **1,766
prod lines, 7.8% of production**, plus part of 26 UI files; 5,715 of the 8,431 test lines are the router's and stay (or are re-baselined — finding 3).
**Edit:** "1,766 production lines of interaction machinery (7.8%), plus junction entities across 47 files; the 3,640-line router stays and is
re-pointed." The honest case for W is the state-shape case, not the line count.

**6. Four of the ten blast-radius rows measure ADR-only issues as code changes.** #188, #189, #190 and #210 carry `research` and name
`docs/decisions/**` or `docs/harness/spikes/**` as "Files likely touched"; #188's verification command is `ls docs/decisions`. So §1's central
sentence — "Four coming changes — #186, #185, #188, #189 — have 84 to 105 files directly importing what they change" — is half wrong: two of the four
produce documents. **Edit:** split the table into "issue as written" vs "the implementation it authorizes", and re-word §1 to "#186 and #185 are wide
today; #188 and #189 are ADRs whose implementations would be."

**7. The gate contradicts the portfolio pick rule and is not mechanisable as described.** `docs/portfolio.md` rule 2 is `surfaces → harness → spine →
aux → surfaces → harness`, carrying the owner's 2026-09-18 reason: "the process ironing and other auxiliary items are of equal priority." "Two of
every three slots" replaces it and starves `spine` (the 0.5→0.7 ladder), `surfaces`, `bugs` and `upkeep`. Mechanically: `backlog.logic.mjs:14`
`PICK_ROTATION` is keyed to **portfolio row slugs**, filed by `project:<slug>` or parent epic (`portfolioRowOf`, `:49`) — a bare `foundation` label
picks up nothing; and `foundation-safe` cannot live in `unpickableReason` (`:60`), which sees one issue at a time, so it belongs in `planReady`
(`:129`). `risk:2` ("store / UI / R3F / architecture / harness paths") already labels most of what it would exclude. **Edit:** 0.6 becomes — add a
`foundation` portfolio row + epic + `project:foundation` label; set `PICK_ROTATION` to `['foundation','foundation','harness']` while non-empty;
express `foundation-safe` as a `planReady` filter over `risk:2`; state in §6 that this supersedes portfolio rule 2, and why. Also **#316 is not
`agent-ready`**, so "may proceed now" is false for it as the backlog stands.

**8. There is no serialization migration mechanism.** `CIRCUIT_FORMAT_VERSION = 1`, and `deserialize.ts:134` throws on any other version; nothing
dispatches on version, yet W.7 and 4.4 both assume a bump with migration. User circuits live in `localStorage` (`hacer-circuit-*`, `__autosave__`) and
as exported JSON in the wild. **Edit:** add a step before W.7 — "`deserialize` dispatches on version; v1 migrates forward; a v1 fixture round-trips" —
and note it lands in the file #181 rewrites at 1.3, so 1.3 should leave the seam.

**9. A net model already exists, unused, in the module the plan keeps.** `wiringScheme/branching.ts` defines `Signal { source, destinations[] }`,
`createSignal`, `addDestinationToSignal`, `hasFanOut`, `getSignalsWithFanOut`, `calculateJunctionPosition`, `generateBranchSegments` — ~220 production
lines whose only consumers are two test files; `Wire.signalId?` and `JunctionNode.signalId` already carry a net reference. **Edit:** W.2 must start
from `branching.ts` and `signalId`, and W.3 must say whether `deriveNets` subsumes or replaces `Signal`, or the plan adds a third net abstraction. W.2
must also list the derivation's hard cases — junction **chains**, the "malformed junction loops" the evaluator already guards, mixed `Wire.width`,
`'bus'` endpoints (ADR-0009) — since those are where a derivation silently drops a connection and evaluation parity still passes.

**10. Two smaller collisions.** (a) Phase 4.3's "the 212 `.position` sites migrate in slices" — ~116 are in `*.test.*` files and §4 rule 3 forbids a
refactor PR from touching existing test files; give the split (96 prod lines, 27 files) and carve test-site migration into its own non-refactor PRs.
(b) `effects.sh` never scans `src/utils`, which W moves into a "pure" `src/geometry`: it holds **33 `console.*` calls**, ~31 in
`wiringScheme/crossing.ts`, including unconditional `console.log` inside `resolveCrossings` and `detectCrossings`, on every wire creation. Add
`src/utils` to §5, add "no `console.*` in the engine" to 0.1, have W.5 strip them.

**11. Over-engineering.** Keep 0.1, 0.2, 0.4. Cut or defer: the second label (`foundation-safe` — reuse `risk:2`); `foundation-metrics.md`'s seven
columns on a change trigger *and* monthly (the depcruise `err` exit code alone already answers "is it improving", free); the per-module `AGENTS.md`
set (§7's own research says a linter-enforced boundary needs one line, and 20 directories is 20 files to keep true); 5.4's API report (defer to its
stated trigger in #189). 0.5 could follow Phase 1 with no loss.

**12. Unnamed risks.** (a) **React Compiler** is on as an ESLint *error* (`eslint.config.js:32`); a store factory reached through context changes read
patterns it must still memoize — Phase 3 needs a line. (b) **`test/testUtils.ts` co-changes with `store/types.ts` and `circuitStore.ts` 9 times each**
(F1 §6) — third vertex of the repo's strongest co-change triangle, absent from the plan. (c) The **8 test-only layer violations** are never scheduled;
0.1's baseline freezes them silently. (d) **#317** — `render.waits.ts` swallows its own timeout, so a scene wait that times out passes — is an open
false green in the oracle the plan relies on, and the gate pushes it behind foundation work. (e) Immer patches (5.1) on `gates`/`wires`: "not
guaranteed minimal" means a splice can emit a whole-array replacement — size the history log before committing to patch-based undo.

**13. Writing.** Name the "three call sites from running headless" (§1); give 678 at first use of "the repo's longest function"; qualify "84 to 105
files" as "direct importers, production and test"; say "2m09s–2m41s" is GitHub Actions wall-clock. §3a's "`CircuitState` carries `wiringFrom`,
`previewEndPosition`, four `destination*` fields" — those five live inside `WiringState`; at the top level it is 4 fields, not ~10.

## The surfaces lens (§3b, Phase S)

§3b's central claim — after the refactor a capability is *exposed*, not *ported* — is right, and nets are correctly named its biggest single enabler.
The phase-by-surface table is where it goes wrong: **pessimistic in row 1, optimistic in rows 2–3, W and 4.**

**(a) Three capabilities, traced.** *Run a `.tst`* — already exposable: `core/testing/index.ts` exports `parseTST`, `parseCmp`, `runTest` and
re-exports **nothing** from `chipCompletion`; `engine.ts` pulls only `evaluateChip`; `implementationSources.ts` pulls `appRegistry`, whose only
imports are `./registry` and `./builtins/project01` — no window, no storage. The 3D surface's extra work (`runChipTest` writing
`testResult`/`testColumns` into `CircuitState`, calling `markChipCompleted` → `localStorage`) is surface-specific and need not be ported. *Place a
chip* — `addGate` → `createGateInstance`, which `deserialize.ts:2` **already imports**, so building a document headlessly is half-possible today and
#181 formalises it; but a CLI still needs a *position*, so the Phase 2–3 cell is right about "load and evaluate" and silent that you cannot sensibly
*add* a gate until #210's auto-layout exists. *Connect two pins* — `addWire(from, to, segments, crossesWireIds, …)` takes segments **as an argument**;
the store does not compute them, the 3D handlers do. A headless caller can therefore create connectivity today by passing `segments: []` and get a
document the 3D surface cannot render: the "porting, not exposing" problem in its purest form, and the strongest argument in §3b for nets.
**Optimistic cells:** W / 2D ("a schematic can render the same document") — rendering needs positions from #210 or `layouts['2d']`, so W alone gives
topology; 4 / MCP ("tools read and write the document alone") — writing connectivity needs `connect`, which is W.6; 2–3 / MCP buys read+evaluate.

**(b) "After Phase 1" is one phase too cautious.** Nothing on the compile → run-`.tst` → truth-table path touches a blocking area: `truthTable.ts`
imports only `topologicalEval` and store *types*; `chipCompletion` is imported by exactly two files, `circuitStore.ts:20` and `testActions.ts:11`,
both in the store layer. Measured: 14 of 15 `src/core` test files and all 6 `src/simulation` files pass under `environment:'node'` today, the one
failure being `chipCompletion.test.ts`, which is not on this path. Of Phase 1's five items none is a prerequisite — 1.1 is store-reached, 1.2/1.3 are
serialization, 1.5 is cosmetic, and 1.4 (`multiBitFormat`) matters only if the CLI wants the app's multi-bit *formatting* rather than its own.
**Edit:** move S.2 and S.3 into Phase 0 and change §6 to "a CLI and read-only MCP tools over the engine may proceed now", with the one caveat that
they import `core/hdl`, `core/testing` and `core/chips` directly and never `@/store`. This is the cheapest thing in the whole plan for the owner's
stated priority, and it is currently delayed a phase for no measured reason.

**(c) 2D.** #211 already stages it "read-only … → then input toggling → then editing". Read-only needs nets (W) + positions (#210, pure,
`agent-ready`, already gate-allowed) + a renderer — **not** the session split and not commands — so it lands at W + #210, one phase earlier than the
table's Phase-4 cell. Input toggling needs one existing action. Only full editing waits for Phase 5. **Edit:** say plainly that 2D is read-only from W
until Phase 5, name input toggling as the cheap middle step, and pull #210 into Phase 0/1 explicitly rather than merely permitting it — it gates every
2D cell in the table.

**(d) Phase S largely re-files work that exists.** S.2 is **#204** (`hacer test <hdl> <tst> <cmp>`) + **#205** (CLI run-tst, "cli scenario driver
(third driver → matrix becomes a check)"); S.3 is **#208** (`hacer_hdl` MCP tool, stdio, in-memory transport, committed `.mcp.json`); S.4's drivers
are already named in #205, #211 and **#279**; and `docs/portfolio.md`'s "Hand in hand" already *is* S.1's rule ("A capability landing on one non-3D
surface has sibling issues for the others") — only its mechanisation is new. Two contradictions: "Design first" says "surface code lands only after
its ADR is accepted" and lists **#209**, the MCP ADR, which S.3 skips; and **#204, #205, #208,
#211 are not `agent-ready`**, so Phase S cannot be picked up as written. **Edit:** Phase S becomes "unblock and
re-rank #279 → #204 → #205 → #208", not four new items, and either waits on #209 or records an explicit exception for read-only tools. **Smallest
honest matrix:** drop S.1's JSON file — the scenario suite *is* the matrix (scenario × driver, pass/fail is the cell), so S.1 collapses into S.4 and
"hand in hand" becomes one assertion in the scenario runner.

**(e) A faster order for the owner's goal.** `connect`/`disconnect` over nets is a *document* operation needing no geometry, so a mutating MCP surface
need not wait for Phase 5's registry — only W.6 plus an isolated store (Phase 3). And W.3–W.4 (`deriveNets`, evaluator reads nets) touch the pure
layer and read `store/types.ts` only: they do not depend on the store factory and can run straight after Phase 1. So: **0 (+S.2, S.3, #210) → 1 →
W.1–W.4 → 2–3 → W.5–W.8 → 4 → 5 → 6.** That reaches a mutating MCP surface at W.6 instead of Phase 5, a read-only 2D schematic at W.4 + #210 instead
of Phase 4, and starts the CLI immediately. The plan's `0 → 1 → S ∥ 2–3 → W → 4 → 5 → 6` reaches the same place strictly later, and its Phase-S
parallelism is the part most at risk: S runs against the pre-W document, so its CLI and MCP tools would be written against wires-and-junctions and
rewritten at W.7. **Edit:** scope Phase S to read-only engine operations the net migration does not touch (compile, run `.tst`, truth table), defer
anything document-shaped until after W.4. Phase 0 is otherwise correctly ordered — 0.1, 0.2, 0.4 are load-bearing now, 0.3 and 0.5 could follow Phase
1, and 0.7 should ship with one metric, not seven.

## 9h — the strongest argument against the declarative direction

Its best advocate: *HACER's differentiator is that a circuit is built in space, not declared. Drawing a wire is the one act that makes the machine
feel constructed rather than specified, and the router's hops, nudging and confluence sharing exist to keep a hand-drawn diagram readable — ADR-0007
spent a 19-source research pass and a four-stage roadmap on exactly that. Retiring the hand removes the only interaction that teaches spatial
reasoning about a circuit, and removes it before the replacement exists: the command palette, MCP and agent API are Phases 5 and 7, so for that
interval the only way to connect two pins is a click-click gesture strictly poorer than what it replaced, on a 3D canvas whose reason to exist has
just been narrowed.*

**The measurements do not answer it.** F1 and F2 count lines, imports and cycles; nothing measures whether anyone uses hand wiring, what a net-only
model costs a learner, or how long the gap is between W.6 and a real command surface. The plan concedes "it is a deliberate feature removal" and then
argues from code volume — a 7.8% number wearing a 24% label (finding 5). What the measurements *do* support is narrower and solid: routed geometry and
crossing bookkeeping do not belong in the serialized document, junctions do not belong in the evaluator, and connectivity should be expressible as a
command — all three achievable **without deleting the gesture**, since `connect` can simply be the command the gesture emits. **Edit:** W.1 must carry
"keep hand drawing as a client of `connect`" as a live alternative with its cost, not only "keep hand wiring as-is" and "keep both"; gate W.8's
deletion on the command surface existing, not on W.7 landing; and note that W.8 rewrites the app tour (`e2e/tour/app-tour.spec.ts` drives
`startWiring`/`setDestinationPin`/`completeWiring*`), making it a `critical` change requiring cloud browser QA under ADR-0016.
