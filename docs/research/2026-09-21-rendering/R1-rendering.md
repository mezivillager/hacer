# R1 — AI-suited 3D browser rendering for HACER

First note of the standing rendering-R&D workstream (#325), serving `foundation/REPORT.md` §4 and §9a. **All web facts fetched 2026-09-21**; repo facts read from `hacer/` the same
day. Tags: **[E]** evidence (primary docs, source, spec text, registry metadata, measured) · **[O]** opinion/argument. Versions and dates come from `npm view` and `curl` against
raw sources — `WebFetch`'s summariser garbled dates twice this session, so nothing numeric below rests on a summary. **Dates are the publish time of the exact version cited** (`npm
view <pkg> time --json`, keyed by version). An earlier draft used `time.modified`, which is the *package document's* last change and includes dist-tag and metadata churn; that
overstated two packages' liveness and both are corrected below. Treat `time.modified` as unsafe for "is this maintained?".

**Reviewed.** A fresh-context adversarial review (`evidence/REVIEW.md`) re-derived 71 claims against primary sources and the repo: about 60 confirmed, 8 wrong, 2 partial. **It
changed no conclusion.** The corrections are applied in place and marked where they land; the ones that mattered were the pin triangle count (480, not 512 — it feeds §4's whole
budget), the state of `@react-three/test-renderer` and of Vitest's environment in §6, a drei issue miscounted as a PR in §3, and a deck.gl WebGPU quote that omitted its own next
sentence in §5.

**Two facts shape everything else.** The canvas is becoming read-only, and HACER imports exactly five symbols from `three`: `Color`, `Euler`, `Group`, `Vector3`, and
`BufferGeometry` as a type (grep over `src/`, **[E]**) — its three.js coupling runs almost entirely *through drei and R3F*. The renderer is genuinely swappable at the three level
and stubbornly *not* swappable at the drei level.

## 1. What "AI-suited" rendering means, concretely and testably

**The honest finding first:** there is no standard, benchmark or established practice called "AI-suited rendering" **[O]** — only properties that make a scene tractable for an
agent. The definition below is constructed; each ingredient is evidenced. **a. A description an agent can generate and diff** — why no existing format is the answer:
- **three.js `Object3D.toJSON()`** *is* versioned — `output.metadata = { version: 4.7, type: 'Object', … }`, and the number has moved (r150 = 4.5, r160/r170 = 4.6, r180/r186 = 4.7)
  — **but `ObjectLoader` never reads it**: grepping `src/loaders/ObjectLoader.js` finds branches on `metadata.type` and **zero** on `metadata.version`, so a format bump is silent,
  with no migration path **[E]**. Diffability is poor for a *generated* scene: every object carries a random `uuid`, geometry/material libraries are keyed by those uuids, and
  `matrix` is a flat 16-float array that hides which of position/rotation/scale moved **[E]**. **[O]** Fine for save/restore inside three; wrong as an agent-facing contract.
- **glTF 2.0** is the live interchange standard but an *asset* format. **It has no text story at all** — the registry contains zero text/font/glyph extensions, and probes for
  `KHR_text`, `EXT_text`, `OMI_text`, `MSFT_text` all 404 **[E]**. Its metadata escape hatch, `extras`, is untyped and unvalidated **[E]**. And **neither `.gltf` nor `.glb` is
  really diffable**: even the JSON form stores geometry as `accessor`→`bufferView`→`buffer` offsets into an opaque binary, so moving one pin rewrites bytes **[E/O]**. Useful
  ratified pieces do exist for a read-only viewer — `KHR_node_visibility` (one boolean, recursive) with siblings `KHR_node_hoverability`/`KHR_node_selectability`, and
  `EXT_mesh_gpu_instancing`, which despite the `EXT` prefix **is Khronos-ratified** **[E]**. **[O]** Right *export* target, wrong source of truth — labels are HACER's primary
  content and glTF cannot carry them.
- **`@react-three/test-renderer` cannot be the golden format — sharper than I first thought.** From source, `toGraph()` emits exactly three fields per node — `type` (the three
  class name), `name` (default `''`) and `children` — with **no transforms, no position, no material, nothing numeric whatsoever** **[E]**, so a chip at (0,0,0) and the same chip
  at (500,0,0) serialise identically. `toTree()` gives `{ type, props, children }` where `props` are **the JSX props as authored** **[E]** — it snapshots your inputs, not the
  resolved scene, and would pass even if `layout()` were right and the renderer wrong. **[O] Neither substitutes for asserting on `describeScene()`'s own output.**
- **[O] The two patterns worth copying are Vega-Lite's and deck.gl's.** Vega-Lite (BSD-3, docs verbatim: *"a high-level grammar for interactive graphics"*, compiled into *"a
  lower-level, more detailed Vega specification"* before rendering **[E]**) is the two-tier shape HACER already has — terse spec → resolved description → renderer. deck.gl's JSON
  API supplies the missing mechanism: *"The set of classes… that should be available to the `JSONConverter` must be provided via an application-provided configuration object"*
  **[E]** — an explicit registry of allowed node types. That registry is what makes a scene description safe to generate from a prompt and cheap to validate. **The cost of both:
  the grammar becomes an API you must version, and anything it cannot express is unreachable without escape hatches.**

**a-bis. OpenUSD on the web: a live standard, not a browser option.** AOUSD shipped **Core Specification 1.0 on 2025-12-17**, 1.1 in progress **[E]**. The browser path is
disqualifying on three measured counts: the wasm bindings behind the reference `usd-viewer` (`@needle-tools/usd`) are **33.75 MB uncompressed**; they are licensed
**PolyForm-Noncommercial-1.0.0**, not OSS-compatible; and they require `SharedArrayBuffer`, hence mandatory COOP/COEP headers **[E]**. Apple's `<model>` element shipped in **Safari
26.0 on visionOS only** — the WebKit post's section is titled *"`<model>` on visionOS"* and names no other platform **[E]**. **[O] Not viable for HACER in 2026.**

**b. Determinism — the load-bearing constraint.** Playwright's visual-comparison docs, verbatim: *"Browser rendering can vary based on the host OS, version, settings, hardware,
power source (battery vs. power adapter), headless mode, and other factors."* It bakes this into the filename — goldens are `…-chromium-darwin.png`, per browser *and* platform
(`microsoft/playwright/docs/src/test-snapshots-js.md`, **[E]**). **[O] Pixels are not a contract; they are a smoke alarm.** The contract is the scene description plus scene-graph
counters, exactly reproducible in Node.

**c. Semantic snapshots — and the spec already requires what an agent needs.** The WHATWG HTML spec is normative here: *"When authors use the `canvas` element, they must also
provide content that, when presented to the user, conveys essentially the same function or purpose as the `canvas` element's bitmap"*; that content *"is the element's fallback
content"*, and *"authors should have a one-to-one mapping of interactive regions to focusable areas in the fallback content"* (`html.spec.whatwg.org/multipage/canvas.html`,
**[E]**). Canvas hit regions (`addHitRegion`) were removed and appear nowhere in the current spec **[E]**. **[O] One artefact satisfies three demands at once**: the accessibility
MUST, a stable tree for agents to assert on, and the only thing DOM-first agent tools can see at all — Playwright MCP is explicitly non-visual (*"No vision models needed, operates
purely on structured data"*, and `browser_take_screenshot` warns *"You can't perform actions based on the screenshot"* **[E]**), so a bare WebGL canvas exposes those tools nothing.
HACER is already halfway: every 3D label is a real DOM `<span data-testid="floating-label">` via drei `<Html>` (`FloatingLabel.tsx:1,62`, **[E]**). **[O]** Emit the rest of the
fallback tree from `describeScene()`. Take the *pattern* from `@react-three/a11y`, not the package: it builds a real DOM overlay with `aria-live` announcements and focusable
`<A11y>` wrappers **[E]**, but **3.0.0 was published 2022-05-15** and is still latest, and it depends on `zustand ^3.2.0` while R3F 9 ships zustand 5 **[E]**.

**c-bis. How vision models actually review rendered UIs in 2026.** **[O] Nobody credible runs a VLM as a pass/fail CI gate.** The shipped pattern is *deterministic diff as the
evidence, model as the reviewer*: Playwright's `toHaveScreenshot` *"uses the pixelmatch library"*, Argos *"uses deterministic pixel diffing, not AI-based visual comparison"*,
Applitools' "Visual AI" is classical CV *"invented by Applitools in 2013"*, and Percy layers an AI *reviewer* over deterministic diffs **[E]**. The clearest open VLM-as-judge is
ByteDance's **Midscene**, notable because it explicitly works on a canvas: *"Midscene uses screenshots to decide where to interact and whether the interface meets your
expectations"*, via `agent.aiAssert('…')` **[E]**. Research is candid about limits — WebVoyager's GPT-4V judge reached *"85.3% agreement with human judgment"* (arXiv 2401.13919),
and 2026 work notes *"no dataset or benchmark exists to support natural language descriptions of UI changes"* (2607.01728) **[E]**. **[O] For HACER: a VLM reviews the 3D view,
never gates it. The gate is §6's counters.**

**d. What the description should contain** **[O]**: stable ids (so a diff is a diff, not a re-layout) · an explicit hierarchy path (`cpu/alu/adder3/nand1`) so drill-down and LOD
are data, not renderer state · declared *intent* (kind, chipName, pin names/widths, signal values) separate from *geometry* (position, size, route points), so an agent can assert
on meaning without parsing coordinates · canonical ordering and fixed float precision for byte-stable serialisation · instancing as `{geometryKey, transforms[], colors[]}` rather
than N nodes, so §4's biggest optimisation is visible in the description and testable in Node · label text as text · `schemaVersion`. **Everything a golden asserts must be in this
file.**

## 2. Is three.js + R3F still right? — stay, with two dated risks

**three.js** — `three@0.186.0`, published 2026-09-08 (npm, **[E]**). MIT. 12.1M downloads/week **[E]**.

- **Cadence has halved; activity has not.** Publish dates **[E]**: r177 2025-05-30, r178 2025-06-30, r179 2025-08-01, r180 2025-09-03, r181 2025-10-31, r182 2025-12-10, r183
  2026-02-18, r184 2026-04-16, r185 2026-06-25, r186 2026-09-08 — the gap widened from ~32 days to ~70, against 400+ commits since 2026-03-21 **[E]**. **[O]** Fewer, larger
  releases means less upgrade churn for HACER.
- **WebGPURenderer is still officially experimental.** three.js manual, verbatim: *"The renderer itself is still in an experimental state…"*, and *"`WebGLRenderer` is still
  maintained and the recommended choice for pure WebGL 2 applications. However… there are no plans to add larger new features to the renderer since the project's focus is now on
  `WebGPURenderer`."* (`mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html`, **[E]**). No WebGLRenderer deprecation is announced: the README says *"The current builds only
  include WebGL and WebGPU renderers…"* and its headline example still constructs `WebGLRenderer` **[E]**; an issue-title search for a WebGPU-as-default RFC returned zero **[E]** —
  absence of evidence, not evidence of absence.
- **Breaking-change load is modest and, for HACER, currently nil.** Migration guide, verbatim: *"deprecation warnings last for 10 releases"*; 83 bullets across the last 12
  revisions, median ~6, worst 184→185 = 19 **[E]**. Against HACER's five symbols, 184→186 is `Source`→`TextureSource`, `Object3D.dispose()`, `toTrianglesDrawMode()` in-place,
  WebGPU premultiplied alpha and post-processing nodes — **HACER uses none** **[E]**: a version bump, not a project. **[O]** But the tax drifts toward features HACER doesn't use
  (r186: ~60 WebGPU/TSL entries to ~25 WebGL **[E]**) — the clearest long-run case for the plug-in boundary.

**R3F** — `@react-three/fiber@9.7.0` (published 2026-07-31; last modified 2026-09-20 for a v10 canary), MIT, 3.97M/week **[E]**. `@react-three/test-renderer@9.1.1` ships in
lockstep **[E]**.

- **RISK 1, dated and live: React 19.3.** R3F declares `peerDependencies.react: ">=19 <19.3"` — verified directly in HACER's own `node_modules/@react-three/fiber/package.json`
  (installed 9.5.0) **[E]**. npm's `react@latest` is **19.3.0** **[E]**. R3F #3915 (open, 2026-09-10) shows the bound is load-bearing: React 19.3 adds a `types` field to the
  transition object that R3F's vendored `react-reconciler` 0.33.0 does not mint, so `useTransition()` inside the R3F tree throws **[E]**; fixes #3916/#3917 were still open at
  2026-09-13 **[E]**. **HACER is safe today** — `pnpm-lock.yaml` and `node_modules/react` both resolve 19.2.6 **[E]** — but `package.json` carries `"react": "^19.2.6"`, so any
  unlocked install crosses the line.
- **RISK 2: drei is the weak link — not three, not R3F.** `@react-three/drei@10.7.8` (published 2026-08-05), MIT, 2.96M/week, but **4 commits in the last 6 months, all by one
  author **[E]**. Correction from the review: the *"[v11] Triage all 51 open PRs…"* item is an **issue** (#2804), not one of the open PRs, so it is evidence of the backlog, not a
  member of it; the open-PR count itself was not independently re-derived. Its pins lag: `three-stdlib ^2.35.6` whose latest is 2.36.1 published **2025-11-10** (>10 months
  stale, and HACER depends on it *directly* too); `three-mesh-bvh ^0.8.3` vs 0.9.15; `stats-gl ^2.2.8` vs 4.2.3 **[E]**.
- **React Compiler: R3F will not be compiled, by design.** PR #3690 closed unmerged 2026-03-17; maintainer, verbatim: *"react-three-fiber isn't a component library that can take
  advantage of compiler memoization—we ship the React runtime it implements over."* **[E]** Separately #3904 (open, 2026-09-05) reports the Compiler now *errors* on mutating a
  `useMemo` result — the pattern HACER's rules sanction for Three.js objects **[E]**. **HACER is not exposed: there is not one `useMemo` in `src/` outside tests** (grep, **[E]**).
  Keep it that way.

**Alternatives** (npm *unpacked* size = all builds, types and sources — **not** a gzip bundle; gzip figures are measured from jsDelivr):

| | licence | version · published | size | WebGPU | headless | React |
|---|---|---|---|---|---|---|
| three | MIT | 0.186.0 · 2026-09-08 | 20.4 MB unpacked; **89.8 KB gzip** WebGL build | experimental, opt-in `three/webgpu` (204.8 KB gzip) | none official | R3F 9.7.0 |
| Babylon.js | Apache-2.0 | @babylonjs/core 9.27.1 · 2026-09-18 | 71.3 MB unpacked | near-parity | **NullEngine** | react-babylonjs 4.0.2 |
| PlayCanvas | MIT | 2.22.3 · 2026-09-21 | 85.6 MB unpacked; 631 KB gzip | yes | — | @playcanvas/react 0.11.5 (pre-1.0) |
| deck.gl | MIT | 9.4.0 · 2026-09-05 | 6.5 MB unpacked; 553 KB gzip | **full layer parity** | — | React-first |
| model-viewer | Apache-2.0 | 4.3.1 · 2026-06-04 | 43.1 MB unpacked; 72.6 KB gzip | n/a | — | web component |

- **Babylon.js** is the only serious contender, for one reason: **`NullEngine`** — *"does not produce any rendering and can therefore be used in a Node.js or server-side
  environment"*, explicitly for *"Run tests"* **[E]**; its `thinInstance` API carries per-instance colour and is *"supported for collisions, picking, rendering and shadows"*
  **[E]**; cadence ~weekly, 23 open issues **[E]**. Against it: 2.5% of three's downloads, and `react-babylonjs@4.0.2` has **0.06% of R3F's**, 13 commits in 6 months, 6 by its sole
  maintainer **[E]**. **[O]** A bad trade when §6 shows HACER already gets most of the headless benefit inside R3F.
- **deck.gl** has the field's most advanced WebGPU work — *"All layers go WebGPU… achieves render parity with the WebGL version"* — but the review found the **next sentence of the
  same paragraph** says that support *"remains experimental and is not yet recommended for production"* **[E]**. Quoting only the first half overstated it; with both halves it
  supports this note's "defer WebGPU" conclusion rather than cutting against it. Its SDF `TextLayer` is still the label atlas HACER
  would otherwise build. **[O]** But no scene graph: layers over flat data, geospatial-first, so hierarchy and drill-down are hand-rolled. Steal techniques (and its JSON class
  registry, §1a), don't adopt.
- **[O] The rest are out on mechanism.** *PlayCanvas*: 470 open issues, and `@playcanvas/react` is pre-1.0 with 10 of 21 six-month commits from renovate bot **[E]**.
  *model-viewer*: colour is per-*material*, not per-instance, no instancing API, and the scene must be an authored glTF asset — the opposite of "a pure function produces the scene"
  **[E]**. *regl* is effectively frozen: 2.1.1, published **2024-11-12** **[E]**. *Threlte* is an ecosystem signal only, at **1.6% of R3F's** downloads **[E]**. *2.5D/SVG*:
  KiCanvas, the closest read-only technical comparator, chose **Canvas + WebGL, not SVG** **[E]** — a 2D plug-in is worth having for a11y and CI, not as the primary view.

**Switching cost, honestly** **[O]**: the description ports; the plug-in is a rewrite. Four things leak *past* the boundary regardless — picking result shapes (three's
`instanceId`/`batchId` vs Babylon's `thinInstanceIndex` vs colour-picking's `{index, object}`), camera controls and their feel, the DOM overlay binding, and text. §7 cuts both
ways: tscircuit ships three renderers off one spec, so the boundary demonstrably works — but its 3D viewer is raw three.js, not R3F, which is precisely the layer that does *not*
port.

## 3. WebGPU in 2026 — not yet, and it buys this workload little

From caniuse's raw feature data (`Fyrd/caniuse/main/features-json/webgpu.json`, **[E]**). Spec status is still `wd` — **W3C Working Draft** **[E]**. **Global usage: 83.99% full +
2.95% partial** **[E]**.

| | status | first | caniuse's own note |
|---|---|---|---|
| Chrome / Edge | full | 113 | *"Support on Linux depends on hardware and drivers"* |
| Safari desktop | **partial** | 26.0 | *"only being enabled by default on macOS 26 Tahoe or later"* |
| iOS Safari | **full** | 26.0 | — |
| Firefox desktop | **partial** | 141 | *"Only enabled by default on Windows as well as macOS 26 Tahoe or later on Apple Silicon"*; flag `dom.webgpu.enabled` |
| Firefox Android | **none** (at 153) | — | flag only |
| Chrome Android 151 / Samsung 24 | full | — | — |

**[O]** High enough to *offer*, far too fragmented to *require* — Firefox desktop on Linux and Firefox Android are out, desktop Safari is gated on macOS 26.

**Fallback is automatic and free.** `WebGPURenderer`'s constructor installs `parameters.getFallback = () => new WebGLBackend(parameters)`; its JSDoc reads *"By default, the
renderer tries to use a WebGPU backend if the browser supports WebGPU. If not, `WebGPURenderer` falls backs to a WebGL 2 backend."*, and `forceWebGL: true` pins it to WebGL2
(`src/renderers/webgpu/WebGPURenderer.js`, **[E]**). **[O]** So adopting WebGPU is a cost question, not a compatibility risk — and the cost is real: 204.8 KB gzip vs 89.8 KB,
**2.28×** **[E]**, plus `ShaderMaterial`, `onBeforeCompile()` and `EffectComposer` unsupported, needing a port to TSL **[E]**.

**CI.** `playwright.config.ts:32-35` already passes `--use-angle=swiftshader`, `--enable-unsafe-swiftshader`, `--enable-webgl`, `--ignore-gpu-blocklist` — **no WebGPU flags**
**[E]**. WebGPU on Linux additionally needs `chrome://flags/#enable-unsafe-webgpu` and `#enable-vulkan` (`developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips`,
**[E]**). **[O]** A software WebGPU adapter in Actions is a project in itself and buys nothing HACER can currently measure.

