# Stryker Mutation Testing Evaluation

Evaluation date: 2026-03-08

## Summary

Stryker mutation testing is set up and verified to reliably identify testing gaps. The configuration runs on PRs when `src/**` changes.

## Single-File Evaluation (gateLogic.ts)

| Metric | Value |
|--------|-------|
| Mutants | 36 total, 21 tested (15 static ignored) |
| Mutation score | 100% (all mutants killed) |
| Runtime | ~2 minutes |
| Config | `stryker.config.json` (mutate: src/simulation/**) |

### Gap Detection Verified

We intentionally weakened the xnorGate tests (removed assertion for "inputs different" case). Stryker detected:

- **Survived mutant:** `ConditionalExpression` at `gateLogic.ts:10:62`
  - Original: `a === b`
  - Mutant: `true` (equivalent to `!==` behavior when not covered)
- **Mutation score dropped:** 100% → 95.24%

Restoring the removed assertion brought the score back to 100%. This confirms Stryker reliably identifies testing gaps.

## Configuration

### Main Config (`stryker.config.json`)

- `mutate`: `src/**/*.ts` (business logic only, no UI components .tsx) excluding test files, `src/test/**`, and `vite-env.d.ts`
- `thresholds`: high 80%, low 60%, break 50%
- `ignoreStatic`: true (improves performance)
- `coverageAnalysis`: perTest

### Config

Single config: `stryker.config.json`. The `mutate` array defines the set of files to test. Add patterns (e.g. `src/store/**/*.ts`) as the codebase grows—no new configs or scripts.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run stryker` | Full run on configured mutate set |
| `npm run stryker:changed` | PR-only: changed files, max 3 files (~3 min) |

## CI Workflow

- **`--since` is not supported** by StrykerJS; the previous workflow would have failed.
- **PRs:** Run `npm run stryker:changed` — only mutated changed source files (max 3, ~3 min cap). Uses `scripts/stryker-changed.sh`.
- **Timeout:** 30 minutes

## Recommendations

1. **Business logic only** — the config covers `src/**/*.ts` (excluding tests). UI components (.tsx) are excluded. PR runs mutate any changed .ts source file (max 3), independent of the config.
2. **Limit:** PR runs use max 3 changed files to keep runtime under ~3 min. Adjust `STRYKER_CHANGED_MAX_FILES` if needed.
3. **Run `npm run stryker` locally** before committing changes to mutated files.
4. **Use `ignoreStatic`** for all configs to reduce runtime.
5. **Address survived mutants** by adding or strengthening tests; avoid lowering thresholds.

## References

- [Stryker Configuration](https://stryker-mutator.io/docs/stryker-js/configuration/)
- [Incremental Mode](https://stryker-mutator.io/docs/stryker-js/incremental/)
- [docs/testing/standards.md](./standards.md)
