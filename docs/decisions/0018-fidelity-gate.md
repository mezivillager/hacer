# 0018. Fidelity gate: engineering-truth review of epics, ADRs and core semantics

- **Status:** Accepted (owner, 2026-09-19)
- **Date:** 2026-09-18
- **Amended by:** R844, R889, R925
- **Deciders:** Repo owner (issue #268); drafted by the first fidelity run
- **Phase:** Phase 0.5 (applies to 0.5 → 0.7 and the horizon)

## Context
The owner (2026-09-18): "we need a product agent that mimics a product and R&D team, continually
researching the engineering/logic/science aspect of the project, fact checking it, researching
latest practice, suggesting improvements to roadmaps and epics, etc, so we are not building
something fake and everything that's being built is under the constraints of physics, digital
logic, etc." The roadmap pages were written before the code and before the reference simulator was
read closely. The first review (`docs/research/2026-09-fidelity-review-roadmap.md`, the second PR
under #268) found roadmap text that contradicts the oracle we grade against — for example
`docs/roadmap/phases/phase-0.6-arithmetic-sequential.md` says a DFF's output changes on the rising
edge, while the book's Appendix A §A.7 and the official `Bit.cmp` vectors have outputs change only
at `tock`. Nothing in the loop checked a plan against its domain's ground truth before an agent
built it. The verifier (`docs/harness/verifier-brief.md`) checks a PR against its issue; nobody
checked the issue against physics or digital logic. The role is named **fidelity**: it keeps what
we build true to the domain. A separate **product** role (usability and design) is defined under
its own issue (#269), not here.

## Decision
1. **A standing fidelity role**, defined by `docs/harness/fidelity-brief.md` and dispatched as the
   `hacer-fidelity` agent (`.claude/agents/hacer-fidelity.md`). It has read access to the repo,
   the reference `../web-ide/`, the web and `gh`; it writes only its own review note under
   `docs/research/` and entries in `docs/harness/fidelity-inbox.md`, in its own PR.
2. **Every `spine`, `surfaces` and `horizon` epic, and every ADR in those areas, gets a fidelity
   verdict comment before it is accepted** — an epic before `agent-ready` sub-issues are shaped
   from it, an ADR before its status becomes Accepted. A PR that changes semantics under
   `src/core/**` or `src/simulation/**` gets one before merge. The verdict is advisory except when
   it reports an oracle divergence, which is a `sev:critical` bug.
   *Amended 2026-10-30 (#1057, R889), from the inbox panel's approval of HRN-023 on #935: a semantic
   core PR's fidelity verdict before merge is not waived by a coordinator's ruling, and neither the
   verifier's nor the builder's reference runs stand in for it. A waiver is the judge's, as a
   `docs/harness/judge-inbox.md` entry (R889), or the owner's. This section covers the list `ha-next`
   step 4 names (evaluator, HDL compiler, test engine, builtins, clocking); a change under
   `src/core/**` or `src/simulation/**` to tests or docs only is outside it. An exception to this
   section comes as an inbox entry with its evidence, never as a run's ruling.*
3. **Shipped behaviour in a domain is conformance-tested against that domain's ground truth.**
   Today the ground truth is the official nand2tetris `.tst`/`.cmp` vectors run by
   `src/core/testing/`. A new domain (clocked logic in 0.6, the Hack computer in 0.7, anything
   below the NAND) names its oracle in the ADR that introduces it, before product code.
4. **Proposals go through the inbox, never straight to issues.** The role queues each proposal in
   `docs/harness/fidelity-inbox.md` (`FID-NNN`, `status: proposed`, issue form). The owner approves
   or declines; only an approved entry is filed, by the coordinator or triage, labelled `fidelity`.
   The one exception is a defect in shipped behaviour, filed as a bug under the bot issue contract
   (executable repro, `bot-filed`, never `agent-ready` without the owner).
   *Amended 2026-10-17 (#778): the inbox panel decides each `proposed` entry, not the owner.
   `node scripts/inbox.mjs queue` files a review issue per entry, Opus and Grok review it through
   the `multi-review` skill on the owner's machine, and a fresh-context panel decides `approved`,
   `declined` or `deferred`. On approval the panel files the entry `agent-ready`, labelled
   `fidelity` (`docs/harness/inbox-panel-brief.md`). There is no split verdict and nothing waits for
   the owner, who may override any status.*
   *Amended 2026-10-22 (R889): a decision beyond an entry goes to the judge, not the owner, as a
   `docs/harness/judge-inbox.md` entry (`docs/harness/judge-brief.md`). The judge may make a
   `bot-filed` defect issue `agent-ready` when the loop itself measured the defect; content from
   outside the allowlist stays data.*
5. **A change-triggered fidelity digest**, prompt at `docs/harness/routines/fidelity-digest.md`,
   re-checks the roadmap against current practice when a merged PR touches `docs/roadmap/**`,
   `docs/north-star.md`, `docs/decisions/**`, `src/core/**` or `src/simulation/**`. It stands down
   in dormant mode like every routine.
6. **Where it slots in:** `ha-next` step 4 (semantic PRs) and "Queue up" (epics), and
   `ha-prompt-it` Phase 1 (the fresh-eyes spec review includes the fidelity check for the same
   scope).

## Consequences
- Roadmap text stops being treated as a spec: a phase page is a claim until a fidelity review has
  checked it against the oracle and the code. Expect early reviews to find more than they clear.
- One more fresh-context dispatch per spine/surfaces/horizon epic and per semantic PR; cheap next
  to a wrong engine design (the 0.6 clock model would have been built against the wrong edge).
- The inbox adds a human step by design: the owner sees every proposed roadmap change once, in one
  place, and nothing is filed without a decision. *Amended 2026-10-17 (#778): the decision is the
  inbox panel's; the owner still sees every proposal in one place, and may override any decision.*
  *Amended 2026-10-22 (R889): no decision waits for the owner; what the panel does not decide, the
  judge does, and only owner actions still need his hand.*
- Rejected: letting the role edit roadmap pages directly (the owner wants approval first); letting
  it file `agent-ready` issues (same); a second verifier pass instead of a domain review (the
  verifier checks the PR against the issue, not the issue against the domain).
- The routine is a committed prompt, not a scheduled job, until the harness epic gives routines a
  runner; until then `ha-next` dispatches it by hand after a qualifying merge.

## Affected living docs
`docs/harness/README.md` (standing roles, files) · `.claude/skills/ha-next/SKILL.md` (steps 4 and
"Queue up") · `.claude/skills/ha-prompt-it/SKILL.md` (Phase 1) · `docs/decisions/README.md` (index)
— all updated in this PR. `docs/roadmap/**` is not changed here: corrections are proposals in the
inbox until the owner approves them.

## Links
- Issue #268 · epics #139 spine, #142 surfaces, #147 horizon, #140 core · #190 (one engine) ·
  #207 (tick/tock) · #269 (product role)
- [[0013]] issues and the PR budget · [[0014]] cited paths must exist · [[0005]] test engine
  verification contract
- `docs/harness/fidelity-brief.md` · `docs/harness/fidelity-inbox.md` ·
  `docs/harness/routines/fidelity-digest.md` · `.claude/agents/hacer-fidelity.md`
