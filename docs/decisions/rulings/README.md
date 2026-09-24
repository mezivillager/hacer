# Rulings

A **ruling** is a decision the coordinator takes on the owner's behalf during a run — which option
an issue takes, what a verdict means, what to stop doing — recorded with what it costs if it is
wrong. Rulings live here, in the repo, because a lineage that is two-thirds off-repo is not a
lineage (`docs/research/2026-09-24-decision-lineage/REPORT.md` §6).

**One file per run:** `<date>-<run>.md`, e.g. `2026-09-25-process-sweep.md` — the day the run
started and its name. The file is **appended during the run**, one block per ruling in the order
they were made, and is not rewritten afterwards.

- The file opens with `# Rulings — <date> <run>`. Each ruling is a `## R<n> — <title>` heading, the
  field lines `Builds on:`, `Assumes:`, `Amends:` and `Cost if wrong:`, then the reasoning. The
  fields and the difference between `none` and `unknown` are defined in
  [../README.md](../README.md#lineage).
- **Ids are allocated by the tool, never by hand:** `node scripts/lineage.mjs next-id` prints one
  past the highest id in this folder. A ruling that restates or corrects an earlier one takes a new
  id and names the old one in `Amends:` — an id is never reused.
- `node scripts/lineage.mjs parse` reads **every file in this folder**, this README included; a
  duplicate id, or a relation naming an id that does not exist, is an error.

Rulings made before this folder existed are imported by #466. Until then the highest ids are in the
coordinator's run directories, so `next-id` refuses to allocate from an empty folder.
