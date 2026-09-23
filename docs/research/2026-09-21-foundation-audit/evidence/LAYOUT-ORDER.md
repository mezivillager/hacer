# F2 — `order: 'id'` vs barycentre vs incremental, measured on the real fixtures

**Why this exists.** ADR-0020 named `order: 'id'` as *"the weakest part of this decision … stability
was measured exhaustively and readability was not"*, and proposed to settle it by rasterising
drawings and asking the product role to judge them. The adversarial review (#359, on PR #358)
pointed out that a cheaper experiment already existed in code — S328 wrote a crossing counter, S210
wrote a pluggable comparator — and that it was cheap **only while both spikes' throwaway trees still
existed**. This is that experiment, run 2026-09-23 before those trees were collected.

**Method.** One harness, one layering. Longest-path (Kahn) layering with dummy nodes for long edges,
taken unchanged from S328's `spike/layout.ts`; crossings counted by S328's `countCrossings` (the
standard pairwise inter-layer count, dummy nodes included). **Only the within-layer comparator
varies**, so the rows are directly comparable. Fixtures are S210's — real nand2tetris Project-1
chips flattened through the repo's own `parseHDL` — plus S328's Parity5 and S328's deliberately
tangled bipartite graph as a control. Node 22.19.0, Vitest, `environment: 'node'`.

Three comparators:

- **`id`** — sort each layer by part id. ADR-0020's proposed default.
- **`barycentre`** — eight alternating barycentre sweeps, keeping the best. S328's placer.
- **`incremental`** — `layout(doc, surface, { previous })`: barycentre on the first layout; on every
  later layout, the ordinary sweeps followed by a repair pass that restores the **relative order of
  the parts `previous` already placed**, leaving new parts (and the dummy nodes carrying long edges)
  in the slots the sweep gave them. Constrained crossing reduction. Still a pure, deterministic
  function of its arguments — `previous` is an ordinary argument, not hidden state.

**Stability** is the share of nodes that keep the same `(layer, index within layer)` across an edit.
This is *not* the metric S328 reported: its "16 of 16 parts moved" counted `(x, z)` **coordinate**
change on a 16-node chain, where the priority-method coordinate pass shifts a node whose order never
changed. Both are real; they answer different questions, and the ADR quoted only the first.

---

## 1. Why the ADR saw no crossings on the real fixture

S328's graph contained **parts only**. The chip's own IN/OUT terminals are drawn (`src/nodes/`,
capability row 5, ADR-0008 assertion 6 is literally about dragging one), and once they are nodes the
picture changes:

| fixture | parts only: id | parts only: barycentre | with I/O: id | with I/O: barycentre |
|---|---|---|---|---|
| Parity5 (16 Nand) | 0 | 0 | **50** | **0** |
| Mux4Way16 → Mux (48 parts) | 205 | 0 | **3 221** | **1 650** |
| Mux4Way16 → primitives (192 parts) | 1 900 | 0 | **7 228** | **3 033** |

The ADR generalised from Parity5, which is a near-chain and the one real shape where id order costs
nothing. It costs on every larger one, and it costs on Parity5 too once the terminals are drawn.

## 2. Crossings and stability, real fixtures, one part added

Edit: one more gate tapping an existing internal signal — S328's own "realistic one more gate".
Numbers are for the drawn graph (parts **and** I/O terminals).

| fixture (drawn nodes) | comparator | crossings | after the edit | stable |
|---|---|---|---|---|
| Parity5 (22) | id | 50 | 50 | 22/22 (100%) |
| | barycentre | **0** | 0 | 21/22 (95%) |
| | incremental | **0** | **0** | 21/22 (95%) |
| Xor → primitives (12) | id | 4 | 4 | 12/12 (100%) |
| | barycentre | 2 | 2 | 12/12 (100%) |
| | incremental | 2 | 2 | 12/12 (100%) |
| Mux8Way16 → Mux4Way16/Mux16 (13) | id | 12 | 12 | 13/13 (100%) |
| | barycentre | **0** | 0 | 13/13 (100%) |
| | incremental | **0** | **0** | 13/13 (100%) |
| Mux4Way16 → Mux (54) | id | 3 221 | 3 236 | 54/54 (100%) |
| | barycentre | **1 650** | 1 657 | 49/54 (91%) |
| | incremental | **1 650** | 2 681 | **54/54 (100%)** |
| Mux4Way16 → primitives (198) | id | 7 228 | 7 229 | 198/198 (100%) |
| | barycentre | **3 033** | 3 048 | 189/198 (95%) |
| | incremental | **3 033** | **3 048** | 189/198 (95%) |
| Mux8Way16 → primitives (906) | id | 42 696 | 42 790 | 906/906 (100%) |
| | barycentre | **13 475** | 13 491 | 842/906 (93%) |
| | incremental | **13 475** | **13 491** | 842/906 (93%) |
| CONTROL: tangled bipartite (16) | id | 43 | 57 | 16/16 (100%) |
| | barycentre | **8** | 8 | 8/16 (50%) |
| | incremental | **8** | **8** | 8/16 (50%) |

**id order costs 2–3× the crossings of barycentre on every real circuit measured** — 1.95× at 48
parts, 2.4× at 192, 3.2× at 896. The ADR's only crossing evidence, 43 → 8 on a graph built to be
tangled, *understated* the cost on real circuits rather than overstating it.

**Barycentre is not 0% stable.** On the real fixtures it holds 91–95% of nodes in place under an
addition. The ADR's "moved 16 of 16" is the coordinate metric on the smallest fixture.

## 3. id order's stability is a property of the id convention, not of the ordering

`addPart` appends, so a new part's id sorts last and displaces nothing. Change only that — same
graph, same edit, an id that sorts mid-list — and:

| new part's id | id | barycentre | incremental |
|---|---|---|---|
| `zz_new_Not` (sorts last) | 54/54 (100%) | 49/54 (91%) | 54/54 (100%) |
| `p0055_Not` (sorts mid-list) | **38/54 (70%)** | 49/54 (91%) | 54/54 (100%) |
| `a_new_Not` (sorts first) | **38/54 (70%)** | 49/54 (91%) | 54/54 (100%) |

Under a mid-list id, id order is **less** stable than barycentre. Any renumbering, any importer that
assigns ids by canonical order, any delete-and-re-add, and the stability argument is gone.

## 4. The other two edit shapes — where id order loses outright

Mux4Way16 → Mux (48 parts, 54 drawn nodes):

| edit | comparator | crossings | stable |
|---|---|---|---|
| delete one mid-list part | id | 3 221 → 3 061 | 38/53 (72%) |
| | barycentre | 1 650 → 1 557 | 43/53 (81%) |
| | incremental | 1 650 → **1 555** | **46/53 (87%)** |
| rewire one connection (no id changes) | id | 3 221 → 3 219 | 54/54 (100%) |
| | barycentre | 1 650 → 1 627 | 30/54 (56%) |
| | incremental | 1 650 → **1 648** | **54/54 (100%)** |

**Delete**: id order is the *worst* of the three on both axes. **Rewire** — the commonest edit, and
the one where no id changes at all — is where the two extremes are each at their worst: id order is
perfectly stable and perfectly blind (it never improves the drawing because it never reads
connectivity), barycentre re-sorts 44% of the drawing over one changed wire, and incremental holds
every node while still picking up the improvement.

## 5. Drift over a session, and determinism

Ten successive one-part additions to Mux4Way16 → Mux:

| comparator | crossings, first → after 10 | total node-moves over the 10 edits |
|---|---|---|
| id | 3 221 → 3 383 | **0** |
| barycentre | 1 650 → **1 213** | 195 |
| incremental | 1 650 → 2 384 | **56** |

Incremental's worst observed drawing after ten edits (2 384) is still **better than id order's best**
(3 221 at the first layout). It moves 3.5× fewer nodes than barycentre.

Determinism: 1 distinct ordering over 20 runs with the same `(graph, previous)`; 1 distinct ordering
over 20 runs with no `previous`; and the first layout is byte-identical to `order: 'barycentre'`.

## 6. Conclusion

`order: 'id'` is dominated. It buys stability that belongs to the append convention rather than to
the ordering, it loses that stability on a delete or a renumber, and it pays 2–3× the crossings on
every real circuit for it. `layout(doc, surface, { previous })` gets barycentre's drawing on the
first layout, ≥ barycentre's stability on every edit shape measured, and needs no user action, no
import moment, and no `tidy`. ADR-0020 §2 is revised to that. `order: 'id'` is kept as an explicit,
`previous`-free option — it is the right thing for a golden that wants one canonical drawing from
one document — but it is not the default.

## Reproducing

The harness is two files, written into S328's throwaway spike tree and run with its
`spike/vitest.spike.config.ts`: `order.ts` (the three comparators over one shared layering) and
`q4.test.ts` (fixtures, edits, reporting). Both spike trees are uncommitted and short-lived by
design — ADR-0013's rule for spikes — so the numbers above are the record, and the harness is
archived with this run's notes rather than in the repo. Re-deriving it is a couple of hours: the
layering and crossing counter are ~120 lines, the fixtures come from `src/core/hdl/parser.ts` and
`src/core/hdl/project1HdlSources.ts`, and the comparator repair pass is ~20 lines.
