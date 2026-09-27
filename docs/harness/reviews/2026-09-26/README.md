# Process review — cycle 2026-09-26

The first cycle. The owner asked for *"a review brief summarizing the autonomous flow that gets the
platform moving forward … for a fresh session to evaluate the process, to identify any weakness/flaw
with it, to suggest improvements, to recommend tools based on best practices, to recommend new
projects, or to suggest different priority of current projects"*.

| File | What | Arrived |
|---|---|---|
| `BRIEF.md` | the brief as issued (#524), rebalanced the same day (#525) | 2026-09-26 |
| `reviews/1.md` | review 1: verdict, scorecard, F1–F12, the live test of F1 on its own PR | 2026-09-26 (#526) |
| `reviews/2.md` | review 2: F13–F16 and a bounded priority reversal; notes `evidence/2-controls.md`, `evidence/2-product.md` | 2026-09-27 (#527) |
| `reviews/3.md` | review 3: verdict, scorecard, F1–F8; measurements `evidence/3-measurements.md` | 2026-09-27 (#529) |
| `evidence/` | `brief-measure-flow.mjs` re-measures the brief's GitHub numbers (`brief-measurements.txt`); `1-stuck-merge-box.md` is review 1's merge-box data | — |
| `SYNTHESIS.md` | the three reviews consolidated: 22 findings, each with its validity, the decision, and what carries it | 2026-09-27 |

**Consolidated on 2026-09-27 (#533).** The files moved here from
`docs/research/2026-09-26-process-review/`. Only paths changed:

- `REPORT.md` became `reviews/1.md`. Its §11 was dropped: other PRs added it later, pointing at the other reviews.
- `FINDINGS.md` became `reviews/3.md`.
- Review 2's summary is restored as `reviews/2.md` from commit `3e4ed2f`. It was first appended to review 1's file, and #529 later replaced it.
- The evidence was renamed by review, and `BRIEF.md` keeps its original line numbering, because the reviews cite it by line.

#529's text called review 2's notes "working notes from that pass", meaning review 3's. They are review 2's own.