**Does it help this workload?** **[O] No.** WebGL2 already has `drawElementsInstanced`, the only GPU feature this scene needs; the scene is static and read-only, so the
draw-call-submission overhead WebGPU reduces is not the bottleneck; and compute-for-layout is moot because `layout`/`route` must stay pure, deterministic and Node-runnable (REPORT
§4). I found **no published benchmark** for a scene of this shape.

## 4. Large and hierarchical scenes — and what HACER does today

**What the repo does today** (all **[E]**, `file:line`):
- `frameloop: 'demand'` **only** in `low-power` mode; the default path is `'always'` (`Scene/renderConfig.ts:19`, `:30`) — a read-only scene renders 60 fps of identical frames.
- **No instancing, no batching, no LOD anywhere** — grep of `src/` for `InstancedMesh`, `BatchedMesh`, `instancedBufferAttribute`, `<Instances`, `<Detailed`, `LOD` returns **zero
  hits**.
- One `<mesh>` + `<meshStandardMaterial>` per chip body, `<boxGeometry>` built inline per render (`gates/common/BaseGate.tsx:132-150`, `scene/ChipBody3D.tsx:73-75`). One `<mesh>` +
  `<sphereGeometry args={[r, 16, 16]}>` **per pin** (`gates/common/GatePin.tsx:39,46`) — **480 triangles per pin**, against 12 for the box it sits on (measured by building both
  geometries in Node against the installed three.js: the two pole rings are triangle fans, not quads, so it is `16 × 15 × 2`, not `16 × 16 × 2`). One `<mesh>` +
  `<cylinderGeometry args={[…, 8]}>` per *unconnected* pin (`gates/common/WireStub.tsx:9-10`).
