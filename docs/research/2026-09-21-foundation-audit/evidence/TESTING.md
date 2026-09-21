# T1 — Testing audit and target strategy

2026-09-21 · measured at `origin/main` `625c2c0` in a throwaway detached worktree (removed) · designed for
`REPORT.md` v2 §4/§6: surfaces read-only, the spec the only editable artefact, `layout` / `route` /
`describeScene` pure. Builds on `MEASUREMENTS.md` (F1) and `RESEARCH.md` (F2), whose numbers are not re-derived.
Every claim is **measured** unless it says *inferred* or carries **[R]** (outside source, URL fetched
2026-09-21, cited at each use).

## 1. Verdict on today's testing

### 1.1 What each layer has actually caught

Sources: `docs/harness/ledger.md`, `docs/development/observed-bugs.md` (B-001…B-008), ADR-0008's context,
verifier verdicts on the 44 PRs merged since 2026-09-18 (24 verdict comments, **8 BLOCK**), `git log --grep
'^fix('` (52 commits).

| # | Real defect | Caught by | Should have been caught by |
|---|---|---|---|
| 1 | #238 `truthTable.ts:35` — table read leftover pin state; one circuit gave two tables | **verifier repro** in Node via `circuitActions` | property `table(doc) === table(deserialize(serialize(doc)))` |
| 2 | #312 — 6 e2e sites drove *unconnected* pins; the affordance was removed under them | **`@store` e2e in `browser-qa`**, read by the verifier | Node characterization of the same store+engine seam |
| 3 | #248 — `CONTRIBUTING.md` never linked the recipe it claimed to | verifier `grep` | `lint:docs` extended past REPO_MAP/AGENTS |
| 4 | #273 — `sev:*` is an *issue* label; no PR ever carried one, so the critical gate never fired | verifier + `gh pr list --label sev:high` → `[]` | unit test with a **realistic** fixture |
| 5 | #294 — an agent's self-rated `sev:critical` jumps its own issue to the front of the pick rule | verifier ran `planReady` on 4 synthetic issues | policy/property test on the pick rule |
| 6 | #305 — `.cursor/cli.json` written with the wrong schema; `cursor-agent` rejected every run | **verifier live-run against the real binary** | contract test against the real dependency |
| 7 | #319 — a killed run records `usage {0,0,0,0}`, so timeouts escape the budget | verifier repro on a pure function | property test over NDJSON streams |
| 8 | #320 — `fetch_origin` reports "timed out after 60s" for *any* failure | verifier ran it with a bogus remote | error-path test |
| 9 | B-004 / B-004a — rendered wires merged onto one track | **human adversarial review**; it "passed 1490+ unit tests" (ADR-0008) | the scene-graph layer — **created in response**, and it holds it now |
| 10 | B-004b (CASE2) — same-column confluences merge; the ADR-0008 oracle shares the flaw | automated LLM reviewer on PR #128 | still **Open**; needs confluence *owner* identity |
| 11 | B-002 — toast overlapped the action bar | human, looking at the app | `@ui` bounding-box spec — written **after**, as the guard |
| 12 | B-001 — placement preview lacks contrast in light mode | human, looking at the app | nothing automated; perceptual |
| 13 | B-008 — disconnected input pins keep stale values | noticed during bus work; fixed by #312 | evaluation property (undriven pin ⇒ 0) |
| 14 | B-005 — autosave test timed out under parallel load | the suite itself (a flake) | test design; no product defect |
| 15 | #321 — `trackRender` has an unconditional early `return`; dead for some time | **an agent reading the code** while fixing #317 | dead-code lint / coverage floor |
| 16 | #317 — `render.waits.ts` swallowed its timeout; its 3 helpers have **zero callers** | code reading (PR #322) | dead-export lint on `e2e/` |

**Discovery tally:** verifier **7** · human inspection **3** · code reading **3** · LLM reviewer **1** ·
`@store` e2e **1** · unit suite **0** · scene-graph layer **0** · types **0** · lint **0** · `@ui` **0** ·
`@tour` **0**. Read it correctly: the unit suite's 1,959 tests are why **38 of 38 scored CI runs are green**
— that is regression prevention, and it is real. But **no defect in the record was discovered by an
automated layer except #312, and #312 was store-and-engine semantics a Node test could reach.** The layer
that finds defects is a fresh-context agent that writes a repro and runs the real thing.

