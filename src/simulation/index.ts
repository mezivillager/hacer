/**
 * The simulation layer's front door (#336).
 *
 * Bus arithmetic only: the four operations that read and write a sub-range of a multi-bit value,
 * which the HDL compiler, the `.tst` runner and every read-only renderer all need, and which
 * depend on nothing.
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
