# Rulings — 2026-10-15 hacer-loop-reset

The coordinator loop run of 2026-10-15 to 2026-10-16. Owner's hand-over: "run the loop until weekly usage
resets (until it goes to 0)". Weekly usage was 57% at the start (22:03Z); the meter resets on
2026-10-16T03:00Z. Publishing `on-green` under the standing grant. Subagents on Opus and Sonnet, two at a
time (R782, R798).

## R834 — the run ends at the weekly reset, 2026-10-16T03:00Z, and its records PR merges before it
Builds on: R805, R741
Weekly usage was 57% at 22:00Z with five hours left, so the clock is the binding limit, not the meter.
No new Opus build chain starts after about 01:30Z unless it can reach a verdict, and the close starts
by about 02:15Z whatever is in flight; in-flight work is handed off, not stranded. If weekly usage
reaches 97% first, dispatch stops there. As R741 ruled, a reset is not permission to continue.
Cost if wrong: if the owner meant "use the new week too", the run stops about a week early; if they
meant "stop when the meter next reads 0", that is the same moment.

## R835 — the first pair is #377 PR 2 (Opus) and #749 (Sonnet); #377 PR 3 takes the first free slot
Builds on: R782, R742
PR 2 is the spine's next step and the longest chain (builder, verifier, fidelity review), so it starts
first. #749 is the only other `agent-ready` item that is neither cloud-lane work (#338, R742) nor
flagged as possibly delivered (#257, #269). Its builder is short, so its slot frees for PR 3 within
the hour. Two agents at once (R782).
Cost if wrong: PR 3 starts about an hour later than it would have beside PR 2.

## R836 — #746 is `agent-ready` and #431 folds into it; one PR closes both
Builds on: R830
Amends: ADR-0020
#746 (`risk:1`) has concrete criteria, and the queue-up rule in `docs/harness/README.md` allows
`agent-ready` at `risk:1`. #431 asks the same question (a read of bits no writer drives compiles and
reads 0) and leaves open whether a whole-signal read of a partially driven signal is an error. #746's
rule answers it as the spec path's `undriven` does: a read that overlaps any driven bit is accepted,
and a read that overlaps none is refused, so #355's slice-assembled reads keep working. #431's
criteria, the union across writers and the reuse of `overlaps()`, join #746 (#746
issuecomment-6203259564; #431 issuecomment-6203261046). An Opus builder and an Opus verifier, because
the change is in `src/core/hdl`, then a short fidelity read. Under this rule a whole read that
overlaps a driven bit still compiles, so ADR-0020's passages that expected #431 to make the engine
report a missed `compileSpec` split are corrected in the run's records.
Cost if wrong: if the owner wants a whole-signal read of a partially driven signal refused too, that
is a later tightening of the same check, and #355's 13 tests would be rewritten then.

## R837 — where legacy reports a `cycle` only because its graph treats bus components as nodes, the import's bit-level verdict stands
Builds on: R826, R828
Amends: ADR-0020 §10
PR #753's builder measured two shapes. A loop made only of bus components (joiner → splitter → joiner)
imports as `wire out = a;`. A splitter bit that no wire carries, looped back into its own part,
imports with that input bound to `false`. Legacy refuses both as cycles, but neither has a
combinational loop in its bits, so the import evaluates them. This is the class PR 1's phantom-edge
nit accepted. The verifier and the fidelity reviewer test it, and PR 3's L-001 section gets one
sentence on it. The fidelity review (issuecomment-6205099371) found the granularity to be the
reference's own: per bit through wires and bus components, with parts opaque. ADR-0020 §10 records it.
Cost if wrong: a document legacy refused to evaluate is imported and evaluated. If the owner wants
such imports refused with a note instead, that is one check and two tests.

## R838 — PR #764 (#746) gets no separate fidelity review; its Opus verifier compares against the reference
Builds on: R836, ADR-0018
Amends: R836
R836 planned a short fidelity read after the verifier. The change only tightens: it refuses reads of
internal-signal bits that no part drives, a shape the reference cannot express at all, because it
refuses subscripted internal signals. So the verifier's brief carries the reference comparison: the
reference's own HDL and chips, which have no subscripted internals, and nothing newly refused.
Cost if wrong: a fidelity concern a dedicated reviewer would have raised is missed; the class is
HACER-only syntax.

## R839 — the release fix (#765, PR #766) merges before any dependabot PR; the nine dependabot PRs then merge one at a time, the two majors last
Builds on: R808
Releases have failed on `main` for 20 runs since 2026-10-15T03:23Z, because the previous run's
commitlint bump (`28f6cbd1`, merged under R808) moved pnpm's hidden hoist to a preset that needs a
newer changelog writer. #766 changes the lockfile, so merging a dependabot PR first would make each of
them conflict with it. #755–#763 then go through the merge tool one at a time, minors and patches
first. #760 (`lucide-react` 0.x → 1.x) relies on typecheck and build to catch a removed icon (6 import
sites). #762 (`@semantic-release/git` 10 → 11, now ESM) merges only after a `Release` run on `main`
has succeeded with #766, and the run after it is checked. A failure there is reverted.
Cost if wrong: a major bump passes CI and breaks something CI does not exercise. For #762 that is a
failed release run, which the post-merge check catches.

## R840 — #752's store actions import `MAX_PIN_WIDTH` from `@/simulation`, and the constant moves to `src/simulation/busOps.ts`
Builds on: none
Amends: none
This changes #752's text, which said to import the constant from `@/core/serialization`. The builder
measured that this import adds 4 `core-through-index` edges, and `lint:layers`'s baseline only
shrinks. `busOps.ts` already holds the 32-bit signal limit that `MAX_PIN_WIDTH` derives from, so the
limit belongs to the simulation layer. `deserialize.ts` re-exports it, so `@/core/serialization` and
its callers are unchanged. The core index test's `SIMULATION_EXPORTS` gains one entry.
Cost if wrong: if the owner wants pin limits in a core types module instead, that is one move of a
constant and its imports.

## R841 — #768's release-pipeline check is a test in the existing suite, not a new CI job
Builds on: none
Amends: none
This changes #768's text, which asked for "a CI job" and listed workflow files under "Files likely
touched". The agents' `gh` token has lost the `workflow` scope (measured scopes: `admin:public_key,
gist, read:org, repo`), so no agent can push a change under `.github/workflows/`. The same lapse made
dependabot #755 and #758 unmergeable by the merge tool. A vitest test that loads the two
preset-loading plugins with `.releaserc.json`'s options runs on every PR through `test:run`, offline,
and catches #765's class whatever the trigger.
Cost if wrong: the check runs on every PR rather than only on dependency changes, about 1–2 s of
suite time.
