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

### JDG-001 · Does #257's browser QA gate wait for a cloud runner, or ship advisory first?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** R881
- **Status:** proposed
- **Evidence:** cloud routines cannot clone the repo (inferred from the schedule tool's setup note).
- **Options:** A, wait; B, ship the gate advisory; the coordinator recommends B, because nothing else depends on it.
- **Cost of delay:** one more run with #257 passed over.
- **Cost if wrong:** an advisory gate nobody reads.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-002 · Which Actions secret does the QA run read?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** #257
- **Status:** decided (B: one repository secret, read only by ui-tour.yml), owner action: add the secret in Settings → Secrets
- **Evidence:** only the owner can add a repository secret.
- **Options:** A, an environment secret; B, a repository secret; the coordinator recommends B.
- **Cost of delay:** the QA run cannot start.
- **Cost if wrong:** a secret readable by more workflows than need it.
- **Decides:** the judge (`judge-brief.md`); the owner may override

### JDG-003 · Is #959 fixed in place or closed for a smaller slice?
- **Date:** 2026-10-22 · **Kind:** decision · **Raised by:** R888
- **Status:** filed (#9020), judge #9021: option A
- **Evidence:** one BLOCK from a fresh verifier.
- **Options:** A, fix in place; B, close and re-slice; the coordinator recommends A.
- **Cost of delay:** the slice behind it waits.
- **Cost if wrong:** one rebuilt PR.
- **Decides:** the judge (`judge-brief.md`); the owner may override
