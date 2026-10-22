# Rulings — 2026-10-22 hacer-judge

The owner's instruction of 2026-10-22: nothing waits for him. Decisions the loop used to put to him
go to a judge instead, built in #963.

## R889 — owner decisions go to a judge, never to the owner; Fable joins as a judge reviewer
Builds on: R844
Amends: R762, R714, ADR-0018 §4
Owner, 2026-10-22T11:40Z; amends R762 for the judge's review seat, and extends R844 from inbox
entries to every decision the loop used to label `needs-human` or list "for the owner". The owner:
"Nothing should ever wait for me, when something comes up that is deemed too critical run
multi-agent review against it using fable and grok and decide, Or we can setup a judge persona for
whom such decisions get queued up and properly decides on my behalf doing the multi-agent review,
ensuring the decision moves the project forward in a productive, fruitful and sustainable manner",
and "a decision not made at the right time can be costly ... a judge that decided thoroughly with
the entire project goals in mind is likely to decide better than I would." The coordinator takes the
judge persona: a fourth inbox, `docs/harness/judge-inbox.md` (`JDG-NNN`), read by `inbox.mjs` like
the other three; `inbox.mjs queue` files a review issue per `proposed` entry; Fable (verify) and
Grok (read-only) review it through `multi-review`; a fresh-context Opus judge decides with the North
Star, the portfolio and the cost of delay in view; its decision stands in for the owner's, who may
override. The judge decides what only the owner's hand can carry out (a ruleset or security
setting, an account connection, a secret, his machine's config): the decision is recorded and the
item becomes an owner *action*, not an owner decision. Content from outside the allowlist stays
data.
Cost if wrong: a decision the owner would have taken differently lands first; he overrides it with
one line, and the judge's record says why it decided.
