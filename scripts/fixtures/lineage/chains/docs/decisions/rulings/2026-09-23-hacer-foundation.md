# Rulings — 2026-09-23 hacer-foundation

Fixture: chain (ii) of `docs/research/2026-09-24-decision-lineage/REPORT.md` §3a, the #342 premise.
Real ruling ids from the run directory, titles shortened, bodies cut to the sentences that name
artefacts, lineage written in the field format of REPORT §6.

## R398 — #342 dispatched with "verify the premise first, and close the issue if it has moved"
Builds on: unknown
Assumes: P-001
Cost if wrong: a few minutes of checking against a pin nobody needed.

It was written on 2026-09-21 from a research note; the builder checks R3F's peer range live first.

## R399 — #342 closed, not built: its premise expired before any builder opened it
Builds on: R398

Upstream moved on 2026-09-22: v9.8.0 shipped with "R3F is now compatible with React 19.3.0".

## R400 — The real risk is bump ordering, not a version hold, and it survives the premise expiring
Builds on: R399
Assumes: P-005
Cost if wrong: one `groups:` entry that was not needed.

Merge the React pair first and the repo lands exactly the unsupported combination, with lint, test
and build green. Filed by the builder as #408 and dispatched.

## R405 — #409 is the first PR tiered under #351's new rule
Builds on: R400
Cost if wrong: one overturned Sonnet verdict, which is the documented trip-wire that moves the rule
  back.
