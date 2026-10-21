# Product inbox fixture: a note after each kind of status

## Entry format

```markdown
### PRD-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #144 polish | #143 3d | #142 surfaces | #139 spine
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Why:** <the finding and its evidence>
```

## Queue

### PRD-001 · A note after proposed
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** proposed, x

### PRD-002 · A note after approved
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** approved, to be filed after #142 exits

### PRD-003 · A proposal
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** proposed

### PRD-004 · Filed, then a note
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** filed (#12), closed by PR #34 on 2026-10-20

### PRD-005 · Declined by the panel, with commas and issue numbers in the reason
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** declined (inbox panel, #791: already carried by #811's corpus, which pins both part orders as intended under R343; #338's official-vector run never meets the shape)

### PRD-006 · Declined, then a note
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** declined (inbox panel, #9001: PRD-004 covers it), confirmed by the owner

### PRD-007 · Deferred, then a note
- **Date:** 2026-10-21 · **Target epic:** #144 polish
- **Status:** deferred (inbox panel, #9002: until the 3D epic exits), revisit after #143
