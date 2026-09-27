# Process review — the autonomous flow, reviewed 2026-09-26

**Reviewer:** a fresh session (Fable 5.1), no memory of the runs, working alone at the owner's
instruction ("just you": no subagents, no cross-model read). **Brief:** `BRIEF.md` on `main` at
`d1c3074`, plus the balancing rewrite on PR #525, whose corrections were treated as claims to test.
**Numbers** are *measured* on 2026-09-26 unless marked *(inferred)*. Raw data for §3's first
finding: `evidence/2026-09-26-stuck-merge-box.md`. Weekly meter: 20% at start, 20% at the last read.

## 1. Verdict

- **Is the flow moving the platform forward?** Partly, and by design. The eight days moved the
  *foundation* and the *guards*: ten engine defects fixed with repros, ADR-0020 accepted after two
  spikes, the layer ratchet down 77 → 71, the Project 1 oracle vendored. The *spine* moved one task
  of 16, and its own measure (conformance pass count) cannot rise until Projects 2–5 vectors exist —
  which sit in the other lane behind a claim marked `building` since 2026-09-23. The evidence fits
  "tooling-heavy fortnight with engine fixes" through 09-24, and "the process became the product" on
  09-25 (24 PRs, none under `src/`). What tells the two apart in the next two weeks: a conformance
  count above zero for Phase 0.6.
- **The single biggest risk to autonomy is the merge step.** Green PRs strand in the merge box by a
  race the #295 fix moved rather than removed (four in three days: #486, #511, #517, #525), the only
  recovery in use is a force-push a permission classifier now refuses, and the tool that merges
  lives outside the repo, untested. When it fails nothing moves, and only the laptop can unstick it.
- **The highest-leverage change:** make merging boring — let every triggered run finish (no
  concurrency group on the two required workflows), move the merge tool into `scripts/` with tests,
  and the whole loop becomes runnable from a cloud session.
- **Keep:** the fresh-context verifier's "try to break it" step and the red-first commit sequence.
  Both were visible in every traced PR, and the verifier caught a real defect in four of seven.

## 2. Scorecard

