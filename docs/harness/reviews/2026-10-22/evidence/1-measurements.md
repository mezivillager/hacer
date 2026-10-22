# Review 1 — raw measurements

Run 2026-10-22 between 09:11Z and 09:30Z from a worktree at `origin/main` `68ded0de`, with an
authenticated `gh`. Read-only. Counts that move (open issues, `ready`) are snapshots at the time given.

## M1. Verdict and fidelity timing against the merge (204 agent PRs, 2026-09-26..10-22T08:35Z)

The same GraphQL search as `brief-measure-flow.mjs`, with each comment's `createdAt` and the last 20
commits' `authoredDate` (a GitHub REBASE update keeps `authoredDate` and changes `committedDate`, so
only `authoredDate` separates new content from `merge-on-green`'s rebase). The script:

```js
// semantic = a non-test file under src/core or src/simulation (the brief's proxy)
for (const p of sem) { const f = p.comments.nodes.filter(c => FID.test(c.body.trimStart()))
  if (!f.length) none.push(p.number); else if (f.some(c => c.createdAt <= p.mergedAt)) pre.push(p.number); else post.push(p.number) }
for (const p of agents) { const before = verdicts(p).filter(v => v.t <= p.mergedAt), last = before.at(-1)
  if (!last || last.s !== 'PASS') { noPass.push(p.number); continue }
  if (p.commits.nodes.some(n => n.commit.authoredDate > last.t)) afterPass.push(p.number) }
```

```text
FIDELITY on 43 semantic PRs: before merge 15 [869,862,853,845,826,818,753,747,744,743,741,740,732,725,643]
  only after merge 1 [911] · none 27
VERDICT TIMING (204 agent PRs): no PASS posted before merge 19 [775,640,638,582,580,578,576,574,571,553,
  543,534,532,529,527,526,525,524,517]
  commits authored after the PASS that preceded merge 17 [780,766,735,727,721,711,709,707,698,687,683,
  672,664,662,653,651,631]; code among them: #698 "refactor(gates): drop BaseGate's stale stub-wiring",
  #721 "refactor(nodes): BusComponent3D draws nothing for…", #711, #709; the rest docs or nits
  BLOCK without a later PASS before merge 0
```

#911: merged 04:18:56Z; its only fidelity comment is the digest, posted 04:29:08Z.

## M2. Shaping, the gap, and the queue

```text
$ gh api repos/mezivillager/hacer/issues/<n>/timeline --jq '…labeled agent-ready…|last'
  #379 09:13:46Z · #773 09:14:02Z · #339 09:13:57Z · #599 09:14:07Z · #941 09:14:29Z   (2026-10-22)
$ node scripts/backlog.mjs projects            # ~09:20Z
  foundation ready 7 · upkeep ready 10 (all inbox reviews) · harness 1 · spine 0 of 12 open · verify 0 · core 0
  spine (ready --json, ~09:17Z): 165 167 169 170 171 172 173 174 176 177 235 236, all "unshaped"
$ gh issue view 177 → labels project:spine,risk:2; blocked by #193 (closed 2026-09-27), #378 (closed 2026-10-15)
$ gh issue view 139 → 0 comments (no fidelity verdict on the spine epic)
$ gh api graphql search 'is:pr is:merged merged:2026-10-05T00:00:00Z..2026-10-14T21:59:00Z' → issueCount 0
$ command grep -l '^\s*schedule:' .github/workflows/*.yml → lineage-verify, mission-control, pr-preview, scorecard
```

## M3. The inbox and the panel

```text
$ node scripts/inbox.mjs list --json | (count by prefix and status)   # 09:22Z, after the retro's 96de42f1
  HRN filed 17 · HRN proposed 10 · FID filed 26 · FID declined 1 · FID deferred 5 · PRD filed 2 · PRD deferred 1
$ command grep -c '^## R[0-9]+ .*without a (separate )?fidelity review' docs/decisions/rulings/2026-10-21-hacer-loop-to-70.md
  13   (of 28 `^## R` headings in that file)
panel share of the run's subagent tokens (brief-hypotheses.txt, H6): 4,597,246 / 18,752,619 = 24.5%
```

## M4. Enforcement

```text
$ gh api repos/mezivillager/hacer/rules/branches/main
  required_status_checks: ci, pr-hygiene, browser-qa · allowed_merge_methods: [rebase]
$ command grep -n -i 'verdict' scripts/merge-on-green.logic.mjs
  every hit is a check-run verdict (judge(), lines 82-95); nothing reads a PR comment
#578 (random pick): .claude/skills/ha-prompt-it/SKILL.md, opened 20:00:02Z, merged 20:02:04Z 2026-09-28,
  labels: released only, no verdict
```

## M5. Two verifier verdicts on the same class of defect

```text
#725, 2026-10-15T04:12:01Z  BLOCK  B1: assignPartIds never returns when a marker's number is 2^53 or more
#826, 2026-10-21T16:00:41Z  PASS   nit 1: a registry returning a fresh definition per get makes compileHDL
                                   never return; "On main the same input compiled" → #836, fixed by #843 at 17:02:05Z
```

## M6. The reference on a pin declared twice (R879's unmeasured premise)

`../web-ide/` at `91ef428`, read, not run: `simulator/src/chip/chip.ts:237-240`, `Pins.insert` asserts
`!this.map.has(name)` ("Pins already has …"), and the `Chip` constructor inserts every `IN` and `OUT`
pin through it (`:313-342`). A pin repeated within `IN` or within `OUT` therefore fails in the reference
too, as #921 now refuses it.
