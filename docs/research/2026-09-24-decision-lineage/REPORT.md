# Decision Lineage — trace a defect to the decision that introduced it, and to everything built on it

**Status:** research report for the owner's review. Nothing in this report is built or filed. Parked
idea: [#457](https://github.com/mezivillager/hacer/issues/457). Sibling report:
`../2026-09-24-mission-control/REPORT.md`.

Every number below was measured on 2026-09-24 at `origin/main` `97f109b` unless it says otherwise.
The coordinator's run directories, which hold most rulings, live outside the repo and are referred to
as "the run directories".

## 1. What the owner asked

> tracking decision flow … so let's say a wrong decision was made (code, architecture, etc) at step 1
> … and the decisions that built upon that step 1 decision have reached step 100, or something like
> that … and the issue is identified at step 100 … then one we identify the issue we should be able
> to associate it with the decison that introduced it, and then find out all other decisions that
> wrongly built upon it, that way we can go back and begin to correct all its ramifications … without
> a mechanism like this our fixes would be immature and bad patching that introduce more issues or
> mask the main issue.

He also asked for a better name than "decision hierarchy" / "decision-flow tracking".

## 2. The name: Decision Lineage

**Decision Lineage** — slug `lineage`. Decisions do not form a hierarchy: a ruling can rest on two
ADRs and a fact at once, and a fact can underpin twenty rulings. They form a directed graph, and the
two questions the owner wants answered are the two questions data engineers ask of *lineage*:
**upstream** — what does this rest on? — and **downstream** — what rests on this? The mechanism is a
lineage graph; the correction workflow is "walk the downstream set from the root".

Alternatives: *Decision Provenance* (accurate, but provenance is the backward question only — the
owner's emphasis is the forward one), *Rationale Graph* (says what it is, not what it is for),
*Consequence Tracking* (close, but names the effect rather than the mechanism).

## 3. What exists today, measured

Decisions are recorded in five places, none of which links to another in a way a program can read.

| Where | What is there | How relations are expressed |
|---|---|---|
| `docs/decisions/` | 21 ADRs, no frontmatter; `- **Status:** / **Date:** / **Deciders:** / **Phase:**` bullets, sections Context / Decision / Consequences / Affected living docs / Links | prose inside the Status line (`0007:3 "Accepted — Superseded by [ADR-0020]"`, `0016:3 "amends [ADR-0012]"`); 38 untyped `[[NNNN]]` links across 19 ADRs; **no** Supersedes / Amended-by / Builds-on field exists |
| The run directories | **321 unique ruling ids** in 8 `rulings.md` files, three header styles, hand-allocated ids; a ruling's later restatement reuses its id with a status in the heading (`R224 (superseded) —`, `R231 (recorded as proposed, not applied) —`), so a parser cannot tell a decision from its amendment; "cost if wrong" 252 times | prose ("my own R517 fix shipped a safety hole" is how R518 says it builds on R517) |
| `docs/research/2026-09-18-agent-readiness/DECISIONS.md` | R1–R106, the only rulings in the repo; its line 3 says new decisions go "to `docs/harness/ledger.md` once it exists" | prose headings ("R19 — R15 amended") |
| `docs/harness/ledger.md` | 53 rows: `Date \| What went wrong \| Should have been caught by \| Mechanised?` | **no row id, no decision id**; rows cite each other by position ("row 11") and are not in date order |
| `docs/harness/sessions/` | rulings sections in 3 of 5 dated records; the 2026-09-24 record cites **0** ruling ids although 35 rulings were made that day | prose |
| Issue form, PR template | 0 fields for a decision, a premise, or "depends on" | — |

**What is machine-readable today:** `Fixes #n` (GitHub and `pr-hygiene.logic.mjs:192-208`), GitHub
`parent`/`blockedBy` links (164 issues have a parent, 106 blockedBy edges — *work* dependencies,
read by `backlog.mjs`), and id tokens (`#n`, `ADR-NNNN`, `R<n>`, `[[NNNN]]`) whose **relation type is
never stated**. Every "built on", "follow-up from", "correction to" relation in the repo is prose.
No script or workflow parses ADRs, sessions, the ledger or rulings (0 hits); `lint:docs` checks
paths, not references.

**How much is outside the repo:** 215 of 321 rulings exist only in the run directories, and 191 are
never cited by id anywhere in the repo. Two public GitHub texts cite local-only artefacts (#394 cites
R310/R345/R350; a #327 comment cites a spike note by its machine path).

**How amendments are marked** — three ways in three ADRs: 0016 has a dated `## Amendment` heading;
0013 has three inline `*Amended … (#n)*` notes and a Status line that still says plain "Accepted";
0020 has a Status paragraph plus a Was / Is-now / Why table — and **names PR #433 zero times** (the
amendment is credited to #372), while the tightening round that corrected the amendment is folded into
§1.5 with no marker at all. The owner's idea text says "amended by #433"; the ADR says #372. Both are
true and neither is recorded.

### 3a. Four real chains, reconstructed — the test data

**(i) ADR-0020 §1.5.** ADR-0020 (#327, PR #358, accepted through R301–R328) → schedules the spike
(§1.5) → #372 → spike note (run directory only, 0 references in the repo) → R501/R502/R503 (R503 led
to #431) → PR #433 (R513: the amendment argued back against the spike) → verifier PASS with four nits
→ R514 (one scoped round) → tightening `0ce21a3` → R519 (merge) → consumer **#374**. Typed edges: two
(`#433 Fixes #372`; `#372 blocking #374`). **#374's body and its one comment mention none of #372,
#433 or the write-back** — the next issue to read §1.5 has no pointer to the correction made for it.

**(ii) The #342 premise.** #325 → #342 (created 2026-09-21T12:46Z, premise: R3F's peer range
excludes React 19.3) → the premise expired at 2026-09-22T19:43Z (R3F 9.8.0), **30.96 h later** →
#342 closed not-planned; its closing comment still says "36 hours" → #408 → PR #409 (the Dependabot
group; the premise restated as a comment in `dependabot.yml:8-21`) → #410 opened 2 min 16 s later
pairing React 19.3.0 with R3F 9.7.0 → held by R608 → #455 ("second occurrence", which names #342 and
#410 but neither #408 nor #409). **The #409 → #410 edge exists only in the run directories — recorded
there as a success** ("the grouping proved itself within the hour").

**(iii) removeJunction.** #356 → #364 → PR #396 ("Fixes #364 in part … remaining data loss: #403";
GitHub closed #364 anyway) → #403 (three options) → R607 picks option 2 (run directory) → PR #459
("Option 2, as decided" — R607 named 0 times) → #462. Typed edges: the two `Fixes`. A semi-structured
hub exists — the B-009 table in `observed-bugs.md:44-56` with "Carried by" / "Partly fixed in" rows.

**(iv) R517 → R518 → R520.** Three corrections to one twenty-minute stretch of coordinator work, each
naming the previous in its heading, with unrelated R519 between them; a fourth instance of the same
class got no id. In the repo, `sessions/2026-09-24.md:72-96` narrates all three with **0** ruling ids
and there is no ledger row.

### 3b. The #394 class, and why the proposed control would not have fired

#394 (open) covers four coordinator claims written from prose rather than the artefact. The ledger row
for #342 (:58) proposed the cheap control: "re-run the issue's own stated verification command before
dispatch". **Measured against #342's text, that control would not have fired:** its verification
command (`pnpm install --frozen-lockfile && … build`) contains no registry query; the premise check
(`npm view @react-three/fiber peerDependencies.react`) sits in an acceptance criterion; and `pnpm`
only warns on a peer violation, so the command exits 0 either way (#408, #455). The rule that exists
today is prose in four places (AGENTS.md "Ticket Freshness", the cloud-lane inbox, the `ha-prompt-it`
measured-facts table, R518's "make the tool state its premise out loud") and no tool runs any of it.

## 4. The problem, precisely

- **Backward tracing is archaeology.** From #462 back to the decision that made removeJunction keep
  standalone wires means reading a PR body, an issue, and a ruling that is not in the repo.
- **Forward tracing is impossible.** "What rests on ADR-0020 §1.5?" has no answer today except a
  person's memory. That is the owner's step-100 problem in its literal form.
- **Premises expire silently.** #342's expired in 31 hours. Nothing re-checks a fact a decision rests
  on, and the one proposed control provably would not have caught it.
- **Ids are not stable.** Ids are allocated by hand per run; a restated ruling keeps its id with its
  status in prose; the ledger has no ids; rows point at "row 11".
- **The graph already exists — in prose, in two places, one of them off the repo.** Every link the
  survey reconstructed was there to find. It cost an agent an hour to find four chains.

## 5. Options

**A. Discipline and templates, no tool.** Add "Builds on" to the templates and rely on people and
agents to keep it. Rejected on evidence: 191 rulings never cited, reverse links missing in four
ADRs, `src/utils/wiringScheme/` cites superseded ADR-0007 **nine times in seven files** (seven as
`ADR-0007`, two by file path — `lanes.ts:27`, `approach.ts:24`) and nothing flags it. Prose links rot; only a check keeps them.

**B. Fixed fields in the existing markdown + a pure script + a lint + scheduled premise
verification — recommended.** Agents already write markdown with fixed `Field: value` lines (the
claim comment, the `## Verifier verdict:` heading); the repo already parses such lines with
`*.logic.mjs` + fixtures. No new dependency, no second source of truth, greppable, renders on GitHub,
and the same ids are what Mission Control draws.

**C. A dedicated graph store or ADR tool** (a JSON graph file, log4brains/adr-tools, a knowledge
graph). Rejected for now: agents edit JSON far less reliably than markdown; ADR tools do not model
rulings or premises; a store the docs do not contain is a second truth. Code-level impact analysis
(the existing `blast-radius.mjs`, dependency-cruiser's graph reporters) is complementary and stays.

## 6. The model — deliberately small

**Three node kinds.** `ADR-NNNN` (exists), `R<n>` (exists; ids become tool-allocated and unique), and
`P-<n>` — a **premise**: a fact a decision rests on, with a command that checks it (new). Issues, PRs,
paths and ledger rows are *artefacts*: referenced, never nodes.

**Five edge kinds.** `builds-on` (the default dependency), `amends`, `supersedes`, `assumes`
(decision → premise), and `introduced-by` (written on the defect's side: an issue or ledger row names
the decision it traces to). Resolution is already `Fixes #n`; no new field.

**Capture is one field block, in the place the decision is already written:**

```
## R612 — <title>
Builds on: R606, ADR-0020 §1.5, P-004      ← may be `none` (explicit) or `unknown` (imported)
Assumes: P-006
Amends: R516
Cost if wrong: …
```

ADRs get the same lines as bullets under Date (`- **Builds on:**`, `- **Amends:**`, `- **Assumes:**`),
and `- **Status:**` stops carrying relations in prose. The agent-ready issue form and the PR template
gain one optional line each (`Introduced by:` / `Decisions:`). The ledger gains an `Id` column
(`L001…`) and a `Decision` column. **Rulings move into the repo** — `docs/decisions/rulings/<date>-<run>.md`,
one file per run, appended during the run — because a lineage that is 67% off-repo is not a lineage.

**Premises are executable.** `docs/decisions/premises.md`:

| Id | Premise | Verify | Expect | Recorded | Status |
|---|---|---|---|---|---|
| P-001 | R3F's peer range excludes React 19.3 | `npm view @react-three/fiber peerDependencies.react` | `<19.3` | 2026-09-21 (#342) | **expired 2026-09-22** |
| P-002 | `fast-check` is not a dependency | `node -e …lockfile…` | absent | 2026-09-23 (#355) | holds |
| P-003 | `main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa` | `gh api …/rulesets/13907542` | those three | 2026-09-24 (R517) | holds |
| P-004 | GitHub answers 422 for a bogus ref on `/commits/{ref}` | `gh api …` | 422 | 2026-09-24 (#432) | holds |
| P-005 | `pnpm install` only warns on a peer violation | `pnpm install` on a fixture | exit 0 | 2026-09-24 (#455) | holds |

`lineage verify` runs every Verify, compares with Expect, and lists — transitively through
`builds-on` — every decision resting on an expired premise. P-001 is the first test: the tool must
report it **expired** with #342, #408 and #409 downstream, or it is not trusted.

## 7. Operations

| Command | Answers | Notes |
|---|---|---|
| `lineage trace <id>` | what does this rest on? | upstream closure, premises with status |
| `lineage radius <id>` | what rests on this? | downstream closure as a tree, each node with its artefacts (PRs via `Decisions:`, issues via `Introduced by:`) — **the step-100 query** |
| `lineage check` | is the graph sound? | every id resolves; no duplicate ids; every ruling after the cut-over has `Builds on:`; reverse links agree (auto-fixable); **a superseded ADR is not cited from `src/`** (first catch: ADR-0007, 9 hits) |
| `lineage verify` | do the premises still hold? | above; scheduled weekly, then daily; opens or updates one issue per newly expired premise, naming its dependents |
| `lineage correct <id>` | what must change if this was wrong? | a correction plan: one draft issue per downstream node, `--dry-run` by default, `--file` creates them with `Introduced by:` set |
| `lineage graph` | draw it | `--mermaid` for GitHub rendering, `--json` for Mission Control |

`lineage check` runs inside `pnpm run lint` as `lint:lineage`: **warn** for two weeks after the
cut-over, then **fail** — and like the layer ratchet, the count of decisions without lineage may only
shrink. `lineage verify --for <issue>` is cheap enough for `ha-next` to run at dispatch, which is the
control the #342 row wanted and could not have had.

**The correction workflow the owner described, end to end:** a verifier BLOCK (or a ledger row)
names `Invalidates: R607` → `lineage radius R607` lists #459 and #462 → `lineage correct R607` drafts
one task per dependent → the root ruling's status becomes `retracted` or `amended` with a pointer →
the ledger row carries `R607` in its Decision column. The fix starts at the root and covers the set,
which is the opposite of "patch step 100".

## 8. Project shape

**Epic:** convert #457 (keep the owner's words, drop `idea`, add `project:lineage` and `epic`).
**Lane:** `process`. **Progress is:** `lint:lineage` green; every ruling since the cut-over carries
lineage; the four chains in §3a answer `trace` and `radius`; premises re-verified on a schedule and
P-001 reported expired.

| Id | Task | Risk | Tier |
|---|---|---|---|
| DL-1 | **Schema, field block, in-repo home for rulings, parser.** `scripts/lineage{,.logic}.mjs` parsing ADRs, rulings, premises, ledger ids; fixtures = the four chains; one fixture with duplicate ids (R224) and one with a dangling id, both shown red first. Tool-allocated ids. | 1 | Opus (new subsystem) |
| DL-1b | **Backfill** — coordinator-owned, not an agent task: import all 321 rulings (`Builds on: unknown` where not known), annotate this week's (R500–R611) with real lineage, add ledger ids. | — | coordinator |
| DL-2 | **`trace`, `radius`, `check`, `graph` + `lint:lineage` (warn).** Reverse-link autofix; the superseded-ADR-in-`src/` check (expect the 9 ADR-0007 hits). | 1 | Opus |
| DL-3 | **Premises register + `verify` + the scheduled workflow.** The five premises above; P-001 must report expired; expiry opens an issue naming dependents. | 1 | Opus |
| DL-4 | **Harness integration.** Briefs (`implementer`, `verifier` gains `Invalidates:`), the agent-ready form, the PR template, the ledger's two columns, `skills.logic.mjs`'s pinned phrases. The coordinator's own skills live outside the repo — the exact edit is handed to the owner. | 1 | Sonnet |
| DL-5 | **`lineage correct`** — correction plans, dry-run and `--file`, tested on chain (iii). | 1 | Opus |
| DL-6 | **`lint:lineage` from warn to fail; the lineage ratchet.** Touches a required check. | 2 | Opus |
| DL-7 | **The graph in Mission Control** — after MC-2 there. | 1 | Sonnet |

Related open work, to link rather than duplicate: **#394** (the class this mechanises — the epic
absorbs it), the #342 ledger row (its proposed control is replaced by DL-3), **#160** (phase status
is a premise-shaped fact), **#271** (the retro role reads `lineage verify`'s output).

## 9. Decisions taken on the owner's behalf

| Id | Decision | Cost if wrong | Revert |
|---|---|---|---|
| D-DL-1 | Name it **Decision Lineage**, slug `lineage`. | a label and a folder | trivial |
| D-DL-2 | Fixed fields in the existing markdown, not a graph store. | A very large graph could outgrow grep-and-parse; the export (`graph --json`) is the migration path. | later |
| D-DL-3 | Rulings move into the repo; the run directories keep only machine state (queue, state.md). | The coordinator's global skill must be edited to write there — an owner-side change, one path. | one line |
| D-DL-4 | Ids are tool-allocated; imported rulings get `Builds on: unknown`, distinct from `none`. | None — `unknown` is honest and countable. | — |
| D-DL-5 | Premises are verified on a schedule **and** at dispatch, not at dispatch only. | Scheduled runs hit the network; harmless. | disable the workflow |
| D-DL-6 | `lint:lineage` warns first, fails after two weeks. | Two weeks of unlinked decisions. | flip the flag |
| D-DL-7 | Nodes are ADRs, rulings and premises only; issues and PRs are artefacts. | A decision made only in a PR thread is invisible until someone writes a ruling. | widen later |

## 10. The pick-rule slot for both projects

The owner asked for equal footing with `harness` and `foundation`. Today's cycle
(`docs/portfolio.md`, `backlog.logic.mjs:PICK_ROTATION`) is
`foundation → foundation → harness → foundation → spine → aux`. Proposed:

`foundation → lineage → harness → foundation → mission-control → spine → foundation → aux`

— eight slots, each new project one slot, literally equal to `harness` and `spine`, foundation's
three picks still spaced. Both rows are lane `process`, rank 13 and 14, and both join
`GATE_EXEMPT_ROWS` for the same reason `harness` is there: their `risk:2` work is CI checks, not the
store/UI/R3F paths the foundation gate protects.

**Cost if wrong:** foundation's share of picks falls from 50% to 37.5% while its plan runs; the owner
set foundation-first deliberately. Revert is deleting two entries. **Alternative** if that is too
much: one shared `instruments` slot alternating the two (seven slots; foundation 43%, each new project
7%).

## 11. Open questions for the owner — each has a default I will proceed on

1. **The name.** Default: Decision Lineage.
2. **The slot.** Default: the eight-slot cycle above.
3. **Backfill depth.** Default: import all 321 rulings as `unknown`, annotate R500–R611 properly.
   Annotating older runs is archaeology with little return.
4. **Where the coordinator writes rulings from now on.** Default: `docs/decisions/rulings/`, which
   needs one path changed in the owner's global `autonomous` skill — I will hand him the edit.

## 12. Risks

- **Capture friction.** One line per decision; the lint makes omission visible rather than
  forbidden, then forbids. If agents still skip it, the count stops shrinking and that is the signal.
- **Wrong edges.** A dependency is itself a judgment. Verifiers read lineage lines as claims like any
  other; a wrong edge is a finding, not a crash.
- **Graph growth.** Bounded by D-DL-7: only decisions with a cost-if-wrong are nodes.
- **Premise checks that need the network in CI.** Scheduled, not on PRs; failures are "unverifiable",
  never "expired".
- **The mechanism being trusted before it is shown to work.** Every task above carries a "shown red
  first" condition, and P-001 is a real expired premise the tool must catch on day one.