### 1.2 Cost per layer (GitHub Actions, last 40 runs per workflow)

| Job | n | median | p90 | outcomes | runs per PR? |
|---|---|---|---|---|---|
| `ci.yml` | 40 | **158 s** | 168 s | 38 success, 0 failure, 0 re-runs | always |
| `browser-qa` | 40 | 14 s | 178 s | 14 success, 1 failure, **24 cancelled** | almost never *executes* |
| `e2e.yml` (manual) | 1 | 450 s | — | 1 success | never automatic |
| `ui-tour.yml` | **0** | — | — | — | has not run since it landed |

`ci.yml` steps on a green run: install 7 s · **lint 40 s** · `lint:docs` 0 s · **vitest 84 s** · build 15 s.
Vitest's own report: **134 files, 83.53 s — `tests` 16.63 s, `environment` 140.58 s cumulative across
workers**, `import` 50.50 s, `setup` 11.71 s, `transform` 14.79 s. **Under 20 % of the unit-suite wall clock
is running tests**; the rest stands up jsdom and the import graph for 134 files, 82 of which reach a DOM/3D
library (F1 §7). In those same 40 runs `browser-qa` actually executed Playwright **twice** (178 s pass, 214
s fail), skipping in 10–21 s otherwise and cancelled 24 times by `cancel-in-progress` churn: **107 `@store`
tests, 2.4 min, exercised twice in three days**, and the one failure was real (#312), identical across both
retries. Flake evidence is local only — #313 records **four false unit timeouts in one day on the laptop**,
one of which made a verifier BLOCK wrongly, and **0 tests set an explicit timeout** (F1 §7).

### 1.3 What the e2e suites test, spec by spec

**Correcting the brief's counts.** `e2e/` holds **31 spec files**: **17 `.store.spec.ts`** (73 static
`test()` calls → the **107** tests CI reports, via parametrised loops), **13 `.ui.spec.ts`** (40), **1
`@tour`**. "21 / 17" counts `test.describe` blocks, not files. `e2e/` total: 70 files / 7,291 lines, specs
4,626. Classes: **(a)** engine semantics reachable in Node · **(b)** store logic reachable in Node · **(c)**
DOM-shell, jsdom or canvas-less browser · **(d)** genuinely 3D/pixel · **(e)** a hand-editing gesture the
read-only decision deletes.

| Spec (cases) | seam | class |
|---|---|---|
| `builtins/placement.store` (1×N) · `bus/bus-placement.store` (2) | toolbar click → `placeGate`; `placeBusSplitter`, `startBusPlacement` | **e** |
| `gates/gate-placement.store` (6) · `gate-movement.store` (7) | grid snapping on `gates[].position`; `rotateGate`, `updateGatePosition`, `selectGate` | **e** — layout's job now (2 selection cases → **c**) |
| `gates/gate-types.store` (6) | `addGate`, pin counts, `removeGate` | **a/b** |
| `simulation/signal-propagation.store` (6) · `testing/test-results.store` (2) | `addWire`+`simulationTick`+pin reads; `runChipTest('Not','builtin')` | **a** |
| `simulation/simulation-control.store` (3) · `performance/performance-mode.store` (2) | `toggleSimulation`; `setPerformanceMode` + localStorage | **b** |
| `persistence/circuit-persistence.store` (3) · `wiring/wire-creation.store` (7) | save/clear/load, `importCircuitJSON`; `addWire`, pin `isConnected`, cascade delete | **b** |
| `wiring/wire-persistence.store` (6) | wire survives gate move/rotate | **b** → re-`route` after re-`layout` |
| `simulation/status-bar.store` (1) · `ui-shell/pinout-panel.store` (1) | `statusMessages`+`data-severity`; `addInputNode` → `pin-toggle-a` DOM | **c** |
| `wiring/node-wiring.store` (9) · `node-rename.store` (4) | nodes, junctions, fan-out, cascade delete; HDL identifier validation | **b**; junction parts **e** |
| `wiring/junction-placement.store` (6) | `placeJunctionOnWire`, `startWiringFromJunction` | **e** (all) |
| `gates/{movement,placement,types}.ui` (15) · `wiring/wire-creation.ui` (5) | toolbar click, `ArrowRight`, selection; pin click → `completeWiring` | **e**; keyboard-rotate **c** |
| `ui-shell/{properties-panel,keyboard-shortcuts-modal,node-rename-via-properties-panel}.ui` (10) | panel open/close/label, `?`+Esc modal, type+Enter / Escape | **c** |
| `ui-shell/{right-action-bar-info,coming-soon-tooltips,theme-toggle}.ui` + `performance-mode.ui` (6) | drawer + live count, disabled buttons, `html.dark`, settings popover | **c** |
| `ui-shell/toast-no-overlap.ui` (3) · `performance/render-sanity.ui` (1) · `tour/app-tour` (1) | `boundingBox()` overlap incl. mobile; 3D readiness; screenshots + a11y per step | **d** |

