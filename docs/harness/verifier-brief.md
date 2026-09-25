# Verifier brief — one PR, fresh context

Given to an agent that has **not** seen the builder's session. It judges the PR only against its
issue and the code. Read-only, except a throwaway worktree and exactly one comment on the PR.

## Pre-dispatch contract
Before dispatching, state three things: the expected evidence, the known unknowns, and the
**stopping condition** — when the review ends (every acceptance criterion answered, or a stated
budget, whichever comes first). Do not lead an adversarial reviewer with the preferred conclusion —
give it the sources.

## Inputs
- The issue the PR closes (its acceptance criteria and verification command); the PR diff; `AGENTS.md`, `.claude/CONSTITUTION.md`, `.claude/skills/hacer-patterns/SKILL.md`.
- The budget: ≤ 400 reviewable changed lines (≤ 200 expected); one sub-issue per PR.
- **Model:** a PR touching `src/core/` or `src/simulation/`, or labelled `risk:2`, is verified on **Opus**; every other PR, at `risk:0` or `risk:1`, on **Sonnet**. The engine clause is first and wins: a `risk:1` PR that touches `src/core/` or `src/simulation/` is an Opus review, not a Sonnet one. The measurement behind the split, and what would move it back: `model-tiering.md`.
- When the coordinator ran `node scripts/second-opinion.mjs <pr>` (`cursor-lane.md` §1.6), its output — **advisory leads, read after your own pass**. A second-opinion BLOCK counts only once you reproduce it; add `Second opinion (<model>): <verdict>; confirmed <n>, rejected <n>` to the verdict.

## Method
1. Worktree from the PR head: `git fetch origin && git worktree add ../hacer-wt-verify-<pr> origin/<branch>`, `rm -rf node_modules && pnpm install --frozen-lockfile`, Node 22.
2. Run the issue's verification command and the definition of done (`docs/harness/implementer-brief.md`); record exit codes and counts.
3. Read every changed file in full. For each acceptance criterion, cite the test (`file:line`) that proves it, or write "unproven".
4. Check the commit sequence: tests committed before the implementation; the red commit fails on its own (check it out; never `git stash`).
5. Check scope and layering: nothing outside the issue; no new imports across the layer walls; changes to shared files (store types, evaluator, configs) are minimal and justified.
6. **Try to break it:** 2–3 throwaway tests for edge cases the author is likely to have missed. Do not commit them.
7. Remove the worktree.

## Verdict rules
- **BLOCK** only with `file:line` plus a failing command or a concrete input/output. Never for taste.
- **NIT** ≤ 3; the rest as "plus N similar". Nits never block; the coordinator files the ones worth keeping as follow-up issues (depth 1, ≤ 3).
- **PASS** when there are no blockers.
- **Invalidates:** when a BLOCK's finding means a past decision (`ADR-NNNN`, `R<n>` or `P-<n>`) was
  wrong, not just that the code needs a fix, name it here — `none` otherwise, and on every PASS.
  This is what starts the correction workflow (`docs/research/2026-09-24-decision-lineage/REPORT.md`
  §7): the coordinator runs `lineage radius <id>` on the name to find every decision resting on it.
- **Name the model you ran on**, in the `Verified on:` field, always. It is the only record that exists: nothing in the repository, the PR or the API says which tier reviewed a PR, so an unnamed verdict cannot be counted as evidence for or against a tier later — and a mis-tiered dispatch stays invisible. If the tier you are running on is not the one the rule above gives for this PR, say so in one line under the verdict, whichever direction it is wrong in.
- A criterion counts as satisfied only when a test **you ran** proves it; a test whose *name* matches the criterion proves nothing — read what it asserts. A failing test you cannot tie to the diff is a machine problem until you show otherwise: re-run it at `origin/main`, and treat a pre-existing flake as a nit, not a blocker. Both are failures a cheaper tier made on #238 (`model-tiering.md` §1).

## Output — one PR comment
The heading `## Verifier verdict: PASS | BLOCK` and the `Verified on:` line are required in every lane, cloud included — it is what a verdict collector counts, so a differently worded PASS/BLOCK is invisible to it.
```
## Verifier verdict: PASS | BLOCK
**Verified on:** <the model you are running as> · **Reviewable lines:** N (budget 400) · **Tests:** N added, suite X passed / Y failed · **DoD:** lint ✔/✘ test:run ✔/✘ build ✔/✘ lint:docs ✔/✘
**Invalidates:** <on BLOCK, the decision the finding invalidates, or `none`>
### Acceptance criteria
- [x|_] <criterion> — <file:line or "unproven">
### Blockers
- <file:line> — <what breaks and how to see it>   (or "none")
### Nits (≤3)
### Edge cases tried
### Not covered
- <what was in scope but not checked, and why — "none" only when the whole diff was reviewed>
_Independent fresh-context review; the verifier did not see the author's session._
```

The owner tunes this brief by applying the `overturned` label to a PR whose verdict was wrong and
saying why on the PR; the second overturn of the same kind changes this file.
