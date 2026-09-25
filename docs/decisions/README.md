# Architecture Decision Records (ADRs)

Durable home for **emergent decisions and direction changes** — the kind that surface mid-session
and would otherwise be lost between Claude/Cursor sessions, silently polluting future context.

## How this differs from neighbouring docs
- **`docs/specs/`** — design for a *specific planned feature* (output of brainstorming).
- **`docs/plans/`** — *execution* steps for a feature.
- **`docs/roadmap/`** — *what* we will build and *when* (phases).
- **`docs/decisions/` (here)** — *cross-cutting decisions, new directions, and rejected approaches*,
  often discovered while doing something else. An ADR records the "why we changed course."

## Conventions
- Filename: `NNNN-kebab-title.md`, zero-padded sequential (`0001`, `0002`, …). **Never renumber.**
- Never delete an ADR — supersede it (set Status, link the replacement).
- One decision per file. Use [`0000-template.md`](0000-template.md).
- Each ADR lists the living docs it affects and whether they were reconciled.

## When to add one
At the end of a session (or when the docs-sync Stop hook prompts), run the **`docs-sync`** skill.
It captures decisions here and then runs the author pass in [`../llm-docs-sync.md`](../llm-docs-sync.md).

## Lineage
Every decision is a node with a stable id, and the relations between decisions are fixed field
lines in the markdown where each decision is written. `node scripts/lineage.mjs parse --json` reads
them into one graph — nodes, edges, artefacts, errors (epic #457; design:
`docs/research/2026-09-24-decision-lineage/REPORT.md` §6).

| Node | What | Written in |
|---|---|---|
| `ADR-NNNN` | an architecture decision | `NNNN-*.md` here — the file number is the id |
| `R<n>` | a coordinator ruling | a `## R<n> — <title>` block in [`rulings/`](rulings/README.md), one file per run |
| `P-<n>` | a premise: a fact a decision rests on, with a command that checks it | a row of [`premises.md`](premises.md) |

Issues, PRs, paths and ledger rows are **artefacts** — referenced, never nodes. `parse` lists every
`#n` a decision's record cites, every ledger row that carries an `Id` (`L001`) and, with `--github`, every PR and issue.

| Edge | Written as | Means |
|---|---|---|
| `builds-on` | `Builds on:` | rests on that decision — the default dependency |
| `amends` | `Amends:`; the amended ADR says `Amended by:` | changes that decision |
| `supersedes` | `Supersedes:`; the replaced ADR's Status **opens** with `Superseded by [ADR-NNNN](…)` | replaces that ADR |
| `assumes` | `Assumes:` | rests on that premise (`P-<n>` only) |
| `introduced-by` | on the defect's side: the ledger's `Decision` column, an issue's `Introduced by:` (#469) | the defect traces to that decision |
| `implements` | a PR's or issue's `Decisions:` line (#469) | carries that decision out |

A ruling's field block sits under its heading:

```
## R612 — <title>
Builds on: R606, ADR-0020 §1.5
Assumes: P-004, P-006
Amends: R516
Cost if wrong: …
```

An ADR carries the same three relations, and `Supersedes:`, as bullets under `Date` (see the [template](0000-template.md)),
and its Status carries no relation in prose — the one relation a Status still holds is the
template's own `Superseded by` value. A value is a comma-separated list of ids, each optionally
followed by a section (`ADR-0020 §1.5`), or one word:
- `none` — an explicit claim that the decision rests on no recorded decision or premise;
- `unknown` — an imported decision nobody has annotated. Both parse; only `unknown` counts as unlinked.

A field may continue on indented lines. A duplicate id, a relation naming an id that does not exist,
a value that is not an id, and a relation field spelt any other way (an ADR's `- **…:**` bullet in a
ruling) are **errors**: `parse` lists each with its `file:line` and exits 1.

**Both ends agree:** an ADR that another decision amends or supersedes says so too — `Amended by:`, or
its Status. `check --fix` writes a missing end into the ADR; never into a ruling, which is append-only.

- **Cut-over:** 2026-09-25 — #469's open date, recorded here as a stand-in for its merge date (this
  builder does not watch CI or merge); if the PR merges on a later date, correct this line to match.
  From this date, every ruling carries `Builds on:`

`node scripts/lineage.mjs <command>` — each takes `--root <dir>`, and `--github` to read PR and issue bodies through `gh`:

| Command | Answers |
|---|---|
| `parse --json` · `next-id` | the graph · the id a new ruling takes |
| `trace <id>` | what it rests on — its upstream closure, each premise with its status |
| `radius <id>` | what rests on it — its downstream closure as a tree, each decision with the `#n` it cites and the PRs and issues naming it |
| `check [--fix]` | is it sound: every id resolves; both ends agree; no superseded ADR is cited from `src/`; rulings since the cut-over without `Builds on:`, counted |
| `verify [--strict] [--for #<issue>] [--file]` | do the premises in [`premises.md`](premises.md) still hold? An expired one lists what rests on it through `builds-on` and `assumes`. `--strict` exits 1 only then. `--file` upserts one `project:lineage` issue per expired premise |
| `graph [<id>] --mermaid` · `--json` | all of it or one decision's lineage, for GitHub · for Mission Control |

