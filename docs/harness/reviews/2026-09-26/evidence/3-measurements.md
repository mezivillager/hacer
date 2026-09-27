# Measurements behind review 3

Captured 2026-09-27 from `hacer-wt-process-review-findings`. GitHub numbers are from
`mezivillager/hacer`. Local reproducers used temporary repositories and a pure import of
`scripts/backlog.logic.mjs`. Nothing here is a personal config value.

## Flow script

`node docs/harness/reviews/2026-09-26/evidence/brief-measure-flow.mjs` (range 2026-09-18..2026-09-25):

```text
MERGED: 125 PRs (113 non-Dependabot, 12 Dependabot)
  by day: 09-18 27 · 09-19 9 · 09-21 17 · 09-22 1 · 09-23 26 · 09-24 32 · 09-25 13
  by files (non-Dependabot): process tooling 41 · docs only 37 · engine 16 · other non-src 13 · mission-control app 4 · other src/ 2
  by project: harness 60 · foundation 17 · core 9 · mission-control 6 · lineage 4 · verify 4 · upkeep 4 · bugs 2 · 3d 1 · surfaces 1 · pubdocs 1 · spine 1
  open -> merge hours: median 0.3 · p90 12.1
  changed lines: median 233 · p90 924
VERDICTS: with 62 · without 63 · PASS 48 · BLOCK 20 · blocked at least once 19
  without a verdict and changing code: #250 #285 #287 #288 #303 #306 #307 #442 #443 #445 #449
ISSUES: opened 258 · closed 106 · opened 09-18: 126
  open now: 152 · agent-ready 62 · needs-human 0 · idea 0 · in-progress 3
```

`node scripts/backlog.mjs ready --json` reason counts the same day: pickable 44, unshaped 76,
in-progress 3, foundation-gate 8, on-request 3, blocked:#315 1, blocked:#193 1, not-pulled 2.
First twelve pickable: foundation#193, lineage#471, harness#148, foundation#217,
mission-control#478, spine#175, foundation#279, upkeep#253, foundation#315, lineage#481,
harness#149, foundation#331.

`pnpm run lint:lineage`: `LINEAGE: 370 decisions · 299 unlinked · 0 unresolved · 9 superseded-cited`.

Open `risk:2` issues: 64. `gh issue list --label in-progress`: #470, #468, #182.
`git ls-remote origin refs/heads/claim/*`: claim/182, claim/193, claim/468, claim/470.
#193 labels: released, project:verify, agent-ready, risk:2, project:foundation. No `in-progress`.
`claim/193` points at `712a0360`, committer date 2026-09-23T22:47:46Z.
#175 labels: project:spine, agent-ready, risk:1, research. Open.
#407 is open: "Two PRs can be green alone and red merged, and nothing detects it before main".

## Ruleset and #517

`gh api repos/mezivillager/hacer/rulesets/13907542` (`main-rules`, enforcement active):
required checks `ci`, `pr-hygiene`, `browser-qa`; `strict_required_status_checks_policy` false;
`required_approving_review_count` 0; `require_extra_approval_for_unattributed_changes` true.
Repo owner type: `User`.

#517: `mergeable` true, `mergeable_state` blocked, `auto_merge` null, `mergedAt` null.
Head `ce3e920`. Every check run named `pr-hygiene`, `browser-qa`, or `ci` on that head concluded
success. Workflow runs on that head include a cancelled PR Hygiene run whose check suite
`97776650607` has zero check runs and a higher suite id than the successful PR Hygiene suite
`97776650604`. #525 `mergedAt` is 2026-09-26T18:46:39Z.

Mission Control snapshot `generatedAt`: 2026-09-27T07:39:13.824Z
(`https://mezivillager.github.io/hacer/control/data/snapshot.json`).

## Claim ref

Documented command `git push origin HEAD:refs/heads/claim/1` against a local bare remote:

```text
first claim: exit=0; created
second claimant, same HEAD: exit=0; Everything up-to-date
second claimant, descendant HEAD: exit=0; fast-forwarded
```

## Successive top picks

Eight calls to `planReady`, deleting the previous top pick each time, on a fixture with three
ready issues in each cycled row:

```text
ONE_LIST foundation,lineage,harness,foundation,mission-control,spine,foundation,verify,...
SUCCESSIVE_TOP foundation,foundation,foundation,lineage,lineage,lineage,harness,harness
```

`rotate` in `scripts/backlog.logic.mjs` sets `aux` to 0 at the start of every call.

## Traced PRs

Seeded sample `random.Random(20260927)` over non-Dependabot merges in the window, excluding the
five named PRs, drew #303 and #409.

| PR | Commits (first lines) | Verdict comments |
|---|---|---|
| #432 | three `test` then `feat` pairs | PASS, BLOCK, PASS |
| #444 | one `test(hdl):` after a coordinator rewrite | BLOCK, then a coordinator note that the rewrite landed one test commit |
| #459 | `test` then `fix` | one PASS |
| #365 | `test` then `fix` | one PASS, then a coordinator correction of the repro |
| #488 | `test` then `feat` | one PASS |
| #303 | `test` then `feat` | "Coordinator review: PASS" |
| #409 | one `ci(deps):` | one PASS |

#444's BLOCK says a rebase would have landed a commit that shifts every parse column by +100_000
and a `fix(hdl)` commit that semantic-release would publish for a bug that never shipped.

## 09-23 merges

GitHub lists 26 PRs merged on 2026-09-23. The session record's table names ten (#360, #362, #366,
#365, #370, #358, #375, #351, #387, #388). The same record later names #396, #398, #399, #404,
#409, plus record PRs #393 and #412. Nine further merges that day start at 10:44Z (#417 through
#430).

## Ledger column

55 data rows in `docs/harness/ledger.md`. Mechanised cell: yes 40, two qualified yes, partly 4,
no 8, n/a 1.

## Sizes

`AGENTS.md` 298 lines. `docs/harness/README.md` line 27 is 836 words.
`.claude/CLAUDE.md:42` links `tasks/todo.md`. `~/.local/bin/gh-merge-on-green` is 128 lines.
`conformance/vectors/` contains `01/` and `LICENSE` only: 16 chips, three files each.
`package.json` has no `bin` entry.