| Stage | Rating | Evidence |
|---|---|---|
| Priorities | works | `PICK_ROTATION` in `scripts/backlog.logic.mjs:23` matches `docs/portfolio.md`; `backlog projects` prints 14 rows with live counts |
| Task shape | fragile | 64 of 152 open issues are `risk:2`, 76 read `unshaped`; blast radius is a command someone remembers to run |
| Pick | works | `ready` gives a reason for every unpickable issue; allowlisted authors only |
| Claim | fragile | 4 `claim/*` refs vs 3 `in-progress` labels; #193 carries a ref and no label; five stale refs were released one day earlier |
| Build | works | every traced PR (#238, #365, #432, #444, #459, #488, #490) shows a `test(...)` commit before its `feat`/`fix` |
| PR | works | `pr-hygiene` failed real cases this fortnight (#432 ratchet, #485 closing keyword); 400-line budget held with `size-override` on the record |
| Correctness | works | three required checks; `browser-qa` cloud-only as ADR-0016 says |
| Judgment | fragile | rule and practice disagree: `ha-next` §4 sends every PR to a verifier, while #440 merged on a non-contract PASS, #319 on the coordinator's own PASS after a BLOCK, #444 on a coordinator rewrite with no re-verify |
| Merge | **broken** | two open PRs BLOCKED with every check green (#517 for 36 h, #525); cause measured in §3 F1 |
| Release | works, noisy | 48 releases, 31 minor versions, 09-18..09-25 |
| Learning | works | ledger 55 rows: 42 mechanised, 4 partly, 8 no, 1 other |
| Stop | fragile | ceilings read from a browser tab; R700 wrote a premise the meter contradicted; R741 ran past a reset |
| Memory | fragile | 343 rulings on `main`, 299 of 370 decisions unlinked; R721–R741 exist only on PR #517 and in a run directory |
| Visibility | works | `/control/data/snapshot.json` live; latest archive 16:17Z at 18:44Z, so "hourly" is best-effort |

## 3. Findings

Severity: **critical** (blocks the loop), **high** (costs owner time or a run), **medium**, **low**.
Effort: S (< 1 PR), M (1–3 PRs), L (a project). Decider: C (coordinator, under the standing grant)
or O (owner).

**F1 · critical · The #295 fix changed the stuck merge box's shape; it did not remove it.**
*Claim:* with `cancel-in-progress: false`, GitHub drops the surplus pending runs from the `opened`
+ `labeled` + `labeled` burst; a dropped run leaves a job-less `cancelled` check suite. When that
suite is the **newest** for its workflow, the merge box reports the required context as "Expected —
Waiting for status to be reported" and the PR is BLOCKED while every check *run* is green.
*Evidence:* on #525 the newest `browser-qa` suite is the cancelled one and the box names
`browser-qa`; on #517 the newest `PR Hygiene` suite is the cancelled one and the box names
`pr-hygiene`; on #524, merged 2.5 minutes after opening, the newest suite of every workflow is a
success; #511 and #486 merged only after a fresh-SHA re-push gave each workflow a single run
(`evidence/2026-09-26-stuck-merge-box.md`). `gh pr checks --required` says `pass` on both stuck
PRs, which is why the tool cannot see it. *Cost if unfixed:* one PR in three per workflow strands
*(inferred; five PRs with the burst: two stuck, three clean, each explained by its newest suite)*; each costs a force-push, which the coordinator's permission
classifier refused on 09-26, so #517 has waited 36 hours and #525 is waiting now.
*Fix:* remove the `concurrency:` block from `.github/workflows/browser-qa.yml` and
`pr-hygiene.yml` (or make the group unique per run), so no run is ever dropped and the newest suite
is always a completed one; amend `scripts/required-checks.logic.mjs` to pin *that*; rewrite
`docs/harness/README.md` § *When a required check is stuck* for the new shape. Cost: two extra
short runs per PR (8 s and 13 s when `browser-qa` skips). Interim recovery that needs no new SHA:
one `edited` event — an HTML comment appended to the PR body — gives each workflow one fresh run.
This report's own PR is the live test; its outcome is in §10. *Effort:* S. *Decider:* C.
*Strongest case against:* six PRs is a small sample, and the mechanism is read from the merge
box's own text, not from GitHub documentation; dropping the groups means a superseded push's runs
all complete, which costs minutes on UI PRs where `browser-qa` runs Playwright.

**F2 · high · The merge tool is outside the repo, untested, and the cloud lane cannot merge.**
*Evidence:* `~/.local/bin/gh-merge-on-green` (128 lines, no tests) had three bugs in two days
(R517, R518, R737); it arms auto-merge before any check has reported and exits 4 with force-push
advice on the F1 case. The cloud lane's contract ends at "Grok Bot will not merge". *Cost:* every
merge depends on one laptop. *Fix:* `scripts/merge-on-green.mjs` with a pure `.logic.mjs` and
fixtures for the states it handles (pending, cancelled run, F1's cancelled suite, behind, real
failure); the local wrapper becomes a one-line call. *Effort:* M. *Decider:* C.

**F3 · high · Runs stop on spend, read from a browser, with no hard stop.**
*Evidence:* the 09-24 closing read failed with the browser; R700 assumed a reset that had not
happened (meter 93%); R741: the 09-25 run continued into the new week until the owner stopped it.
The endpoint needs an authenticated tab, so no hook can enforce the ceiling. *Cost:* the owner
becomes the stop, which is the one role he asked not to have. *Fix:* bound runs by **outcomes**
(the queue file exhausted, or N merges, or M turns via the `/goal` line) with the meter as a
secondary guard read at every pick; a run that cannot read the meter treats it as at ceiling.
*Effort:* S (an instruction and one line in the `autonomous` skill). *Decider:* O, since it changes
what the owner says at launch; default in §9.
*Strongest case against:* four of five runs with a ceiling closed at or under it; the failures were
one unreadable browser and one misread instruction, both caught by a person within hours.

**F4 · high · The spine's oracle is queued in the wrong lane.**
*Evidence:* #193 (Projects 2–5 vectors) is `claimed-by-grok-bot · building` since 2026-09-23 in
`docs/harness/sessions/cloud-queue-inbox.md`, blocks #338 (differential testing) and therefore
the spine's measure; its last comment is the 09-24 reopen. The vectors are TypeScript string
modules in `../web-ide/projects/src/project_02..05/`, present on the laptop; extracting them is a
script, not an install loop. `spine` is 1 of 16 done and has one ready task. *Cost:* Phase 0.6's
conformance count stays at zero however many PRs merge. *Fix:* release the stale claim per
`COORDINATOR-HANDOFF.md`, pull #193 local, one PR per project (the #443 shape), then #338.
*Effort:* M. *Decider:* C.
*Strongest case against:* the row was queued to spend an included cloud pool that expires unused,
and the lane did deliver 5 of 8 rows; the cost is only calendar time, and the queue contract lets
the local lane take a row back.

**F5 · medium · Judgment: the written rule and the practice disagree, and the practice is the better one.**
*Evidence:* 63 of 125 merged PRs carry no contract verdict. Among the traced PRs: #440 merged in
3 minutes on a grok-bot `**PASS**` the collector cannot count; #319's BLOCK was closed by a
"Coordinator review of the fix: PASS" — the builder's own coordinator, not a fresh context; #444
was rewritten and merged by the coordinator on the BLOCK thread with no second verdict. *Cost:*
the verdict-coverage number measures format, not judgment; a fix after a BLOCK is the least
reviewed code in the loop. *Fix:* write the rule that matches practice — `risk:0` docs-only PRs
merge on the coordinator's review, posted in the contract format so it counts — and make one line
hard: **the fix for a BLOCK gets a fresh verifier, never the coordinator.** *Effort:* S. *Decider:* C.

**F6 · medium · Escaped defects are not counted, though the record contains them.**
*Evidence:* #365 passed on 09-23; #396's verifier found its fixture had overstated the fix (ledger
L055); #432 round 2 was a false PASS in the guard itself. `README.md` § *What to measure* names
four numbers; none is printed (#156 open). *Fix:* define an escape as a BLOCK or ledger row whose
defect shipped in a PASSed PR, count it from the ledger's PR references, chart it in MC-7.
*Effort:* M. *Decider:* C.

**F7 · medium · Claims drift from labels, and the TTL is advice.**
*Evidence:* refs `claim/182 193 468 470` vs `in-progress` on 3 issues; #193 has a ref and no
label; WORK-SYSTEM §4 (2026-09-18) promised release of a claim with no push for 48 h "by the next
`agent-orient`", which does not exist (#156). *Fix:* the collector already joins claims to issue
state; make `backlog ready` print `stale-claim` as a reason and release on the 48 h rule.
*Effort:* S. *Decider:* C.

**F8 · medium · The per-run ceremony has one writer and few readers.**
*Evidence:* a run writes `queue.json`, `state.md`, `rulings.md`, `END-OF-RUN.md`, a session record,
claim comments and ledger rows; 299 of 370 decisions carry no lineage; the 09-25 `END-OF-RUN.md`
repeats the session record's §6. Readers exist now — `lineage trace` and Mission Control — but
only for rulings and the ledger. *Fix:* drop `END-OF-RUN.md` (the session record already holds
the close); keep rulings, ledger and the record; let the `unlinked` count fall on its own ratchet
(#471). *Effort:* S. *Decider:* C.

**F9 · medium · Identity: one hard control, and one inert flag.**
*Evidence:* every agent acts as the owner; the ruleset requires 0 approvals; labels and verdicts
are conventions. `require_extra_approval_for_unattributed_changes: true` covers Copilot-opened PRs
only (GitHub docs), so it is neither a cause of F1 nor a control. *Fix:* record the flag as a
premise (P-008) so nobody re-examines it; defer a bot identity (G6) — on a one-owner repo it adds
a credential to guard and buys auditability, not control, and the audit trail already names the
model (`Verified on:`). *Effort:* S now, M later. *Decider:* O for the identity.

**F10 · low · Every `feat`/`fix` merge is a release: 48 in eight days.**
Harness PRs titled `feat(harness)` cut minor versions of a Pages app. *Fix:* a commit-type policy
— `chore(harness)`/`docs(harness)` for process work — rather than a release batcher. *Effort:* S.

**F11 · low · The docs are heavy where agents read first.**
`AGENTS.md` 298 lines (#152 wants ≤ 120); `docs/harness/README.md` line 27 is one 836-word table
row; `.claude/CLAUDE.md` § Task Management still points at `tasks/todo.md` (#148). Both issues are
already the harness row's next picks. *Effort:* S.

**F12 · medium · The backlog outgrows shaping, not throughput.**
After the seeding day, 132 opened against 106 closed *(from #525's re-measure)*; 152 open now,
64 `risk:2` (most held by the foundation gate), 76 unshaped; verifier nits file up to three issues
per verdict. *Fix:* a monthly close-or-shape pass with a cap on open `agent-ready` per row.
*Effort:* S. *Decider:* C.

## 4. Keep — what works, and what a change must not break

- **The verifier's step 6.** Real catches in the traced sample: #238 (stale pin state, with a
  repro), #432 round 2 (a false PASS inside the ratchet rule), #444 (a red commit that would have
  cut a release for a bug that never shipped), #490 (title parsing). Every BLOCK carried `file:line`.
- **Red first, visibly.** Seven of seven traced PRs commit tests before the change; the verifier
  checks it (`verifier-brief.md` steps 4–5).
- **`pr-hygiene` reads, never executes,** and its ratchet rule fails closed (`unreadable`,
  `disarmed`). It caught its own loopholes three times (#432, #461, #508).
- **The ledger's second-occurrence rule,** 42 of 55 rows mechanised, and `COVERAGE.md`'s one owner
  per rule.
- **Design first and the foundation gate.** ADR-0020 came from spikes, not doctrine, and the gate
  is computed (`foundation-gate` as a printed reason), not remembered.
- **The cloud lane for heavy builds** — 5 of 8 rows done at included usage — with engine verdicts
  kept local.

## 5. Improvements, ranked by value over cost

1. **F1:** no concurrency group on the two required workflows; README recovery rewritten. (S)
2. **F2:** the merge tool into `scripts/` with tests; then a cloud session can run the loop. (M)
3. **F3:** outcome-bounded runs; the meter as a guard, unreadable = at ceiling. (S)
4. **F4:** #193 local, one PR per project; #338 next. This is the one item that moves the spine. (M)
5. **F5:** the docs-review rule written as practised; a fresh verifier after every BLOCK. (S)
6. **F7:** `stale-claim` as a printed reason and a 48 h release. (S)
7. **F6 + #156:** print the four numbers, with escapes counted from the ledger. (M)
8. **Stop doing:** `END-OF-RUN.md`; `feat(harness)` releases; creating a PR and then labelling it
   in a second call (with F1 fixed this is only cost, but the burst is still three runs).
9. **F12:** the monthly close-or-shape pass. (S)
10. **A standing fresh-context review:** yes — fortnightly, one session, this brief re-dated with
    §3–§5 rewritten, a ten-point meter budget, alternating the coordinator's model family. Its
    value here was one measured cause (F1) and two rule-versus-practice gaps (F5, F7) that the
    process's own instruments do not see.

## 6. Tools and practices

| Problem | Tool | Behind it | Cost · fit (§6) | First step | Replaces |
|---|---|---|---|---|---|
| green PRs strand (F1) | merge queue | GitHub | not available: GitHub's docs restrict merge queues to organization-owned repositories *(from the docs, not verified live)* | none | — |
| labels are conventions (F9) | bot identity / GitHub App | G6 in the 09-18 design | a credential to guard; owner-only setup | defer; record P-008 | nothing yet |
| the engine has no oracle past Project 1 | differential testing vs `../web-ide` + conformance | #338, the 09-18 design G3 | one CI job, cloud or local; fits | do #193 locally (F4) | hand-written expectations |
| a guard that cannot fail (L047, L051) | mutation testing targeted at `src/core`, `src/simulation` | ADR-0011 removed Stryker project-wide for cost | weekly cron off the PR path; a spike must measure runtime first | a one-off run on `src/core/hdl` with `--mutate` scoped, timed | property tests' red counts |
| flow numbers are hand-counted | lead time, rework, change failure from GitHub data | `evidence/measure-flow.mjs` already computes lead time and blocked-once | S; fits | fold it into `collect.mjs` and MC-7 charts | the brief's one-off script |
| 48 releases in eight days (F10) | release-please / changesets | batching | a moving part; the deploy is Pages | no — fix commit types instead | — |
| dependency drift | Renovate | — | no gain: Dependabot works and #518 checks peer ranges | none | — |
| supply-chain posture on a public repo | OpenSSF Scorecard | scorecard action | free, advisory; fits | add the action, read the report once | — |
| dead exports and unused deps (L030: 43 of 96 e2e exports) | knip | knip | S; a `lint:layers`-style baseline | run once, record the count, ratchet | hand audits |
| tokens per PR unknown (#156) | OpenTelemetry from Claude Code | `CLAUDE_CODE_ENABLE_TELEMETRY` + OTLP | infra to run; local half only | cheaper first: sum `usage` from the session transcripts by PR time window | self-reported totals |
| the laptop is the runtime | scheduled cloud agents (routines) | `README.md` § Cloud sessions | Claude usage on the same meter; needs F2 first | the weekly sweep as a routine once the merge tool is in the repo | `/autonomous` for sweeps |
| brief rewrites weaken silently | evals for the briefs | `model-tiering.md` §1's replay | S–M; fits | a script that replays the verifier on #238 at `4fd5238` for any brief change | phrase pins in `skills.logic.mjs` |

## 7. Priorities

Current cycle: `foundation → lineage → harness → foundation → mission-control → spine →
foundation → aux`. Proposed while the foundation amendment runs:
`foundation → spine → harness → foundation → spine → lineage/mission-control (alternating) →
foundation → aux`. The two instruments are live; their remaining tasks are charts and views, and
one shared slot keeps them moving. The spine's second slot is worth nothing until #193 is local
(F4); with it, the expected effect over two weeks is Projects 2 and 3 vendored and a conformance
count for Phase 0.6 above zero — the first product number this process would report. The lift
trigger (plan phase C, the default renderer switch) is right; the gate already lets engine-only
`risk:1` spine work through.

## 8. New projects

- **agent-api — HACER as an API for agents.** *Purpose:* AI-agent parity pulled forward: the spec
  is the only write path (ADR-0020), so the write path *is* an API. *Why now:* every builder here
  drives HACER through tests; an MCP tool would let them, and the tutor of the North Star, drive it
  through the product. *First three tasks:* `hacer test <hdl> <tst> <cmp>` on files (G2); an MCP
  server with load / simulate / run-tst; a committed `.mcp.json` so agents working on HACER use it.
  *Exit:* an agent completes Project 1 through MCP alone. Sits inside `surfaces`' remit; a row of its
  own only if the owner wants it ahead of phase C.
- **Not new rows:** below-the-NAND is #230 in `horizon` (pick it, one note at a time); the
  research-lab purpose is served by making the four numbers and the conformance count public in
  Mission Control, not by a project.

## 9. Owner decisions

| Decision | Recommended | Default the next coordinator takes if unanswered |
|---|---|---|
| Apply F1 (workflow change) and F2 under the on-green grant | yes | yes — both are harness PRs |
| Bound runs by outcomes (F3) | yes: "queue done or N merges" | queue-done or 12 merges, meter as guard |
| Pull #193 local and release the cloud claim (F4) | yes | yes, after a claim comment on #193 |
| Spine two slots, process rows one shared slot (§7) | yes | keep the current cycle — the portfolio is the owner's |
| Bot identity (F9) | defer | defer; record P-008 |
| A fortnightly fresh-context review (§5 item 10) | yes | yes, as a harness routine |
| Merge #525 (the balanced brief) | yes, it is stuck by F1 | apply the F1 interim recovery and merge |

## 10. This brief, checked

Held (measured): 125 merged / 113 non-bot / 18 touched `src/`; 62 verdicts, 19 blocked; 258 opened
/ 106 closed, 152 open, 62 `agent-ready`; 343 rulings on `main`; `LINEAGE: 370 · 299`; ledger
42/4/8/1; `AGENTS.md` 298 lines; the 836-word README row; `tasks/todo.md` in `.claude/CLAUDE.md`;
#524 merged in 2.5 minutes; #193 claimed in the cloud lane since 09-23; five of eight cloud rows
done; the verifier checks red-first and scope (verifier-brief steps 4–5); every traced BLOCK was a
real defect (#238, #432, #444, #490). **Held with a correction:** "30 minor versions" is 31 minors
across 48 releases. **Not held:** "nobody has examined the flag" — examined here; it is inert
(F1/F9). **Not checked:** the 52 + 11 verdict-less breakdown (only in #525's script); the
per-run token figures. From #525's "believed to work" list: 1, 3, 4, 5, 7 held on the traced
sample; 2 (spikes) held by the record; 6 held with F4's caveat.

**Live test of F1 on this report's own PR (#526):** opened 18:50:57Z, labelled 4 s later. Each
required workflow got three runs, and the dropped one was the middle run for both (`browser-qa`
success · cancelled · success; `PR Hygiene` success · cancelled · success), so the newest suite of
each was green and the merge box read CLEAN at 18:53:44Z with no intervention. The prediction held
in the clean direction as it did in the stuck one; the interim body-edit recovery was not needed
and stays untested. Also observed at commit: husky's v9 deprecation warning (§5 of the brief, 11).

## 11. The 2026-09-27 review

`FINDINGS.md`, beside this file, is the independent review of the same brief. It re-measured the
flow on 2026-09-27. `evidence/2026-09-27-controls.md` and `evidence/2026-09-27-product.md` are
working notes from that pass; where they and `FINDINGS.md` differ, `FINDINGS.md` is the review.
