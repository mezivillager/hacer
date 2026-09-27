# Process reviews

A fresh-context review of the autonomous flow, at least every two weeks. It judges how the platform
moves forward without the owner, and reports:

- flaws and improvements;
- tools, judged against best practice;
- new projects;
- changes to project priority.

Every cycle lives here in one layout, so cycles can be compared. The owner, 2026-09-27: "i don't want
non-uniform sacttered review docs, especially given this will happen every two weeks at least".

## A cycle

| Step | Who | Writes |
|---|---|---|
| 1. Issue the brief | the coordinator | `<cycle>/BRIEF.md`: this cycle's measured evidence, the runs since the last cycle, and the coordinator's hypotheses in both directions. It is issued over the standing brief, `docs/harness/process-review-brief.md`. |
| 2. Review | one fresh session per reviewer, on any model or tool the owner picks | one file each, `<cycle>/reviews/<n>.md`, in the standing brief's report format. Raw output goes in `<cycle>/evidence/<n>-<topic>.md`. |
| 3. Consolidate | the coordinator | `<cycle>/SYNTHESIS.md`: every finding once, deduplicated across reviews, with its validity, the decision, and the issue, PR or ruling that carries it. |
| 4. Follow through | the loop | the issues and rulings SYNTHESIS.md names. The next cycle's brief starts from what landed. |

## Layout

```
docs/harness/reviews/
  README.md             this page
  <YYYY-MM-DD>/         one directory per cycle, named for the day its brief was issued
    README.md           the cycle's index: the brief, each review, status
    BRIEF.md            the brief as issued
    reviews/<n>.md      one file per review, numbered in the order the reviews arrived
    evidence/           brief-* for the brief's measurements, <n>-* for review n
    SYNTHESIS.md        the consolidated findings
```

## Rules

- **A review never edits another review or the brief.** A correction goes in `SYNTHESIS.md`.
- **Reviews are numbered, not named by model.** The findings are judged, not their authors. A review
  may say what it ran on.
- **A review files no issues and changes no process.** The coordinator triages in `SYNTHESIS.md`,
  files what survives, and puts the owner's decisions in its table.
- **Numbers are measured or marked inferred,** and every review checks at least five of its brief's
  claims against their sources.

## Cycles

| Cycle | Reviews | Status |
|---|---|---|
| [2026-09-26](2026-09-26/README.md) | 3 | triaged 2026-09-27; follow-through in the review-followups run (`docs/decisions/rulings/2026-09-27-review-followups.md`) |