- No `renderer.info`, `stats-gl` or `r3f-perf` instrumentation anywhere in `src/`, `e2e/` or `scripts/`.

**The budget**, computed from those geometry arguments (**[E]** per-chip cost, **[O]** scenarios):

| circuit | meshes | triangles | DOM labels |
|---|---|---|---|
| 40 chips × 5 pins | 440 | ~122k | 40 |
| 200 chips × 5 pins | 2,200 | ~610k | 200 |
| 2,000 chips × 5 pins (a gate-level CPU) | 22,000 | ~6.1M | 2,000 |

Against R3F's own published guidance, verbatim: *"Each mesh is a draw call, you should be mindful of how many of these you employ: **no more than 1000 as the very maximum, and
optimally a few hundred or less**."* (`docs/advanced/scaling-performance.mdx`, **[E]**). **[O] HACER exceeds "optimal" at ~40 chips and the stated maximum near 100** — before
counting wires (§5). Pins are ~99% of the triangle budget purely because of `sphereGeometry(r,16,16)`; `(r,8,6)` is a one-line ~6× reduction.

**The tools available** (all **[E]** from three.js source/docs): **`InstancedMesh`** — one geometry, many transforms, `setColorAt()`/`instanceColor` for per-instance colour,
`raycast()` returning `instanceId`; exact fit for pins and stubs. **`BatchedMesh`** — **no longer marked experimental** (the string does not appear in
`src/objects/BatchedMesh.js`); draws *different* geometries with one material in one multi-draw call, with per-instance visibility, per-object frustum culling and sorting — the fit
for chip bodies, which differ in box dimensions per type. **LOD** — three's `LOD` via drei `<Detailed>`; **[O]** HACER's natural mapping is not mesh resolution but *hierarchy
level* (a composite chip drawn as one labelled box until the camera earns the expansion), which puts LOD in the description, not the renderer — the right place per §1. **Culling**
— frustum culling is on by default; no built-in occlusion culling in the WebGL path, and **[O]** a flat board does not occlude, so don't build it. **Picking** — R3F's pointer
events are raycasting and `InstancedMesh.raycast()` loops over *every* instance (`src/objects/InstancedMesh.js:258-291`), so naive instancing makes picking *worse*;
`three-mesh-bvh@0.9.15` (2026-09-09) is the standard accelerator, and drei pins `^0.8.3`.

