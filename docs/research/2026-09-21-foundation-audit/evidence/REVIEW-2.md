# Adversarial review 2 — REPORT.md v2 (the read-only-surfaces strangler)

**Verdict: sound with corrections — two of them load-bearing.** The pivot's direction holds; v2 took almost every
correction from `REVIEW.md`. Three claims do not survive: Phase N is **not** "mostly new files in sound areas" (every 3D
leaf that draws is welded to the gesture state the plan deletes); "the engine, 4,266 lines, is kept whole" is wrong by
~830 lines; Phase C's gate can never be met as written. Taken literally, its mechanism drops five portfolio rows from
`backlog.mjs ready`. Re-derived at `origin/main` `625c2c0`, Node 22.

## 1. Did v2 take the first review's corrections?

| # | REVIEW finding | v2 | Evidence / note |
|---|---|---|---|
| 1 | Headless premise measured wrong | **addressed** | §2 "A correction to version 1"; `src/test/setup.ts` named; 0.2 gives the node project its own setup file |
| 2 | `JunctionNode` across 47 prod files unmeasured | **addressed** | §3 cites 47; C.2 splits by consumer group. No blast row added to §1 (asked for, minor) |
| 3 | Router is order-dependent → a rewrite | **addressed** | §4 bullet 2 says control flow is replaced, goldens re-baselined; drag worry correctly mooted |
| 4 | Parity not a sufficient oracle; ADRs superseded | **addressed in words, contradicted** | P.1 names 0007/0008/0009 — but see F8: ADR-0008's suite asserts on the *rendered* graph, N.5–N.6 move it to Node only |
| 5 | "24%" overstates by ~3× | **addressed** | §3 now 3,000 lines / 13%; "the honest case is not line count" |
| 6 | ADR-only issues counted as code | **partly — repeated for #210** | §2 fixed for #188/#189; 0.5 and N.4 treat spike #210 as an implementation. F10 |
| 7 | Gate contradicts portfolio, not mechanisable | **addressed in words, mechanism wrong** | 0.4 adds row+epic+label+`planReady` filter; the rotation edit drops five buckets. F5 |
| 8 | No serialization migration mechanism | **partly** | 1.3 names the seam; nothing builds version dispatch; C.1 vs C.2 now contradict. F7 |
| 9 | `branching.ts` already has a net model | **addressed** | P.2 starts from `Signal`/`signalId` and lists the hard cases |
| 10a | 116 of 212 `.position` sites are tests | **moot — checked, correct** | §4: derived layout removes the migration. But see F3: hints bring the sidecar back |
| 10b | `effects.sh` never scans `src/utils` | **addressed** | 0.1 "with `src/utils` scanned too"; §2 cites ~31 `console.*` in `crossing.ts` |
| 11 | Over-engineering (2nd label, metrics, AGENTS.md, API report) | **addressed** | all four cut or deferred; one tracked metric |
| 12a | React Compiler needs a line | **partly** | §4 names it; no analysis. F11 |
| 12b | `src/test/testUtils.ts` co-change triangle | **dropped, no reason** | file still exists; 21 `@store` specs still gate every PR. F8 |
| 12c | 8 test-only layer violations unscheduled | **addressed** | 0.1 records them as known, shrink-only |
| 12d | #317 false green in the oracle | **dropped, no reason** | not in v2 at all; N.5/N.6/N.8 exits are scene assertions. F8 |
| 12e | Size the Immer patch log | **moot — checked** | patch log removed; replaced by an unargued claim. F11 |
| 13 | Writing (name the 3 sites, 678, 84–105, wall-clock, `WiringState`) | **addressed** | all five folded in; but "unguarded" is wrong. F9 |
| (a) | Three capabilities traced; optimistic cells | **moot** | the phase-by-surface table is gone |
| (b) | "After Phase 1" one phase too cautious | **addressed** | 0.5 "Surfaces, now." |
| (c) | 2D read-only lands at W + #210 | **addressed** | N.9 = #211 stage 1 |
| (d) | Phase S re-files existing work; #209 contradiction | **addressed** | 0.5 reuses #279/#204/#205/#208; the exception is recorded — but see F10 on its scope |
| (e) | A faster order | **moot** | the strangler supersedes it; 0.5 is engine-only, never `@/store` — the review's worry is answered |
| 9h | The case for the hand | **addressed in words, incomplete** | §3 states it and answers it; the strongest objection is missing. F12 |

## 2. Findings, by how much they should change the plan

