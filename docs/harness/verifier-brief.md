# Verifier brief — one PR, fresh context

Given to an agent that has **not** seen the builder's session. It judges the PR only against its
issue and the code. Read-only, except a throwaway worktree and exactly one comment on the PR.

**Exception:** a `risk:0` docs-only PR may merge on the coordinator's own review instead of this
dispatch, posted in the same format with `Verified on: coordinator`. A fix that follows a **BLOCK**
never takes that shortcut — it goes back to a fresh verifier, always, never the coordinator.

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
1. Worktree from the PR head: `git fetch origin && git worktree add ../hacer-wt-verify-<pr> origin/<branch> && node scripts/wt-new.mjs scratch ../hacer-wt-verify-<pr>`, `rm -rf node_modules && pnpm install --frozen-lockfile`, Node 22. Write your definition-of-done logs and your verdict body only in the folder `SCRATCH:` names, and post the verdict with `--body-file`, never inline. The folder is outside the worktree, so removing the worktree in step 8 leaves it.
2. Run the issue's verification command and the definition of done (`docs/harness/implementer-brief.md`); record exit codes and counts.
3. Read the PR's own CI logs, including `browser-qa`: `gh run list --branch <branch>`, then `gh run view <id> --log`. Cite the run id and what the log shows for each required job. A green summary is not evidence the specs ran. A skipped or empty job is "unproven".
4. Read every changed file in full. For each acceptance criterion, cite the test (`file:line`) that proves it, or write "unproven".
5. Check the commit sequence: tests committed before the implementation; the red commit fails on its own (check it out; never `git stash`).
6. Check scope and layering: nothing outside the issue; no new imports across the layer walls; changes to shared files (store types, evaluator, configs) are minimal and justified.
7. **Try to break it:** 2–3 throwaway tests for edge cases the author is likely to have missed. Do not commit them.
8. Remove the worktree.

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

## Overturned verdicts
**Overturned:** A verdict is overturned when it is a PASS whose ticked criterion, or whose `Blockers: none`, a later PR's fix or a later verifier pass shows was wrong, or a BLOCK whose finding a fresh verifier or a ruling rejects with no code change; it is not overturned when the defect lies in a path the verdict marked `unproven` or listed under `Not covered`, or when a later ruling changes the design or the issue's criteria.

- **Who applies the label.** The retro reports candidates: an unlabelled PASS whose defect a later
  PR fixed is a candidate, not an overturn. The coordinator classifies each against the definition
  and applies `overturned` to the PR when it meets it. The owner may remove the label. The rule
  covers verifier verdicts only: the fidelity and product briefs keep the owner as the applier.
- **The label's comment.** When it applies the label, the coordinator posts one PR comment naming
  the verdict's comment id, its `Verified on:` model, the later PR or pass that showed it wrong, the
  case of the definition it meets, and `applied by the coordinator under verifier-brief.md`. Agents
  post as the owner's account, so this comment is the only record of who applied the label.
- **The label alone moves no tier.** What a labelled verdict counts for is `model-tiering.md` §2.

The second overturn of the same kind changes this file.