## 5. Text and wires

**Wires today: one draw call per segment.** `Wire3D` maps over `precomputedPath.segments` and renders one drei `<Line>` per segment (`src/components/canvas/Wire3D.tsx:154-175`,
**[E]**). drei's `<Line>` is a `Line2` from three-stdlib — instanced quads with its own geometry *and its own `LineMaterial`* per instance. Arc hops become 12- or 30-point
polylines by performance mode (`wireRenderConfig.ts:3-5`, **[E]**). **[O]** A 60-wire circuit at 4 segments each is **240 extra draw calls and 240 extra materials**, on top of §4.
Wires, not chips, likely hit the wall first. `lineWidth` is 1 for every unselected wire (`wireRenderConfig.ts:14`, **[E]**) — paying `Line2`'s cost for a hairline.

**Text today: DOM, not GPU.** Every chip and node label is a drei `<Html>` DOM `<span>` (`FloatingLabel.tsx:1,56-62`; call sites `BaseGate.tsx:234`, `InputNode3D.tsx:144`,
`OutputNode3D.tsx:170`, `BusJoiner3D.tsx:103`, `BusSplitter3D.tsx:110` — **[E]**). The file's own comment says this was deliberate: *"cheap on the GPU (no SDF text, no per-frame
Billboard rotation)"* **[E]**. drei `<Text>` — which *is* `troika-three-text`, confirmed from drei's source (`src/core/Text.tsx` imports `Text as TextMeshImpl from
'troika-three-text'`, **[E]**) — is used in exactly one place, `SceneAxes.tsx` **[E]**.

- **[O] The DOM-label decision is right and should be defended, not reversed.** Zero draw calls; it is what makes the scene semantically readable (§1c) and testable in jsdom. Its
  cost is DOM nodes, so 2,000 labels is a DOM problem, and the fix is *culling by zoom level* (declared as LOD, §4), not moving them to the GPU.
- `troika-three-text@0.52.5` (2026-07-24) is maintained; drei pins `^0.52.4` **[E]**. Troika builds the SDF atlas on the fly in a worker, then *"assembles a geometry that positions
  all the glyphs"* per `Text` instance **[E]** — **one mesh, one draw call per label**, not a shared batch. **[O]** Moving 2,000 labels from DOM to troika would *add* 2,000 draw
  calls: not the optimisation it looks like. The only GPU text that scales here is a shared atlas on instanced quads (deck.gl's `TextLayer` is the reference) — a project, not a
  swap.
- **Animated signal flow is not implemented** (no dash or UV-scroll code in `src/`, **[E]**). **[O]** The cheap version is a scrolling dash offset on `LineMaterial` — but it forces
  `frameloop: 'always'`, so it and on-demand rendering are mutually exclusive. A product decision to make explicitly, not a technical one.

## 6. Testing and measuring rendering without a GPU

**HACER's position is better than it looks.** `@react-three/test-renderer` is a devDependency used by three files under `src/test/r3f/` **[E]**; ADR-0008 makes it permanent after
a routing fix passed 1,490 unit tests while a render-level merge hole survived **[E]**. Two corrections from the review: npm's latest is 9.1.1, but **HACER pins `^9.1.0` and the
lockfile resolves exactly 9.1.0** — a year old, not in lockstep with R3F, and not currently installed at all (stale local `node_modules`). And Vitest no longer simply "runs under
jsdom": on 2026-09-21 (#323, PR #324) `vite.config.ts` split the suite into a **`node` project** for the pure layers — `core`, `simulation`, `store`, `utils`, `lib` — and `jsdom`
for the rest. That is this note's own thesis already landing in the repo, and it strengthens the case rather than weakening it.

- **What it does and doesn't do** **[E]**: builds the three scene graph through the real R3F reconciler, exposing `renderer.scene.children`, `allChildren`, `props`, `fireEvent()`,
  `advanceFrames()`. It **does not rasterise** — no GL context, no pixels — and `toGraph()` omits `attach`-ed children. **[O]** Exactly the right tool: it proves "the description
  became the right meshes at the right coordinates" with no GPU, on the owner's laptop, in seconds.
- **Deterministic vs noisy.** `renderer.info.render.calls`/`.triangles` and `info.memory.geometries`/`.textures` are exact integers derived from what was submitted and do not vary
  with hardware. Frame timing does. **[O] Assert on counters, only *record* timings** — runners are shared, and I found no citable measurement of their variance, so I am not
  asserting a number I have not seen.
- **Software rendering** is already configured (`playwright.config.ts:32-35`, **[E]**) and ADR-0016 confines browser suites to Actions **[E]**. **[O]** SwiftShader is deterministic
  enough for "did it render at all"; Playwright's warning (§1b) says it is not a cross-machine pixel contract.
- **Headless three.js in Node**: `gl` (headless-gl), BSD-2-Clause — **stable 8.1.6 published 2024-10-29**, with a `9.0.0-rc` line still moving (rc.10, 2026-04-10) **[E]**. **[O]**
  It buys nothing the test renderer plus `renderer.info` doesn't, at the cost of a native build in CI. Skip. `stats-gl@4.2.3` (2026-07-10) is maintained; **`r3f-perf@7.2.3` was
  last published 2024-11-08** — nearly two years stale **[E]**. **[O]** Read `renderer.info` directly; it is four integers.

## 7. What comparable tools actually do

- **nand2tetris web IDE** (read locally at `ha/web-ide`): `@nand2tetris/web-ide@2025.49.0`, whose entire `dependencies` block is `{"typescript": "^5.9.2"}` — **no three.js, no
  WebGL, no 3D at all** **[E]**. A DOM/2D app. **[O]** HACER's 3D view has no counterpart in the reference implementation; the owner's "differentiator" claim is literally true
  within this field.
- **tscircuit is the find of this note — HACER's architecture, already shipped, same domain, MIT.** `circuit-json` (ISC, *"Definitions for the tscircuit intermediary JSON format"*)
  is a renderer-independent scene spec with **at least three independent consumers**: `@tscircuit/3d-viewer` 0.0.601 (2026-09-19, MIT), `circuit-to-canvas` (*"Draw Circuit JSON
  into a Canvas — works with any canvas object (Node/Vanilla)"*) and `circuit-json-to-gltf` **[E]**. That is precisely `describeScene()` + renderer plug-ins + glTF-as-export. Also
  note the 3d-viewer is **raw three.js, not R3F** — deps are `three ^0.165.0`, `three-stdlib`, `troika-three-text`, `@jscad/regl-renderer` **[E]**. **[O] Read `circuit-json` before
  finalising HACER's schema; it is the closest prior art that exists.**
- **The serious large-scene viewers all built a custom compact scene representation, and none adopted glTF as the runtime model** **[E/O]**. **xeokit-sdk** 2.6.114 (2026-09-02),
  **AGPL-3.0**, own renderer: a *"data texture model representation (DTX)"* since v2.4 with *"a much lower memory footprint"* than VBOs, `SceneModel` as the build-time layer above
  it, and a **73,203-object** scene as its cited figure **[E]**; **[O]** AGPL is decisive for MIT HACER — ideas, not code. **Speckle viewer** 2.31.14, Apache-2.0, on **`three
  ^0.140.0`** — confirmed in the live repo with no `resolutions`/`overrides`, so **effectively pinned, not forked** **[E]**; its seam is `@speckle/objectloader2`. **That Open
  (IFC.js)** `@thatopen/components` 3.4.8, MIT, peers **`three >=0.182.0`** — tracking three closely, the opposite of Speckle — with `@thatopen/fragments` as a FlatBuffers binary
  scene format **[E]**.
- **Logic simulators: only DigitalJS has a data model worth stealing.** **DigitalJS** 0.14.2 (2026-02-10), BSD-2, is 2D SVG (JointJS + `elkjs` for layout) and is explicitly
  declarative: *"Circuits are represented using JSON. The top-level object has three keys, `devices`, `connectors` and `subcircuits`"*, where a subcircuit name is used as a
  `celltype` **[E]**. Its documented limit: *"subcircuits cannot (currently) define their own subcircuits"* **[E]**. **[O] The flat-definitions-plus-celltype-reference shape is
  exactly what makes CPU→ALU→adder→gate diffable — steal it, and lift the nesting restriction, which is HACER's differentiator.** By contrast **CircuitVerse** (MIT) has **no
  separation at all**: `circuitElement.js` carries both `saveObject()` and `draw()` writing straight to a 2D context **[E]** — the exact coupling HACER is moving away from.
  **Logisim-evolution** and **Digital** are GPL-3.0 desktop Java **[E]**: study the interaction design, do not reuse code. **KiCanvas**: not on npm, Canvas+WebGL.
- **[O] The convergent finding**: every viewer that reached scale owns an explicit scene/model layer separate from its renderer, and pins or replaces the renderer underneath.
  REPORT §4's boundary is not a bet — it is what this field already settled on.

## Recommendations for HACER

**1. The scene description's contents.** Adopt §1d: stable ids · explicit hierarchy path · intent separate from geometry · canonical order and fixed float precision · instancing as
`{geometryKey, transforms[], colors[]}` · label text as text · `schemaVersion` · plus an explicit **registry of allowed node types**, deck.gl-style, so a generated description is
validated rather than trusted. **Cost:** a design decision inside work already planned — near zero now, expensive later because goldens re-baseline. **Evidence:** the two-tier
Vega-Lite pattern and deck.gl's `JSONConverter` class registry **[E]**; pixels are not a cross-machine contract (Playwright's docs **[E]**), so the description *is* the contract;
and DigitalJS's flat `devices`/`connectors`/`subcircuits` shape **[E]**, whose one documented limit (subcircuits cannot nest) is what HACER must *not* inherit. **Do this first:
read `circuit-json` (§7) — the same architecture, shipped, MIT, in this domain.**

**1-bis. Emit a fallback DOM tree from `describeScene()`.** **Cost:** small; it rides on the `<Html>` labels already there. **Evidence:** the WHATWG canvas fallback-content MUST
**[E]**; DOM-first agent tools see nothing else on a canvas **[E]**; and it gives goldens a stable assertable artefact. **Do not** adopt `@react-three/a11y` — 3.0.0 dates from
2022-05-15 and carries a conflicting zustand v3 **[E]**. Corollary: **a vision model reviews the 3D view, never gates it** **[E]**.

**2. Stay on three.js + R3F.** **Evidence:** three.js is MIT, 12.1M/wk, actively developed, and its last three revisions break nothing HACER uses **[E]**; R3F is 3.97M/wk and ships
its test renderer in lockstep **[E]**; the only credible alternative, Babylon, costs a 0.06%-adoption React binding to buy a headless engine HACER can approximate inside R3F (§6)
**[E/O]**. **The condition that would flip it:** drei going another six months at ~4 commits **and** R3F's React peer bound falling behind a React version HACER needs — i.e. the
*binding layer*, not three.js, is what would force a move, and the move is then to vendor drei's four components (`Text`, `Html`, `Instances`, controls), not to change engine.
**Two cheap actions now:** pin `react`/`react-dom` to `19.2.x` exactly until R3F #3916 lands (**cost:** one line; **evidence:** the peer range read from HACER's own `node_modules`
**[E]**); and keep `src/` free of `useMemo`, which it currently is (grep **[E]**, R3F #3904 **[E]**).

**3. The first three rendering improvements once the read-only renderer exists** — in this order; each is measurable and none needs a new library.
- **(i) `frameloop="demand"` unconditionally.** The scene is read-only and mostly static; today only `low-power` gets it (`renderConfig.ts:19,30` **[E]**). **Cost:** small but real
  — every mutation path must call `invalidate()`, and R3F's docs warn anything mutating props outside React goes stale **[E]**; drei's controls already invalidate **[E]**.
  **Payoff:** an idle circuit costs zero frames.
- **(ii) Instance the pins and stubs; batch the chip bodies.** Pins are ~99% of the triangle budget at 480 triangles each **[E]**, and every pin, stub and body is its own draw call
  **[E]**. `InstancedMesh` + `setColorAt` fits pins exactly; `BatchedMesh` — no longer flagged experimental **[E]** — fits differently-sized bodies. **Cost:** moderate, and it
  **breaks picking**: `InstancedMesh.raycast()` loops every instance **[E]**, so this must ship with an `instanceId` → node-id map in the description (§1d) and probably
  `three-mesh-bvh`. Free first step: drop pin geometry to `(r, 8, 6)` for a ~6× triangle cut in one line.
- **(iii) Merge each wire into one `Line2` instead of one per segment** (`Wire3D.tsx:154-175` **[E]**). One polyline can carry all segments including arc points — a ~4× draw-call
  cut on wires for a small change. **Cost:** low. **Caveat:** per-segment colour is lost unless vertex colours are used.

**4. The CI benchmark: assert counters, record timings.** **Metrics:** `renderer.info.render.calls`, `.triangles`, `info.memory.geometries`, `.textures`, plus DOM label count and
scene-description byte size — all exact integers, none hardware-dependent **[E]**. **Scenes:** three fixed circuits — Nand-only (~20 chips); Mux8Way16-class (~40 chips, dense
fan-in, already the ADR-0008 stress case **[E]**); and a synthetic 200-chip hierarchy exercising drill-down. **Method:** assert counters against committed budgets and **fail on
regression**; record frame timings as trend data only, never as a gate, because runners are shared. **Cost:** moderate — it needs a scene the test renderer can mount headlessly,
which §6 says it already can. **Evidence:** §6's counter/timing split, and R3F's published 1,000-draw-call ceiling **[E]**, which gives the budgets a number.

**5. Defer.** **WebGPU** — experimental per three.js's own manual, 2.28× bundle, needs flags CI does not pass, and WebGL2's `drawElementsInstanced` already covers this workload
**[E/O]**. **GPU text** — troika is one draw call per label **[E]**, so it makes things worse; keep DOM labels and cull by LOD. **Occlusion culling** — nothing built in, and a flat
board does not occlude **[E/O]**. **A second renderer** — build the boundary, don't staff the plug-in; its real payoff is Node-testable pure functions today. **glTF/USD export** —
eventually, not now.

## 8. How to keep watching — the watch list

| Source | Trigger to re-evaluate |
|---|---|
| three.js releases + Migration Guide wiki | a revision touching `Color`/`Euler`/`Group`/`Vector3`/`BufferGeometry`; any WebGLRenderer deprecation |
| three.js manual `webgpurenderer.html` | **"still in an experimental state" disappearing** — the cleanest WebGPU trigger |
| `npm view @react-three/fiber peerDependencies`; R3F #3915/#3916/#3917/#3904/#3921 | the React peer bound moving past 19.3 — or failing to |
| drei commits + open PRs, the v11 alpha, `three-stdlib` (stale since 2025-11-10) | another 6 months at ~4 commits ⇒ start vendoring `Text`, `Html`, controls |
| caniuse `webgpu.json` raw feed (§3 method) | Firefox desktop default-on; global full support vs 83.99% today |
| `BatchedMesh` / `three-mesh-bvh` release notes | instanced and batched picking support |
| deck.gl release notes | WebGPU bellwether — it is ahead of three.js here |
| HACER's own CI counters, once §6's benchmark exists | any regression in `renderer.info.render.calls` for a fixed scene |

## Could not verify

- **Any measured FPS or frame-time benchmark** for a scene of this shape (thousands of instanced chips + live wires + labels) in *any* engine. None is published. **Every
  performance claim here is architectural — draw-call counts, triangle counts, API capability — not measured.** §4's tables are computed from the repo's geometry arguments, not
  observed on a GPU. If a decision turns on performance, the honest next step is a spike scene measured under SwiftShader in Actions.
- Whether R3F #3916/#3917 merged after 2026-09-13, or whether 9.7.1+ has shipped.
- Any three.js roadmap or RFC dating WebGPU-as-default or WebGLRenderer deprecation.
- Frame-timing variance on GitHub-hosted runners — "noisy" is asserted on general grounds only, which is why rec. 4 records timings rather than gating on them. Likewise whether
  SwiftShader output is bit-identical across runs/versions: Playwright's warning is enough to decide, but is not a measurement.
- **Safari 27 bringing `<model>` beyond visionOS** — claimed by search summaries and a WWDC26 session title, **not confirmed from a WebKit primary source**.
- **xeokit's object ceiling**: 73,203 is the only figure from a fetched page; the repeated "millions" is search-summary text. **Speckle's reason** for pinning three 0.140 is
  undocumented. **That Open and `BatchedMesh`** is inferred from `@thatopen/fragments`' deps only. PlayCanvas WebGPU maturity and scene JSON, tree-shaken Babylon bundle size,
  Babylon's `SceneSerializer` limits (docs 404), Percy's model type, and Logisim/Digital's in-simulation drill-down: not fetched.
- **Never reached:** Turing Complete / nandgame / Virtual Circuit Board (3D logic games — the one category that might beat HACER at its own differentiator), node-graph prior art
  (ComfyUI, litegraph, Rete), the three.js editor's scene JSON, xeokit's `SceneModel` API. **R2's list.**

**Corrections applied after the first draft, both mine to own:** dates first taken from `npm view <pkg> time.modified` were re-checked against the publish time of the exact version
cited. Two were wrong — `@react-three/a11y` 3.0.0 is **2022-05-15**, not 2026-08-07 (four years stale, so §1c now says take the pattern, not the package), and headless-`gl`'s
stable 8.1.6 is **2024-10-29**, not 2026-04-10 (a 9.0.0 prerelease). All other cited dates re-verified unchanged.
