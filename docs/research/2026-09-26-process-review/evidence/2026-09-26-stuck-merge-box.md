# Evidence — the stuck merge box, measured 2026-09-26

Four PRs, all at `main-rules` ruleset 13907542 (required `ci`, `pr-hygiene`, `browser-qa`; strict off;
0 approvals; `require_extra_approval_for_unattributed_changes: true`). Read with
`gh api repos/mezivillager/hacer/actions/runs?head_sha=<sha>` and the merge box in a browser.

## The GitHub merge box (browser, 18:35–18:45Z)

- **#525** (`190a406`, BLOCKED): "1 pending check — **browser-qa** Expected — Waiting for status to
  be reported — Required". Listed successful and required: `CI / ci`, `PR Hygiene / pr-hygiene`.
  The two green `browser-qa` check runs the API lists for the same SHA are not shown.
- **#517** (`ce3e920`, BLOCKED since 2026-09-25T07:22Z): "1 pending check — **pr-hygiene**
  Expected — Waiting for status to be reported — Required". Listed successful and required:
  `browser-qa / browser-qa`, `CI / ci`.
- `gh pr checks <n> --required` reports all three required checks as `pass` on both PRs, because
  the GraphQL rollup reads check *runs*, and the newest run of each name is green.

## Workflow runs per head, in creation order (all created in the same second)

| PR | workflow | runs (conclusion / jobs) in creation order | newest suite |
|---|---|---|---|
| #525 stuck | browser-qa | success · success · **cancelled / 0 jobs** | cancelled |
| #525 stuck | PR Hygiene | success · cancelled / 0 jobs · success | success |
| #517 stuck | browser-qa | success · cancelled / 0 jobs · success | success |
| #517 stuck | PR Hygiene | success · success · **cancelled / 0 jobs** | cancelled |
| #524 merged in 2.5 min | browser-qa | success · cancelled / 0 jobs · success | success |
| #524 merged in 2.5 min | PR Hygiene | success · cancelled / 0 jobs · success | success |
| #511 merged after a fresh-SHA re-push | browser-qa, PR Hygiene | one success each on the re-pushed head | success |

The three runs per workflow are the `opened` and two `labeled` deliveries (#295). With
`cancel-in-progress: false`, GitHub keeps one pending run per concurrency group and drops the rest
while still pending; a dropped run leaves a check suite that is `completed/cancelled` with no jobs
and no check run. Which of the three is dropped is a race. When the dropped one is the **newest**
suite of that workflow, the merge box reports the required context as *expected but never
reported*, and the PR is BLOCKED although every check run is green. #486 (2026-09-24) recovered
the same way #511 did: a force-push of the identical tree, so the new head had one run per workflow.

## Ruleset

```
gh api repos/mezivillager/hacer/rulesets/13907542 --jq '.rules[]|select(.type=="required_status_checks")|.parameters'
{"do_not_enforce_on_create":false,"required_status_checks":[{"context":"ci"},{"context":"pr-hygiene"},{"context":"browser-qa"}],"strict_required_status_checks_policy":false}
```

`require_extra_approval_for_unattributed_changes` applies to pull requests Copilot opens under its
own app identity (GitHub docs, "available rules for rulesets"). Every commit on the four PRs is
authored and committed by the owner's account, so the flag is inert here.

## Rule-suite log

`gh api "repos/mezivillager/hacer/rulesets/rule-suites?ref=main"` for 2026-09-26 lists one
evaluation: #524's merge, `pass`. A merge refused by the merge box leaves no rule-suite entry.
