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

*Empty: the first entries are filed once the judge is merged.*
