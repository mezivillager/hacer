# Fidelity inbox — proposals waiting for the owner

The fidelity role (`fidelity-brief.md`, ADR-0018) never files an issue for a proposal. It queues
the proposal here, in the issue form, and waits. **The owner approves by changing `status` to
`approved` (or saying "approve FID-00N"); declines by setting `declined` with a one-line reason.**
Only an approved entry is filed — by the coordinator or triage, never by the fidelity agent — as an
issue labelled `fidelity` under the target epic, and the entry then records the issue number.
Declined entries stay, so the same proposal is not made twice.

## Entry format

```markdown
### FID-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #139 spine | #142 surfaces | #147 horizon | #140 core
- **Status:** proposed | approved | declined (<reason>) | filed (#n)
- **Why:** <the finding, with its source — file:line, book section, URL and fetch date>
- **Review note:** docs/research/<note>.md

**Draft issue body**
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

Ids are sequential and never reused. Target epics: `#139` spine, `#142` surfaces, `#147` horizon,
`#140` core. An entry's draft body follows the agent-ready issue form in
`docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` §2 so filing it is a copy, not a rewrite.

## Queue

_Empty. The first review (issue #268, second PR) fills it._
