/**
 * Layer rules as a ratchet (#329). HACER's three layers — pure logic ← state ← rendering — were a
 * convention until now: the foundation audit found 16 production cross-layer edges and 3 cycles
 * passing a green `lint` (docs/research/2026-09-21-foundation-audit/REPORT.md §4-§6).
 *
 * The rules below are the wall. Today's violations live in `.dependency-cruiser-known-violations.json`
 * and are ignored at lint time; a *new* one fails. The baseline is only ever rewritten with
 * `--baseline-mode shrink-only` (`pnpm run lint:layers:shrink`), so a violation that has been fixed
 * can never be re-added. Run it, and read the count, with `pnpm run lint:layers`.
 *
 * Adding a RULE is the one exception: its existing violations have to enter the baseline before the
 * ratchet can hold them, which shrink-only cannot do. Record them once, with the rule, in the same
 * commit — `pnpm exec depcruise src --config .dependency-cruiser.cjs --baseline` — and say in the
 * commit message how many rows that added. From then on the rule shrinks like every other.
 *
 * That same command absorbs whatever *else* is broken in the tree at that moment, and no one reads
 * this baseline in a PR: `.gitattributes` keeps it `linguist-generated`, which is deliberate (#406
 * — a baseline write rewrites the whole file, so a line review sees churn, not meaning) but does
 * take it out of review. So this paragraph is not the fence; the fence is the `ratchet` rule in
 * `scripts/pr-hygiene.logic.mjs`, which compares the committed rows against the PR's merge base
 * and fails any row added under a rule name that already existed, naming it.
 *
 * A guard that cries wolf makes agents argue with it, so every rule here is deliberately narrow:
 * it names the directions the audit measured and nothing more. Widen it only with a measurement.
 *
 * `console.*` and DOM globals in the engine are NOT here: they are globals, not dependencies, and
 * dependency-cruiser only sees dependencies. ESLint carries those (eslint.config.js, "engine layer").
 */

/** pure logic — no React, no browser, no store. */
const ENGINE = '^src/(core|simulation)/'
/** the single Zustand store. */
const STATE = '^src/store/'
/** everything that draws: R3F components, the DOM shell, per-gate bodies, hooks, theme. */
const UI = '^src/(components|gates|nodes|hooks|theme|styles)/|^src/(App|main)\\.tsx$'
/** `preserveSymlinks` keeps these as `node_modules/<pkg>/…` under pnpm instead of
 *  `.pnpm/<pkg>@<version>/…`, so neither the pattern nor the baseline breaks on a version bump.
 *  Left unanchored so a nested or hoisted `node_modules` matches too. */
const RENDERING_PACKAGES = '(^|/)node_modules/(three|three-stdlib|@react-three/[^/]+|@react-spring/[^/]+)/'
const UI_PACKAGES = `${RENDERING_PACKAGES}|(^|/)node_modules/(react|react-dom|zustand|sonner|next-themes|lucide-react|framer-motion|leva|@radix-ui/[^/]+|@testing-library/[^/]+)/`

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'engine-no-state',
      severity: 'error',
      comment: 'Pure logic may not import the store. Pass the data in; return data out.',
      from: { path: ENGINE },
      to: { path: STATE },
    },
    {
      name: 'engine-no-ui',
      severity: 'error',
      comment: 'Pure logic may not import anything that renders.',
      from: { path: ENGINE },
      to: { path: UI },
    },
    {
      name: 'engine-no-ui-packages',
      severity: 'error',
      comment: 'No three, React, Zustand or toast libraries in the engine — it must run headless in Node.',
      from: { path: ENGINE },
      to: { path: UI_PACKAGES },
    },
    {
      name: 'state-no-ui',
      severity: 'error',
      comment: 'The store may not import rendering code: layout and node config belong below it.',
      from: { path: STATE },
      to: { path: UI },
    },
    {
      name: 'state-no-3d',
      severity: 'error',
      comment: 'The store may not import a 3D library; geometry types belong to the renderer.',
      from: { path: STATE },
      to: { path: RENDERING_PACKAGES },
    },
    {
      name: 'core-through-index',
      severity: 'error',
      comment:
        "Code outside src/core imports the engine through src/core/index.ts, not past it into a module's internals.",
      from: { path: '^src/', pathNot: '^src/core/' },
      to: { path: '^src/core/', pathNot: '^src/core/index\\.ts$' },
    },
    {
      name: 'src-no-e2e',
      severity: 'error',
      comment: 'Production code may not import test-harness types from e2e/.',
      from: { path: '^src/' },
      to: { path: '^e2e/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'A cycle means neither module can be loaded, tested or moved on its own.',
      from: { pathNot: '^node_modules/' },
      to: { circular: true },
    },
  ],
  options: {
    // node_modules stays in the graph (the package rules need it) but is never walked into.
    doNotFollow: { path: 'node_modules' },
    // pnpm resolves node_modules/<pkg> through .pnpm/<pkg>@<version>; keeping the symlink keeps the
    // version out of every path, so a bump does not invalidate the baseline.
    preserveSymlinks: true,
    // `import type` counts: 4 of the audit's 16 production edges are type-only, and a type edge is
    // still a compile-time coupling that blocks a move.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
