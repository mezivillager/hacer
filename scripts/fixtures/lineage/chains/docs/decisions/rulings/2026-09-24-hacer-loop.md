# Rulings — 2026-09-24 hacer-loop

Fixture: chains (i) ADR-0020 §1.5 and (iv) R517 → R518 → R520 of
`docs/research/2026-09-24-decision-lineage/REPORT.md` §3a. Real ruling ids from the run directory,
titles shortened, bodies cut to the sentences that name artefacts, lineage written in the field
format of REPORT §6. R519 belongs to chain (i) and sits between R518 and R520, as it did.

## R501 — The #372 spike executed ADR-0020 §1.5's mechanism and found it does not work
Builds on: ADR-0020 §1.5
Cost if wrong: N.1 is built on a lowering that silently evaluates pass-throughs to 0.

## R502 — Substitution hides a genuine double drive from #362, and that is the sharper finding
Builds on: R501, ADR-0020 §1.8
Cost if wrong: the spec accepts a document the engine would have refused.

## R503 — Two agents found the same live `main` bug independently, from opposite directions
Builds on: R501
Cost if wrong: none — both repros are measured.

The #397 builder filed #431 while the #372 spike listed it as break 1.

## R513 — The ADR amendment argued back against the spike and was right to
Builds on: R501
Amends: ADR-0020 §1.5
Cost if wrong: the ADR records a capability the lowering does not have.

It rejected the spike's proposed `Or4`/`Or8` builtins in favour of #374's width-generic desugar.

## R514 — #433's nits go in as a briefed builder round, not a merge-as-is and not a fourth review
Builds on: R513
**Cost if wrong:** one extra small docs round on a document that has already had a review.

#374 is the very next issue to read §1.5, and read alone it would put the write-back in the caller.

## R517 — `gh-merge-on-green` treated every red check as fatal; scoped to required contexts
Builds on: none
Assumes: P-003
Cost if wrong: the tool merges a PR whose non-required check was actually load-bearing.

## R518 — my own R517 fix shipped a safety hole; the tool's first live run caught it
Builds on: R517
Cost if wrong: unchanged from R517 — bounded by the repo's own stated gate.

## R519 — #433 merges on its tightening round, with no fourth review
Builds on: R514
Cost if wrong: a docs-only ADR edit lands with an error in it.

## R520 — correction to R517: the red non-required checks were NOT a standing problem, and no issue is filed
Builds on: R518
Amends: R517
Cost if wrong: if deploy-preview really is flaky, it resurfaces on a later PR with real evidence.
