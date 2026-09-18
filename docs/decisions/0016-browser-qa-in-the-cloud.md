# 0016. Browser QA in the cloud is required for critical changes

- **Status:** Accepted — amends [ADR-0012](0012-e2e-tests-manual-only.md)
- **Date:** 2026-09-18
- **Deciders:** Repo owner (issue #220; QA agent in #257)
- **Phase:** Phase 0.5

## Context
ADR-0012 took Playwright out of every automatic path: the browser suites were slow and flaky as a
gate on every commit, and a scheduled run nobody watched produced failures detached from their
cause. Since then the automated safety net has been lint, unit tests and build. A regression in
wiring, canvas interaction, rendering or persistence is caught only if someone remembers to
dispatch `e2e.yml`.

The owner ruled on 2026-09-18 that this is not enough for the changes that matter:

> "all critical features/fixes have to pass through an independent QA that does browser testing"

and where that testing may run:

> "we need browser testing to be done in cloud for 3d, but 2d and other browser testing can be
> done locally also"

Two consequences follow. Browser testing becomes a required gate again — but only for critical
changes, and only in the cloud, never on the owner's laptop. And a passing suite is half of the
policy: the other half is an *independent* QA that drives the changed flow in a browser (#257).

## Decision
1. **A PR is critical** when it touches `src/components/**`, `src/gates/**`, `src/nodes/**`,
   `src/App.tsx` or `src/store/actions/**` (user-facing behaviour; a rename counts by its old
   path too), or carries the `critical` label, or fixes a `sev:high` / `sev:critical` bug — the
   PR or an issue its body links (`Fixes` / `Closes` / `Resolves` / `Part of #n`) carries
   `critical`, `sev:high` or `sev:critical`. `sev:*` is an issue label, so the check reads the
   PR's files, labels and body and the linked issues' labels (`issues: read`), and re-runs when
   the body is edited. The definition is code: `scripts/browser-qa.logic.mjs` (`CRITICAL_PATHS`,
   `CRITICAL_LABEL`, `SEVERITY_LABELS`, `decide`).
2. **Browser suites run automatically in GitHub Actions only.** `.github/workflows/browser-qa.yml`
   (job `browser-qa`) runs on every PR and always reports. A non-critical PR exits green with
   `BROWSER-QA: skipped (no critical paths)`. A critical PR builds the bundle, serves it with
   `vite preview` and runs Playwright `@store` — plus `@ui` when `src/components/canvas/**`,
   `src/gates/**` or `src/nodes/**` are touched — with the existing SwiftShader flags,
   `--workers 1`, `--retries 2`, then prints one greppable
   `BROWSER-QA: PASS|FAIL suites=… passed=… failed=…` line and a job summary. A run in which no
   test ran is a FAIL. Once green on its first critical PR it becomes a required check.
3. **Never a local gate.** No definition of done, hook or skill asks for `test:e2e*` on a
   developer machine. 2D and other browser tests *may* be run locally by choice; **3D (`@ui`)
   never runs on the owner's laptop** — CI or a cloud session only.
4. **Playwright in CI tests what ships** (#218 folded in): with `CI` set, the `webServer` in
   `playwright.config.ts` runs `vite build` and serves the bundle with `vite preview`; locally
   it keeps the dev server and reuses one already running.
5. **`e2e.yml` stays** as the manual, any-suite entry point (ADR-0012 §2). A run can be
   re-checked by hand with `gh workflow run browser-qa.yml -f pr=<n>`.
6. **The independent QA agent (#257) is the second half.** For a critical PR, merge requires the
   `browser-qa` check *and* a QA verdict from an agent that drives the changed flow against the
   PR preview in a fresh context. That brief is #257's deliverable, not this ADR's.

## Consequences
- Critical PRs regain a browser-level net without taxing every commit: a docs or `src/core`
  change is green in seconds; a canvas change pays for a real run.
- The definition of critical is mechanical and conservative: a test-only change under
  `src/components/**` triggers a run. Narrowing it is a change to `CRITICAL_PATHS`, with a test.
- Flakiness is contained by `--workers 1` and two retries, and the HTML report is always uploaded
  as an artifact for the QA agent and for humans.
- ADR-0012 §1 ("E2E never runs automatically") is superseded for critical PRs; §2–§4 stand.
  The definition of done is unchanged: `pnpm run lint` · `pnpm run test:run` · `pnpm run build`.
- The `browser-qa` check must be added to the `main-rules` ruleset by the owner after its first
  green run on a critical PR; until then it reports but does not block.
- It runs under `pull_request` because it must execute the PR's code, so — unlike `pr-hygiene` —
  a PR can edit its own copy. `scripts/browser-qa*.mjs` belongs on #151's protected-path list
  beside `.github/**` and `playwright.config.ts`.
- A label added to a linked issue after the PR's last run takes effect on the next push, body
  edit or `gh workflow run browser-qa.yml -f pr=<n>`; a link the API cannot resolve fails the
  check rather than skipping it.

## Affected living docs
`docs/decisions/0012-e2e-tests-manual-only.md` (status), `docs/decisions/README.md` (index),
`docs/harness/README.md` (checks table), `AGENTS.md` (§4 CI layers), `playwright.config.ts` —
updated alongside this ADR.

## Links
- [[0012-e2e-tests-manual-only]] · [[0013-backlog-in-github-issues-and-portfolio]]
- Issues #220 (this ADR + workflow), #218 (built bundle, folded in), #257 (QA agent)
- `.github/workflows/browser-qa.yml`, `scripts/browser-qa.mjs`, `scripts/browser-qa.logic.mjs`