`pnpm run lint:lineage` (in `pnpm run lint`) is `check --summary`: `LINEAGE: N decisions · M unlinked · K unresolved ·
J superseded-cited`, `unresolved` being every `parse` error — and exit 0, warn mode, until #471 makes it fail.

## Index
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-adopt-adr-log-and-docs-sync-enforcement.md) | Adopt ADR log + enforced docs-sync | Accepted | 2026-06-19 |
| [0002](0002-commit-and-worktree-conventions.md) | Commit attribution & worktree location conventions | Accepted | 2026-06-19 |
| [0003](0003-design-for-longevity.md) | Design for long-term extensibility over near-term expedience | Accepted | 2026-06-19 |
| [0004](0004-p05-18-boundary-evaluatechip-seam-landed-in-p05-16.md) | P05-18 re-scope: evaluateChip dispatch seam landed in P05-16 | Accepted | 2026-06-19 |
| [0005](0005-p05-17-test-execution-engine-design-and-verification-contract.md) | P05-17 test execution engine: functional design + never-vacuous verification contract | Accepted | 2026-06-20 |
| [0006](0006-p05-22-test-lab-implementation-source-seam-and-store-action.md) | P05-22 Test Lab: pluggable implementation-source seam + test execution as a store action | Accepted | 2026-06-20 |
| [0007](0007-wire-routing-engine-direction.md) | Wire routing engine direction: gridless orthogonal-visibility-graph (staged) | Accepted — superseded by [0020](0020-spec-only-writes-read-only-projections.md) | 2026-06-21 |
| [0008](0008-scene-graph-routing-testing-layer.md) | Scene-graph routing testing layer as DoD enforcer | Accepted — amended by [0020](0020-spec-only-writes-read-only-projections.md) (assertion 6) | 2026-06-26 |
| [0009](0009-bus-components-entity-and-wireendpoint-bus.md) | Bus components as a separate entity; `'bus'` WireEndpoint | Accepted — superseded in the document by [0020](0020-spec-only-writes-read-only-projections.md) | 2026-06-27 |
| [0010](0010-no-absolute-paths-in-docs.md) | No machine-specific absolute paths in documentation | Accepted | 2026-09-17 |
| [0011](0011-remove-stryker-mutation-testing.md) | Remove Stryker mutation testing | Accepted | 2026-09-17 |
| [0012](0012-e2e-tests-manual-only.md) | E2E tests run on manual invocation only | Accepted — superseded in part by [0016](0016-browser-qa-in-the-cloud.md) | 2026-09-17 |
| [0013](0013-backlog-in-github-issues-and-portfolio.md) | Backlog in GitHub Issues, project order in `docs/portfolio.md`, one sub-issue per PR | Accepted | 2026-09-18 |
| [0014](0014-cited-doc-paths-must-exist.md) | Paths cited in agent entry docs must exist (`lint:docs`) | Accepted | 2026-09-18 |
| [0015](0015-releases-do-not-commit-to-main.md) | Releases tag and publish; they no longer commit to `main` | Accepted | 2026-09-18 |
| [0016](0016-browser-qa-in-the-cloud.md) | Browser QA in the cloud is required for critical changes (amends 0012) | Accepted | 2026-09-18 |
| [0017](0017-documentation-platform.md) | Documentation platform: Astro Starlight at `/docs/` on the existing Pages deploy | Accepted | 2026-09-18 |
| [0018](0018-fidelity-gate.md) | Fidelity gate: engineering-truth review of epics, ADRs and core semantics | Accepted | 2026-09-18 |
| [0019](0019-canvas-less-shell-mode.md) | Canvas-less shell mode selected by `?renderer=none` | Accepted | 2026-09-21 |
| [0020](0020-spec-only-writes-read-only-projections.md) | Spec-only writes, read-only projections (supersedes [0007](0007-wire-routing-engine-direction.md), amends [0008](0008-scene-graph-routing-testing-layer.md), supersedes [0009](0009-bus-components-entity-and-wireendpoint-bus.md) in the document) | Accepted — mechanism amended 2026-09-24 by its scheduled spike [#372](https://github.com/mezivillager/hacer/issues/372) | 2026-09-23 |
| [0021](0021-vendored-nand2tetris-vectors-are-cc-by-nc-sa.md) | Vendored nand2tetris vectors stay CC BY-NC-SA 3.0 | Accepted | 2026-09-24 |
