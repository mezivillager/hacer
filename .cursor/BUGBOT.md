# Bugbot review rules for HACER

Bugbot is an **advisory** second reviewer here; the in-session verifier (`docs/harness/verifier-brief.md`)
and CI (`ci`, `pr-hygiene`, `browser-qa`) are the gates. Review against the same rules.

## Report
- Correctness bugs with a `file:line` and the input or step that shows them.
- Violations of the repo's hard rules (`.claude/CONSTITUTION.md`): `any` or `@ts-ignore`; new
  `useMemo`/`useCallback`/`React.memo` (React Compiler is on; the only allowed `useMemo` is for
  Three.js geometries/materials); store mutated outside `circuitActions`; React, the store or
  `notify` imported into `src/core/**` or `src/simulation/**`; errors thrown where the codebase
  returns them as data.
- Workflow changes: secrets or PR-controlled strings reaching a `run:` block, `pull_request_target`
  that checks out PR code, missing `permissions:`.
- Semantics under `src/core/**` / `src/simulation/**` that could diverge from the nand2tetris
  reference (official `.tst`/`.cmp` vectors) — say which vector would catch it.

## Do not report
- Anything lint, the type check, or `lint:docs` already enforce; formatting; naming taste.
- Generated or vendored files, `pnpm-lock.yaml`, `CHANGELOG.md`, `scripts/fixtures/**`,
  `docs/research/**` prose, and the legacy `.cursor/` tree other than this file.
- More than three nits per review — summarise the rest as a count.
