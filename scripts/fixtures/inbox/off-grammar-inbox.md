# Product inbox fixture: statuses inside and outside the grammar

## Entry format

```markdown
### PRD-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #144 polish | #143 3d | #142 surfaces | #139 spine
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Why:** <the finding and its evidence>
```

## Queue

### PRD-001 · A capitalised status
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** Proposed

### PRD-002 · A status cut short
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** approve

### PRD-003 · A proposal
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** proposed

### PRD-004 · Filed, then a note after a comma
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** filed (#12), closed by PR #34 on 2026-10-20

### PRD-005 · Filed, then a note with no comma
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** filed (#12) closed by PR #34

### PRD-006 · Deferred by the panel
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** deferred (inbox panel, #9002: until the 3D epic exits)