**Counts (114 static cases): a = 8 · b = 32 · c = 28 · d = 5 · e = 41.** So **36 % of the e2e suite loses
its subject**, **35 % is store logic that belongs in Node**, **25 % is DOM-shell work a canvas-less browser
does locally**, **4 % is genuinely pixel-level.** And **duplication, measured:** the `@store` suite drives
**43 distinct `__CIRCUIT_ACTIONS__` methods; all 43 are already named in at least one `src/**/*.test.ts`**
(`addGate` in 26 files, `addInputNode` 21, `addWire` 20). *Caveat: a name match is not a semantic match.* No
action the browser suite reaches lacks a Node-side test file; what the browser adds is "through the built
bundle".

### 1.4 Test quality signals

Whole corpus: 124 `src` test files, 1,458 static `it/test`, 3,189 `expect(`, 285 `vi.mock|spyOn|fn`.

- **0 snapshot tests, 0 assertion-free files.** Weakest ratio is 1.0 assert/test across 15 files, all
  single-assert table tests (`formatColumnValue` 14/14, `multiBitFormat` 19/19) — defensible.
- **Mocking the thing under test is the real flaw.** `ChipBody3D.test.tsx` mocks `@react-three/fiber`
  **and** `@react-three/drei` (17 mocks, 3 tests) — it asserts on stand-ins for the renderer the component
  is written against; `WirePreview.test.tsx` mocks the router (`wiringScheme/core`) and `Wire3D`, proving
  wiring-up, not geometry; then `gateHandlers` 30 mocks, `groundPlaneHandlers` 22, `useKeyboardShortcuts`
  17. **Every one is class (d)/(e) code — mock density tracks the gesture machinery exactly.**
- **`src/test/testUtils.ts`**: 223 lines, **two** exports, **6** importers — yet it co-changes with
  `store/types.ts` in **9 PRs** (F1 §6). *Inferred:* the coupling is `createMockStore` naming every
  `CircuitState` field, not breadth of use; under the new store it has no successor. Pairing cost nearby:
  `wiringActions.ts` (966) + its test (1,547) = 2,513 lines to change one wiring rule.
- **Dead test infrastructure, scanned exhaustively:** of **96 exported symbols across `e2e/`'s 39 non-spec
  files, 43 (45 %) have no caller anywhere in `e2e/`, `src/` or `scripts/`** — all of `e2e/scenarios/` (5
  files, 206 lines), `store.assertions.ts` 6 of 8, `render.waits.ts` 5 of 8, `simulation.actions.ts` 5 of 9,
  `toolbar.actions.ts` 4 of 8, `canvas.selectors.ts` entirely. Same rot as #317 and #321, and nothing
  detects it; `circuitStore.ts:28` still imports `renderTracking` for instrumentation that unconditionally
  returns.

### 1.5 The oracle nobody is using

