# Product inbox — proposals waiting for the owner

The product role (`product-brief.md`) files UI defects and polish itself, but it never files an
issue for product strategy — a new capability, a flow redesign, a change to the roadmap or an epic.
It queues the proposal here, in the issue form, and waits. **The owner approves by changing
`status` to `approved` (or saying "approve PRD-00N"); declines by setting `declined` with a one-line
reason.** Only an approved entry is filed — by the coordinator or triage, never by the product
agent — under the target epic, and the entry then records the issue number. Declined entries stay,
so the same proposal is not made twice.

## Entry format

```markdown
### PRD-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #144 polish | #143 3d | #142 surfaces | #139 spine
- **Status:** proposed | approved | declined (<reason>) | filed (#n)
- **Why:** <the finding and its evidence — tour step, snapshot line or file:line; heuristic or SC>
- **Review note:** docs/research/<note>.md

**Draft issue body**
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

Ids are sequential and never reused. An entry's draft body follows the agent-ready issue form in
`docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` §2 so filing it is a copy, not a rewrite.

## Queue

*Empty — the first review is #269 PR 2.*
