# layer-ratchet fixtures

A miniature repo with the layout `.dependency-cruiser.cjs` describes, and one deliberate violation
of every rule in it. `scripts/layer-ratchet.logic.test.mjs` cruises this tree with the **real**
`forbidden` rules and asserts each one fires — a guard with no failing case is not a verified guard.

Nothing here is application code: it is never type-checked (no tsconfig includes `scripts/`), never
linted (`eslint.config.js` ignores it) and never cruised by `pnpm run lint:layers`, which is rooted
at `src`. Keep the imports deliberately wrong.

`src/core/index.ts` is the one deliberately *right* import here: `core-through-index` must flag
`src/components/widget.ts` reaching into `src/core/internal.ts` and must leave the front door alone.

`src/cli` and `src/mcp` each hold one import of the store or the UI: `surfaces-through-core`.

`src/nodes/BusSplitter3D.tsx` is a mesh component with a type-only store import: `mesh-no-state`
must catch it. `src/nodes/NodeRenderer.tsx` beside it is an adapter that reads the store, and the
rule must leave it alone — it names the mesh files, not their folders.
