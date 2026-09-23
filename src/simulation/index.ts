/**
 * The simulation layer's front door (#336).
 *
 * The bus half of the engine's surface, and nothing else. Two things are here, both of which
 * depend on nothing and are needed by callers in every layer:
 *   - **Bus arithmetic** — the four operations that read and write a sub-range of a multi-bit
 *     value, which the HDL compiler, the `.tst` runner and every read-only renderer all need.
 *   - **`createBusPins`** — a bus component's pin interface, derived from its kind and width.
 *     It is the contract the three layers agree on rather than one layer's internal: the store
 *     creates a component with it (`busActions`), `core/serialization/deserialize` rebuilds a
 *     saved one with it, and the renderers lay out against the pin ids it produces (#181).
 *
 * Re-exports are named, never `export *`, and come from a module, so the front door never reaches
 * past one — the same rule `src/core/index.ts` keeps. `src/core/index.test.ts` pins this list
 * exactly, so a name joins it only by a deliberate edit there.
 *
 * Deliberately NOT here, because each one is canvas-shaped or not headless, and an index that
 * re-exports a module's internals makes them public without saying so:
 *   - `topologicalEval` and `truthTable` walk a `CircuitDocument` — the store's canvas document,
 *     not the engine's chip model. The headless path to the same answer is `evaluateChip`.
 *   - `busLogic` (`evaluateSplitter` / `evaluateJoiner`) evaluates canvas bus components; its only
 *     caller is that canvas walk.
 *   - `signalDisplay` formats values for the UI and imports from `@/components`.
 */
export { clampToWidth, maskForWidth, readSubBus, writeSubBus } from './busOps'
export type { BusPin } from './busPins'
export { createBusPins } from './busPins'
