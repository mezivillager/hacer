# Product inbox — proposals the inbox panel decides

The product role (`product-brief.md`) files UI defects and polish itself, but it never files an
issue for product strategy — a new capability, a flow redesign, a change to the roadmap or an epic.
It queues the proposal here, in the issue form. **The inbox panel decides each `proposed` entry
(`inbox-panel-brief.md`): `node scripts/inbox.mjs queue` files a review issue for it, Opus and Grok
review it, and the panel sets `approved`, `declined (<reason>)` or `deferred (<until>)`. The owner
may override any status at any time, by editing it or by saying "approve PRD-00N".** Only an
approved entry is filed — by the panel, never by the product agent — under the target epic, and the
entry then records the issue number. Declined entries stay, so the same proposal is not made twice.

## Entry format

```markdown
### PRD-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #144 polish | #143 3d | #142 surfaces | #139 spine
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Why:** <the finding and its evidence — tour step, snapshot line or file:line; heuristic or SC>
- **Review note:** docs/research/<note>.md

**Draft issue body**
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

Ids are sequential and never reused. An entry's draft body follows the agent-ready issue form in
`docs/harness/issue-form.md` so filing it is a copy, not a rewrite.

## Queue

*Empty — the first review is #269 PR 2.*
