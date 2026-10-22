# The differential harness — HACER beside the reference simulator

`pnpm run test:differential` runs HACER's engine and the nand2tetris reference simulator
([web-ide](https://github.com/nand2tetris/web-ide)) on the same official Project-1 `.tst` for each of
the 15 chips, and compares the two .out files line by line (#338). A passing suite is a weak oracle;
an implementation HACER did not write is a strong one.

It lives in `conformance/differential/`, never in `src/`: the `src-no-conformance` rule in
`.dependency-cruiser.cjs` fails any import of it from production code. It has its own Vitest config, so
`pnpm run test:run` never collects it, and its own CI job, `differential` in `.github/workflows/ci.yml`.

## What a run checks

For each chip in `project1DependencyOrder`, with HACER's own HDL (`project1HdlSources`) and the
official `.tst`/`.cmp` from `conformance/vectors/01/`:

| Verdict | Meaning |
|---|---|
| `AGREE` | both engines wrote the same .out, line for line, and it is the official `.cmp` |
| `DISAGREE` | one line per difference: `<chip> line <n>: expected <reference's line>, actual <HACER's line>` |
| `REJECTED` | the engines agree, but the reference's .out is not the `.cmp`: the HDL is wrong, so agreement proves nothing |
| `ERROR` | one engine wrote no .out, and why |

HACER's .out is what `runCli(['run-tst', '<chip>.hdl', '<chip>.tst'], read)` prints, with `read` serving
the vector from memory: `runCli` is the function the `hacer` bin calls, so a change to the CLI's path
reaches the harness, and `conformance/differential/harness.test.ts` fails if the harness stops calling it.

The harness is not vacuous: the upstream stub `.hdl` files (empty `PARTS:`) are `REJECTED` for all 15.

**A disagreement is a finding, not a test to tune.** File an issue naming the chip, the line, both
values and the pinned commit; do not edit the harness, the vectors or the pin to make it pass.

## The reference, and where it comes from

Nothing of web-ide is committed. `conformance/differential/reference.ts` (run by the suite's global
setup, or alone with `node conformance/differential/reference.ts`) does this once per pin, under
`node_modules/.cache/hacer-differential/<commit>/`:

1. a sparse, shallow clone of the repository `conformance/differential/reference.json` names, at its
   `commit` (`projects`, `runner`, `simulator`, `LICENSE`, `tsconfig.base.json`, and its lockfile),
   checked against the pin;
2. `npm ci` from upstream's own lockfile at that commit, with a manifest of our own naming only
   those three packages and the four exact versions the pin lists. The lockfile fixes the whole
   tree, transitive packages included, so every cold run installs the same one; `npm ci` fails if a
   pinned version is not the one the lock resolves. `@davidsouther/jiffies` must be exactly **2.2.5**:
   2.3.0 ships `.ts` sources and one `.js` file, so every `lib/esm/*.js` import fails at runtime;
3. `tsc --build` of each package. Upstream's sources carry type errors (6 at `52611ad9`) that do not
   stop the emit, so the run checks the emitted files, never tsc's exit code;
4. a provenance file in that folder, recording the pin it was built from and that the install was
   `npm ci`. A cache is reused only if its provenance matches both and the three emitted files still
   exist; any other cache is rebuilt from scratch.

The pin is the commit `conformance/vectors/` was extracted from, so the vectors and the simulator
come from one place. A cold run (fetch, install, build, test) took 37 s on the owner's laptop, and a
cached run 7 s.

## Re-vendoring

1. Pick the new upstream commit, and read the versions its package-lock.json resolves for
   `@davidsouther/jiffies`, `ohm-js`, `rxjs` and `typescript`. `npm ci` takes the lockfile as it
   stands, so a direct dependency upstream adds to one of the three packages arrives with it.
2. Set `commit` and those versions in `conformance/differential/reference.json`. Change jiffies only
   if upstream has, and check the new version ships `lib/esm/*.js`.
3. `pnpm run test:differential`. The changed pin rebuilds the cache.
4. A new disagreement is a finding about one engine or the other. Read it before you land the pin.
5. If `conformance/vectors/` moves to the same commit, re-vendor both in one PR.

## Licence

web-ide is MIT, Copyright 2022 David Souther et al: `conformance/differential/LICENSE` carries it
verbatim. The official vectors the harness reads are not MIT: see `conformance/vectors/LICENSE`.
