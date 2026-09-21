# 0019. Canvas-less shell mode selected by `?renderer=none`

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Builder agent for [#291](https://github.com/mezivillager/hacer/issues/291) (owner ruling of 2026-09-19 quoted in [ADR-0016](0016-browser-qa-in-the-cloud.md) *Amendment*)
- **Phase:** Phase 0.5

## Context

ADR-0016 §3 (as amended, #282) allows local browser tests only for suites that do not mount the 3D
canvas, and then observes that no such suite can exist: *"Every Playwright suite today, `@store`
included, loads the whole app, and `App` mounts the canvas."* That is the whole blocker. The owner's
laptop must never render 3D, so all 30 specs under `e2e/specs/` run in GitHub Actions and nowhere
else.

Reading the code rather than reasoning from first principles turns up three facts that change the
shape of the answer.

**The seam already exists, and is already documented as the boundary.** `Shell` takes an optional
`scene?: ReactNode` prop defaulting to `null` and renders it as a child
(`src/components/Shell.tsx:16`, `:23`, `:30`); its doc comment already calls this *"the contract
boundary between the 3D and non-3D areas."* Exactly one call site fills it —
`src/App.tsx:19`, `<Shell scene={<CanvasArea />} />`. `src/test/renderShell.tsx:18` already renders
`<Shell scene={null} />` under RTL, so a canvas-less shell demonstrably works today; what is missing
is only a *browser-reachable* way to select it.

**Exactly one line forces a WebGL context.** `src/components/canvas/Scene/Scene.tsx:25` — the
`<Canvas>` from `@react-three/fiber`. Everything between it and `App` is plain DOM or store reads:
`CanvasArea` (`src/components/canvas/CanvasArea.tsx:14-89`) is a `div` of store selectors that only
becomes 3D at `:91` where it renders `<Scene>`. Importing R3F creates no context; rendering `<Canvas>`
does.

**The `@store` suite is already canvas-independent in everything but the mount.** The distinguisher
between the suites is the *fixture*, not the spec bodies: `ui.fixture.ts:58-64` waits for a `canvas`
selector and `waitForSceneReady`, while `store.fixture.ts:31-32` waits only on
`window.__CIRCUIT_STORE__` and says why — *"Skip scene ready wait - store tests don't need 3D
scene."* Measured exhaustively across all 17 `*.store.spec.ts` files: none references
`__SCENE_HELPERS__`, `__SCENE_READY__`, `scene-manager`, `scene-canvas`, `projectToScreen` or
`canvasRect`; none calls `page.mouse` or `boundingBox`; none calls any scene or render wait; and none
calls a `*ViaUI` helper. They drive the app through `__CIRCUIT_ACTIONS__` and assert on store state
and DOM. They mount the canvas only because `App.tsx:19` gives them no choice.

**Playwright already cannot click the canvas.** `addGateViaUI` — a `@ui` helper — drives the toolbar
through the DOM and then places via the store, with the reason in the code:
*"Place the gate using store action (bypasses canvas click which doesn't work in Playwright)"*
(`e2e/helpers/actions/gate.actions.ts:92-98`). Genuine canvas-coordinate interaction survives in one
place only, `canvas.actions.ts:20-26`, which projects through `__SCENE_HELPERS__` and is reached from
`wire.actions.ts`. So the interaction surface canvas-less mode gives up is narrower than it looks.

## Reuse considered

| Candidate | Licence | Verdict | Date |
|---|---|---|---|
| `src/lib/demoTour.ts` URL-param pattern (in-repo) | n/a | **adopt** — identical shape: pure predicate over `search`, read once at mount, already driven by e2e | 2026-09-21 |
| `src/test/renderShell.tsx` (in-repo, RTL + jsdom) | n/a | **integrate** — it already proves `<Shell scene={null}/>` works; the browser mode extends the same seam. Not a substitute: jsdom has no layout, so no positioning, overlap or scroll assertions | 2026-09-21 |
| `@react-three/test-renderer` 9.1.0 (`package.json:82`) | MIT | **reject** *for this purpose* — a Node-side reconciler for vitest with no DOM shell; cannot serve Playwright browser assertions. Retained where it fits | 2026-09-21 |
| SwiftShader / ANGLE software WebGL (`playwright.config.ts:32-33`) | Apache-2.0 | **reject** — it *is* rendering 3D, which ADR-0016 §3 forbids on the owner's machine; already the CI path | 2026-09-21 |
| `headless-gl` (`gl`) | BSD-2-Clause | **reject** — Node-only context needing a native build; does nothing for a browser page | 2026-09-21 |
| Vite build-time split / `import.meta.env.MODE` (precedent `circuitStore.ts:150`) | n/a | **reject** *as the selector* — a separate build is not what ships, contradicting ADR-0016 §4 | 2026-09-21 |
| nand2tetris web-ide (`../web-ide`) | MIT | **none found** — no renderer, headless or mode switch in `web-ide/simulator/src`; its simulator is UI-agnostic by having no canvas at all, so there is nothing to lift | 2026-09-21 |
| `computer-visualizer` (`../computer-visualizer`) | none declared | **none found** — no renderer or mode switch | 2026-09-21 |

## Decision

**We will add a boot-time renderer selector read from the URL query string, `?renderer=none`, which
makes `App` pass no scene to `Shell`.**

1. **The seam is `src/App.tsx:19`** — the single expression that decides what goes into
   `Shell`'s existing `scene` prop. Nothing below it changes; `Shell`, every panel, the toolbar,
   the status bar and the toaster are untouched. `renderer=none` renders the shell with
   `scene={null}`, the same tree `renderShell.tsx` already proves.
2. **Selection is a URL parameter, resolved by a pure function.** A
   `resolveRendererFromSearchParams(search): 'r3f' | 'none'` in `src/lib/renderer.ts`, defaulting to
   `'r3f'` for any unrecognised or absent value, read once at `App` from `window.location.search`.
   This copies `src/lib/demoTour.ts:8` / `DemoOverlay.tsx:20` exactly — an existing, unit-tested,
   in-production precedent that e2e already drives via `APP_ENTRY_URL = '/?notour=1'`
   (`e2e/config/constants.ts:22`).
3. **It ships.** One bundle, one artifact, selectable at load. A mode that only exists under a test
   build would contradict ADR-0016 §4 ("Playwright in CI tests what ships") — CI would be exercising
   a bundle no user can load. The production cost is roughly ten lines plus one test file.
4. **The renderer is not store state.** It is a boot-time environment fact, not circuit state and
   not a user preference like `performanceMode`. Keeping it out of the store means the canvas never
   mounts or unmounts as a state transition, so there is no teardown path to test.
5. **`renderer=none` does not mean three.js is unloaded.** `CanvasArea` stays statically imported
   (`App.tsx:4`), so the whole bundle — one chunk, 1,757 kB raw / 503 kB gzip on this branch's
   `pnpm run build` — is still downloaded and parsed; only the WebGL context is never created. That
   is what the constraint actually requires: the cost the laptop cannot pay is rendering, not
   parsing. Lazy-loading is a later, optional optimisation, not part of the contract.
6. **The seam is the 2D surface's seam.** `?renderer=2d` is the same expression with a third arm,
   which is criterion 3 of #291 and the hosting point for #211 under the surfaces epic (#142).

### What is not available under `renderer=none`

Stated explicitly so a spec cannot silently claim coverage it does not have.

| Unavailable | Why |
|---|---|
| `window.__SCENE_HELPERS__`, `window.__SCENE_READY__` | Set inside `useFrame` in `SceneReadyBridge.tsx:29-30`, which never runs. No `projectToScreen`, no `canvasRect` — **nothing can be located or clicked by 3D coordinates.** |
| Every pointer interaction routed through the canvas | `GroundPlane.tsx:16-19` owns click / pointermove / pointerup. Gate placement by clicking, wire drawing by dragging, junction placement and drag-to-move are unreachable; they can only be driven through `__CIRCUIT_ACTIONS__`. In practice this costs one real helper, `canvas.actions.ts:20-26` (used by `wire.actions.ts`) — the rest already bypasses the canvas. |
| Meaningful `window.__RENDER_TRACKER__` counts | All four `trackRender` call sites are canvas components (`CanvasArea.tsx:46`, `GroundPlane.tsx:10`, `PlacementPreview.tsx:25`, `WirePreview.tsx:63`). The tracker object exists but stays near-empty. |
| The whole `@ui` suite (13 specs) | `ui.fixture.ts:58-64` waits for a `canvas` selector and `waitForSceneReady`; `base.fixture.ts:32-33` likewise. |
| Camera, orbit controls, grid, axes, wire geometry, `--canvas-bg` theme flip (`Scene.tsx:13`), and all 3D visual regression | No scene. |

**The silent-pass hazard, named.** `waitForSceneStable` (`e2e/helpers/waits/render.waits.ts:14`)
catches its own timeout and falls through to a 200 ms sleep (`:28-34`). Under `renderer=none` it
would therefore spin for 5 s and then **pass**, reporting stability that was never observed. Canvas-less
mode must make the scene waits *throw*, not degrade. This is the discipline #257's acceptance
contract asks for, applied here.

### The store bridge stays; the scene bridge does not

`window.__CIRCUIT_STORE__` / `__CIRCUIT_ACTIONS__` / `__CIRCUIT_STORE_SET_STATE__` are installed at
module load under a plain `typeof window !== 'undefined'` guard (`src/store/circuitStore.ts:326-342`),
with no dependency on React or the canvas. They are exactly the right bridge for canvas-less mode and
need no change. `__SCENE_HELPERS__` (#217) keeps its meaning — *"the scene rendered and here is how to
project into it"* — and its correct canvas-less behaviour is **absence**. Canvas-less specs assert on
the store bridge and on DOM; they get no new global of their own, and a canvas-less fixture should
assert `__SCENE_READY__ === undefined` so that a spec which quietly needs the scene fails loudly
instead of hanging.

### Running `@store` locally: worth it, narrowly

Honest accounting. Locally running `@store` adds no *coverage* — CI already runs it and it is a
required check on critical PRs. It buys latency: seconds instead of a push plus a ~2.1 min cloud run
(ADR-0016's amendment, #273). The hazard is configuration divergence: one suite name, two app
configurations, with local green not implying CI green.

The ruling: **build the seam, and let it pay for itself on the suite that needs it.**
- `@store` **keeps running canvas-ful in CI**, which stays authoritative, because that is the shipped
  configuration and ADR-0016 §4 requires CI to test it. Locally it *may* be run with
  `?renderer=none` as a fast pre-flight, never as a gate (ADR-0016 §3 stands).
- The new `@shell` suite — DOM-shell specs that are canvas-less *by contract* — is canvas-less in
  both places, so no suite ever runs in two configurations across environments.

The seam would be worth building for #211 alone; local `@store` is a bonus, not the justification.
*Cost if this ruling is wrong:* a local pre-flight that occasionally disagrees with CI, costing a
confused re-run. It does not weaken the merge gate, which never consults a local result.

## Consequences

- The DOM shell and, later, the 2D surface become testable in a real browser on the owner's laptop
  for the first time; the non-3D surfaces get the feedback loop the 3D one has had in CI.
- A standing maintenance obligation: every future shell feature must not assume a canvas exists.
  That is the cost, and it is also the point — it is what keeps the 2D surface landable.
- Ten or so lines of production code carry a test-only capability. Mitigated by the same seam being
  the 2D surface's mount point, so it stops being test-only as soon as #211 lands.
- Canvas-less mode is easy to over-claim. The unavailability table above and a fixture that asserts
  `__SCENE_READY__ === undefined` are the guard; without them the silent-pass in
  `render.waits.ts:28-34` would manufacture false green.
- Explicitly rejected: a build-time split, a store flag, software WebGL, and lazy-loading in the
  first slice.

### Follow-up issues

Design only — nothing here is implemented in this PR. Each slice is well inside the 400-line budget.

1. **`feat(shell)`: `?renderer=none` renders the shell with no canvas** (~60 lines) —
   `src/lib/renderer.ts` with `resolveRendererFromSearchParams` + unit test; the ternary at
   `App.tsx:19`; a `data-testid` on the canvas-less region. This is #291's criterion 2.
2. **`test(e2e)`: a canvas-less Playwright project and the first `@shell` spec** (~80 lines) — a
   `dom.fixture.ts` navigating to `/?notour=1&renderer=none`, waiting on `__CIRCUIT_STORE__` and
   asserting `__SCENE_READY__ === undefined`; satisfies `pnpm exec playwright test --grep @shell`.
3. **`fix(e2e)`: scene waits must throw, not degrade** (~40 lines) — remove the silent 200 ms
   fallback at `render.waits.ts:28-34` for canvas-less runs.
4. **`docs(adr)`: amend ADR-0016 §3** (~20 lines) to point its local-run rule at this mode; may be
   folded into slice 2.

## Affected living docs

`docs/decisions/README.md` (index row) — updated alongside. `docs/decisions/0016-browser-qa-in-the-cloud.md`
§3 is **not** amended here: it becomes accurate only once slice 1 lands, so follow-up 4 carries it.
`AGENTS.md`, `REPO_MAP.md` and `docs/testing/structure.md` gain entries when the mode exists, not before.

## Links

- [[0016-browser-qa-in-the-cloud]] (§3 local-run rule, §4 "CI tests what ships") · [[0012-e2e-tests-manual-only]] · [[0003-design-for-longevity]]
- Issues [#291](https://github.com/mezivillager/hacer/issues/291) (this ADR), [#142](https://github.com/mezivillager/hacer/issues/142) (surfaces epic), [#211](https://github.com/mezivillager/hacer/issues/211) (2D surface), [#217](https://github.com/mezivillager/hacer/issues/217) (scene bridge), [#257](https://github.com/mezivillager/hacer/issues/257) (QA acceptance contract), [#282](https://github.com/mezivillager/hacer/issues/282) (ADR-0016 amendment)
- Code: `src/App.tsx`, `src/components/Shell.tsx`, `src/components/canvas/Scene/Scene.tsx`, `src/components/canvas/Scene/SceneReadyBridge.tsx`, `src/store/circuitStore.ts`, `src/lib/demoTour.ts`, `src/test/renderShell.tsx`, `e2e/fixtures/store.fixture.ts`, `e2e/helpers/waits/render.waits.ts`
