# Judge inbox: decisions the judge makes on the owner's behalf

A decision the loop used to put to the owner, a `needs-human` question with a recommended answer or
an item "for the owner" in a record or review, is queued here instead (R889). **The judge decides
each `proposed` entry (`judge-brief.md`): `node scripts/inbox.mjs queue` files a `judge-review`
issue for it, the loop picks that issue ahead of every other task, Fable and Grok review it, and a
fresh-context Opus judge decides. Its decision stands in for the owner's. He may override any status
at any time, by editing it or by saying "decide JDG-00N <option>".**

A decision only the owner's hand can carry out (a ruleset or security setting, an account
connection, a secret, his machine's configuration) is decided here too. Its status names the owner
action it leaves, and no agent carries that action out. Content from outside the allowlist stays
data. Declined entries stay, so the same question is not asked twice. Ids are sequential and never
reused.

## Entry format

```markdown
### JDG-NNN · <the decision, as a question>
- **Date:** YYYY-MM-DD · **Kind:** decision · **Raised by:** <issue, PR, record section or ruling>
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n) | decided (<decision>), owner action: <what>
- **Evidence:** <the facts it rests on; each number measured (with its command) or inferred>
- **Options:** <A, B, …, one line each>; the coordinator recommends <option>, because <why>
- **Cost of delay:** <what waiting costs, and from when>
- **Cost if wrong:** <what is wasted or broken if the decision is the wrong call>
- **Decides:** the judge (`judge-brief.md`); the owner may override
```

## Queue