- **Zero `.tst`/`.cmp`/`.hdl` files exist in the repository**; the vectors are TypeScript template strings
  in `core/testing/project1{Tst,Cmp}Fixtures.ts` (16 keys each). **They are faithful and they are used.**
  Comparing all 15 chips with an upstream counterpart against `web-ide/projects/src/project_01/*.ts`,
  comments and whitespace normalised: **15 identical, 0 differ, 0 missing**, `.tst` and `.cmp` alike (`Nand`
  is HACER's 16th; no Project-1 stub). And `engine.test.ts:137` runs `it.each` over all 16 against the
  builtins with the matching `.cmp`. So the official oracle *is* wired — Project-1 builtins only, from a
  hand-copied corpus nothing keeps in sync.
- **No differential test against `web-ide/simulator` exists. I built one and it works.** In a temp dir
  outside both repos: `web-ide/{projects,runner,simulator}` + a 4-line workspace `package.json`, `npm
  install`, `tsc --build`. An `And` built from two `Nand`s, with the **official** `And.tst` / `And.cmp`,
  through `@nand2tetris/simulator/projects/runner.js` (`maybeParse` → `maybeBuild` → `tryRun`): **pass,
  output byte-equal to the official `.cmp`. All 15 Project-1 vectors run in 81 ms**, and the harness
  correctly **rejects the upstream stub HDL 15/15** — not vacuous. Nor is headlessness in doubt: `command
  grep -rE '\b(window|document|localStorage|navigator|HTMLElement)\b'` over `web-ide/simulator/src` non-test
  files returns **0 files**.
- **Three frictions, all fixable:** (1) all three `@nand2tetris/*` packages are `"private": true` with
  `"exports": {"./*": "./build/*"}` — **not on npm**; vendor or build from the checkout. (2)
  `@davidsouther/jiffies` is pinned `^2.2.5` but npm resolves **2.3.0, which ships 239 `.ts` and exactly 1
  `.js`** — every `lib/esm/*.js` import fails at runtime; **pinning 2.2.5 (163 `.js`) fixes it**, and that
  upstream breakage is why a naive "just import the reference simulator" would have failed. (3) `tsc --build
  simulator` emits JS **despite 4 type errors** (ohm-js drift) — fine for a vendored artefact, unacceptable
  as a CI gate.
- **Licence and coupling:** web-ide is **MIT**, and the rule is "adapt capability, don't couple", so the
  shape is a **dev-only, pinned, vendored differential harness**, run in CI and on demand, never imported by
  `src/`. The **vectors** (`hdl`/`tst`/`cmp` string exports) are plain data and can be vendored verbatim
  with attribution, replacing the hand-transcribed copies.

## 2. The target strategy for the read-only-projection architecture

| # | Layer | For | Runs | Budget | Oracle |
|---|---|---|---|---|---|
| 1 | **Node unit + property** | engine, spec model, commands, store slices | **local, every save** | **< 10 s for the whole node project** | assertions + `fast-check` properties |
| 2 | Official-vector conformance | nand2tetris semantics | local + CI | < 1 s (81 ms measured for 15) | vendored `.tst`/`.cmp`, protected |
| 3 | **Differential vs the reference simulator** | "is our engine the same machine?" | CI + on demand | < 30 s | `web-ide/simulator`, pinned & vendored |
| 4 | Scene-description goldens | `layout` / `route` / `describeScene` | Node, inside layer 1 | in the 10 s | ADR-0008's seven assertions as properties |
| 5 | **Canvas-less browser** (`?renderer=none`) | DOM shell: panels, editor, keyboard, toasts | **local** — ADR-0019 / #291 / #316 | < 60 s | DOM roles + `boundingBox()` |
| 6 | 3D smoke + tour | the canvas mounts; the product role's eyes | **cloud only** | ≤ 3 min | `__SCENE_HELPERS__.describe()` (#217); screenshots for humans |

**Why not the trophy.** Dodds' trophy ("mostly integration") and Spotify's honeycomb are doctrine — both
pages state claims, neither publishes a number **[R: kentcdodds.com/blog/the-testing-trophy-and-testing-classifications; engineering.atspotify.com/2018/01/testing-of-microservices]**. Google's published
mix is **80 % small / 15 % medium / 5 % large**, small meaning *single process, no I/O, no sleeping*, and
Google measured that **larger tests are more flaky** **[R: abseil.io/resources/swe-book/html/ch11.html;
testing.googleblog.com/2017/04]**. §1.1 says the same locally. The read-only architecture makes almost
everything a pure function, so HACER should be **pyramid-shaped and almost entirely "small"** — and the
deciding reason is not doctrine but that layers 1–4 run in seconds on a 2019 laptop while 5–6 cannot run
there at all. (Layer 0 is unchanged: types and layer rules — `tsc -b` + `dependency-cruiser` shrink-only,
REPORT §6 0.1 — inside today's 40 s lint.)

### 2.1 The properties, named against this system's functions

`fast-check` **4.10.2** (2026-09-19) with `@fast-check/vitest` **0.5.0**, peer range `vitest ^4.1.0 || ^5.0.0`
— **HACER's Vitest 4.1.2 is supported with no upgrade**. Default `numRuns` is **100**; **the seed defaults to
`Date.now() ^ random`, so CI must pin it** (`fc.configureGlobal({ seed })`) or a failure is not reproducible
**[R: registry.npmjs.org/fast-check, /@fast-check%2Fvitest; `QualifiedParameters.ts`]**. Issue **#198**
already exists for this; here is its content.

| Function | Property |
|---|---|
| `parseHDL` / `toHDL` | `parse(print(parse(s))) ≡ parse(s)` — round-trip on the AST, not the text |
| `fromLegacyCircuit` | `evaluate(import(doc)) ≡ evaluate(doc)` for every input vector — REPORT §6 N.2's stated test, as a property over generated legacy documents |
| `compileHDL` vs `evaluateCircuit` | same outputs for the same netlist — #190's "one engine", as a metamorphic relation that survives the merge |
| `evaluate` | an input pin no wire drives reads 0 — **B-008 / #312 stated once as a property, not as cases**; and De Morgan / gate-reorder rewrites preserve the truth table — metamorphic, needs no reference **[R: Segura et al., *A Survey on Metamorphic Testing*, IEEE TSE]** |
| `layout(doc, surface)` | deterministic; no two part footprints overlap; every part inside the surface — replaces `gate-placement.store`'s 6 grid-snap cases |
| `route(doc, placements)` | endpoints connect to the pins they name; no segment crosses a chip body; **lane exclusivity** (no two distinct nets collinear on one track); canonical net order ⇒ order-independent output. **ADR-0008's seven assertions restated as properties of a pure function** — exactly what REPORT §4 asks for |
| `describeScene(...)` | stable under irrelevant permutation (part insertion order); every wire appears exactly once; ids total |
| commands (`addPart`, `connect`, `disconnect`, `setInput`, …) | model-based: a shadow model agrees with the store after any command sequence; `undo(do(s)) ≡ s`. Catches the class #319 was — a designed code path nobody enumerated |
| `serialize` / `deserialize` | round-trip preserves evaluation; **version dispatch is total** (Phase 1.3's exit test) |

### 2.2 Scene testing, and why pixels stay rejected

`@react-three/test-renderer` is **already a devDependency** (`^9.1.0`; stable **9.1.1**, 2026-07-31, v10 in
alpha — actively maintained), and its README is explicit: it snapshots the scene graph "**without the need
for webgl & browser**" **[R: registry.npmjs.org/@react-three%2Ftest-renderer; pmndrs README]**. Node is
blocked only by `src/test/setup.ts:43` patching `HTMLCanvasElement` — confirmed: `vitest run
src/components/canvas/routingScene.test.tsx --environment node` fails at that exact line, not at anything
R3F does. Its role **shrinks** under the target: once `describeScene` is pure with goldens, the renderer's
job is "draws what the description says" — one thin conformance suite, not seven routing assertions.
(`toGraph()` omits `attach`-ed children **[R]**, so material state is outside it either way.)

**Pixel diffing stays rejected, on the vendor's own words.** Playwright documents `threshold` (default 0.2,
YIQ), `maxDiffPixels` and `maxDiffPixelRatio` (both unset by default) and warns that "browser rendering can
vary based on the host OS, version, settings, hardware, **power source (battery vs. power adapter)**,
headless mode, and other factors". **Playwright documents nothing about SwiftShader or software-GL
determinism** **[R: playwright.dev/docs/test-snapshots, /docs/api/class-pageassertions]**. ADR-0008 already
rejected screenshot diffs; this adds the citation. Screenshots stay in `@tour`, for humans, never as an
assertion.

## 3. Fate of every existing suite

| Fate | Files | Cases | Destination |
|---|---|---|---|
| **Delete with the legacy code** (e) | 9 whole + parts of 4 | **41** | placement modes, junction placement, wire drawing, gate drag / arrow-rotate, toolbar placement |
| **Port to Node** (a + b) | 11 | **40** | layer 1 — store slices, engine, persistence, rename validation, simulation control |
| **Port to the canvas-less shell** (c) | 9 | **28** | layer 5, `?renderer=none` (#291 / #316) — panels, modals, theme, status bar, pinout |
| **Keep as browser** (d) | 3 | **5** | layer 6, cloud only — toast overlap geometry, render sanity, `@tour` |

Plus, now and regardless of phase, **the 43 of 96 dead `e2e/` helper exports** — though `e2e/scenarios/` is
not deleted blindly: **#195** lifts it into `src/scenarios` with core and store drivers, so dead e2e code
becomes layer-1 input (#279 is the same idea one level up).

**Unit (124 files):** move the 36 files / 722 tests F1 measured as Node-ready into the `node` project
(**#323**; close **#178** as duplicate); keep DOM-shell component tests on jsdom; **rewrite rather than
port** the heavy mockers (`ChipBody3D`, `WirePreview`, `gateHandlers`, `groundPlaneHandlers`, the three drag
hooks) — most disappear with their subjects, and what survives asserts on the real scene description; delete
`src/test/testUtils.ts` with the legacy store.

**Characterization that MUST be captured before the legacy app is replaced** — each its own earlier PR
(REPORT §5 rule 3), because none of it is recoverable afterwards:

1. **ADR-0008's seven rendered-geometry behaviours** as golden `describeScene`-shaped data from *today's*
   app, for the circuits the ADR names (`Mux4Way16` 5-input fan-in, `Mux8Way16` 9-input, the two-transit
   CASE1 case, the node-drag re-route, the mixed 5-gate sweep). Capture the **data**; the assertions become
   properties of `route`. **B-004b (CASE2) is Open and the oracle shares its blind spot** — say so, so the
   golden does not enshrine the bug.
2. **Evaluation results on fixture circuits**, before and after `serialize`→`deserialize`, for junction
   chains, the malformed loops the evaluator guards against, mixed widths and `'bus'` endpoints (REPORT §6
   P.2's list) — `fromLegacyCircuit`'s only acceptance test.
3. **The 16 Project-1 `.tst`/`.cmp` runs** frozen as expected output (so #190's "one engine" is checked
   against today's answers, not its own new code), and **the 43 store actions the `@store` suite drives** as
   Node fixtures **before** `CircuitState` changes — the only record of what the browser suite protected.

## 4. How tests defend against the agents that write the code

The problem is not bad code; it is that **a passing suite is a weak oracle**. Complementary to F2's evidence:
SWE-Bench+ found **32.67 % of successful patches involved solution leakage and 31.08 % passed only because
of weak tests**, dropping SWE-Agent+GPT-4 from 12.47 % to 3.97 % after filtering **[R: arXiv 2410.06992]**;
PatchDiff found **29.6 % of test-passing patches behave differently from ground truth, 7.8 % of "correct"
patches fail the developers' own suite** **[R: arXiv 2503.15223]**. Both papers' strong oracle is
**differential comparison against a known-good implementation** — and HACER has one in the workspace (§1.5).

| Test | Author | Rule |
|---|---|---|
| Red test; properties for a pure function | **implementer** (properties reviewed as design) | TDD stays the iron law; red = a test plus a compiling stub that fails (ledger, 2026-09-18). Weakening a generator to go green is what #151's tamper flag should catch |
| The **repro** for a blocker | **verifier** | already the highest-yield layer — 7 of 8 blocks in §1.1 |
| **Differential + official vectors** | **nobody — they are fixed** | vendored, pinned, **protected path**: the held-out oracle the implementer cannot edit |
| Characterization goldens | **a separate, earlier PR** | REPORT §5 rule 3 |

Extend **#151** (already open: protected paths, removed `expect()`, added `.skip`/`.only`) to cover the
vendored vectors, the differential harness, `src/test/**` golden data and `*.characterization.*`; REPORT §5
rule 4 is the same defence generalised, mechanised after Phase 1 as the plan already says. And from the
coordinator's note on #312 — *"the builder could not run Playwright locally and builders do not watch CI, so
the fresh-context verifier reading the PR's CI logs was the only layer that could see it"* — make "read the
PR's own CI logs, including `browser-qa`" a numbered `verifier-brief.md` step.

**Mutation testing: still no.** Stryker **10.0.0** (2026-08-14) has incremental mode but **no
`--since`/diff-only flag — the config schema has no such key**; the only diff lever is hand-narrowing
`mutate` globs, and the Vitest runner forces `coverageAnalysis: "perTest"` and `threads: true` **[R:
stryker-mutator.io/docs/stryker-js/{incremental,vitest-runner}; stryker-core.json]**. The cost model is
unchanged since ADR-0011 — a full suite run per mutant — which removed it because it "never produced a
finding that changed the code, while repeatedly blocking otherwise-green PRs". **Nothing here reopens
that.** Property testing on the pure engine is cheaper and better aimed: it states the invariant a mutant
would have to preserve, runs 100 cases in milliseconds, and is readable evidence in a PR. *Revisit only if*
the differential harness and the property suite are both green for a quarter and defects still land in
`src/core`.

**Flake policy.** Google measured **1.5 % of all test runs flaky, 16 % of tests flaky at some level, 84 % of
pass→fail transitions involving a flaky test**, and quarantines automatically — while warning that
quarantine "could easily mask a real race condition" **[R: testing.googleblog.com/2016/05]**. HACER's flakes
are all local and load-induced (#313, B-005). So: **(1)** explicit per-test timeouts, never the 5 s default;
**(2)** a failure an agent cannot tie to the diff is a machine problem until re-run at `origin/main` —
already in `verifier-brief.md`; **(3)** **no quarantine list**: with 0 CI failures in 40 runs there is
nothing to quarantine, and building it early invites the masking Google warns about.

## 5. Ordered, PR-sized issue list

Existing issues reused; **new** marks something that does not exist; phases are REPORT §6's.

| Phase | # | Issue | Unblocks |
|---|---|---|---|
| 0 | a | **#323** Vitest `node` project for the ~36 headless files (close **#178** as duplicate) | every later Node layer; removes jsdom there — partial #313 fix |
| 0 | b | **new** — move the `HTMLCanvasElement` patch out of the shared setup into the jsdom project's own setup | the single line blocking `src/store`, `src/core` **and** `routingScene.test.tsx` from Node |
| 0 | c | **#313** explicit per-test timeouts, no test on the 5 s default; **#317** (in progress); **new** — delete the 43 dead `e2e/` exports and all of `e2e/scenarios/`, add a no-dead-export check to `lint` | stops false BLOCKs; ~600 lines of rot; prevents the next #317 |
| 0 | d | **#321** remove `trackRender`, its 4 call sites and `circuitStore.ts:28`; **new** — set `testMatch: '**/*.spec.ts'` in `playwright.config.ts` | one F1 layering violation, free; a Vitest file under `e2e/` currently breaks `playwright test --list` |
| 1 | a | **new** — vendor the official Project-1 `.hdl`/`.tst`/`.cmp` from `web-ide/projects` (MIT, attributed) into a **protected** path; assert the 16 transcriptions match | a held-out oracle no implementer may edit; §1.5 shows 15/15 already match, so this is a lock, not a change |
| 1 | b | **new** — dev-only differential harness vs `web-ide/simulator`: vendored, **jiffies pinned to 2.2.5**, one CI job, never imported by `src/` | the strongest oracle available; 81 ms for 15 vectors, measured |
| 1 | c | **#182** inject storage into `core/testing/chipCompletion`; **#181** `deserialize` returns warnings as data | REPORT §6 1.1; closes the 7-file cycle |
| 1 | d | **#151** tamper flag, extended to 1a/1b and `*.characterization.*` | §4's "what an implementer may not touch" |
| 1 | e | **new** — `verifier-brief.md`: read the PR's own CI logs, including `browser-qa` | the #312 lesson, mechanised |
| P | a | REPORT §6 **P.1** ADR — record that ADR-0008's assertions become properties of `route`/`describeScene`, and that pixel diffing stays rejected (with the Playwright citation) | supersedes ADR-0008's *mechanism*, keeps its *content* |
| P | b | **new** — characterization capture PR (§3), before any pipeline code; **#210** spike, with "golden scene description in Node" added to its exit | the only irreversible step in the plan; layer 4 |
| N | a | **#198** fast-check model-based test over circuit commands; **new** — properties for `layout` and `route` (determinism, no-overlap, endpoints, lane exclusivity) | §2.1's rows; the defence against vacuous tests; N.4 / N.5's exit test |
| N | b | **#195** lift `e2e/scenarios` into `src/scenarios` with core + store drivers; **#166** Project-1 scenario suite | dead e2e code becomes layer-1 input; layer 2 end to end |
| N | c | **#279** → **#204** → **#205** → **#208** (MCP, in-memory-transport tests) | the scenario suite *is* the capability matrix (REPORT §6 0.5) |
| N | d | **#291** / **#316** canvas-less shell + the first local `@shell` Playwright project | **layer 5 — the 28 class-(c) cases, on the owner's laptop** |
| N | e | **#216** `test` render mode (frameloop never, dpr 1, fixed clock, seeded RNG) | makes layer 6 deterministic enough to be worth running |
| C | a | **new** — delete the 41 class-(e) cases and their 9 spec files with the gesture machinery, one consumer group per PR | REPORT §6 C.2 |
| C | b | **#217** `__SCENE_HELPERS__.describe()`; **#257** independent QA agent for critical PRs | layer 6's only assertion seam; replaces what `@ui` was nominally for |
| C | c | **#290** docs sweep: stale "run `test:e2e:store` locally" lines | contradicts ADR-0016 as amended |

For **#208**: the MCP TypeScript SDK ships `InMemoryTransport.createLinkedPair()`, but its docs lead with
driving a real `Client` in-process via `handler.fetch`, noting `createLinkedPair` "connects 2025-era
instances only" **[R: modelcontextprotocol/typescript-sdk `docs/testing.md`]** — the issue should say which.

## 6. Could not verify

- **Vitest per-file timings.** No JSON reporter runs in CI, so only the aggregate exists (134 files, 83.53
  s; `tests` 16.63 s); producing the ranking is a one-line `--reporter=json` change in `ci.yml`.
- **Flake rate re-run-to-green.** `attempt > 1` is **0** across all 160 runs fetched, and `gh run list` does
  not expose Playwright's internal `--retries 2`. The one `browser-qa` failure was not a flake. So **no CI
  failure in this window was re-run to green**, and I cannot rule out earlier ones — the API returned only
  to 2026-09-19 (`ci.yml`) / 2026-09-21 (`browser-qa`) at limit 40.
- **"Named in a unit test" ≠ "same behaviour asserted."** §1.3's 43-of-43 finding is a name-level match; a
  per-assertion comparison (107 e2e vs 1,458 unit tests) was not done. Relatedly, **whether `@ui` has ever
  caught anything is *unmeasurable*, not zero**: it never runs in CI (ADR-0016) and `e2e.yml` has one manual
  run in the window — except B-002, where the spec was written as a guard after a human found the bug.
- **Whether HACER's engine and the reference simulator agree.** The harness runs and is non-vacuous; I did
  **not** put HACER's engine through it, because that needs `src/core` importable standalone (REPORT §6 1.5
  — `src/core/index.ts` does not exist). That is issue 1b's first task.
- **Local full-suite wall clock** — deliberately not measured (laptop load, #313). And **Segura et al.'s "119
  papers"** plus the Microsoft 4.6 % / 86 % flaky figures are secondary-source only: abstracts read, counts
  not confirmed in the PDFs.
