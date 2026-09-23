# layer-ratchet fixtures

A miniature repo with the layout `.dependency-cruiser.cjs` describes, and one deliberate violation
of every rule in it. `scripts/layer-ratchet.logic.test.mjs` cruises this tree with the **real**
`forbidden` rules and asserts each one fires — a guard with no failing case is not a verified guard.

Nothing here is application code: it is never type-checked (no tsconfig includes `scripts/`), never
linted (`eslint.config.js` ignores it) and never cruised by `pnpm run lint:layers`, which is rooted
at `src`. Keep the imports deliberately wrong.

`src/core/index.ts` is the one deliberately *right* import here: `core-through-index` must flag
`src/components/widget.ts` reaching into `src/core/internal.ts` and must leave the front door alone.