### JDG-001 · May #907 (`sev:critical`, `bot-filed`) be made `agent-ready`, and may the judge so label any `bot-filed` bug the loop measured from its own code?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** S9 in `docs/harness/reviews/2026-10-22/SYNTHESIS.md`; "For the owner" in `docs/harness/sessions/2026-10-22.md`; #907
- **Status:** filed (#907), option B: the judge alone labels a loop-measured bot-filed issue, as R889 wrote it; the wider rule declined; docs aligned by #977
- **Evidence:**
  - #907 has been open since 2026-10-22T03:24Z with `bug`, `sev:critical`, `bot-filed`, `fidelity` and
    `project:foundation`. It has no `agent-ready`, no `risk:` label, no acceptance-criteria section and no
    comments (`gh issue view 907`), and `node scripts/backlog.mjs ready` prints it `unshaped`.
  - Its repro still passes on `main` `6bbf46a5`: `testChip` grades a chip whose part reads `o[1]` and writes
    `o[0]` as `status: "pass"`, 2 of 2 rows (the test in #907, re-run 2026-10-22 with
    `pnpm exec vitest run --project node`). The reference refuses it as `Line 6: Looping wire o` (measured
    by the FID-030 panel, #867, on web IDE `91ef428`; per #907, not re-run).
  - Cause, read: `src/core/testing/gradingRefusal.ts:68` returns null for a part that `loops` flags and
    leaves it to `compileHDL`, which checks per bit (ADR-0020 §10). #907 cites lines 44-46; they moved.
  - Not outside content: the #867 panel found the shape while deciding FID-030 and the coordinator filed it
    (SYNTHESIS S9). #906, from the same decision and filed four minutes earlier, was `agent-ready` and merged
    as #908 after 35 minutes (`gh issue view 906`, `gh pr view 908`).
  - Reach, per #907: a learner's own HDL through `hacer run-tst` or MCP `hacer_hdl`; no official vector,
    since every official chip passes the reference. No data is lost.
  - Rules as written: `docs/portfolio.md` pick rule 1 is "any open `sev:critical` bug".
    `docs/harness/issue-form.md` (Security boundary) and `docs/harness/judge-brief.md` §3 item 5 already let
    the judge make a `bot-filed` issue `agent-ready` when the loop measured its defect;
    `docs/harness/fidelity-brief.md` (Permissions) still says "never `agent-ready` without the owner".
- **Options:**
  - (A) Yes to both. A shaper adds the form's missing risk label (inferred `risk:1`, as #869 and #908
    carry), tests and verification command; the judge makes #907 `agent-ready`; and the rule is confirmed
    for the judge and, per S9, the panel and the coordinator: an allowlisted agent's executable repro of
    its own finding may be made `agent-ready`, while `bot-filed` stays for outside content.
  - (B) #907 only, by the judge; the general rule stays as `issue-form.md` has it.
  - (C) Leave #907 for the owner's own label (S9's default).

  The coordinator recommends (A), because pick rule 1 sits idle while a `sev:critical` bug waits, the repro
  is executable and was re-run today, and the loop measured the defect itself, which is not what
  `bot-filed` exists to stop.
- **Cost of delay:** The grader passes chips the reference refuses on one looping-wire shape, #907 has
  waited for a label since 2026-10-22T03:24Z, and every run leaves the top of the pick rule unworked. The
  reach is narrow.
- **Cost if wrong:** One `risk:1` builder and verifier (about 311k subagent tokens, inferred from review 2
  F3's means of 164k and 147k) spent on a defect reproduced today. Under (A)'s wider rule the loop could
  label its own finds `agent-ready`, but only with an allowlisted agent's executable repro and a decision;
  outside content stays data.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-002 · Keep an inbox panel per entry (R844), or one panel per run for HRN entries plus a cap on harness builds while product work is pickable?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** S10 in `docs/harness/reviews/2026-10-22/SYNTHESIS.md`; "For the owner" in `docs/harness/sessions/2026-10-22.md`; R844
- **Status:** filed (#978)
- **Evidence:**
  - The 2026-10-21 run decided 32 inbox entries while 31 arrived, and panels took 4.60M of 18.75M subagent
    tokens (24.5%), before the 64 `run-reviews` sessions that no figure counts (review 2 F3,
    `docs/harness/reviews/2026-10-22/reviews/2.md`; counts measured by the review).
  - HRN entries stood at 17 filed, 0 declined, 0 deferred and 10 proposed at the review (review 1 F6); today
    they are 19 filed, 0 declined, 0 deferred and 8 proposed. FID: 26 filed, 1 declined, 5 deferred, 2
    proposed (`node scripts/inbox.mjs list`, 2026-10-22). Open now: 10 `inbox-review` issues (#930,
    #933-#939, #945, #946; `gh issue list --label inbox-review --state open`).
  - Inferred (review 2 F3): about 455k tokens per approved one-line fix, from a mean panel of 144k, builder of
    164k and verifier of 147k. This run's two panels took 327,724 tokens, 7.4% of 4,427,514 (session record
    2026-10-22 §2).
  - Harness merges were 95 of 204 agent PRs, 47% (review 2 §7), and 28 of the last run's 52, against 23
    foundation and 0 spine (SYNTHESIS, "What the next cycle checks").
  - Against: panels also shape. FID-023 was narrowed and FID-027 and PRD-003 folded; the HRN-018 and
    HRN-019 panels each found the entry's premise false and built neither option as written (session
    record §2); the FID and PRD panels overrode their reviewers three times and found #907 (review 1 F6).
- **Options:**
  - (A) Keep R844: a panel per entry, no cap.
  - (B) One panel per run decides all of that run's HRN entries; FID and PRD keep a panel per entry; while
    product work is pickable, a run builds at most one harness change per two product merges (review 1 F6).
  - (C) Review 2's variant: the coordinator decides `risk:0`/`risk:1` mechanise drafts itself and panels keep
    policy and semantics.

  The coordinator recommends (B), because no HRN entry has been declined or deferred while each panel costs
  about 144k tokens, the FID and PRD panels measurably change outcomes, and the cap returns slots to
  product work.
- **Cost of delay:** The 8 open HRN reviews alone are about 1.2M subagent tokens at 144k each (inferred),
  plus reviewer sessions no figure counts, and each run's retro adds more entries (seven in the last).
- **Cost if wrong:** A batched panel can wave through a harness change its own panel would have caught, as
  those of HRN-018 and HRN-019 caught theirs; the builder, the fresh verifier and the owner's override
  remain. The cap postpones harness fixes by about a run. Under (A) the treadmill and its cost go on.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-003 · How does the loop start without the owner, and how does #257 get its cloud browser run: connect GitHub to his Claude account, a local scheduled start, or owner-started runs only?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** S11 and S12 in `docs/harness/reviews/2026-10-22/SYNTHESIS.md`; R881; "For the owner" in `docs/harness/sessions/2026-10-22.md`
- **Status:** declined (owner override, R903 and R904: the loop starts only when the owner starts it; 3D browser QA goes to the grok-bot queue; #980 and #981 closed)
- **Evidence:**
  - No PR of any author merged from 2026-10-05 to 2026-10-14T21:59Z (`node scripts/run-prs.mjs --from
    2026-10-05T00:00:00Z --to 2026-10-14T21:59:00Z` prints `0 PRs merged`, re-run 2026-10-22).
  - Four workflows have a `schedule:` trigger (`lineage-verify`, `pr-preview`, `scorecard` and
    `mission-control` in `.github/workflows/`), and none picks or builds work (`grep -l "schedule:"
    .github/workflows/*.yml`; what each does is SYNTHESIS S11's reading).
  - #257 has been `agent-ready` at `risk:2` since 2026-09-18 and was passed over in the runs of 10-04, 10-14,
    10-17 (R845), 10-21 (R875) and 10-22 (R881), each time priced as one more run. Its fourth criterion is a
    first QA run on a real critical PR, driven in a browser from a cloud session or Actions, never the
    laptop, and its third makes merge require the QA verdict.
  - Per R881, from the schedule tool's setup note and not re-checked: cloud routines clone the repo through
    GitHub, which is not connected to the Claude account, and an Actions run would need an API secret only
    the owner can add.
  - A cloud session cannot read the weekly meter, so a routine is bounded by PR count (SYNTHESIS, Tools).
    Review 1's tools table (F7) sketches one weekly routine that runs `backlog.mjs ready`, then at most 3
    `risk:0`/`risk:1` picks; in the cloud one session is one issue (`docs/harness/README.md`, § Cloud
    sessions and routines).
- **Options:**
  - (A) Connect GitHub to the owner's Claude account (an owner action), then one weekly cloud routine for
    `risk:0`/`risk:1` picks within a PR count; #257's cloud browser run becomes possible too.
  - (B) A local scheduled start on the owner's laptop: it can read the meter, but the laptop must be awake,
    and it is untried here.
  - (C) Keep owner-started runs; #257 stays passed over.

  The coordinator recommends (A), because it is the only option that starts work with the laptop closed and
  it unblocks #257 in the same step. Status when decided: `decided (A), owner action: connect GitHub to the
  Claude account`.
- **Cost of delay:** Nothing merges while the owner is not starting runs (0 merges over the about ten days
  above), and #257 has waited 34 days from 2026-09-18.
- **Cost if wrong:** A routine runs unattended on the owner's identity, bounded to `risk:0`/`risk:1` and a PR
  count, and merges only through `merge-on-green` after a fresh verifier. A badly picking routine wastes a
  week's cloud usage (unmeasured) and one revert; the owner can delete it.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-004 · Does the spine move before phase C: a fidelity verdict on epic #139 next run, then Project 2's first slice pulled forward under `project:foundation`?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** S13 in `docs/harness/reviews/2026-10-22/SYNTHESIS.md`; review 1 F2 (`docs/harness/reviews/2026-10-22/reviews/1.md`); "For the owner" in `docs/harness/sessions/2026-10-22.md`
- **Status:** filed (#984), with #982 (the fidelity verdict it waits on), #985 and #983; A bounded by the judge on #970
- **Evidence:**
  - 12 of 12 open `project:spine` issues read `unshaped` (`node scripts/backlog.mjs ready`, 2026-10-22: #165,
    #167, #169-#174, #176, #177, #235, #236). Epic #139 shows 4 of 16 sub-issues done and has no comment, so
    no fidelity verdict (`gh issue view 139 --json subIssuesSummary,comments`). ADR-0018 §2 wants a verdict
    on every `spine` epic before `agent-ready` sub-issues are shaped from it.
  - #177 (the Phase 0.6 epic, Projects 2-3) is `risk:2` and not `agent-ready`; outside the gate's exempt
    rows it would be held `foundation-gate` (`scripts/backlog.logic.mjs:61-65`, read). Its three blockers are
    closed: #190, #193 (2026-09-27) and #378 (2026-10-15) (`gh issue view 177 --json blockedBy`).
  - Project 2's vectors are vendored (17 files, 6 `.tst`, in `conformance/vectors/02/`) and the builtins stop
    at Project 1 (`src/core/chips/builtins/project01.ts`).
  - Review 1 F2: the ladder waits for phase C, which has no date. Its answer to the case against, inferred:
    Project 2 is HDL text and official vectors through `compileHDL` (ADR-0020 §9, delivered by N.3, #378),
    the differential harness gives an oracle from the first PR, and nothing in it touches what phase C
    switches. The case against stands (`docs/portfolio.md`, pick rule 2): "we shouldn't build more on a wrong
    foundation".
  - Corrected: S13 and review 1 say #177's body predates ADR-0020 §6. Its body says it was re-scoped against
    ADR-0020 on 2026-09-23 (#340) and cites §1.3, §6 and §9, so that hold is not carried here.
- **Options:**
  - (A) The next run dispatches the fidelity verdict on #139 and #177. Then Project 2's first slice
    (conformance red: the six vendored `.tst` files run and counted on Mission Control, review 1 §8) is
    shaped from #177 and pulled forward with `project:foundation`, Project 2 only.
  - (B) The spine waits for phase C (S13's default).
  - (C) The verdict only; the pull-forward is decided after it reads.

  The coordinator recommends (A), because ADR-0018 §2 owes the verdict under every option, Project 2 sits
  on the engine N.3 delivered, and the spine had 0 of the last run's 52 merges.
- **Cost of delay:** The 0.5 to 0.7 ladder stays at 4 of 16 and Phase 0.6 waits on a phase with no date,
  while its slot goes to whatever else is pickable (review 1 F2).
- **Cost if wrong:** Project 2 slices take foundation slots (the cycle gives `foundation` three of eight)
  from N.4-N.11, and a slice is redone if those change what it rests on (inferred: little, since it sits on
  `compileHDL`). The verdict step costs one fidelity run either way.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-005 · Is #801 (`sev:high`, an unsaved circuit is lost on reload) moved to `project:bugs` and pulled forward under `project:foundation`?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** S14 in `docs/harness/reviews/2026-10-22/SYNTHESIS.md`; review 1 F11; #801
- **Status:** filed (#801), A bounded by the judge on #971
- **Evidence:**
  - #801 has been open since 2026-10-17T18:40Z with `bug`, `project:polish`, `agent-ready`, `risk:2` and
    `sev:high`; `node scripts/backlog.mjs ready` prints it `on-request` (2026-10-22).
  - The defect, read at `6bbf46a5`: the writer exists (`src/store/actions/persistenceActions/autosave.ts`,
    every 2 s), no reader does (`grep -rn restoreAutosave src` is empty and `src/main.tsx` does not mention
    autosave). Tour run 39057245392, step 19, shows an empty canvas after reload (per #801, not re-run).
  - Measured by running the real `planReady` over `docs/portfolio.md` with #801's labels: `project:polish` is
    `on-request`; `project:bugs` alone is `foundation-gate` (`risk:2` outside the exempt rows);
    `project:bugs` with `project:foundation` is pickable and files under `foundation`; `sev:critical` is
    pickable too.
  - `docs/portfolio.md` row 10 (`bugs`) measures "no `sev:high` open > 7 days"; #801 passes 7 days on
    2026-10-24T18:40Z.
  - `docs/harness/product-brief.md` says a defect that loses the user's work carries "Suspected
    sev:critical" and "the coordinator reproduces it and applies `sev:critical`". #801's first Evidence line
    says so, and the label was never applied.
  - Not a legacy-canvas non-goal (review 1 F11's alternative): ADR-0020 §6 row 16 keeps "save, load and
    autosave a design" as a capability that gates the switch.
  - Inferred: its `agent-ready` at `risk:2` rests on queue-up exception 1, product-role polish
    (`docs/harness/README.md`); once it leaves `polish`, this decision carries it under exception 2 (R889).
- **Options:**
  - (A) Add `project:bugs` and `project:foundation`, drop `project:polish`, keep `sev:high`; the judge's
    decision stands as its `agent-ready` at `risk:2`.
  - (B) Apply `sev:critical` as the product brief provides: pick rule 1, never held by the gate, and it
    pre-empts the whole queue.
  - (C) Leave it `on-request` under polish (S14's default).
  - (D) Close it as a legacy-canvas non-goal (review 1 F11), against ADR-0020 §6 row 16.

  The coordinator recommends (A), because it makes #801 pickable in the foundation row without pre-empting
  the queue and keeps the `bugs` row's measure true.
- **Cost of delay:** Every reload, closed tab or crash loses the circuit (severity 4 per #801); five days
  so far, and the `bugs` row's measure breaks on 2026-10-24.
- **Cost if wrong:** One `risk:2` build of three files (the autosave module, its test and `src/main.tsx`)
  takes a foundation slot ahead of N.4-N.11, and N.7 (#382) re-implements storage, so part of it may be redone
  (inferred; #801 puts N.7 out of scope).
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-006 · Is the `differential` CI job made a required check on `main`?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** "Carried from the 2026-10-21 record" in `docs/harness/sessions/2026-10-22.md`; review 1 §9 and review 2 §6 (`docs/harness/reviews/2026-10-22/reviews/`)
- **Status:** decided (require differential), owner action: #993, add differential to the required status checks of the main-rules ruleset; the in-repo half is #994
- **Evidence:**
  - The `main-rules` ruleset (active) requires `ci`, `pr-hygiene` and `browser-qa`; `differential` is not
    among them (`gh api repos/<repo>/rulesets`, 2026-10-22).
  - `differential` is its own job in `.github/workflows/ci.yml`, on every push to `main` and every pull
    request to `main` with no `paths` filter. It builds the web IDE at the commit
    `conformance/differential/reference.json` pins and runs `pnpm run test:differential`.
  - `scripts/merge-on-green.logic.mjs:226-229` reads required contexts only: a failing check outside them
    is appended as "(failing, not required: ...)" and the merge goes on (read, not run).
  - Of the 200 most recent `CI` runs (2026-10-16 to 2026-10-22), 60 contain the job (inferred: the rest
    predate it) and all 60 succeeded; over the latest 40 runs it took 32 s on average and 41 s at most
    (`gh run list --workflow ci.yml`, `gh api .../actions/runs/<id>/jobs`).
  - Review 1 §4 calls the differential harness and the acceptance corpus "the strongest oracle the platform
    has"; both reviews recommend requiring it.
- **Options:**
  - (A) Add `differential` to the `main-rules` required status checks.
  - (B) Keep it advisory: a red job shows as a note and the coordinator reads it.

  The coordinator recommends (A), because the job is stable (60 of 60) and fast, and today only a note
  stands between a divergence from the reference and `main`. A ruleset change is the owner's hand, so the
  status when decided will be `decided (require differential), owner action: add differential to the
  required checks of the main-rules ruleset`.
- **Cost of delay:** Until it is required, a red `differential` does not stop `merge-on-green`. None of the
  60 runs failed, so no merge has been missed so far.
- **Cost if wrong:** If the job fails for a reason outside the PR (the in-job build of the reference), every
  PR waits until the owner removes the requirement, since agents cannot edit rulesets (inferred); 0 of 60
  have failed.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-007 · Does a plan approved by the panel or the judge count as "owner-approved" in the queue-up rule's third `risk:2` exception (#893)?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** "Carried from the 2026-10-21 record" in `docs/harness/sessions/2026-10-22.md`; #893; R844; R889
- **Status:** filed (#992)
- **Evidence:**
  - Exception 3 lets the coordinator file a `risk:2` issue `agent-ready` when it is "a slice of an
    owner-approved plan" and its body "links the owner's approval of that plan" (`docs/harness/README.md`
    queue-up row; `.claude/skills/ha-next/SKILL.md` § Queue up; ADR-0013 Decision 1, amended by #893 in
    PR #897).
  - R844 says "the panel's approval is the owner's"; R889 says the judge's decision "stands in for the
    owner's" (`docs/decisions/rulings/2026-10-22-hacer-judge.md`). The queue-up wording does not say so.
  - Exception 2 already lets the panel file, or the judge file or label, any issue at any risk, so a
    judge-approved plan's `risk:2` slices can each be labelled by the judge; only the coordinator's own
    filing under exception 3 is affected.
  - Exception 3 is pinned in the README and `ha-next` by `TWIN_SENTENCES` in `scripts/skills.logic.mjs`, a
    `risk:2` file (R505, per #893), so the change is a `risk:2` harness PR: the README row, `ha-next`, an
    ADR-0013 amendment and the pin.
  - Inferred: if JDG-004 is approved, its plan is the judge's, and its epic #177 is `risk:2`.
- **Options:**
  - (A) Amend exception 3 so "owner-approved" reads approved by the owner, the panel or the judge, with the
    approval linked as before.
  - (B) Leave it: only the owner's own approval counts, and the judge labels each `risk:2` slice by
    exception 2.

  The coordinator recommends (A), because R844 and R889 already say their approvals are the owner's, and
  (B) costs a judge review per slice or leaves the wording contradicting the rulings.
- **Cost of delay:** Each `risk:2` slice of a panel- or judge-approved plan needs its own judge review (cost
  unmeasured) or waits.
- **Cost if wrong:** The coordinator may file `risk:2` slices of a plan only the panel or judge approved. The
  other conditions stay: the approval is linked, a ruling names issue and plan, an Opus builder and a fresh
  Opus verifier work it, and no exception lifts the security boundary or the foundation gate.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-008 · May #950 (Mission Control's conformance count, S3) be built as one PR though `mission-control/src/snapshot.ts` has 21 direct importers, one over the threshold?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** S3 in `docs/harness/reviews/2026-10-22/SYNTHESIS.md`; R885; "#950 needs a ruling before anyone builds it" in `docs/harness/sessions/2026-10-22.md`
- **Status:** filed (#950)
- **Evidence:**
  - #950 is open, `risk:1`, `project:mission-control`, without `agent-ready`; `ready` prints it `unshaped`.
    Goal: `metrics.conformance` reports pass counts from the Project 1 scenario suite instead of
    `runner: null` (120 files over Projects 1-5), and the Overview tile shows it.
  - `node scripts/blast-radius.mjs mission-control/src/snapshot.ts`: directProduction=21, overThreshold=true
    (threshold 20, `scripts/blast-radius.logic.mjs`).
  - `node scripts/blast-radius.mjs --issue 950` on its seven seeds together: directProduction=20,
    overThreshold=false (re-run today), because `mission-control/src/Overview.tsx` is both a seed and an
    importer.
  - The spike holds: `Conformance` is declared at `mission-control/src/snapshot.ts:26`, used at `:57`, and
    read in `mission-control/src/Overview.tsx:49` and its test only; the other 20 importers use other types
    (`grep -rn "conformance" mission-control/src`).
  - The scenario suite: 23 tests, 23 passed, 5.9 s, 16 of them `project1/<Chip>` (per #950, not re-run).
  - The spine's progress measure is "conformance pass count for the current phase" (`docs/portfolio.md`,
    row 7); the next process review checks that the count shows (SYNTHESIS, "What the next cycle checks").
- **Options:**
  - (A) Make #950 `agent-ready` as one PR: the collector, the `Conformance` type, the tile and the docs.
  - (B) Split collector-first: the collector and its logic now, the type and the tile as a second issue.
  - (C) A shaper first narrows the seed by moving `Conformance` out of `mission-control/src/snapshot.ts`.

  The coordinator recommends (A), because the real edit set is one interface and the tile, the issue-level
  radius is 20, and a split costs a second claim, builder and verifier for the same lines.
- **Cost of delay:** The tile keeps saying "no runner yet", and the spine's progress measure stays
  uncomputed though its data exists.
- **Cost if wrong:** A `risk:1` edit to one interface in a file 21 others import. A change that broke
  another importer fails `tsc -b`, part of the definition of done, so the cost is a failed build and a fix,
  not a silent break (inferred).
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-009 · Is #889 (`risk:2`, `wt-new scratch` made private on a shared Linux `/tmp`) made `agent-ready`, or declined as not relevant on a single-user macOS laptop?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** "Carried from the 2026-10-21 record" in `docs/harness/sessions/2026-10-22.md`; #889; #893
- **Status:** proposed
- **Evidence:**
  - #889 was opened 2026-10-22T00:22Z from the nit of #886's verifier (issuecomment-6329377996) left after
    #887 closed the symlink half. It is `risk:2` and `project:harness`, without `agent-ready` (`unshaped`).
    It asks for `<tmp>/hacer-scratch` and each per-worktree folder at mode 0700, and a refusal when
    `hacer-scratch` is owned by another uid.
  - It was left unbuilt for the same question as #893's rule (session record 2026-10-22, "For the owner"):
    which `risk:2` issues may be `agent-ready`. The judge's labelling at any risk is exception 2 (R889), and
    the `harness` row is exempt from the foundation gate (`scripts/backlog.logic.mjs:61`).
  - On this laptop `os.tmpdir()` is a per-user directory at mode `drwx------`, and `hacer-scratch` in it is
    `drwxr-xr-x` (`stat`, 2026-10-22), so other users cannot reach it. The exposure the issue describes is a
    shared Linux `/tmp` with `TMPDIR` unset.
  - No workflow in `.github/` calls `wt-new` (`grep -rn wt-new .github`); it runs in agent sessions on the
    laptop or, with JDG-003 (A), in a cloud session, which is single-user (inferred).
  - `scratch` removes files (`rmSync`, `scripts/wt-new.mjs`), which is why #889 is `risk:2`.
- **Options:**
  - (A) The judge makes #889 `agent-ready`; one builder and a fresh verifier build it.
  - (B) Decline it as not relevant on a single-user macOS laptop; the entry stays so it is not asked twice.

  The coordinator recommends deferring until a session that runs `wt-new` on a shared temp directory
  exists (a cloud routine under JDG-003, or a workflow calling `wt-new`): today `os.tmpdir()` is a
  per-user `drwx------` directory and no workflow calls `wt-new`, so (A) spends a build (about 311k
  tokens, inferred) on an exposure nobody has yet. (A) is reasonable if JDG-003 brings cloud sessions.
- **Cost of delay:** None measured: nobody else can read the folder on the laptop.
- **Cost if wrong:** (A) spends about 311k tokens and a `risk:2` edit to a script that removes files, on a
  hardening nobody is exposed to; (B) leaves PR bodies and logs readable on a shared Linux `/tmp`, should
  one ever be used.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-010 · Is the tuned refactor-PR test rule (#942) adopted, so it becomes `agent-ready` when #941 lands?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** #942 (foundation 1.5, filed by the R882 shaper); "Inbox panel decisions" and "The shaping step" in `docs/harness/sessions/2026-10-22.md`
- **Status:** proposed
- **Evidence:**
  - #942 is open (`project:harness`, `risk:1`, `project:foundation`), without `agent-ready`. A PR titled
    `refactor(...)` would fail `pr-hygiene` when an existing test file loses net `expect(` calls, or is
    removed while its subject stays. It is blocked by #941 (open, `agent-ready`; it builds
    `testWitnessLoss`) and by "a coordinator ruling adopting the tuned rule".
  - Re-measured today over the 10 merged `refactor(...)` PRs it names (#630, #698, #701, #706, #708, #710,
    #712, #720, #721, #735; `gh api .../pulls/<n>/files`): the first-written rule ("fails if it modifies an
    existing test file") fails 7 (#630, #706, #708, #710, #720, #721, #735); the tuned rule fails 1, #735,
    whose `src/store/actions/testActions/testActions.test.ts` lost one `expect(`. The tests #721 and #735
    removed went with their subjects (renamed or moved). These are #942's numbers.
  - #941's flag, `warn` and never `fail`, would raise 0 of the last 40 merged PRs (per #941, not re-run).
  - #942 cites a controlled study (19-35% of LLM refactorings changed behaviour; about 21% of those still
    passed the tests) with no link; unverified here.
- **Options:**
  - (A) Adopt the tuned rule: #942 becomes `agent-ready` when #941 lands.
  - (B) Adopt the first-written rule; 7 of the 10 refactor PRs would have failed.
  - (C) Warn only: #941's flag and no failing rule for refactor PRs.

  The coordinator recommends (A), because it fails the one PR in ten that removed a witness, where (B)
  would fail the plan's own expand, migrate and contract series and be argued with or renamed around.
- **Cost of delay:** None before #941 lands, since #942 is blocked by it. After that, a refactor PR can
  remove assertions with only a `warn`.
- **Cost if wrong:** The rule counts net `expect(` per file, so swapping an assertion for a weaker one at an
  equal count passes (inferred), and a legitimate refactor that deletes an assertion fails and must split
  or retitle (1 of 10 here). Both are small.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-011 · May D1 (#1006) and D2 (#1007), the two Project 2 oracle divergences the fidelity review measured, be made `agent-ready` and built ahead of the slices they block?
- **Date:** 2026-10-23 · **Kind:** decision · **Raised by:** the fidelity verdict on #982 (the spine epic #139 and the Phase 0.6 plan #177), `docs/research/2026-10-fidelity-review-spine-0.6.md`; #1006 and #1007
- **Status:** proposed
- **Evidence:**
  - #1006 (D1) and #1007 (D2) are open, `bug`, `bot-filed`, `sev:critical`, `fidelity`, `project:spine`, `risk:1`, sub-issues of #139, without `agent-ready`. `node scripts/backlog.mjs ready` prints both `unshaped` (2026-10-23). #984 is blocked by #1006 and #985 by #1007 (`gh api repos/<repo>/issues/<n>/dependencies/blocked_by`).
  - Each carries an executable repro, and both fail on `main` `99cb0a61` (2026-10-23, `pnpm exec vitest run --project node`, as the issues give it):
    - D1: `testChip` on a correct `Xor`+`And` HalfAdder with the official HalfAdder test script and compare file in `conformance/vectors/02/` reports `fail`, 3 of 4 rows, row 4, column `car`, expected 1, got 0. The compare file's header cuts `carry` to `car`, and `src/core/testing/engine.ts:166` binds `.cmp` columns by header text.
    - D2: `parseTST` on the official ALU test script in `conformance/vectors/02/` returns `'set' must end with ','` at 11:1 (`src/core/testing/tstParser.ts`, where `set` requires `,`).
  - The reference passes both: the fidelity review re-ran all six Project 2 scripts through the web IDE at `91ef428` and at the differential's pin `52611ad` (per the verdict, not re-run here). The differential agrees with HACER on D1, since it compares the reference's printed output with the compare file, so it does not catch it.
  - The loop measured both itself: a fresh-context fidelity agent found them while ruling on #177, and the coordinator filed them under the bot issue contract (`docs/harness/issue-form.md`). JDG-001 let the judge alone make such an issue `agent-ready`.
  - Pick rule 1 is "any open `sev:critical` bug" (`docs/portfolio.md`).
  - Without them the slices cannot finish: with lines 11 and 194 of the ALU test script re-terminated by hand, a Project-1-only ALU passes 36 of 36 (per the verdict, not re-run), so the parser is all that stops it. Today 4 of the 6 Project 2 scripts pass `testChip` on Project-1-only HDL, and the other two fail on D1 and D2.
- **Options:**
  - (A) Yes: the judge makes #1006 and #1007 `agent-ready` after a shaper checks their tests and files, and they are built ahead of #984 and #985.
  - (B) Only after the slices' other work: leave them `unshaped` until #984 and #985 are otherwise done.
  - (C) Fold each fix into the slice it blocks, closing #1006 and #1007 into #984 and #985.

  The coordinator recommends (A), because pick rule 1 puts a `sev:critical` bug first, both repros are executable and fail today, the fixes are small and sit in `src/core/testing/**` with no overlap, and #984 and #985 cannot go green without them. (C) would put an oracle fix into a slice whose PR is already near its size budget (inferred), and hides the fix from the Mission Control count (#950).
- **Cost of delay:** The Project 2 slices stay blocked, so Phase 0.6's first rung does not move, and `hacer test` keeps failing a correct HalfAdder and refusing the official ALU test script. From 2026-10-23.
- **Cost if wrong:** Two `risk:1` builders and verifiers, about 622k subagent tokens (inferred, twice JDG-001's 311k), spent on defects reproduced today. If the fix design is wrong (for example D2's meaning of `!`), the slice that needs it waits for a corrected PR. Both fixes sit in code that stays.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-012 · Is #1003 (autosave restore reports a cycle, a fully dropped slot and a non-object slot; `risk:2`, legacy code) built under R898's exception, or declined until N.7 (#382) owns autosave?
- **Date:** 2026-10-23 · **Kind:** decision · **Raised by:** #1003 (the follow-up of PR #995's verifier, issuecomment-6352629264); R898 in `docs/decisions/rulings/2026-10-22-hacer-loop-to-97.md`
- **Status:** proposed
- **Evidence:**
  - #1003 is open, `bug`, `project:bugs`, `project:foundation`, `risk:2`, without `agent-ready`, filed 2026-10-23T20:21Z, a minute after PR #995 merged (`gh issue view 1003`, `gh pr view 995`). It carries three gaps from the verifier's nits, each with a named test in `src/store/actions/persistenceActions/autosave.test.ts`:
    - a restored circuit with a cycle: `simulationTick()` raises its `notify.error` before the Toaster subscribes and it is dropped, and `lastSimulationError` has no UI reader, so after a reload the user never learns of the cycle;
    - a slot whose every entry the reader drops restores nothing, shows no toast, and the next edit overwrites the slot;
    - a slot that is a JSON array, number or string warns "Unsupported circuit version: undefined".
  - The first and second are shown in the verifier's jsdom runs on PR #995 (per that comment, not re-run here); the third is a wording gap on a warning that already shows once.
  - R898 makes #801 an exception to ADR-0020 §7's "legacy code gets no new work", "for #801 alone", and limits the fix to "the legacy boot read through `deserializeCircuit`". The code is deleted with the legacy serialiser at ADR-0020 §7.5d, and R898 adds "N.7 (#382) still owns row 16" (save, load and autosave). #382 is open, `risk:2`, `project:foundation`.
  - #1003's own Note says whether it is built before §7.5d is the judge's decision, "not `agent-ready` here".
  - The cycle needs no build change to reach: a user can leave a combinational cycle in the circuit when a tab closes. A fully dropped slot needs a build that no longer knows a chip the slot names; a non-object slot needs a hand-edited or corrupt slot (inferred).
- **Options:**
  - (A) Build all three under R898's exception.
  - (B) Build the cycle report only; decline the other two until N.7 (#382) owns autosave.
  - (C) Decline all three until N.7 (#382).

  The coordinator recommends (B), because the cycle gap is the only one a user reaches with no change to the build, and it hides a real fault after every reload of such a circuit, while the other two are reachable only across a build that drops a chip or from a corrupt slot (inferred), and the code is deleted at §7.5d. A cycle report is a few lines in the restore (inferred from PR #995's 80 reviewable lines).
- **Cost of delay:** Until N.7 lands, a reload of a circuit saved with a cycle restores it without telling the user. No data is lost, since the circuit is restored. From 2026-10-23.
- **Cost if wrong:** (B) spends one `risk:2` builder and verifier, about 311k tokens (inferred, as in JDG-009), on legacy code the plan deletes; if the dropped-slot overwrite turns out to be reachable, a user loses a slot silently, which (B) leaves open. (A) spends about three times the code in legacy code. (C) leaves all three until N.7.
- **Decides:** the judge (`judge-brief.md`); the owner may override