**F1. Phase N's 3D renderer is not "mostly new files": every leaf that draws reads gesture state.** N.8 is "a read-only
3D renderer of the scene description"; §6's Phase N header says "every step in a sound area; mostly new files". The 3D
tree is 2,156 production lines; the six components that actually draw hold 985 of them and all import the store:
`BaseGate.tsx:3` (+`:71` `wiringFrom`, `:80` `useGateDrag`, `:92`/`:100` `setDestinationPin`, `:115` `setHoveredGate`),
`InputNode3D.tsx:4,61–64,68`, `OutputNode3D.tsx:6,60–63,104`, `BusSplitter3D.tsx:11,43–44`, `BusJoiner3D.tsx`,
`Wire3D.tsx:2,38`; `deriveWire3DProps.ts:1` is typed on `CircuitStore`. So N.8 is either a **fork** (a second copy of
every mesh, maintained while "two renderers coexist for a while") or a **props-ification of the legacy render tree** — a
refactor in a blocking area, contradicting the header. **Edit:** add `N.0 — extract the six mesh components to
prop-only, store-free components (≈985 lines, 6 PRs, expand→migrate→contract)` before N.8 so both renderers share one
mesh layer; delete "mostly new files". N.0 also makes the legacy tree testable, so it pays even if C never happens.

**F2. "The engine, 4,266 lines, is kept whole" (§3) is false by ~830 lines.** `topologicalEval.ts:6` and
`truthTable.ts:2` are typed on `CircuitDocument`; `serialize.ts:1` on `CircuitState`; `deserialize.ts:2–4` builds canvas
entities. N.3 ("the spec evaluates through `compileHDL` — one engine") retires `topologicalEval`'s 363 lines, the
largest file in `src/simulation`; C.2 lists "the evaluator's junction tracing" as a deletion group; C's exit
("`CircuitState` and `junction` no longer exist in `src/`") forces `truthTable` and both serialization files to change.
**Edit:** §3 → "4,266 production lines: ~3,440 (`hdl`, `chips`, `testing`) kept whole, ~830 (`topologicalEval`,
`truthTable`, `serialize`, `deserialize`) canvas-shaped and replaced or re-typed."

