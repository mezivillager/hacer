# Vitest projects — `node` and `jsdom`

`pnpm run test:run` runs two Vitest projects. Every test file belongs to exactly one of them.

| Project | Environment | Setup file | What it holds |
|---------|-------------|-----------|---------------|
| `node`  | `node`      | none      | the layers that must stay headless |
| `jsdom` | `jsdom`     | `src/test/setup.ts` | everything else |

```bash
pnpm run test:node          # the headless half — the "engine runs headless" fitness function
pnpm run test:run           # both projects, the definition-of-done command
pnpm exec vitest run --project jsdom
```

## Why

`node` is a guard, not an optimisation. HACER's pure logic (`src/core`, `src/simulation`), its state
layer (`src/store`), its scenario module (`src/scenarios`) and its own tooling (`scripts/`) are
supposed to run with no browser anywhere in sight — that is what makes an agent able to drive the
simulator headlessly, and what keeps the engine portable to a CLI or a worker. Before this split the
claim was untested: `src/test/setup.ts`
patches `HTMLCanvasElement.prototype.getContext` at module scope, so every test imported a DOM
whether it needed one or not and nothing noticed when a headless layer quietly grew a dependency
on `window`.

The `node` project has **no setup file on purpose**. A test there that reaches for `window`,
`document` or `localStorage` fails with a `ReferenceError`, loudly, on the commit that introduces
it. Do not polyfill it back: either the production code gets a port for that browser API, or the
test file joins the exception list below with its reason.

Running without jsdom is also much faster: 66 files / 1583 tests in ~5s, against ~47s for the whole
suite (measured 2026-09-21, #323).

## Membership

Configured in `vite.config.ts`. A file is in the `node` project when **both** hold:

1. it sits under one of `src/core`, `src/simulation`, `src/store`, `src/utils`, `src/lib`,
   `src/scenarios`, `scripts`; and
2. it ends in `.test.ts` / `.spec.ts` / `.test.mjs` / `.spec.mjs` — a `.tsx` test renders JSX, so it
   belongs with a DOM;

…unless it is listed as an exception. Membership is resolved from disk when the config loads, and
the `jsdom` project excludes exactly what the `node` project runs, so a new test file joins a
project on its own and no file can land in both or in neither.

Everything else — components, hooks, gates, nodes, `src/test` — stays in `jsdom`. Some of those
files would pass under `node` today (the pure handler and layout tests under `src/components`, for
example); they are left where they are because the directory around them is DOM-bound and an
exception list long enough to carve them out would stop being readable.

## Exceptions — in a `node` directory, but still need a DOM

Each fails with `ReferenceError: localStorage is not defined` (measured 2026-09-21, #323). They go
away when persistence moves behind a port rather than touching `localStorage` directly.

| File | Reason |
|------|--------|
| `src/core/testing/chipCompletion.test.ts` | `localStorage`: completed-chip persistence |
| `src/lib/performanceModeStorage.test.ts` | `localStorage`: the performance-mode preference itself |
| `src/store/circuitStore.autosave.test.ts` | `localStorage`: autosave slot round-trip |
| `src/store/actions/persistenceActions/autosave.test.ts` | `localStorage`: debounced autosave writes |
| `src/store/actions/persistenceActions/persistenceActions.test.ts` | `localStorage` + `Blob`/`document`: save, load, export |
| `src/store/actions/testActions/testActions.test.ts` | `localStorage`: marks a chip completed on a passing run |
| `src/store/actions/viewActions/viewActions.test.ts` | `localStorage`: persists the performance mode |

To add one, put the path in `NEEDS_DOM` in `vite.config.ts` with a one-line reason. The config
throws at load if an entry no longer exists, so the list cannot rot silently.
