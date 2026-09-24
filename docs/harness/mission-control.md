# Mission Control — the snapshot, schema v1

Mission Control (epic [#458](https://github.com/mezivillager/hacer/issues/458)) shows the platform's state from one
file, the **snapshot**, built by `scripts/mission-control/collect.mjs` from GitHub, git and this repo's files. The
coordinator's orient step is to read the same file (#156), so people and agents see the same numbers. It is a read-only
projection (`docs/research/2026-09-24-mission-control/REPORT.md` §5) and holds no state of its own. Run
`node scripts/mission-control/collect.mjs --json [--previous <snapshot.json>]`:

- `--json` prints the snapshot and one stderr line, `MISSION-CONTROL: VALID schema 1 · ok 13 · partial 0 · error 0`;
  without it, only the line. It exits 1 only when the snapshot fails schema v1, and then prints no snapshot.
- GitHub is read with `gh` (`GH_TOKEN` or `GITHUB_TOKEN` when set, else gh's login): five calls, all GraphQL, six
  requests while over 100 issues are open, no REST — 6–7 s on 2026-09-25. Without a token `gh` calls nothing, and the
  GitHub sections go stale rather than fail the run. The ratchet's history needs a full clone (`fetch-depth: 0`).
- The transforms are pure, in `collect.logic.mjs`, tested over recorded `gh` JSON in `scripts/fixtures/mission-control/`.

## Freshness, not failure

Each section has `freshness.<section>` = `{ source, fetchedAt, status, error? }`:

| `status` | Means | The section holds |
|---|---|---|
| `ok` | every input was read | this run's data; `fetchedAt` is `generatedAt` |
| `partial` | an optional input failed, named in `error` | this run's data, without that input's fields |
| `error` | a required input failed, or its JSON changed shape (`could not build: …`) | the `--previous` snapshot's data and its `fetchedAt`; with none, empty data and `fetchedAt: null` |

## Sections

| Section | What it holds | From |
|---|---|---|
| `schemaVersion` · `generatedAt` · `head` | `1`; when the run finished; the commit it ran at (`sha`, `date`, `subject`) | git |
| `portfolio` | `projects[]`, one per `docs/portfolio.md` row: `backlog.mjs projects`' counts and next pick, the epic's `title` and `subIssues` (`total`, `completed`, `percentCompleted`) | portfolio + `gh issue list` |
| `pickRule` | `rotation`, `auxRotation`, and `next[]` — `backlog.mjs ready`'s picks, in its order | the same |
| `tasks` | `items[]`, each open non-epic issue as `backlog.logic.mjs` triages it (`project`, `pickable`, `reason`); `byProject`, issue numbers per row, `unfiled` for none | the same |
| `prs` | `open[]` and the last 60 `merged[]`, with `closes[]` and `verdicts[]` (`verdict`, `round`, `model`, `at`, `url`); `coverage`: merged, with and without a verdict, latest `PASS` / `BLOCK` | `gh pr list` |
| `claims` | `items[]` per `claim/<n>` ref: the issue's `state` and `labels`, its latest claim comment's fields (`claimedBy`, `intent`, `session`, `branch`, `handoff`); `onClosedIssue` marks a stale ref, `onClosedIssues` counts them | `git ls-remote`; `gh api graphql` optional |
| `cloudLane` | `items[]`, the rows of `docs/harness/sessions/cloud-queue-inbox.md`'s table keyed by its header, plus the issue `number` | the inbox |
| `sessions` | `items[]`, the dated files in `docs/harness/sessions/`: `date`, `kind` (`record` / `handoff`), `title`, `status`, `lines` | the files |
| `ledger` | `items[]`, the rows of `ledger.md`; `byMechanised`: `yes` / `no` / `partly` / `other` | the ledger |
| `adrs` | `items[]`, `docs/decisions/NNNN-*.md`: `number`, `title`, and the `Status` line as written | the files |
| `roadmap` | `lastUpdated` as the README states it; `phases[]` from its tables (`phase`, `status`, `scope`, `group`, `doc`) | `docs/roadmap/README.md` |
| `metrics` | `ratchet`: the baseline's `count` and `byRule`, and `history[]` from `git log` of it (34 → 77 → 72 → 71 on 2026-09-24); `releases[]`; `mergesPerDay[]` over `prs.merged`, in UTC days, a day without merges absent | baseline, git; releases and PRs optional |
| `checks` · `lineage` | `{ until, items: [] }` — **empty until MC-6** (the checks' `HYGIENE:` / `BROWSER-QA:` / `LAYER-RATCHET:` lines) and **until DL-7** (the decision graph) | — |

A verdict is a comment by an allowlisted author (`BACKLOG_ALLOWLIST`, as for `backlog.mjs`) headed as
`verifier-brief.md` prescribes — `## Verifier verdict: PASS | BLOCK`, a `(round N, …)` or `(re-review of …)` qualifier
and a bold word allowed; any other shape counts as none, which is how drift from the brief shows. `round` is the
heading's number, else the verdict's position on the PR; `model` is the `Verified on` field to its first ` · `, ` — `
or full stop. Claim comments are read by their fields, from the same authors.

**The contract.** `SCHEMA_V1` in `collect.logic.mjs` is the checked shape, and this page its meaning. Adding a field
keeps v1; renaming, removing or retyping one bumps `schemaVersion`, and a `--previous` of another version is not kept.

**Privacy.** Public data only, and no issue, PR or comment body is copied — only verdict and claim fields; the cloud
inbox gives its table, never the meter readings under it. Usage meters, org ids and lane files are never read.
