# Backlog sweep against the read-only direction — every open issue, once

**Date:** 2026-09-23 · **Issue:** [#340](https://github.com/mezivillager/hacer/issues/340) (foundation plan
[#318](https://github.com/mezivillager/hacer/issues/318), item P.3) · **Swept against:**
[ADR-0020 — spec-only writes, read-only projections](../../decisions/0020-spec-only-writes-read-only-projections.md),
Accepted 2026-09-23, merged to `main` by [PR #358](https://github.com/mezivillager/hacer/pull/358) while this sweep ran.

The backlog was shaped on 2026-09-18 for a product people edit by hand in 3D. On 2026-09-21 the owner changed that.
Until this sweep, every issue filed before that date was silently making the old assumption, and an agent picking one up
had no way to tell which. This is the one pass that answers it for all of them.

**Scope:** all **127** open non-epic issues at the time of the sweep. The 12 epics
([#138](https://github.com/mezivillager/hacer/issues/138)–[#147](https://github.com/mezivillager/hacer/issues/147),
[#260](https://github.com/mezivillager/hacer/issues/260), [#318](https://github.com/mezivillager/hacer/issues/318)) are
containers and are not classified; they follow their children.

## The rule, as ADR-0020 §11 fixes it

| Class | Meaning |
|---|---|
| **keep** | Unaffected by the read-only direction. The body stands (a clarifying comment may still have been added, and one body was *trimmed* — see #179 — without changing the class: the class answers "what does the direction do to this issue?", not "was it edited?"). |
| **re-scope** | The outcome survives but is reached through **spec → render**. The body is rewritten; the original is in the issue's edit history. |
| **hold** | Waiting on a **named Phase N step**. A narrower class than before the ADR, which is what a hold used to mean. `agent-ready` is off and is restored by that step, not by a reviewer. |
| **close** | Either (a) its **only beneficiary is hand editing** — wire drawing, junction placement, dragging, placement previews and their polish, which §6 names as non-goals rather than deferred work — or (b) it is **absorbed, superseded or already delivered** by ADR-0020, which §9 authorises by name for #188, #189 and #190. |

Two rules bind every row and were applied without exception:

- **Nothing is closed silently.** Every one of the 19 closes carries a comment that quotes the owner's direction
  verbatim and **names what replaces the capability**. An observed bug in machinery being removed is closed the same
  way, and `docs/development/observed-bugs.md` now carries that rule, the four affected entries and a new stated
  limit (B-009).
- **A bug that corrupts evaluation is never held or closed.** It is fixed in the evaluation layer, as
  [#312](https://github.com/mezivillager/hacer/pull/312) was.
  [#355](https://github.com/mezivillager/hacer/issues/355), [#356](https://github.com/mezivillager/hacer/issues/356),
  [#363](https://github.com/mezivillager/hacer/issues/363) and [#367](https://github.com/mezivillager/hacer/issues/367)
  are that class, and so is [#311](https://github.com/mezivillager/hacer/issues/311) — which is why it is a **keep**
  while its look-alike [#309](https://github.com/mezivillager/hacer/issues/309) is a **close**. The test is whether the
  defect produces a *wrong value*, not whether it lives in legacy code.

## The count

| Class | Count |
|---|---|
| keep | **89** |
| re-scope | **15** |
| hold | **4** |
| close | **19** |
| **total** | **127** |

All 19 closes were **actually closed**, with their comments, on 2026-09-23 — 16 as `not planned`
(superseded or hand-editing-only) and 3 as `completed`
([#210](https://github.com/mezivillager/hacer/issues/210), [#328](https://github.com/mezivillager/hacer/issues/328),
[#359](https://github.com/mezivillager/hacer/issues/359) — delivered work that was never closed out).

## The spine row, re-scoped as spec → render

The audit counted **13 of the 15** open `project:spine` issues as interactive UI work, with only
[#175](https://github.com/mezivillager/hacer/issues/175) `agent-ready` — which is why the row *"pauses for re-scoping
rather than continuing as data"*. After the sweep:

| Class | Count | Issues |
|---|---|---|
| re-scope | **12** | #165, #167, #169, #170, #171, #173, #174, #175, #176, #177, #235, #236 |
| keep | **3** | #166, #168, #172 |
| hold | **0** | — |
| close | **0** | — |
| **total** | **15** | |

**Nothing in the spine row was closed**, which is the result worth stating: the read-only direction does not delete the
nand2tetris Project-1 ladder, it changes how each rung is reached. The 13 the audit counted are the
12 re-scoped **plus [#172](https://github.com/mezivillager/hacer/issues/172)**, which ADR-0020 §11
keeps *and promotes* ("where the 3D renderer's effort goes after N.8") rather than re-scopes. The two it did not count
are [#166](https://github.com/mezivillager/hacer/issues/166) and
[#168](https://github.com/mezivillager/hacer/issues/168), which the ADR keeps by name as "this work already filed".

Every re-scoped spine issue now carries a blocker pointing at the Phase N step that produces its capability, so the row
is **paused by data rather than by a convention** — `node scripts/backlog.mjs ready` will not offer them until that
step lands.

## Issues this sweep did not redo

These were already handled on 2026-09-21 and were **checked, not repeated**. Where the ADR decided their fate, the issue
was made to match:

| Issue | Was | Now |
|---|---|---|
| [#178](https://github.com/mezivillager/hacer/issues/178) | closed, superseded by #323 and #335 | unchanged — already closed |
| [#183](https://github.com/mezivillager/hacer/issues/183) | held | **closed** — the ADR removes the module rather than re-scoping it |
| [#184](https://github.com/mezivillager/hacer/issues/184) | held ("kept code, but the ADR names its module") | **hold, re-pointed** — the ADR fixes the contract, not the tree, and says so; #379 settles the path |
| [#185](https://github.com/mezivillager/hacer/issues/185) | held | **closed** — all three criteria land elsewhere |
| [#186](https://github.com/mezivillager/hacer/issues/186) | held | **closed** — the need is met in the replacement (#382) |
| [#188](https://github.com/mezivillager/hacer/issues/188) | held, "absorbed by the ADR" | **closed** — ADR §9: *"absorbed; close as decided by this ADR"* |
| [#189](https://github.com/mezivillager/hacer/issues/189) | held, "absorbed by the ADR" | **closed** — ADR §9: *"absorbed; close as decided"* |
| [#190](https://github.com/mezivillager/hacer/issues/190) | held, "absorbed by the ADR" | **closed** — ADR §9: the ADR question only; the implementation stays as N.3 (#378) |
| [#217](https://github.com/mezivillager/hacer/issues/217) | held for the ADR | **keep, as written; `agent-ready` restored** — ADR §9: *"kept as written until N.6, then superseded"*. It is #331's instrument, and the ADR is the follow-up entitled to restore the label |
| [#204](https://github.com/mezivillager/hacer/issues/204) | blockers re-pointed (#185, #181 removed; #193 added) | unchanged — the re-pointing still holds, and #185's closure confirms it |

## The table

Ordered **close → re-scope → hold → keep**, then by number. "Row" is the portfolio row the issue sits in.

| Issue | Row | Class | Verdict |
|---|---|---|---|
| [#183](https://github.com/mezivillager/hacer/issues/183) | core | **close** | Superseded. `store/pinHelpers` goes with the legacy store slices (§7.5); pin positions become `describeScene` output (#381). Rewriting its rotation math is working rule 1. |
| [#185](https://github.com/mezivillager/hacer/issues/185) | core | **close** | Superseded. All three criteria land elsewhere: the `e2e/` import is on #329's ratchet, `renderTracking` is deleted by #321/#332, and the injected-effects need is met by `createCircuitStore` (#382). |
| [#186](https://github.com/mezivillager/hacer/issues/186) | core | **close** | Superseded. All nine sites are in legacy store actions and `serialize.ts`, removed at §7.5; the new store takes `{ ids, clock, storage, scheduler }` injected from day one (#382). Part-id stability comes from §1.9's `// #p3` marker. |
| [#187](https://github.com/mezivillager/hacer/issues/187) | core | **close** | Absorbed. ADR §4's `connect(from, to)` is semantic and stores no path; built at #385. Its "segments computed by the existing router" is dropped — that router is deleted at §7.5c. |
| [#188](https://github.com/mezivillager/hacer/issues/188) | core | **close** | Absorbed — **ADR §9 closes it by name**. Document = spec + sidecar (§1); hints keyed per surface from v1 (§1.4); session state per surface in the session slice (§5); no shared version counter, one one-way importer. |
| [#189](https://github.com/mezivillager/hacer/issues/189) | core | **close** | Absorbed — **ADR §9 closes it by name**. §4 is its registry, §5 its undo; `produceWithPatches` explicitly deferred; the build is scheduled at #385, no longer conditional. |
| [#190](https://github.com/mezivillager/hacer/issues/190) | core | **close** | Absorbed — **ADR §9: the ADR question only; the implementation stays as N.3** (#378). One evaluator; the `'circuit'` chip type becomes the composite-chip evaluator. |
| [#191](https://github.com/mezivillager/hacer/issues/191) | core | **close** | Absorbed. `CommandResult` (§4) is errors-as-data for the whole surface; 58 of the 74 sites are `wiringActions` gesture validation that leaves with the gesture (§7.5b). |
| [#192](https://github.com/mezivillager/hacer/issues/192) | core | **close** | Absorbed — and its *method* is the one the ADR rejects. Wrapping legacy actions puts a stable surface on machinery deleted at §7.5. The document/session split survives as three scopes in #385. |
| [#210](https://github.com/mezivillager/hacer/issues/210) | surfaces | **close** | **Delivered.** Its measurements are the ADR's Reuse rows: elkjs rejected (439,672 B; 1,688 ms; 195/198 nodes moved on a permutation), dagre and `@xyflow/react` too. Carried by #379. |
| [#211](https://github.com/mezivillager/hacer/issues/211) | surfaces | **close** | Absorbed. Stage 1 is #384 (the ADR cites "#211's first stage"); stages 2 (input toggling) and 3 (editing) are named non-goals (§6). |
| [#212](https://github.com/mezivillager/hacer/issues/212) | surfaces | **close** | Absorbed by #386. Diagnostics-as-data becomes §1.1's parse-to-render guarantee; "one-way HDL → circuit" becomes the whole pipeline, so there is no second direction to sync. |
| [#213](https://github.com/mezivillager/hacer/issues/213) | surfaces | **close** | **Duplicate** of #168, which ADR §11 keeps by name and which listed this issue as its own blocker. The printer lands at #374; junctions/splitters dissolve into slices (§1.2), so there is nothing left to normalise. |
| [#223](https://github.com/mezivillager/hacer/issues/223) | bugs | **close** | Hand-editing only: a defect in the legacy router (`src/utils/wiringScheme`), deleted at §7.5c. **Replaced by** channel routing (#380), under which §8's assertions 3/4/5/7 collapse into one by-construction invariant. #331 still records it beside the golden. |
| [#224](https://github.com/mezivillager/hacer/issues/224) | bugs | **close** | Hand-editing only: **placement previews are a named non-goal** (§6). Replaced by `setHint` (row 19), drawn read-only by #383/#384. |
| [#309](https://github.com/mezivillager/hacer/issues/309) | bugs | **close** | Hand-editing only: §6 drops toggling an input by clicking its pin, "reopenable as a shortcut that emits `setInput`". **Not the evaluation class** — #222 made evaluation correct; what is left is an affordance. Replaced by `setInput` + the pins panel (#386). |
| [#328](https://github.com/mezivillager/hacer/issues/328) | foundation | **close** | **Delivered, and its exit is met here**: "the spike's break list exists as issues" — Phase N is filed (#373–#386). Three pieces of its evidence are explicitly retired by the ADR and re-measured at #374. |
| [#359](https://github.com/mezivillager/hacer/issues/359) | foundation | **close** | **Delivered.** Both review rounds returned on PR #358; the ADR is Accepted and records that no further round is required. Its corrections produced #367, #363 and #372. |
| [#364](https://github.com/mezivillager/hacer/issues/364) | core | **close** | Hand-editing only, by its own line: "Visual/geometry only — evaluation is correct since #356." The junction stops being a domain entity (§6); every path listed is deleted at §7.5b. **One half is carried, not closed**: `removeJunction`'s trunk-deleting `slice(1)` is a data-loss path, now an acceptance criterion on #376 and recorded in `observed-bugs.md` as B-009. |
| [#165](https://github.com/mezivillager/hacer/issues/165) | spine | **re-scope** | A chip is authored by editing its spec; a spec compiles into a chip definition and **registers itself** (§9), so nesting is the default. The placed-chip lifecycle is a non-goal. → blocked by #378. |
| [#167](https://github.com/mezivillager/hacer/issues/167) | spine | **re-scope** | The spine's row for the spec surface, now the product's *primary* authoring surface. Diagnostics-as-data becomes §1.1's guarantee: valid if it parses, errors visible on the drawing. → blocked by #386. |
| [#169](https://github.com/mezivillager/hacer/issues/169) | spine | **re-scope** | Capability row 22 (**gates**): the library lists **spec documents**. Save/load/autosave become spec + sidecar (row 16); `exportCircuitJSON` retires with `serialize.ts` (row 21). → blocked by #386, #385. |
| [#170](https://github.com/mezivillager/hacer/issues/170) | spine | **re-scope** | Capability row 1 (**gates**): IN/OUT are declared in the spec text. The panel shows and validates; auto-IO becomes a spec-scope command returning `CommandResult`. I/O terminals get `NodeId`s (`in:a`) so their positions can be hinted. → blocked by #386, #385. |
| [#171](https://github.com/mezivillager/hacer/issues/171) | spine | **re-scope** | The implementation source becomes a **command** (#385) over the document, re-evaluated through the one engine (#378) — not a toggle mutating canvas state. → blocked by #385. |
| [#173](https://github.com/mezivillager/hacer/issues/173) | spine | **re-scope** | Labels, names and live signal values become **fields of the scene description** (row 12 **gates**), asserted on Node goldens instead of screenshots. "Previews" is dropped (§6 non-goal). → blocked by #381. |
| [#174](https://github.com/mezivillager/hacer/issues/174) | spine | **re-scope** | Bus appearance is a **projection derived from the net** (§1.2), not a `BusComponent`. ADR-0009's `computeBusPinLayout` is kept and re-pointed at the derived glyph; ref kinds stay a closed union with no `default` arm. → blocked by #381. |
| [#175](https://github.com/mezivillager/hacer/issues/175) | spine | **re-scope** | The question is answered: the splitter/joiner *entities* P05-12a delivered are **dissolved into slices** (§1.2). The remainder is capability row 6 (**gates**), which "needs #357". → blocked by #357. |
| [#176](https://github.com/mezivillager/hacer/issues/176) | spine | **re-scope** | Documents the spec → render pipeline. It is the **deferred half of ADR-0020's living-docs list**: `REPO_MAP.md`, `HACER_LLM_GUIDE.md`, `.cursorrules`, `docs/testing/structure.md` are "N/A until the paths exist (N.1 onward)". → blocked by #374. |
| [#177](https://github.com/mezivillager/hacer/issues/177) | spine | **re-scope** | Its blocker `C9` ("the one-engine ADR") **is** ADR-0020 §9, now accepted; clock/DFF waits on #378, not on a decision. Each 0.6 chip becomes spec text + a sidecar `.tst`/`.cmp` binding (§1.3). #357 named as a Project-2 precondition. |
| [#195](https://github.com/mezivillager/hacer/issues/195) | verify | **re-scope** | The core driver stands; **the legacy store driver is dropped** — it would drive `CircuitState`, deleted at §7.5g. A store driver returns over #382 if still wanted. Driver list is `hdl`/`cli`/`mcp`/`svg2d` (#279). |
| [#197](https://github.com/mezivillager/hacer/issues/197) | verify | **re-scope** | Round trip becomes `parseSpec(printSpec(doc)) ≅ doc` (incl. `// #p<n>`); **junction insertion is dropped** (no junction entity) and is replaced by "adding a sink changes no other net"; permutation-is-a-no-op becomes one of `layout`'s four contract preconditions, with ELK's 195/198 as its measured reason. → blocked by #374, #379. |
| [#209](https://github.com/mezivillager/hacer/issues/209) | surfaces | **re-scope** | Still wanted, but narrower: §4 already decided the registry, the three scopes, schema generation and the **session carve-out** (`camera`/`inspect`/`renderer` *are* MCP commands). The body now records those as settled input and states what is genuinely still open. |
| [#235](https://github.com/mezivillager/hacer/issues/235) | spine | **re-scope** | Capability row 15 (**gates**): `truthTable` is re-typed onto the spec and evaluates through #378, as a **run-scope command** (not undoable), over-budget returned as an `error` not a toast. → blocked by #378, #385. |
| [#236](https://github.com/mezivillager/hacer/issues/236) | spine | **re-scope** | The view becomes a DOM panel fed by a command's result — **testable on the owner's laptop** under `renderer=none`, because it needs no canvas. → blocked by #235, #386. |
| [#184](https://github.com/mezivillager/hacer/issues/184) | core | **hold** | **Kept code**, but the ADR fixes the *contract* (`layout(doc, surface, options)`) and not the tree — it names no layout module path. **What settles it: #379 (N.4).** `agent-ready` stays off; `computeBusPinLayout` stays the single source of width-dependent pin geometry. |
| [#198](https://github.com/mezivillager/hacer/issues/198) | verify | **hold** | Technique survives, subject does not exist yet. Its old blocker #186 was closed by this sweep; **re-pointed at #385 (N.10)** — a model over `defineCommand`'s spec-scope commands against `CommandResult`, with undo as an extra invariant. |
| [#219](https://github.com/mezivillager/hacer/issues/219) | 3d | **hold** | Instancing is **reserved** in the description (§2, and an acceptance criterion of #381), but this spike asserts through the `__SCENE_HELPERS__` bridge that N.6 supersedes. The ADR also says draw-call budgets are "reasoned, not observed" and only #325's CI benchmark can settle them. `agent-ready` removed. → blocked by #381. |
| [#261](https://github.com/mezivillager/hacer/issues/261) | pubdocs | **hold** | "Parity by construction" is strengthened by §4 (the facade *and* the MCP schemas are generated). Its old blocker #189 was closed by this sweep; **re-pointed at #385 (N.10)**, whose registry it generates from. |
| [#148](https://github.com/mezivillager/hacer/issues/148) | harness | keep | Harness/process. The backlog's own bootstrap; the direction does not touch it. |
| [#149](https://github.com/mezivillager/hacer/issues/149) | harness | keep | Harness/process. `backlog.mjs` is the instrument this sweep is measured with. |
| [#151](https://github.com/mezivillager/hacer/issues/151) | harness | keep | Harness/process. The tamper flag now also protects #331's characterization goldens and #376's captured corpus. |
| [#152](https://github.com/mezivillager/hacer/issues/152) | harness | keep | Harness/process. |
| [#153](https://github.com/mezivillager/hacer/issues/153) | harness | keep | Harness/process. The 'add a chip' recipe drifts again at N.1 (#374); this issue owns the duplication, #176 owns the re-write. |
| [#154](https://github.com/mezivillager/hacer/issues/154) | harness | keep | Harness/process. |
| [#155](https://github.com/mezivillager/hacer/issues/155) | harness | keep | Harness/process. |
| [#156](https://github.com/mezivillager/hacer/issues/156) | harness | keep | Harness/process. |
| [#159](https://github.com/mezivillager/hacer/issues/159) | harness | keep | Harness/process. |
| [#160](https://github.com/mezivillager/hacer/issues/160) | harness | keep | Harness/process. |
| [#166](https://github.com/mezivillager/hacer/issues/166) | spine | keep | **ADR §11 keeps it by name**: 'the scenario suite … this work already filed'. Clarified on the issue: drivers are `core`/`cli`/`mcp`/`svg2d`; the legacy store driver goes with `CircuitState`. |
| [#168](https://github.com/mezivillager/hacer/issues/168) | spine | keep | **ADR §11 keeps it by name**: 'the canonical HDL printer … this work already filed'. Both its blockers resolved — #190 absorbed, #213 closed as its duplicate — and it is re-pointed at #374. Its old 'fixed point' evidence is retired by the ADR and re-measured there. |
| [#172](https://github.com/mezivillager/hacer/issues/172) | spine | keep | **ADR §11 keeps it and *promotes* it**: 'where the 3D renderer's effort goes after N.8'. Nesting is now data (`describeScene`'s hierarchy path); drill-down is new work, not a gate (§6 bundled-row rule). Blocker re-pointed from #217 to #383. |
| [#179](https://github.com/mezivillager/hacer/issues/179) | core | keep | Unaffected. Body trimmed to the part #329 did not deliver — the no-DOM `tsconfig.core.json`. A dependency rule catches an import; it does not catch a global. |
| [#180](https://github.com/mezivillager/hacer/issues/180) | core | keep | Engine hygiene, foundation 1.3. `src/core`/`src/simulation` are adopted whole by the ADR. |
| [#181](https://github.com/mezivillager/hacer/issues/181) | core | keep | **Newly blocking** (ADR §10, one of six preconditions): 'the importer has never once seen the output of the reader it is specified to consume'. And `deserialize` is the **one legacy reader that outlives the switch** (§7.6), so this is work on kept code. |
| [#182](https://github.com/mezivillager/hacer/issues/182) | core | keep | Foundation 1.1, and capability row 23 (**gates**): completion tracking moves to the session slice *before* §7.5g deletes `CircuitState` around it. |
| [#193](https://github.com/mezivillager/hacer/issues/193) | verify | keep | The held-out oracle's vectors. Unaffected; the ADR adopts `web-ide`'s `.tst`/`.cmp` tooling as the conformance reference. |
| [#194](https://github.com/mezivillager/hacer/issues/194) | verify | keep | File-based conformance. Unaffected — capability row 14 (**gates**) runs `.tst`/`.cmp` through `src/core/testing` either way. |
| [#196](https://github.com/mezivillager/hacer/issues/196) | verify | keep | The matrix report is unaffected; only the driver list moved (no store driver). Noted on the issue: it and §6's 24-row capability list are the same instrument from two sides. |
| [#199](https://github.com/mezivillager/hacer/issues/199) | verify | keep | Parser fuzz on `src/core/hdl`, adopted whole. |
| [#200](https://github.com/mezivillager/hacer/issues/200) | verify | keep | CI differential against `web-ide` on generated circuits. Sibling of #338 (official vectors), not a duplicate. |
| [#201](https://github.com/mezivillager/hacer/issues/201) | verify | keep | Harness/process. |
| [#202](https://github.com/mezivillager/hacer/issues/202) | verify | keep | Harness/process. |
| [#203](https://github.com/mezivillager/hacer/issues/203) | verify | keep | Harness/process. |
| [#204](https://github.com/mezivillager/hacer/issues/204) | surfaces | keep | Foundation 0.6. Already re-pointed on 2026-09-21 (#185 and #181 removed as blockers, #193 added) — **listed, not redone**. |
| [#205](https://github.com/mezivillager/hacer/issues/205) | surfaces | keep | Foundation 0.6, the third driver. Unaffected — the CLI drives the engine, never the store. |
| [#206](https://github.com/mezivillager/hacer/issues/206) | surfaces | keep | Engine-level: the missing `getUserChipRegistry().register` call. It is the registry half that #378's composite-chip evaluator uses; #165 is the spec half. |
| [#207](https://github.com/mezivillager/hacer/issues/207) | surfaces | keep | `.tst` parser `repeat`/`while`/`tick`/`tock`. Its blocker #190 is closed (absorbed), so it is **unblocked** by this sweep. |
| [#208](https://github.com/mezivillager/hacer/issues/208) | surfaces | keep | Foundation 0.6, disposable by design — §4 regenerates the MCP schemas from the registry, and the ADR says so. |
| [#214](https://github.com/mezivillager/hacer/issues/214) | surfaces | keep | Later/attached mode. Unaffected. |
| [#215](https://github.com/mezivillager/hacer/issues/215) | 3d | keep | Renderer-level; survives into #383. |
| [#216](https://github.com/mezivillager/hacer/issues/216) | 3d | keep | Renderer-level; the deterministic test mode survives into #383 and is what makes `renderer.info` counters assertable. |
| [#217](https://github.com/mezivillager/hacer/issues/217) | 3d | keep | **ADR §9: kept as written until N.6, then superseded.** It is #331's instrument, and #331 is the point of no return. `agent-ready` **restored** — by the ADR's own decision, which is the only thing allowed to restore it. It mounts the canvas, so CI only (ADR-0016 as amended). |
| [#218](https://github.com/mezivillager/hacer/issues/218) | 3d | keep | Playwright plumbing. Unaffected. |
| [#225](https://github.com/mezivillager/hacer/issues/225) | bugs | keep | Unaffected, and now easier: the sweep resolved most of the file's open entries and wrote the closing rule into it. See the comment for the current state of `observed-bugs.md`. |
| [#229](https://github.com/mezivillager/hacer/issues/229) | upkeep | keep | Doc gardening. Unaffected. |
| [#230](https://github.com/mezivillager/hacer/issues/230) | horizon | keep | Horizon research note — 'below the NAND gate'. The owner's North Star; unaffected. |
| [#231](https://github.com/mezivillager/hacer/issues/231) | horizon | keep | Horizon research note — what 'AI-native' adds beyond AI-Agent Parity. |
| [#232](https://github.com/mezivillager/hacer/issues/232) | horizon | keep | Horizon research note — HACER as a research vehicle. |
| [#233](https://github.com/mezivillager/hacer/issues/233) | horizon | keep | Horizon research note — WaveDrom timing diagrams for 0.6. |
| [#247](https://github.com/mezivillager/hacer/issues/247) | harness | keep | Harness/process. |
| [#251](https://github.com/mezivillager/hacer/issues/251) | harness | keep | Harness/process. |
| [#252](https://github.com/mezivillager/hacer/issues/252) | upkeep | keep | Upkeep. Deleting aspirational trees from `REPO_MAP.md` is *more* correct under the ADR, not less. |
| [#253](https://github.com/mezivillager/hacer/issues/253) | upkeep | keep | Upkeep. Same class as #153. |
| [#256](https://github.com/mezivillager/hacer/issues/256) | upkeep | keep | Upkeep/dependency. |
| [#257](https://github.com/mezivillager/hacer/issues/257) | harness | keep | Harness/process. |
| [#262](https://github.com/mezivillager/hacer/issues/262) | pubdocs | keep | pubdocs — Starlight. Unaffected. |
| [#263](https://github.com/mezivillager/hacer/issues/263) | pubdocs | keep | pubdocs — HDL language reference. Unaffected; §1.5 adds one named superset (`wire out = a;`) plus an export mode that desugars it, which this page should document when it lands. |
| [#264](https://github.com/mezivillager/hacer/issues/264) | pubdocs | keep | pubdocs — MCP tools reference, generated from the server's schemas. Sibling of #261 (held); #209 decides the names both depend on. |
| [#265](https://github.com/mezivillager/hacer/issues/265) | pubdocs | keep | pubdocs — CLI reference. Unaffected. |
| [#266](https://github.com/mezivillager/hacer/issues/266) | pubdocs | keep | pubdocs — the hand-in-hand rule. Unaffected. |
| [#269](https://github.com/mezivillager/hacer/issues/269) | harness | keep | Harness/process — the product role. **Load-bearing for #379**: the ADR leaves one aesthetic question open ('whether the barycentre drawing reads well to a person') and names this role as its judge, before N.4 is accepted. |
| [#270](https://github.com/mezivillager/hacer/issues/270) | harness | keep | Harness/process — the agent roster. |
| [#271](https://github.com/mezivillager/hacer/issues/271) | harness | keep | Harness/process — the retro role. |
| [#275](https://github.com/mezivillager/hacer/issues/275) | pubdocs | keep | pubdocs — llms.txt, link checks. |
| [#279](https://github.com/mezivillager/hacer/issues/279) | harness | keep | Foundation 0.6 shaping: scenario ids + drivers. The driver list (`hdl`/`mcp`/`svg2d`/`cli`) is exactly what #195 and #196 re-point onto. |
| [#280](https://github.com/mezivillager/hacer/issues/280) | harness | keep | Harness/process. |
| [#284](https://github.com/mezivillager/hacer/issues/284) | 3d | keep | Far-future research on browser-testing 3D. Unaffected; its own body already sequences it after the non-3D surfaces catch up. |
| [#289](https://github.com/mezivillager/hacer/issues/289) | verify | keep | browser-qa paths. Unaffected. |
| [#290](https://github.com/mezivillager/hacer/issues/290) | upkeep | keep | Docs sweep vs ADR-0016. Unaffected. |
| [#304](https://github.com/mezivillager/hacer/issues/304) | harness | keep | Harness/process. |
| [#308](https://github.com/mezivillager/hacer/issues/308) | harness | keep | Harness/process. |
| [#311](https://github.com/mezivillager/hacer/issues/311) | bugs | keep | **Never held or closed — it is the evaluation-corruption class**, and its sibling #309 is not. Output-node values are *serialised*, so a stale value enters #376's captured corpus and becomes a fixture #377 compares against: **fix before the capture is run**. `risk:1` added. |
| [#313](https://github.com/mezivillager/hacer/issues/313) | bugs | keep | Foundation 0.10. Unaffected. |
| [#315](https://github.com/mezivillager/hacer/issues/315) | surfaces | keep | Foundation 0.7 — the renderer selector the whole new path ships behind (ADR-0019, load-bearing per §8). |
| [#316](https://github.com/mezivillager/hacer/issues/316) | surfaces | keep | Foundation 0.10 — `@shell`, the reason the 2D surface and the shell are testable on the owner's laptop. |
| [#321](https://github.com/mezivillager/hacer/issues/321) | bugs | keep | Foundation 0.8 — dead code. |
| [#325](https://github.com/mezivillager/hacer/issues/325) | 3d | keep | Foundation 0.9 — the standing rendering-R&D role, and per the ADR **the only place draw-call budgets can be measured**. |
| [#327](https://github.com/mezivillager/hacer/issues/327) | foundation | keep | **In flight — not touched.** The ADR this sweep is run against (PR #358). |
| [#331](https://github.com/mezivillager/hacer/issues/331) | foundation | keep | The first point of no return. **Now blocks #381** (N.6's goldens diff against it), and §7.1 names the constraint that decides when it can run: it needs #217 over the legacy app, which mounts the canvas, so it is a **cloud job**. |
| [#332](https://github.com/mezivillager/hacer/issues/332) | foundation | keep | Foundation 0.8 — dead code. |
| [#333](https://github.com/mezivillager/hacer/issues/333) | harness | keep | Foundation 0.3 — blast radius. |
| [#334](https://github.com/mezivillager/hacer/issues/334) | harness | keep | Foundation 0.7/0.10 — ledger `merge=union`, verifier reads CI logs. |
| [#335](https://github.com/mezivillager/hacer/issues/335) | foundation | keep | Foundation 0.10. |
| [#336](https://github.com/mezivillager/hacer/issues/336) | foundation | keep | Foundation 1.4 — the engine's front door. Complements #179's remainder: #336 proves it loads under Node, #179 makes the type checker refuse the next DOM global. |
| [#338](https://github.com/mezivillager/hacer/issues/338) | foundation | keep | Foundation 1.6 — the differential harness on the official vectors. |
| [#339](https://github.com/mezivillager/hacer/issues/339) | harness | keep | Foundation 1.5. |
| [#340](https://github.com/mezivillager/hacer/issues/340) | harness | keep | **This sweep.** |
| [#342](https://github.com/mezivillager/hacer/issues/342) | upkeep | keep | Upkeep/dependency — React held at 19.2.x for R3F's peer range. Load-bearing while 3D stays first-class. |
| [#345](https://github.com/mezivillager/hacer/issues/345) | harness | keep | Harness/process. |
| [#349](https://github.com/mezivillager/hacer/issues/349) | harness | keep | Harness/process. |
| [#352](https://github.com/mezivillager/hacer/issues/352) | harness | keep | Harness/process. |
| [#357](https://github.com/mezivillager/hacer/issues/357) | core | keep | **In flight — not touched.** A precondition of #377/#378 and, per §6 capability row 6, *the only way to express a bit slice on a part pin*. |
| [#361](https://github.com/mezivillager/hacer/issues/361) | core | keep | Engine defect in `src/core/hdl`, adopted whole. **Not** one of §10's six preconditions, but adjacent: a slice-only-written signal is exactly what a dissolved joiner (§1.2) produces. Do it with or after #363. |
| [#363](https://github.com/mezivillager/hacer/issues/363) | core | keep | **Newly blocking** (added by the ADR's second review pass): a spurious combinational cycle on disjoint slices is every dissolved joiner. Blocks #377, #378 **and #372** — the alias spike runs after it, or it fails its own fixtures for the wrong reason. |
| [#367](https://github.com/mezivillager/hacer/issues/367) | core | keep | **In flight — not touched.** The engine half of §1.8: a part *input* pin bound twice compiles and silently evaluates last-binding-wins, which #362 does not catch. |
| [#368](https://github.com/mezivillager/hacer/issues/368) | harness | keep | Harness/process. |
| [#369](https://github.com/mezivillager/hacer/issues/369) | harness | keep | Harness/process. |

## What the sweep filed

Phase N was *"deliberately left unfiled"* by the audit (REPORT §6a: *"the ADR and the spike produce them — filing now
would pre-empt both"*). The ADR is accepted and the spike (#328) is delivered, so it is filed, plus the two
preconditions the ADR's own text turned into work:

| Item | Issue | Blocked by |
|---|---|---|
| the alias / `compileSpec` spike (§1.5, §1.6) | [#372](https://github.com/mezivillager/hacer/issues/372) | #363 |
| N.0 — six mesh components become prop-only | [#373](https://github.com/mezivillager/hacer/issues/373) | — |
| N.1 — the spec model | [#374](https://github.com/mezivillager/hacer/issues/374) | #372 |
| **the real-v1-document corpus** (§7.2) | [#376](https://github.com/mezivillager/hacer/issues/376) | — (`needs-human`) |
| N.2 — `fromLegacyCircuit` | [#377](https://github.com/mezivillager/hacer/issues/377) | #355, #357, #367, #363, #181, #374 |
| N.3 — one engine through `compileHDL` | [#378](https://github.com/mezivillager/hacer/issues/378) | #357, #367, #363, #374 |
| N.4 — `layout` | [#379](https://github.com/mezivillager/hacer/issues/379) | #374 |
| N.5 — `route` | [#380](https://github.com/mezivillager/hacer/issues/380) | #379 |
| N.6 — `describeScene` | [#381](https://github.com/mezivillager/hacer/issues/381) | #380, #331 |
| N.7 — the new store | [#382](https://github.com/mezivillager/hacer/issues/382) | #374 |
| N.8 — the read-only 3D renderer | [#383](https://github.com/mezivillager/hacer/issues/383) | #373, #381 |
| N.9 — the read-only 2D SVG renderer | [#384](https://github.com/mezivillager/hacer/issues/384) | #381 |
| N.10 — commands over the spec | [#385](https://github.com/mezivillager/hacer/issues/385) | #382 |
| N.11 — the shell | [#386](https://github.com/mezivillager/hacer/issues/386) | #382, #385 |

All carry `project:foundation`, a risk label and `--parent 318`.

**#376 did not exist and had to be filed.** ADR §7.2 calls it *"the second point of no return"* and a hard precondition
on C.1, and it is the only one of the two that nobody had written down: #331 captures the *legacy renderer* and
*hand-built* fixtures, which is a different thing. The ADR is blunt about why it matters — *"**No real saved circuit
file exists anywhere in the repository today**"* — and about its window: capture runs through `exportCircuitJSON`,
which **dies with `serialize.ts`**, so it can only be done from the legacy app before the switch. It carries §7.2's
**exit clause** as an acceptance criterion, so a precondition with no exit cannot become a deadlock.

## Limits of this sweep

- **Four issues were classified but not touched**, because they were in flight:
  [#327](https://github.com/mezivillager/hacer/issues/327) (the ADR itself, PR #358),
  [#357](https://github.com/mezivillager/hacer/issues/357), [#367](https://github.com/mezivillager/hacer/issues/367),
  and #340 itself. All four are **keep** and none needed an edit; #357 and #367 are preconditions the sweep wired
  *into* #377/#378 rather than away from. **#327 and #357 both closed while the sweep ran** (PR #358 and PR #370
  merged), which is why #175 shows as `ready` again: its only blocker was #357.
- **Nothing was left unclassified.** Every one of the 127 rows above has exactly one class.
- **One issue was filed *after* the snapshot and is classified here rather than in the table**:
  [#371](https://github.com/mezivillager/hacer/issues/371) — `compileHDL` does not bounds-check a slice on the
  **external** side of a connection (`Not(in=bus[20], out=o)` on a 16-bit `bus` compiles and `readSubBus` silently
  returns 0), found while implementing #357. **keep**, and the same class as #361 and #363: an engine defect in
  `src/core/hdl`, which ADR-0020 adopts whole, and a *wrong value* rather than a missing check once a dissolved
  joiner (§1.2) is what produces the slice. Do it with or after #363.
- **One judgement is worth flagging for review**, because it is the sweep's only close whose subject is partly a
  correctness defect: [#364](https://github.com/mezivillager/hacer/issues/364). Its five geometry readers are
  hand-editing-only and go at §7.5b, but its addendum names `removeJunction` deleting the **trunk** wire — data loss
  in a saved document. Closing the issue while a live data-loss path remains would have been silent, so it is carried
  two ways instead: as an acceptance criterion on #376 (*capture before exercising `removeJunction`*) and as a new
  stated limit, **B-009**, in `docs/development/observed-bugs.md`. If that is judged wrong, the fix is to reopen #364
  scoped to `signalActions.ts:61` alone.
- **`agent-ready` was removed from one issue** ([#219](https://github.com/mezivillager/hacer/issues/219)) and
  **restored on one** ([#217](https://github.com/mezivillager/hacer/issues/217)), by the ADR's own decision. The other
  three holds never had it.
- The counts here are a **snapshot at 2026-09-23**. `node scripts/backlog.mjs ready` is the live list; this file is
  the record of the verdicts, not the state.
