# Foundation audit — 2026-09-21

The owner asked: *is the codebase structured to support our rigorous, more-or-less autonomous
process? Is it too tangled? Is it too monolithic?* — and ruled that the foundation is fixed before
more is built on it. The same day he set the product's direction: connections are declared, not
drawn; the 2D and 3D surfaces are read-only; legacy machinery is removed, not frozen; and the 3D view
is a differentiator to invest in.

| Read | For |
|---|---|
| `REPORT.md` | the answer, the target structure, the working rules, the ordered plan (§6), the plan as issues (§6a), the gate (§7), testing (§8), rendering R&D (§9a) |
| `evidence/MEASUREMENTS.md` | what was measured in the code (called F1 in the other files); re-derive with `evidence/scripts/run.sh` |
| `evidence/RESEARCH.md` | outside sources, dated, tagged evidence or opinion (F2) |
| `evidence/TESTING.md` | the testing audit: what each layer has caught, its cost, the fate of every suite (T1) |
| `evidence/REVIEW-1.md`, `evidence/REVIEW-2.md` | two fresh-context adversarial reviews of earlier versions, kept as written — including the claims they found wrong |

Tracking issue: #318. Label: `project:foundation`. The decision record is the ADR in #327; until it
is accepted, `REPORT.md` is the plan. The evidence files are a snapshot: their numbers were true at
`origin/main` `6e6e636` and are not maintained.
