# F1 — Foundation measurements (HACER)

**Repo** `mezivillager/hacer` · **commit measured** `6e6e636f0cee7cb7a7c88ff0676bfce18d415bbe` (`origin/main`, 2026-09-21 13:07 +0300, fetched 2026-09-21 13:26).
**Method** read-only, detached worktree from `origin/main`; Node 22.19.0; scripts in `foundation/scripts/`.
GitNexus not used (no index confirmed at this commit).
Every number below is **measured** unless the line says *inferred*.

Reproduce: `zsh foundation/scripts/run.sh <path-to-a-clean-hacer-checkout>`

---

## Summary

| # | Dimension | Headline number | How bad, on the evidence | Tracked? |
|---|---|---|---|---|
| 1 | Blast radius of imminent work | 4 of 10 ready issues touch ≥84 files' direct importers; 4 touch ≤6 | **Split**: the UI-seam tickets are genuinely small; the four core-seam tickets are not small anywhere in this tree | tracked (#181 #185 #186 #188 #189 #190) |
| 2 | Layering | **16 production cross-layer import edges** (12 value, 4 type-only); **3 cycles**, 1 spanning 7 files across `store`↔`core` | Rule is broken in exactly the places the surfaces work needs; the wall is a convention, not a check | tracked (#181 #185), partly new |
| 3 | Coupling | `store/types.ts` fan-in **59/173 prod files**; **118 of 305 files import `src/store`**; **163 deep imports** bypass an existing `index.ts` | One god-type; directory entry points exist but are not honoured | new |
| 4 | Monolith | prod file p50 **76** / p90 **292** / max **1021**; function p50 **15** / p90 **85** / max **678** | Files are fine. **Functions are not**: 9 over 200 lines, the biggest is a 678-line slice factory | partly tracked (#189) |
| 5 | Effects in pure layers | `src/simulation` prod: **0 effects**. `src/core` prod: **1 unguarded `localStorage`**, **1 `notify` (sonner)**, **1 `new Date()`** | Nearly clean — three sites stand between `core` and headless | tracked (#181 #186); the `localStorage` site is **new** |
| 6 | History / tangling | **1 of 41** PRs merged since 2026-09-18 touched `src/`; over all 149 merged PRs, a src-touching PR has p50 **8** src files across p50 **2** top-level dirs, p90 **43 / 6** | The agent loop has **almost no evidence** on application code; historical src PRs were wide | new |
| 7 | Test seams | **0** directories run without jsdom; **82 of 124** test files reach a DOM library — including **21 of 21** `src/store` tests | The state layer cannot be tested headless today | tracked (#185), partly new |
| 8 | Public surfaces | `src/simulation` has **no `index.ts`**; `src/core` consumed **41 deep vs 3 via index**; **2** `src/`→`e2e/` value imports | No module in `src/` is consumed as a package | tracked (#185), partly new |
| 9 | Doc drift | REPO_MAP **1 dead path of 97**; AGENTS.md **0 of 45** | Largely fixed since the 2026-09-18 REPORT (which measured 45/118) | tracked (#153), now mostly closed |
| 10 | Reconciliation | 7 findings tracked, 4 partly, **5 new** | See §10 | — |

---

## 1. Blast radius of the work that is actually coming

Seed = the files the issue body names plus the files that actually contain the named construct.
`direct` = files importing a seed (the set a change of shape forces you to re-read). `trans` = transitive
reverse closure. `prod` excludes `*.test.*`. Script: `blast-all.mjs` (seed sets are literal in the script).

| Issue | What it is | Seeds (files / LOC) | Direct importers (prod) | Transitive | Layers in the direct set |
|---|---|---|---|---|---|
| **#315** | renderer selector | 3 / 269 | **4 (1)** | 7 | ui only |
| **#217** | `__SCENE_HELPERS__.describe()` | 1 / 50 | **2 (1)** | 8 | ui only |
| **#181** | deserialize returns warnings | 1 / 230 | **2 (1)** | 133 | pure only |
| **#175** | splitter/joiner (verify-only) | 8 / 853 | **6 (4)** | 130 | ui, state, pure |
| **#190** | one engine → `compileHDL` | 4 / 673 | **21 (10)** | 218 | pure 16, ui 2, state 3 |
| **#210** | netlist → ELK positions | 22 / 8 603 | **34 (19)** | 178 | state 12, ui 11, shared 10, pure 1 |
| **#189** | command registry + undo/redo | 40 / 11 791 | **84 (37)** | 111 | ui 71, shared 7, pure 5, state 1 |
| **#188** | document / layout sidecar | 1 / 448 | **86 (59)** | 199 | ui 35, state 24, shared 22, pure 5 |
| **#185** | store drops e2e types | 1 / 343 | **103 (40)** | 133 | ui 70, state 22, shared 7, pure 4 |
| **#186** | injected ids + clock | 10 / 2 451 | **105 (42)** | 132 | ui 70, state 22, shared 7, pure 6 |

**What makes each number what it is** (measured facts, not judgement):

- **#186** — 7 files each define a *private, byte-identical* `generateId()` (`gateActions.ts:34`, `wireActions.ts:121`, `nodeActions.ts:37`, `nodePlacementActions.ts:31`, `signalActions.ts:28`, `junctionPlacementActions.ts:36`, `busActions.ts:25`), plus `junctionPlacementActions.ts:68` (`sig-${Date.now()}`), `statusActions.ts:17` and `core/serialization/serialize.ts:99` (`new Date()`). The issue says "one `ids` provider **on the store factory**" — **there is no store factory**: `create()` runs at module scope (`circuitStore.ts:85`) and 40 files import that module directly. *Inferred:* adding a factory is therefore a prerequisite, not a detail. Measured mitigation: **0 test files assert on id shape**, so the tests do not pin the format.
- **#188** — `CircuitState` is **32 fields**; `CircuitDocument` (the netlist) is **6** of them (`types.ts:263`). `Position`+`Rotation` are embedded in `GateInstance`, `InputNode`, `OutputNode`, `JunctionNode`, `BusComponent`; routed 3D geometry (`segments: WireSegment[]`) is on `Wire`; `selected: boolean` is on `GateInstance` and `BusComponent` *and* duplicated as `selectedGateId` in state. `.position` is read in **50 files / 212 sites**. `store/types.ts` has the highest fan-in in the repo (59).
- **#189** — `src/store/actions/` is **40 files / 11 791 LOC**; `circuitActions` is a hand-written facade of **125 entries** (`circuitStore.ts:167–323`), each a one-line `getState().x(...)` forward.
- **#190** — two schedulers confirmed: `evaluateCircuit` (`simulation/topologicalEval.ts:220`) and `compileHDL` (`core/hdl/compiler.ts:40`). The `'circuit'` chip type exists as a type only — `ChipImplementation = … | { type: 'circuit'; circuitData: unknown }` (`core/chips/types.ts:11`) with a guard `isCircuitChip` (`:29`) and **0 occurrences of "circuit" in `evaluateChip.ts`**.
- **#181** — only 2 direct importers, but it is the file that closes the 7-file cycle (§2).
- **#315 and #217 are the two small ones and they are small for a structural reason**: `Shell.tsx:16` already takes `scene?: ReactNode`, injected at `App.tsx:19`, and `App.tsx` is **42 lines**.

---

## 2. Layering, measured

Layers: **pure** = `src/simulation`, `src/core` (53 files) · **state** = `src/store` (43) · **ui** = `src/components`, `src/gates`, `src/nodes`, `src/hooks`, `src/theme`, `src/styles`, `App.tsx`, `main.tsx` (152) · **shared** = `src/lib`, `src/utils`, `src/test` (56).
Totals: **305 TS/TSX files, 49 732 lines, 933 internal import edges, 303 external.** Script: `layers.mjs`.

### Production violations (16 edges; 4 are `import type`)

| Kind | `file:line` → target | value/type |
|---|---|---|
| pure→state | `src/core/serialization/deserialize.ts:2` → `store/actions/gateActions/gateActions.ts` | **value** |
| pure→state | `src/core/serialization/deserialize.ts:3` → `store/actions/busActions/busPins.ts` | **value** |
| pure→state | `src/core/serialization/deserialize.ts:4` → `store/types.ts` | type |
| pure→state | `src/core/serialization/serialize.ts:1` → `store/types.ts` | type |
| pure→state | `src/simulation/topologicalEval.ts:6` → `store/types.ts` | type |
| pure→state | `src/simulation/truthTable.ts:2` → `store/types.ts` | type |
| pure→ui | `src/simulation/signalDisplay.ts:1` → `components/ui/multiBitFormat.ts` | **value** |
| state→ui | `src/store/actions/busActions/busActions.ts:14` → `nodes/config/index.ts` | **value** |
| state→ui | `src/store/actions/junctionUtils.ts:11` → `nodes/config/index.ts` | **value** |
| state→ui | `src/store/actions/nodeActions/nodeActions.ts:15` → `nodes/config/index.ts` | **value** |
| state→ui | `src/store/actions/wiringActions/wiringActions.ts:6` → `nodes/config/nodeConfig.ts` | **value** |
| state→ui | `src/store/actions/pinHelpers/pinHelpers.ts:3` → `components/scene/chipBodyLayout.ts` | **value** |
| state→ui | `src/store/actions/pinHelpers/pinHelpers.ts:4` → `components/scene/busBodyLayout.ts` | **value** |
| state→3D lib | `src/store/actions/pinHelpers/pinHelpers.ts:1` → `three` | **value** |
| state→e2e | `src/store/circuitStore.ts:27` → `../../e2e/types/globals` | **value** (side-effect import) |
| ui→e2e | `src/components/canvas/Scene/SceneReadyBridge.tsx:4` → `../../../../e2e/types/globals` | **value** |

Test-only violations (8 more): 4 pure tests importing `circuitStore` (`simulation/topologicalEval.test.ts:2`, `busSimulation.test.ts:2`, `truthTable.test.ts:2`, `core/serialization/serialization.test.ts:2`), `truthTable.test.ts:6` (type), `store/actions/nodeActions/nodeActions.test.ts:12`, `pinHelpers.test.ts:2` (`three`), `pinHelpers.test.ts:4`.

**No production file in `src/simulation` or `src/core` imports React, `react-dom`, `@react-three/*`, `import.meta.env`, `window`, or `document`.** The pure layer's only leaks are the table above plus the three effects in §5.

### Cycles (3)

1. **7 files, spans `store`↔`core`** (value edges):
   `store/actions/persistenceActions/autosave.ts` → `core/serialization/deserialize.ts` → `core/serialization/index.ts` → `store/actions/persistenceActions/persistenceActions.ts` → `store/actions/placementActions/placementActions.ts` → `store/actions/gateActions/gateActions.ts` → `store/circuitStore.ts` → back.
   This is the cycle #181 names; it is why `import('src/core/serialization')` throws in plain Node.
2. **2 files** (value): `gates/common/index.ts` ↔ `gates/common/BaseGate.tsx` (barrel re-export).
3. **2 files, type-only**: `utils/wiringScheme/types.ts` ↔ `store/types.ts`.

Plus a **cross-root cycle** not inside `src/`: `src/store/circuitStore.ts:27` → `e2e/types/globals.ts` → `e2e/types/globals.ts:15` → `src/store/types.ts`.

---

## 3. Coupling hotspots

Script: `metrics.mjs`. Production files only (173 of 305); edges are internal imports.

**Most depended-on (fan-in)** — `store/types.ts` **59** · `store/circuitStore.ts` **40** · `utils/wiringScheme/types.ts` **27** · `lib/utils.ts` 18 · `theme/index.ts` 13 · `utils/grid.ts` 12 · `nodes/config/index.ts` 11 · `utils/wiringScheme/segments.ts` 11 · `core/chips/types.ts` 10 · `components/ui-kit/button.tsx` 9 · `core/chips/registry.ts` 9 · `lib/notify.ts` 9 · `core/chips/appRegistry.ts` 8 · `simulation/signalDisplay.ts` 8 · `utils/wiringScheme/crossing.ts` 7.

**Most dependencies (fan-out)** — `store/circuitStore.ts` **24** · `store/actions/index.ts` 12 · `components/canvas/CanvasArea.tsx` 11 · `components/ui/PropertiesPanel/index.tsx` 11 · `components/canvas/Scene/SceneContent.tsx` 10 · `components/ui/CompactToolbar.tsx` 10 · `nodes/BusJoiner3D.tsx` 10 · `store/actions/testActions/testActions.ts` 10 · `components/ui/RightActionBar.tsx` 9 · `nodes/BusSplitter3D.tsx` 9 · `store/actions/gateActions/gateActions.ts` 9.

**Store reach — 118 of 305 files import something from `src/store`:**

| Importing layer | value imports | type-only |
|---|---|---|
| ui (prod) | 36 | 10 |
| ui (test) | 35 | 2 |
| pure (prod) | **1** | 3 |
| pure (test) | 4 | 0 |
| shared (prod) | 0 | 9 |
| shared (test) | 7 | 11 |

**Deep imports bypassing an existing `index.ts`: 163.** Worst entry points: `utils/wiringScheme` **57** · `core/chips` **48** · `core/testing` **22** · `hooks` 8 · `core/hdl` 8 · `gates/common` 4 · `nodes/config` 3 · `store/actions` 3.
`circuitStore.ts:23–25` imports `@/utils/wiringScheme`, `@/utils/wiringScheme/segments` and `@/utils/wiringScheme/types` — the barrel and two internals, in adjacent lines.

---

## 4. Monolith indicators

| Metric | p50 | p90 | p99 | max |
|---|---|---|---|---|
| Production file LOC (173 files, 22 513 total) | 76 | 292 | 587 | **1 021** |
| Test file LOC (132 files, 27 524 total) | 106 | 461 | — | **1 679** |
| Function length (451 functions, prod only) | **15** | **85** | 264 | **678** |

Files over 300 prod lines: **18**. Over 500: **6**. Any file over 800 lines: **7**.
Functions over 100 lines: **39**. Over 200: **9**.

**20 largest files** — `utils/wiringScheme/crossing.test.ts` 1679 · `store/actions/wiringActions/wiringActions.test.ts` 1547 · `store/actions/gateActions/gateActions.test.ts` 1119 · `utils/wiringScheme/crossing.ts` **1021** (wire-crossing resolution) · `store/actions/wiringActions/wiringActions.ts` **966** (18 wiring actions) · `simulation/topologicalEval.test.ts` 877 · `utils/wiringScheme/pathfinding.test.ts` 859 · `store/actions/simulationActions/simulationActions.test.ts` 729 · `store/actions/nodeActions/nodeActions.test.ts` 690 · `core/testing/project1TstFixtures.ts` 587 (data) · `core/hdl/parser.test.ts` 577 · `store/actions/wireActions/wireActions.test.ts` 573 · `utils/wireSharing.test.ts` 570 · `core/hdl/parser.ts` 556 · `utils/wiringScheme/core.test.ts` 550 · `components/ui/CompactToolbar.tsx` 528 · `store/actions/signalActions/signalActions.test.ts` 526 · `hooks/useKeyboardShortcuts.test.ts` 519 · `core/testing/tstParser.ts` 514 · `store/actions/junctionPlacementActions/junctionPlacementActions.test.ts` 494.

**10 longest functions** — `createWiringActions` `wiringActions.ts:143` **678** · `CompactToolbar` `CompactToolbar.tsx:72` 456 · `createGateActions` `gateActions.ts:71` 356 · `PropertiesPanelInner` 296 · `resolveCrossings` `crossing.ts:599` 284 · `useNodeDrag` 264 · `useGateDrag` 228 · `useBusDrag` 203 · `RightActionBar` 202 · `BaseGate` 200.

**No file exceeds what an agent can read in one pass** (max 1 679 lines). *Inferred:* the pairing is the cost — changing one wiring rule means `wiringActions.ts` (966) + `wiringActions.test.ts` (1 547) = **2 513 lines** in context.

**`src/store`** — 43 files, 22 prod / 4 927 LOC, 21 test / 7 568 LOC. 16 slice factories wired by hand in `circuitStore.ts:93–108`; `types.ts` 448 lines = 32 state fields + 16 action interfaces + `CircuitStore extends` all 16 (`types.ts:447`); module-scope `setInterval` simulation loop at `:116–148`.
**`src/App.tsx`** — **42 lines**, 1 store selector, renders `<Shell scene={<CanvasArea/>}/>`.
**Canvas tree** — `src/components/canvas/` is 51 files / 5 720 LOC; `src/components` total 107 files / 11 421 LOC.

---

## 5. Effects in the pure layers

Script: `effects.sh` (uses `command grep -rE`, not the ugrep shim). Production files only.

### `src/simulation` (5 prod files, 546 LOC) — **zero** effects
No `Date.now`, `Math.random`, timers, `window`, `document`, `localStorage`, `import.meta.env`, `console.*`, `notify`. (`document` appears twice, in JSDoc prose only.)

### `src/core` (27 prod files, 3 726 LOC) — **3 sites**
- `src/core/testing/chipCompletion.ts:7` — `localStorage.getItem(KEY)` — **unguarded** (no `typeof window` check). **new finding**
- `src/core/testing/chipCompletion.ts:21` — `localStorage.setItem(KEY, …)` — unguarded. Reached at store construction: `circuitStore.ts:79` calls `readCompletedChips()`.
- `src/core/serialization/deserialize.ts:1` — `import { notify } from '@/lib/notify'` → `sonner`; calls at `:147`, `:163`.
- `src/core/serialization/serialize.ts:99` — `savedAt: new Date().toISOString()`.

### `src/store` (22 prod files, 4 927 LOC)
- **9 `Date.now()` / 7 `Math.random()`** — the 7 id generators + `junctionPlacementActions.ts:68` + `statusActions.ts:17`.
- **`setInterval`/`clearInterval` ×5** at module scope: `circuitStore.ts:116,123,129,142,143`.
- **`import.meta.env`** ×1: `circuitStore.ts:150` (`MODE !== 'test'` → `subscribeAutosave()`).
- **`window`** ×19 / **`document`** ×5 / **`localStorage`** ×9: `circuitStore.ts:326–341` (`__CIRCUIT_STORE__`, `__CIRCUIT_ACTIONS__`, `__CIRCUIT_STORE_SET_STATE__`), `persistenceActions.ts:13,15,23,25,32,34,114,116,117,144,147,151,156`, `autosave.ts:13,17`. All except `circuitStore.ts:332–341` are behind a `typeof window === 'undefined'` guard.
- **`console.*` ×9**: `nodeActions.ts:446,454`, `junctionUtils.ts:223`, `gateActions.ts:334,360,374,375`, `busActions.ts:246,251`.
- **`notify` — 82 references across 6 files**; `wiringActions.ts` alone has **~58**.
- **`three`** imported at `pinHelpers.ts:1`.

**Shortest path from each module to a DOM/3D library** (value edges only, `layers.mjs` + path trace):
`store/circuitStore.ts` → `pinHelpers.ts` → **`three`**;
`store/actions/gateActions.ts` → `lib/notify.ts` → **`sonner`**;
`core/serialization/index.ts` → `deserialize.ts` → `lib/notify.ts` → **`sonner`**;
`simulation/topologicalEval.ts` → **no DOM reach**; `simulation/truthTable.ts` → **no DOM reach**.

---

## 6. Tangling evidence from history

**Method note (load-bearing):** `origin/main` is **rebase-merged** — **0 merge commits since 2026-09-18**, and no subject carries `(#N)`. PR boundaries therefore come from the GitHub API (`gh pr list --state merged --limit 400 --json number,title,mergedAt,files,additions,deletions`), not from `git log`. Script: `pr-spread.mjs`.

### The headline

**Of the 41 PRs merged since 2026-09-18, exactly 1 touched `src/`** — #238 (`feat(simulation): truth-table engine`, 4 src files across `src/simulation` + `src/store`, 464 lines). The other **40 were docs / harness / CI only**.

| Window | PRs | src-touching | files/PR p50·p90·max | lines/PR p50·p90·max | >400 lines |
|---|---|---|---|---|---|
| since 2026-09-18 (agent era) | 41 | **1** | 4 · 9 · 13 | 200 · 606 · 933 | 11 |
| since 2026-06-01 | 58 | 11 | 5 · 21 · 65 | 233 · 1 248 · 5 902 | 20 |
| all merged (149, since 2026-03-07) | 149 | 42 | 5 · 30 · 100 | 210 · 2 373 · 36 106 | 55 |

For the 42 **src-touching** PRs across all history: src files/PR p50 **8**, p90 **43**, max 62; src top-level dirs/PR p50 **2**, p90 **6**, max **7**.
Widest: #130 (bus splitter/joiner) 55 src files across 7 dirs, 5 902 lines · #128 (wire routing) 27 src files / 4 dirs / 4 901 lines · #124 (Test Results Panel) 17 src files / 4 dirs / 2 364 lines.

### Co-change (production `src/*.ts(x)`, per PR)

Top pairs — `store/circuitStore.ts | store/types.ts` **9** · `store/circuitStore.ts | test/testUtils.ts` **9** · `store/types.ts | test/testUtils.ts` **9** · `simulation/topologicalEval.ts | store/types.ts` **4** · `components/ui/RightActionBar.tsx | store/circuitStore.ts` 3 · `…RightActionBar.tsx | store/types.ts` 3.

Top **directory** pairs — `src/components | src/store` **14** · `src/components | src/test` **14** · `src/store | src/test` **13** · `src (App.tsx) | src/components` 9 · `src/test | src/utils` 7 · `src/simulation | src/store` **6** · `src/components | src/utils` 6 · `src/store | src/utils` 6 · `src/components | src/hooks` 5 · `src/components | src/nodes` 5 · `src/nodes | src/store` 5.

Churn (PRs that touched the file) — `store/types.ts` **14** · `test/testUtils.ts` **12** · `store/circuitStore.ts` **11** · `App.tsx` 8 · `components/canvas/CanvasArea.tsx` 7 · `store/actions/gateActions/gateActions.ts` 7 · `store/actions/nodeActions/nodeActions.ts` 7 · `components/ui/RightActionBar.tsx` 7 · `simulation/topologicalEval.ts` 6 · `components/ui/CompactToolbar.tsx` 6.

*Inferred:* the `store/types.ts ↔ circuitStore.ts ↔ test/testUtils.ts` triangle is the repo's single strongest co-change signal, and `src/simulation | src/store` co-changing 6 times is the same coupling §2 records as `topologicalEval.ts:6`.

---

## 7. Test seams

- **`vite.config.ts:41` sets `environment: 'jsdom'` for every test.** There is no vitest `projects`/`workspace` block, and **0** files carry `// @vitest-environment node`. So **no directory runs in plain Node today.**
- Of **124 `*.test.*` files**, **82 transitively reach a DOM/3D library** (`react`, `@testing-library/*`, `@react-three/*`, `three`, `sonner`, `next-themes`, `@radix-ui/*`, …) and **42 do not**:

| Dir | tests | needs DOM | node-capable |
|---|---|---|---|
| `src/components` | 43 | 40 | 3 |
| `src/store` | 21 | **21** | **0** |
| `src/utils` | 17 | 2 | 15 |
| `src/core` | 15 | 1 | 14 |
| `src/simulation` | 6 | 4 | 2 |
| `src/hooks` | 5 | 5 | 0 |
| `src/nodes` | 7 | 6 | 1 |
| `src/lib` | 4 | 1 | 3 |
| `src/gates` | 2 | 2 | 0 |
| `src/test` | 4 | 4 | 0 |

  18 of the 21 `src/store` tests reach DOM through `circuitStore.ts` → `pinHelpers.ts:1` → `three`; the 4 `src/simulation` and 1 `src/core/serialization` cases reach it because the **test file itself** imports `circuitStore`.
- **Test-to-code LOC ratio** — `simulation` 2.64 · `store` 1.54 · `utils` 1.43 · `hooks` 1.30 · `lib` 1.22 · `gates` 0.99 · `components` 0.97 · `core` 0.70 · `nodes` **0.37** · `theme` **0.00**.
- **43 production modules have no colocated test**: `components` 20, `core` 10, `gates` 4, `utils` 3, `App.tsx`, `hooks` 1, `lib` 1, `nodes` 1, `store` 1, `theme` 1.
- **Real timers (#313):** 6 files call `vi.useFakeTimers` (`utils/debounce.test.ts`, `ui/DemoOverlay.test.tsx`, `ui/CircuitLibrary.test.tsx`, `store/circuitStore.autosave.test.ts`, `persistenceActions/autosave.test.ts`, `persistenceActions/persistenceActions.test.ts`). **7 files use `userEvent`; only 1 of those (`DemoOverlay.test.tsx`) also uses fake timers.** 7 files use `waitFor`/`findBy`. **0 tests set an explicit timeout**, so every wait runs on vitest's 5 s default. Both files #313 names use `userEvent.setup()` on real timers: `CompactToolbar.test.tsx:3,43` and `Shell.integration.test.tsx:14`.
- **Full-suite timing: not measured, deliberately.** A single-worker local run would load the laptop that three other agent worktrees are building on — the exact condition #313 blames for the false failures. Free substitute: the five most recent `ci.yml` runs took **2m09s–2m41s** wall-clock for install + lint + test + build (`gh run list --workflow=ci.yml --limit 5 --json createdAt,updatedAt`).

---

## 8. Public surfaces

- **20 directories have an `index.ts`**; **163 imports bypass one** (§3).
- **`src/simulation` has no `index.ts` at all.** Its 11 external imports are all file-by-file: 8 from `ui`, 2 from `state`, 1 from `pure`.
- **`src/core`** is consumed by 44 external imports: **3 through an `index.ts`, 41 deep.** By layer: state 18 (+4 test), ui 7 (+6 test), pure 3 (+4 test), shared 2 test.
- `src/core/serialization/index.ts` exists but the package cannot be imported standalone — cycle #1 in §2.
- **Outside `src/` reaching in:** `e2e/types/globals.ts:15,16` imports `src/store/types` and `src/utils/wiringScheme/types` (type-only); `e2e/specs/ui-shell/pinout-panel.store.spec.ts:8` and `e2e/specs/performance/performance-mode.store.spec.ts:2` import `@/lib/performanceModeStorage`; `e2e/tour/app-tour.spec.ts:16` imports `@/nodes/config/nodeConfig`. **No `scripts/*.mjs` imports anything from `src/`.**
- **`src/` reaching out:** 2 value imports into `e2e/` (§2). `e2e/` is 69 files / 7 291 lines. The `window.__CIRCUIT_*` / `__SCENE_HELPERS__` contract is referenced by **34 e2e files** and 4 `src/` files.

---

## 9. Drift between documented and actual structure

Script: `doc-drift.mjs` (backtick-quoted paths; `@/` resolved to `src/`; bare filenames with no `/` skipped as examples).

| Doc | paths cited | checkable | dead |
|---|---|---|---|
| `REPO_MAP.md` | 99 | 97 | **1** |
| `AGENTS.md` | 51 | 45 | **0** |
| `HACER_LLM_GUIDE.md` | 61 | 46 | **2** |
| `CONTRIBUTING.md` | 14 | 10 | 0 |
| `.cursorrules` | 16 | 14 | 0 |

The one REPO_MAP dead path is `@/simulation/gateLogic` (`REPO_MAP.md:508`) — inside a comment that *says* it was removed, so it is a note, not a claim. HACER_LLM_GUIDE's two are `@react-three/test-renderer` (a package, false positive) and `components/GateEditor` (`:1196`, genuinely gone).

**Structural claims an agent would act on:**
- `src/api`, `src/plugins`, `src/workers`, `src/services`, `src/adapters`, `src/surfaces`, `src/renderers` — **all MISSING from the tree**. REPO_MAP cites them only inside a block headed `### ⏸️ Phase 5+ (Future - Not Yet Active)` (`:517`). `AGENTS.md:224` names `src/surfaces/**` with the hedge "or, later,".
- `REPO_MAP.md:268` lists `branded.ts  # Branded ID types (GateId, WireId, etc.)` in a tree diagram and `:523` imports `GateId, WireId` from `@/core/types/branded` — **no such file exists**; the `:523` line is inside the Phase-5 block, the `:268` tree entry is not obviously marked.
- `lint:docs` (`scripts/check-doc-paths.mjs`) exists and **exits 0**. Its `PATH_EXISTENCE_PATTERNS` (`scripts/hooks/docPathExists.logic.mjs:24`) covers `REPO_MAP.md`, `AGENTS.md`, `docs/harness/*-brief.md` and owned `SKILL.md` — **`HACER_LLM_GUIDE.md`, `CONTRIBUTING.md` and `.cursorrules` are not guarded.**
- `gateLogic` / `GateType` now appear in exactly **1** doc line across `REPO_MAP.md`, `AGENTS.md`, `HACER_LLM_GUIDE.md`, `CONTRIBUTING.md` and `.claude/skills/hacer-patterns/SKILL.md` — the note above.

The 2026-09-18 REPORT measured "45 of 118 REPO_MAP paths don't exist". **Today it is 1 of 97.** That part of #153 has largely landed.

---

## 10. Already-tracked versus new

| Finding (§) | Status |
|---|---|
| 7-file `store`↔`core/serialization` cycle; `deserialize` imports store actions and `notify` (§2, §5) | **tracked — #181**; also REPORT §1 seam 1 |
| `circuitStore.ts:27` e2e import, `:28` renderTracking, `:150` `import.meta.env` (§2, §5) | **tracked — #185** |
| 7+3 non-deterministic id/clock sites (§5) | **tracked — #186**; REPORT §1 seam 4 ("7 sites, plus two") — measured today as 7 generators + `junctionPlacementActions.ts:68` + `statusActions.ts:17` + `serialize.ts:99` |
| `CircuitState` mixes netlist (6 fields) with gesture/UI state (26); position/rotation/segments on domain entities (§1) | **tracked — #188**; REPORT §1 seam 6 |
| 125-entry hand-written `circuitActions` facade; 40 action files / 11 791 LOC; no command layer (§1, §4) | **tracked — #189**; REPORT §1 seam 5 |
| Two schedulers; `'circuit'` chip type is a type with no evaluator (§1) | **tracked — #190**; REPORT §1 seam 7 |
| REPO_MAP / AGENTS dead paths (§9) | **tracked — #153, now ~closed** (1 of 97, was 45 of 118) |
| Both #313 victims use `userEvent` on real timers; 0 explicit timeouts; 5 s default (§7) | **partly tracked — #313** (the issue asks which tests; this names them) |
| `three` in `pinHelpers.ts:1`; pure layout under `components/scene` (§2) | **partly tracked** — REPORT §1 seam 2 names both; **no issue found** |
| 82 notify calls in store/core; 4 error conventions (§5) | **partly tracked** — REPORT §1 seam 3 (74 calls then, 82 now); #181 covers only the `core/serialization` two |
| **`core/testing/chipCompletion.ts:7,21` — unguarded `localStorage` in the pure layer**, reached at store construction (§5) | **NEW** |
| **`src/simulation` has no `index.ts`; `src/core` consumed 41 deep vs 3 via index; 163 deep imports repo-wide** (§3, §8) | **NEW** |
| **21 of 21 `src/store` tests reach a DOM library; no vitest node project exists** (§7) | **NEW** (portfolio row 4 sets `vitest --project node` as the *goal*, so the gap is known; the 21/21 number is not recorded anywhere) |
| **1 of 41 agent-era PRs touched `src/`** (§6) | **NEW** |
| **9 functions over 200 lines, max 678 (`createWiringActions`)** while files are modest (§4) | **NEW** |
| **`src/store/types.ts` fan-in 59 and churn 14 PRs — the repo's single highest on both** (§3, §6) | **NEW** |

---

## Facts that should most change the plan

Ranked; each traceable to a number above.

1. **The agent loop has essentially no evidence on application code.** 1 of 41 PRs merged since 2026-09-18 touched `src/` (§6). Every claim that "small PRs work here" rests on 40 docs/harness PRs and one 464-line src PR. *Inferred:* the loop's behaviour on `src/` is unmeasured, not proven.
2. **Four of the ten ready issues are not small changes in this tree, and three of them are the surfaces spine.** #186 (105 direct importers), #185 (103), #188 (86), #189 (84) — versus #315 (4) and #217 (2) (§1). The split is structural, not accidental: #315 is cheap *because* `Shell.tsx:16` already has a `scene?` seam and `App.tsx` is 42 lines.
3. **#186 as written cannot be done as written**: it asks for an ids provider "on the store factory", and there is no factory — `create()` runs at module scope (`circuitStore.ts:85`) with 40 direct importers (§1). Mitigating measurement: 0 tests assert id shape.
4. **The state layer cannot be tested headless at all today**: 21 of 21 `src/store` tests reach a DOM library, 18 of them through one line, `pinHelpers.ts:1` → `three` (§7, §5). Portfolio row 4's exit test (`vitest --project node` green) is currently unreachable for `src/store`.
5. **`src/simulation` is already clean and `src/core` is three sites away.** `src/simulation` production code has **zero** effects and **no DOM reach**; `src/core`'s only blockers are `chipCompletion.ts:7,21` (unguarded `localStorage`), `deserialize.ts:1` (`notify`) and `serialize.ts:99` (`new Date()`) (§5). The headless-core claim is close to true for the pure layer and false for the state layer.
6. **One type is the repo's centre of gravity**: `store/types.ts` — fan-in 59 of 173 prod files, churn 14 PRs, co-changing with `circuitStore.ts` and `test/testUtils.ts` 9 times each (§3, §6). #188 changes exactly this file.
7. **The layer rule is enforced by nothing.** 16 production violating edges and 3 cycles exist with a green `lint` (§2); `lint:docs` guards doc paths, not import direction.
8. **Size is a function problem, not a file problem.** Files p50 76 / max 1 021, but functions p50 15 / max 678, with 9 over 200 lines and the top two being a slice factory (`createWiringActions`, 678) and a toolbar component (456) (§4).
9. **The `src/` ↔ `e2e/` coupling is bidirectional and load-bearing for 34 e2e files** (§2, §8) — #185 removes 2 import lines, but the `window.__CIRCUIT_*` contract those lines type is what the whole store-mode e2e suite runs on.
10. **Doc drift is largely repaired** (1 dead REPO_MAP path of 97, down from 45 of 118) and a `lint:docs` gate now holds it — but it does not cover `HACER_LLM_GUIDE.md`, `CONTRIBUTING.md` or `.cursorrules` (§9).
