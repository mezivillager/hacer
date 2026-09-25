# Mission Control — the snapshot (schema v1) and the site

Mission Control (epic [#458](https://github.com/mezivillager/hacer/issues/458)) shows the platform's state from one
file, the **snapshot**, built by `scripts/mission-control/collect.mjs` from GitHub, git and this repo's files. The
coordinator's orient step is to read the same file (#156), so people and agents see the same numbers. It is a read-only
projection (`docs/research/2026-09-24-mission-control/REPORT.md` §5) and holds no state of its own. Run
`node scripts/mission-control/collect.mjs --json [--previous <snapshot.json>]`:

- `--json` prints the snapshot and one stderr line, `MISSION-CONTROL: VALID schema 1 · ok 13 · partial 0 · error 0`;
  without it, only the line. It exits 1 only when the snapshot fails schema v1, and then prints no snapshot.
- GitHub is read with `gh` (`GH_TOKEN` or `GITHUB_TOKEN` when set, else gh's login): six calls, all GraphQL, seven
  requests while over 100 issues are open, no REST — 7–8 s over three runs on 2026-09-25. Without a token `gh` calls
  nothing, and the GitHub sections go stale rather than fail the run. The ratchet's history needs a full clone
  (`fetch-depth: 0`). `checks` needs no `checks` permission while the repo is public: #507's preview build collected
  it `ok`, annotations included, with a token that has none (`pr-preview.yml`, 2026-09-25).
- The transforms are pure, in `collect.logic.mjs`, tested over recorded `gh` JSON in `scripts/fixtures/mission-control/`.
- `--previous` is best-effort: a missing, empty or unparseable file (`parsePrevious`, `collect.logic.mjs`) reads as
  "no previous" — every section fresh, nothing to fall back on — never a crash (#476; was an uncaught `SyntaxError`
  on an empty or truncated file, latent until the hourly workflow started passing one every run).

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
| `checks` | `items[]`, per required check on main's head and on each open PR's: its newest run's `conclusion` and the line it published — `HYGIENE:`, `BROWSER-QA:`, `LAYER-RATCHET:` — with the line's `verdict` and `fields` (see *Checks*) | `gh api graphql`: the check runs' annotations |
| `lineage` | `{ until, items: [] }` — **empty until DL-7** (the decision graph) | — |

A verdict is a comment by an allowlisted author (`BACKLOG_ALLOWLIST`, as for `backlog.mjs`) headed as
`verifier-brief.md` prescribes — `## Verifier verdict: PASS | BLOCK`, a `(round N, …)` or `(re-review of …)` qualifier
and a bold word allowed; any other shape counts as none, which is how drift from the brief shows. `round` is the
heading's number, else the verdict's position on the PR; `model` is the `Verified on` field to its first ` · `, ` — `
or full stop. Claim comments are read by their fields, from the same authors.

## Fields

Every field, by section. `?` marks one that can be `null`; `[]` an array.

- **Top level** — `schemaVersion` (`1`) · `generatedAt` · `head` {`sha`, `date`, `subject`} · `freshness.<section>` {`source`, `fetchedAt`?, `status`, `error` (only when not `ok`)}
- **`portfolio.projects[]`** — `rank` · `lane` · `slug` · `epicNumber` · `open` · `ready` · `inProgress` · `needsHuman` · `next`? {`number`, `title`}, the row's first *pickable* task, which `ready` may not pick (`on-request`, `not-pulled`): the pick itself is in `pickRule.next` · `title`? (the epic's) · `subIssues`? {`total`, `completed`, `percentCompleted`}
- **`pickRule`** — `rotation[]` · `auxRotation[]` · `next[]` {`number`, `title`, `project`?}: `ready`'s picks, in its order
- **`tasks`** — `items[]` {`number`, `title`, `labels[]`, `blocking[]`, `project`?, `rank`?, `lane`?, `pickable`, `reason`?} in `ready`'s order: the picks (`reason: null`) first, then the rest by number with the reason `ready` prints (`author`, `in-progress`, `needs-human`, `unshaped`, `blocked:#n,…`, `foundation-gate`, `on-request`, `not-pulled`) · `byProject` {slug: issue numbers}
- **`prs`** — `open[]` and `merged[]` {`number`, `title`, `url`, `author`?, `labels[]`, `headRefName`, `isDraft`, `createdAt`, `mergedAt`?, `closes[]`, `verdicts[]` {`verdict`, `round`, `model`?, `at`, `url`}} · `coverage` {`merged`, `withVerdict`, `withoutVerdict`, `pass`, `block`}
- **`claims`** — `items[]` {`number`, `ref`, `sha`, `state`?, `title`?, `url`?, `labels[]`?, `onClosedIssue`?, `claim`? {`claimedBy`?, `intent`?, `session`?, `branch`?, `handoff`?, `author`, `at`, `url`}}, where every `?` above is `null` without GraphQL · `onClosedIssues`
- **`cloudLane.items[]`** — `number`? and one field per column of the inbox table, its header camelCased (today `issue`, `whyCloud`, `successCriteria`, `claimStatus`, `queuedBy`, `status`, `cloudAgentId`, `notes`)
- **`sessions.items[]`** — `file` · `date` · `kind` (`record` | `handoff`) · `title`? · `status`? · `lines`
- **`ledger`** — `items[]`, one field per column of the ledger's table (today `date`, `whatWentWrong`, `shouldHaveBeenCaughtBy`, `mechanised`) · `byMechanised` {`yes`, `no`, `partly`, `other`}
- **`adrs.items[]`** — `number` · `file` · `title`? · `status`? (as written)
- **`roadmap`** — `lastUpdated`? · `phases[]` {`phase`, `doc`?, `group` (the table's heading), and the table's other columns (today `status`, `scope`)}
- **`metrics`** — `ratchet` {`count`, `byRule` {rule: count}, `history[]` {`sha`, `date`, `subject`, `count`}, oldest first} · `releases[]` {`tag`, `publishedAt`, `isLatest`}, newest first · `mergesPerDay[]` {`date`, `merges`}
- **`checks.items[]`** — `pr`? (`null` for main's head) · `sha` · `check` (`pr-hygiene` · `browser-qa` · `ci`) · `conclusion`? (`null` while it runs) · `completedAt`? · `url`? (the job) · `line`? (as published; `null` when that run published none: still running, run before MC-6, or stopped before printing it) · `verdict`? (the conclusion wins: `FAIL` for a failure or time-out, the conclusion itself for any other that is not `SUCCESS` — `CANCELLED`, `SKIPPED`, … — and `null` while it runs; on a success, the line's: `PASS` · `WARN` · `SKIPPED`, the ratchet's `FAIL` on a new violation) · `fields` (the line's `key=value` pairs, numbers as numbers; the ratchet's `known` and `new`) · `disagrees` (the line's own verdict says otherwise than the conclusion; its `fields` are kept)
- **`lineage`** — {`until`, `items[]`}

## Checks: where the summary lines are published (MC-6)

The required checks print one line each, and until #477 it lived only in the Actions log, which needs a token to read.
In Actions each check now also prints its line as a workflow command, `::notice title=<PREFIX>::<line>`, and writes it
into the job summary (`publishLine` in `scripts/check-lines.logic.mjs`). The runner stores a notice as an annotation on
the job's own check run, where GraphQL and the Checks API serve it; the REST endpoint answers even unauthenticated.
`pr-hygiene` publishes `HYGIENE:`; `browser-qa` its last line, the skip or the verdict; `ci` the ratchet's
`LAYER-RATCHET:` from inside `pnpm run lint`. The collector reads each head's status rollup and takes each check's
newest run — the run `gh pr checks` shows. The rollup leaves out a `workflow_dispatch` re-check: that run publishes
on itself, but it is not the PR's check, so it is not read (measured on #507, dispatch run 36095970389). A run's
conclusion wins over its line: `lint:layers` fails on a rule the config no longer declares (#489) while its line still
ends `0 new`, so a run that did not succeed never reads `PASS`, and `disagrees` marks the line (`readCheckRun`).

Why a notice (measured 2026-09-25 by a throwaway run under pr-hygiene's own permissions, `contents: read` and
`pull-requests: read`: run 36094881378):

| Route | To write | To read |
|---|---|---|
| **Notice → annotation** (chosen) | nothing: it is stdout, so no permission and no step (the probe's notice became an annotation) | GraphQL, or the Checks API; public |
| Check-run output via the Checks API | `checks: write` — the probe's POST answered 403; a fork PR's `pull_request` token is read-only anyway | the same |
| Artifact `<check>.json` | an upload step (the probe's worked) | a token even on a public repo (401 without), a zip, and it expires |
| Job summary alone | already written | no API |

`pr-hygiene` runs main's copy of its script (`pull_request_target`), so a PR's `HYGIENE:` line reads `null` until
MC-6 is on main — #507, which brought it, included. What stays in the log (and the job summary) only: the findings
under `HYGIENE:`, the paths that made a PR critical, and the ratchet's `by rule`, `NEW` and `UNDECLARED` lines.

## Adding a section

1. **Read** — a source in `SOURCES` (`collect.mjs`): `id: [label, () => value]`, I/O only; a failure is caught for you.
2. **Build** — a section in `SECTIONS` (`collect.logic.mjs`): `{ needs, optional, build }`. `build(values, { allowlist })` is pure and must also run on `{}`: that is the empty section a failed required input leaves when there is no `--previous`.
3. **Contract** — its shape in `SCHEMA_V1`; `freshness` gains its entry by itself. A new section or field keeps v1.
4. **Test** — a recording of the source in `scripts/fixtures/mission-control/` and a test in `collect.logic.test.mjs`, shown red first; the section counts in the existing tests (`ok 13`) move by one.
5. **Document** — a row in *Sections* and a line in *Fields*.
6. **Show** — for a view: the fields it reads in `mission-control/src/snapshot.ts`, the view, and a recaptured site fixture (below).

## The site: `/control/`

[`/control/`](https://mezivillager.github.io/hacer/control/) renders the snapshot (#473). **Overview**: seven tiles, each from one section and dated by its `fetchedAt`. **Projects**: the portfolio with each epic's progress and "next" from `pickRule.next` (what `ready` picks, not `portfolio.projects[].next`); a row drills into its tasks, in `ready`'s order, at `#/projects/<slug>`. **Process** (`#/process`, #474): the loop `ready → claimed → building → PR → verifying → merged` as an inline SVG diagram (no diagram library), live counts defined straight from the snapshot — `ready` is `tasks.items` where `pickable`; `claimed` is `claims.items.length` (every open `claim/*` ref, whatever the issue's state); `building` is `tasks.items` where `reason` is `'in-progress'`; `PR` is `prs.open.length`; `verifying` splits those same open PRs by whether `verdicts` is empty (no verdict yet) or not (with a verdict); `merged` is `prs.merged` whose `mergedAt` falls in the 7 days before `generatedAt`. Each stage drills into its items, linked to GitHub. The claims table renders `claims.items` — already joined to issue state by the collector — with a ref `onClosedIssue` flagged; the cloud lane renders `cloudLane.items` (status, claim status, agent id), each linked to its issue. A section `partial` or `error` keeps its data under a stale banner; one never fetched says so rather than show zeros it did not count. A second, page-level banner (`isStale`, `snapshot.ts`) reads the whole snapshot's own age: past `STALE_AFTER_MS` (two hours — the hourly refresh's own slack for a missed run) it shows `Stale: snapshot is over 2 hours old`, independently of any section's freshness.

- **Build** — `pnpm run build:control`: `collect.mjs --json` into `mission-control/public/data/snapshot.json` (git-ignored), then `vite build` of the second root `mission-control/` (`base`: `BASE_PATH` + `control/`). The page fetches `data/snapshot.json` from beside itself, so `/control/data/snapshot.json` is the one file people and agents read.
- **Deploy** — `mission-control.yml` (#476) refreshes `control/` hourly, on `workflow_dispatch`, and on a push to `docs/**`, `scripts/**` or `mission-control/**`: collect (with `--previous` the newest archived snapshot) → build → archive → deploy, sharing the `gh-pages` concurrency group with `deploy.yml` and `pr-preview.yml` so pushes never race. `deploy.yml` also builds and deploys it, after the app, on every push to `main`; both leave the app's own files alone (`clean-exclude`) and, since #476, leave `control/history/` alone too (below). `pr-preview.yml` builds it into `pr-preview/pr-<n>/control/` when a PR touches `mission-control/**` or `scripts/mission-control/**`, and links it from the preview comment.
- **Boundary** — it imports nothing from `src/`: `mission-control/imports.test.mjs` runs a dependency-cruiser rule over it, resolving as the app does. Plain CSS, plain React state, hand-rolled hash routes; no router or chart library (charts are MC-7).
- **Tests** — `pnpm exec vitest run mission-control`, in the `jsdom` project, over `scripts/fixtures/mission-control/snapshot.json`: the real collector's output, kept valid v1 by `collect.logic.test.mjs`. The Overview's and Process's numbers are pinned against it, so a recaptured fixture means re-pinning them; the fixture's claims are all on open issues, so the flagged-claim case is shown on a copy of the fixture with one claim's issue state overridden closed.

**The contract.** `SCHEMA_V1` in `collect.logic.mjs` is the checked shape, and this page its meaning. Adding a field
keeps v1; renaming, removing or retyping one bumps `schemaVersion`, and a `--previous` of another version is not kept.

**Privacy.** Public data only, and no issue, PR or comment body is copied — only verdict and claim fields; the cloud
inbox gives its table, never the meter readings under it. Usage meters, org ids and lane files are never read.

## The history archive: `control/history/`

Every `mission-control.yml` run appends the snapshot it just built to `control/history/<generatedAt>.json` on
`gh-pages` — one file per run, named for the snapshot's own `generatedAt` (`Date#toISOString()`, so the names sort
chronologically) — giving later work (charts, trend lines; MC-7) a series git history alone cannot give, since
`gh-pages` is force-pushed history-free by the site deploys. The next run reads the newest of these as `--previous`,
so a GitHub call that fails for one hour still shows that section's last-known data rather than going empty.

A prune step keeps the last `KEEP_DAYS` (90) days: `planPrune` (`scripts/mission-control/prune.logic.mjs`, pure,
unit-tested) decides, `prune.mjs` lists `control/history/` in the `gh-pages` checkout and removes what it names. Two
invariants hold regardless of input — **the newest archived snapshot is never removed**, even when a long-idle
workflow leaves every file on disk outside the window, so the archive is never emptied outright; and **a name that
is not exactly one snapshot's own `<Date#toISOString()>.json` is never a removal candidate**, only ever kept, so the
step can never reach outside what it recognises as its own.

Both `deploy.yml`'s and `mission-control.yml`'s "Deploy Mission Control" steps carry `clean-exclude: history`: each
deploys `mission-control/dist` to `target-folder: control`, and `github-pages-deploy-action`'s clean (`rsync
--delete`) is scoped to that step's own transfer root — `control/`'s own contents when `target-folder` is set, the
branch root when it is not (why the app's root-level step already protects the whole `control/` tree with its own
`clean-exclude: control`, and why `history`, not `control/history`, is the right value on a `target-folder: control`
step). Without it, the next ordinary push to `main` would delete the archive `mission-control.yml` had built.