**F3. Layout hints are the plan's own escape hatch, and they bring #188's sidecar back through the side door.** §4 says
"No positions in the document, so #188's layout sidecar … are not needed"; the same section then asks whether the spec is
"HDL plus a small sidecar (metadata, test bindings, **optional layout hints**)"; §9 says that if 3D layout is not good
enough, "optional layout hints move into the first version of the spec". Two of the three require what the first denies.
Worse, §9's reassurance for "the owner wants hand editing back" — "`connect` and the other commands are already what a
gesture would emit" — holds for connectivity, **not** for placement: with layout derived there is nowhere for a drag to
write. The layout evidence is thin: **`elkjs` is not a dependency** (`grep elk package.json` → no match); ELK is a 2D
graph-layout library with no layered 3D algorithm — PIVOT said "(ELK for 2D; planar for 3D)", v2 dropped the
parenthetical rather than answering it; and `elk.layout()` is promise-based, so `layout(doc, surface)` cannot be the
pure synchronous function §4 draws. Determinism is unstated (stable part ids, canonical part/net order, pinned ELK
options and version, or N.4/N.6's goldens are flaky), and so is the learner's mental map — under a layered layout one
added part reflows the whole diagram. **Edit:** P.1 decides the sidecar (as a stable `part-id → hint` map) instead of
listing it as a question; §4 says "pure, deterministic, asynchronous" with its preconditions; P.2 gains "name a 3D
placement algorithm and measure a 16-part chip headless", since nothing in the plan or backlog names one.

**F4. Phase C's gate cannot be met as written, and no step produces the list it needs.** "The spec-and-command path can
author everything the legacy app could" (C.1) is not a command, unlike every other exit in §6, and four things the
legacy app authors have no spec form. (i) A work-in-progress circuit: `compiler.ts:124` rejects an unconnected part
input, `:143` a read-but-unproduced signal, `:165` a combinational cycle — every intermediate state of building a chip
is a compile error. (ii) A **bus splitter/joiner**, which ADR-0009 defines as "a new first-class entity, **not** a
gate", with width-dependent pins; HDL expresses bit access as slice notation on a connection, not as a part, so a
splitter with 1 of 16 outputs wired has no HDL form. (iii) Hand-chosen positions and wire paths, which N.2 drops by
design. (iv) Chip metadata and `.tst` bindings — `runChipTest` resolves the chip under test through
`implementationSources.ts`, which offers only `builtin` and the fixture HDL registry, and `appRegistry.ts`'s user chip
registry "Starts empty". **Edit:** C.1 becomes "every scenario in the P.1 capability list passes through the spec
path", the list frozen in the ADR with those four non-goals named; and §4 must say the spec is **parsed** to render and
**compiled** only to evaluate, or an incomplete circuit renders nothing and the act of building is lost.

**F5. The rotation change removes five portfolio rows from the backlog rather than deprioritising them.**
`scripts/backlog.logic.mjs:24` derives `BUCKET_ORDER` *from* `PICK_ROTATION`; `:140` files any task whose bucket is not
in `BUCKET_ORDER` under `unpicked` with reason `on-request`, and `:128` returns `null` for an enabler blocking nothing in
a live bucket (`not-pulled`). `PICK_ROTATION = ['foundation','foundation','harness']` therefore makes `surfaces`, `spine`,
`pubdocs`, `core` and `3d` vanish from `node scripts/backlog.mjs ready` — including 0.5's own #204, #205, #208 and #210,
unless they are relabelled `project:foundation`, which removes them from the surfaces epic's progress metric and the
"Hand in hand" rule. Two more gaps: `DESIGN_FIRST_SLUGS = ['surfaces','core']` (`:18`) has no `foundation`, so P.1 — the
ADR the plan waits on — loses design-first priority in its own slot; and `backlog.logic.test.mjs:80,82,84` assert the
rotation and `DESIGN_FIRST_SLUGS` *literally*, so 0.4 edits an existing test file. **Edit:** 0.4 sets
`PICK_ROTATION = ['foundation','foundation','harness','foundation','spine','aux']`, adds `foundation` to
`DESIGN_FIRST_SLUGS`, and §7 names the `project:` label each 0.5 issue carries afterwards.

**F6. §7's "chips as data / the spine may proceed" describes almost nothing in the spine backlog.**
`gh issue list --label project:spine --state open` returns 15 issues, 13 of them interactive-UI work: #236 (button +
`<TruthTableView>`), #235 (store slice), #174 (thick bus wires), #173 (in-view labels/previews), #172 (composite chip 3D
rendering), #171 (builtin toggle UI), #170 (ChipDefinitionPanel), #169 (chip browser UI), #167 (HDL editor panel), and
exactly **one** (#175) is `agent-ready`. So P.3's half-line — "spine tickets phrased as UI building flows to re-scope as
spec → render" — is the whole row, not a sweep, and §7's claim that the 0.5→0.7 ladder continues is unsupported. It also
misses **#168 (P05-26, "canonical HDL printer + round-trip property")** — N.2's circuit→HDL round-trip, already filed.
**Edit:** say the spine pauses for re-scoping, give P.3 an issue count, cite #168 as N.2's prior art, and drop "chips as
data" from the May-proceed list or name the issue that is one.

**F7. Rule 1 is broken by 1.2, and C.1 contradicts C.2.** 1.2 injects a clock into `serialize.ts` — 107 lines whose only
job is writing the v1 format C.2 deletes ("legacy serialization") — precisely "refactor what you are going to delete".
And C.1 switches the default renderer "with legacy autosaves imported on load" while C.2 deletes the legacy reader in
the same phase. **Edit:** drop 1.2 (or move the clock into the new writer); say which holds — `deserialize` survives
C.2 as `fromLegacyCircuit`'s private reader, or import runs once before the switch and v1 files then die.

**F8. Two dropped findings, one now the plan's only oracle.** #317 ("a scene wait that times out silently passes:
`render.waits.ts` swallows its own timeout" — open, `in-progress`) appears nowhere in v2, yet N.5, N.6 and N.8 all exit
on scene assertions. `src/test/testUtils.ts` also vanished; it exists, and the 21 `@store` specs it serves gate every PR
today. Related: §4's move of ADR-0008's assertions to "properties of `route` and `describeScene`, checked in Node" puts
the seam one step *earlier* than the bug the ADR was created for — `routingScene.test.tsx` renders production `Wire3D`
through `@react-three/test-renderer` and checks the **rendered** graph, so a Node golden over `describeScene` cannot
catch a description→mesh bug. **Edit:** Phase 0 gains #317; N.8 keeps the r3f suite pointed at the new renderer
(GPU-free, runs locally) *as well as* the goldens; say what replaces `testUtils.ts` and the 21 `@store` specs.

**F9. "Unguarded `localStorage`" is wrong, and 1.1 ports the wrong thing.** `chipCompletion.ts:6–13` and `:20–25` wrap
every access in `try`/`catch`, returning `[]` or keeping the in-memory list, so in Node the reference error is caught
and the module already degrades; its test fails headless because `chipCompletion.test.ts:4,14,23` calls `localStorage`
directly. **Edit:** §2 → "a browser-only, already-guarded `localStorage` read"; 1.1 becomes "move completed-chip
tracking out of the engine into session state", not a storage port for 24 lines.

**F10. #210 repeats the error REVIEW 6 corrected, and ADR-0019 does not exist.** §2 now correctly calls #188/#189 ADRs;
but 0.5 lists "#210 (netlist → positions as a pure function), which gates every 2D cell" and N.4 says "building on
#210", when #210's acceptance criterion is "a note + throwaway code" and its verification is `cat
docs/harness/spikes/2d-layout.md`. Separately, **ADR-0019 is cited three times** as the seam the strangler hangs on (§5
rule 1; N.8's `?renderer=…`; PIVOT) while `docs/decisions/` ends at `0018-fidelity-gate.md` — only #315's *title*
mentions it, and ADR-0014 here requires cited paths to exist. Third, the #208-before-#209 exception is under-argued:
#208 commits `.mcp.json` and a tool *name*, and tool count/naming/schema generation is what #209 decides. **Edit:** 0.5
says "#210, then a new implementation issue"; Phase 0 gains "#315 lands and ADR-0019 is written" as a stated
prerequisite of N.8; and say the hand-written MCP tool is disposable and will be regenerated from the registry.

**F11. Undo and the React Compiler are asserted, not argued.** N.10's "Undo is the spec's own history, so no patch log
is needed" is one clause for a system with four writers (editor, commands, CLI, MCP). Whole-document history suits a
~1 KB chip, but needs a single serialisation point, keystroke coalescing and a rule for an agent's 40-command batch —
none named. §4's "React-Compiler-friendly read patterns (the compiler's lint is an error in this repo)"
(`eslint.config.js:32`) names a constraint and draws no consequence; the concrete one is the **test bridge**:
`circuitStore.ts:332–341` publishes `window.__CIRCUIT_STORE__`/`__CIRCUIT_ACTIONS__` at module scope *because* the store
is a module singleton, and 36 e2e files ride that contract. A factory store behind context has no module scope to
publish from, so the bridge moves to a mount-time effect and the readiness contract changes — which is exactly what
#317 makes unsafe. **Edit:** a paragraph in N.7 on the bridge; a sentence in N.10 naming writer and batch rule.

**F12. What the owner is not told: the strongest objection, and the cheaper option.** §3 answers "you lose the headline
interaction" with "there is no interval" and "it can come back" — both fair. It omits the harder objection: once nothing
is manipulated in space, **the canvas has a weak claim to being 3D at all**; a 2D schematic reads a netlist better, and
the 3D surface's cost is unchanged by the pivot (neither `test:e2e:store` nor `test:e2e:ui` runs on his laptop — both
mount the canvas — and N.8 still needs cloud QA under ADR-0016), so "this collapses the 3D QA burden" holds for
*interaction* coverage, not for *locality*. And a cheaper honouring of his three directions is never weighed: **freeze
the legacy canvas as it is — no deletion, no new work on it — build only the spec-driven path, defer cut-over
indefinitely.** Cost: ~6,000 lines and the `@ui`/`@store` suites stay in CI and the bundle, and §8's exit "the
known-violations file is empty" becomes "frozen". Gain: Phase C disappears — the document's largest diffs and its one
unmeetable judgment (F4) — his "if manual 2d/3d edits are ever needed we can consider that in the future" stays
literally true, and no state of the product is ever worse than today's. **Edit:** add it to §9 as a named third
alternative — the only one that does not ask him to approve a deletion; §5's rule 1 goes straight from "don't refactor
what you will delete" to "cut over; delete" without pausing there.

**F13. Sequencing, and writing.** (a) **N.1–N.3 need nothing from Phase 1** (spec model, importer and `compileHDL` touch
`src/core` only), so serialising N behind Phase 1 buys nothing; say N may start beside Phase 1 once P.1 is accepted.
(b) **Rule 3 ("characterization before change, in its own earlier PR") is violated by the plan's own largest change:**
nothing in Phase 0/1 records what the legacy renderer draws today, so N.8's "shows an imported legacy circuit" has no
baseline. Add #217 (`__SCENE_HELPERS__.describe()`, 2 direct importers) to Phase 0, record goldens for a few reference
circuits, diff N.6 against them. (c) §3's "about 3,000 lines (13%)" and its router aside should be one conditional
range: 3,000–6,600 production lines, 13–29%.
