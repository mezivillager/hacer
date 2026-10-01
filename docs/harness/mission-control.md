# Mission Control — the snapshot (schema v1) and the site

Mission Control (epic [#458](https://github.com/mezivillager/hacer/issues/458)) shows the platform's state from one
file, the **snapshot**, built by `scripts/mission-control/collect.mjs` from GitHub, git and this repo's files. The
coordinator's orient step is to read the same file (#156), so people and agents see the same numbers. It is a read-only
projection (`docs/research/2026-09-24-mission-control/REPORT.md` §5) and holds no state of its own. Run
`node scripts/mission-control/collect.mjs --json [--previous <snapshot.json>]`:

- `--json` prints the snapshot and one stderr line, `MISSION-CONTROL: VALID schema 1 · ok 13 · partial 0 · error 0`;
  without it, only the line. It exits 1 only when the snapshot fails schema v1, and then prints no snapshot.
- GitHub is read with `gh` (`GH_TOKEN` or `GITHUB_TOKEN` when set, else gh's login): six calls, all GraphQL, seven
  requests while over 100 issues are open, no REST — 7–8 s over three runs on 2026-09-25. The claim history reads one
  more page only while the newer ones leave the cycle's place a guess (`readClaimHistory`, #540). The flow numbers
  read one call more (`flowQuery`, #539), a page per 100 PRs merged in the last 14 days: two for 154 PRs on
  2026-09-27, the first taking 7–10 s. The pages run one after another, so on 2026-09-27 a run took 13–17 s over
  three runs, against 9–10 s without them. Without a token `gh` calls nothing, and the GitHub sections go stale rather than fail the run. The ratchet's history needs a full clone
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
| `partial` | an optional input failed, named in `error` — or, for the pick sections, the claim history leaves the cycle's place a guess (`claimHistory: no claim in the N most recently updated issues fixes …`, #540) | this run's data, without that input's fields |
| `error` | a required input failed, or its JSON changed shape (`could not build: …`) | the `--previous` snapshot's data and its `fetchedAt`; with none, empty data and `fetchedAt: null` |

## Sections

| Section | What it holds | From |
|---|---|---|
| `schemaVersion` · `generatedAt` · `head` | `1`; when the run finished; the commit it ran at (`sha`, `date`, `subject`) | git |
| `portfolio` | `projects[]`, one per `docs/portfolio.md` row: `backlog.mjs projects`' counts, stale claims and next pick, the epic's `title` and `subIssues` (`total`, `completed`, `percentCompleted`) | portfolio + `gh issue list`; the claim refs, `gh api graphql` and `gh pr list --state open` optional, as `ready` reads claims; the claim history (`gh api graphql`, `claimHistoryQuery`) optional, as `ready` resumes the cycle from it (#535) |
| `pickRule` | `rotation`, `auxRotation`, and `next[]` — `backlog.mjs ready`'s picks, in its order, the cycle resumed after the latest claim; `dormant`, as `ready`'s banner reads it | the same |
| `tasks` | `items[]`, each open non-epic issue as `backlog.logic.mjs` triages it (`project`, `pickable`, `reason`); `byProject`, issue numbers per row, `unfiled` for none | the same |
| `prs` | `open[]` and the last 60 `merged[]`, with `closes[]` and `verdicts[]` (`verdict`, `round`, `model`, `at`, `url`); `coverage`: merged, with and without a verdict, latest `PASS` / `BLOCK` | `gh pr list` |
| `claims` | `items[]` per `claim/<n>` ref: the issue's `state` and `labels`, its latest claim comment's fields (`claimedBy`, `intent`, `session`, `branch`, `handoff`); `onClosedIssue` marks a stale ref, `onClosedIssues` counts them | `git ls-remote`; `gh api graphql` optional |
| `cloudLane` | `items[]`, the rows of `docs/harness/sessions/cloud-queue-inbox.md`'s table keyed by its header, plus the issue `number` | the inbox |
| `sessions` | `items[]`, the dated files in `docs/harness/sessions/`: `date`, `kind` (`record` / `handoff`), `title`, `status`, `lines` | the files |
| `ledger` | `items[]`, the rows of `ledger.md`; `byMechanised`: `yes` / `no` / `partly` / `other` | the ledger |
| `adrs` | `items[]`, `docs/decisions/NNNN-*.md`: `number`, `title`, and the `Status` line as written | the files |
| `roadmap` | `lastUpdated` as the README states it; `phases[]` from its tables (`phase`, `status`, `scope`, `group`, `doc`) | `docs/roadmap/README.md` |
| `metrics` | `ratchet`: the baseline's `count` and `byRule`, and `history[]` from `git log` of it (34 → 77 → 72 → 71 on 2026-09-24); `releases[]`; `mergesPerDay[]` over `prs.merged`, in UTC days, a day without merges absent; `flow`, the PRs merged in the 14 days to the run (see *Flow and conformance*); `conformance`, the files under `conformance/vectors/` by project; `openTasks`, each day's `tasks.byProject` from the history archive (see *The history archive*) | baseline, git; releases, PRs, the flow query (`gh api graphql`, `flowQuery`), the vectors listing and the archive (`git show origin/gh-pages:control/history`) optional |
| `checks` | `items[]`, per required check on main's head and on each open PR's: its newest run's `conclusion` and the line it published — `HYGIENE:`, `BROWSER-QA:`, `LAYER-RATCHET:` — with the line's `verdict` and `fields` (see *Checks*) | `gh api graphql`: the check runs' annotations |
| `lineage` | `nodes[]`, `edges[]`, `artefacts[]`: the decision graph as `lineage.mjs graph --json` prints it | `node scripts/lineage.mjs graph --json` |

A verdict is a comment by an allowlisted author (`BACKLOG_ALLOWLIST`, as for `backlog.mjs`) headed as
`verifier-brief.md` prescribes — `## Verifier verdict: PASS | BLOCK`, a `(round N, …)` or `(re-review of …)` qualifier
and a bold word allowed; any other shape counts as none, which is how drift from the brief shows. `round` is the
heading's number, else the verdict's position on the PR; `model` is the `Verified on` field to its first ` · `, ` — `
or full stop. Claim comments are read by their fields, from the same authors.

## Flow and conformance

`metrics.flow` (#539) moves the numbers `docs/harness/reviews/2026-09-26/evidence/brief-measure-flow.mjs` counted by
hand into the snapshot, by that script's definitions. On 2026-09-27 both printed the same numbers for the same window.
The window is the 14 days to the run, to the millisecond (`since` to `generatedAt`), over every PR merged in it,
Dependabot's included:

- **Open to merge** — hours from `createdAt` to `mergedAt`; `median` and `p90` are the sorted value at `floor(n × p)`,
  the script's `pct`, in tenths of an hour, and `null` with nothing merged.
- **Blocked at least once** — a PR with a `BLOCK` among its verdicts, counted once however many it had, out of the PRs
  with any verdict. A verdict is the one `prs` reads (above), so a `(round N, …)` heading counts and an author off the
  allowlist does not.
- **Coverage** — `code` is a PR touching `src/`, `mission-control/`, `scripts/` or `.github/` (the script's engine,
  other `src/`, app and process-tooling kinds) that is not Dependabot's; `nonCode` is the rest: docs only, config,
  `.claude/`, root docs, the vendored vectors, and Dependabot. The verifier skips docs and Dependabot by design;
  `code.without` lists the PRs to look at.

`metrics.conformance` is the product's own measure beside those process counts: each directory under
`conformance/vectors/` (projects `01`–`05` on 2026-09-27) with its files counted by extension. `.tst` is the test
scripts. No runner reads these files yet (#194 is the file-based suite), so `runner` is `null` and there is no pass
count. It will carry one only once a runner exists; it never guesses one.

## Fields

Every field, by section. `?` marks one that can be `null`; `[]` an array.

- **Top level** — `schemaVersion` (`1`) · `generatedAt` · `head` {`sha`, `date`, `subject`} · `freshness.<section>` {`source`, `fetchedAt`?, `status`, `error` (only when not `ok`)}
- **`portfolio.projects[]`** — `rank` · `lane` · `slug` · `epicNumber` · `open` · `ready` (the row's tasks `ready` picks: none with a reason, #540) · `inProgress` · `needsHuman` · `staleClaims[]` (issue numbers) · `agentReady` (open `agent-ready` issues; `projects` warns past 12) · `next`? {`number`, `title`}, the row's first *pickable* task, which `ready` may not pick (`on-request`, `not-pulled`): the pick itself is in `pickRule.next` · `title`? (the epic's) · `subIssues`? {`total`, `completed`, `percentCompleted`}
- **`pickRule`** — `rotation[]` · `auxRotation[]` · `next[]` {`number`, `title`, `project`?}: `ready`'s picks, in its order · `dormant` {`dormant`, `agentPrs[]`}: dormant mode, `true` at 5 open PRs by the allowlist
- **`tasks`** — `items[]` {`number`, `title`, `labels[]`, `blocking[]`, `project`?, `rank`?, `lane`?, `pickable`, `reason`?} in `ready`'s order: the picks (`reason: null`) first, then the rest by number with the reason `ready` prints (`claimed`, `stale-claim`, `author`, `in-progress`, `needs-human`, `unshaped`, `blocked:#n,…`, `foundation-gate`, `on-request`, `not-pulled`) · `byProject` {slug: issue numbers}
- **`prs`** — `open[]` and `merged[]` {`number`, `title`, `url`, `author`?, `labels[]`, `headRefName`, `isDraft`, `createdAt`, `mergedAt`?, `closes[]`, `verdicts[]` {`verdict`, `round`, `model`?, `at`, `url`}} · `coverage` {`merged`, `withVerdict`, `withoutVerdict`, `pass`, `block`}
- **`claims`** — `items[]` {`number`, `ref`, `sha`, `state`?, `title`?, `url`?, `labels[]`?, `onClosedIssue`?, `claim`? {`claimedBy`?, `intent`?, `session`?, `branch`?, `handoff`?, `author`, `at`, `url`}}, where every `?` above is `null` without GraphQL · `onClosedIssues`
- **`cloudLane.items[]`** — `number`? and one field per column of the inbox table, its header camelCased (today `issue`, `whyCloud`, `successCriteria`, `claimStatus`, `queuedBy`, `status`, `cloudAgentId`, `notes`)
- **`sessions.items[]`** — `file` · `date` · `kind` (`record` | `handoff`) · `title`? · `status`? · `lines`
- **`ledger`** — `items[]`, one field per column of the ledger's table (today `date`, `whatWentWrong`, `shouldHaveBeenCaughtBy`, `mechanised`) · `byMechanised` {`yes`, `no`, `partly`, `other`}
- **`adrs.items[]`** — `number` · `file` · `title`? · `status`? (as written)
- **`roadmap`** — `lastUpdated`? · `phases[]` {`phase`, `doc`?, `group` (the table's heading), and the table's other columns (today `status`, `scope`)}
- **`metrics`** — `ratchet` {`count`, `byRule` {rule: count}, `history[]` {`sha`, `date`, `subject`, `count`}, oldest first} · `releases[]` {`tag`, `publishedAt`, `isLatest`}, newest first · `mergesPerDay[]` {`date`, `merges`} · `flow`? {`days` (14), `since`, `merged`, `openToMergeHours` {`median`?, `p90`?}, `blockedOnce` {`count`, `of` (the PRs with a verdict), `prs[]`}, `coverage` {`code`, `nonCode`}, each {`merged`, `withVerdict`, `without[]` (PR numbers)}} · `conformance`? {`projects[]` {`project` (its directory: `01`…), `files`, `byExtension` {ext: count}}, `files`, `runner`? (`null`: no runner yet, #194)} · `openTasks`? [{`date` (UTC day), `at` (that snapshot's `generatedAt`), `byProject` {slug: issue numbers}}], oldest first. `flow`, `conformance` and `openTasks` are `null` when their input failed, never zeros
- **`checks.items[]`** — `pr`? (`null` for main's head) · `sha` · `check` (`pr-hygiene` · `browser-qa` · `ci`) · `conclusion`? (`null` while it runs) · `completedAt`? · `url`? (the job) · `line`? (as published; `null` when that run published none: still running, run before MC-6, or stopped before printing it) · `verdict`? (the conclusion wins: `FAIL` for a failure or time-out, the conclusion itself for any other that is not `SUCCESS` — `CANCELLED`, `SKIPPED`, … — and `null` while it runs; on a success, the line's: `PASS` · `WARN` · `SKIPPED`, the ratchet's `FAIL` on a new violation) · `fields` (the line's `key=value` pairs, numbers as numbers; the ratchet's `known` and `new`) · `disagrees` (the line's own verdict says otherwise than the conclusion; its `fields` are kept)
- **`lineage`** — `nodes[]` {`id`, `kind` (`adr` | `ruling` | `premise`), `title`, `source` (`file:line`), `status`?, and the fields `lineage.mjs` gives each kind} · `edges[]` {`from`, `to`, `kind` (`supersedes` | `amends` | `builds-on` | `assumes` | `introduced-by`), `anchor`?} · `artefacts[]` {`id` (`#n` or a ledger row), `kind` (`github` | `ledger-row`), `citedBy[]`?}. A premise's `status` begins `expired` once its condition has lapsed

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
2. **Build** — a section in `SECTIONS` (`collect.logic.mjs`): `{ needs, optional, build }`. `build(values, { allowlist, now })` is pure and must also run on `{}`: that is the empty section a failed required input leaves when there is no `--previous`.
3. **Contract** — its shape in `SCHEMA_V1`; `freshness` gains its entry by itself. A new section or field keeps v1.
4. **Test** — a recording of the source in `scripts/fixtures/mission-control/` and a test in `collect.logic.test.mjs`, shown red first; the section counts in the existing tests (`ok 13`) move by one.
5. **Document** — a row in *Sections* and a line in *Fields*.
6. **Show** — for a view: the fields it reads in `mission-control/src/snapshot.ts`, the view, and a recaptured site fixture (below).

## The site: `/control/`

[`/control/`](https://mezivillager.github.io/hacer/control/) renders the snapshot (#473). **Overview**: nine tiles, each from one section and dated by its `fetchedAt`. The last two, from `metrics`, are
**Flow** (merged, open → merge median and p90, blocked at least once out of those with a verdict, verdict coverage on
code and on docs, Dependabot and config) and **Conformance vectors** (files and test scripts per project, and the pass
count as "no runner yet"). **Projects**: the portfolio with each epic's progress and "next" from `pickRule.next` (what `ready` picks, not `portfolio.projects[].next`); a row drills into its tasks, in `ready`'s order, at `#/projects/<slug>`. **Process** (`#/process`, #474): the loop `ready → claimed → building → PR → verifying → merged` as an inline SVG diagram (no diagram library), live counts defined straight from the snapshot — `ready` is `tasks.items` where `reason` is `null` (the set `pickRule.next` draws from, so an `on-request` or `not-pulled` task is not ready); `claimed` is `claims.items.length` (every open `claim/*` ref, whatever the issue's state); `building` is `tasks.items` where `reason` is `'in-progress'` or `'claimed'` (a `stale-claim` is not building); `PR` is `prs.open.length`; `verifying` splits those same open PRs by whether `verdicts` is empty (no verdict yet) or not (with a verdict), and its drill-down lists the two groups apart; the diagram keeps its natural width on a narrow screen and scrolls sideways so the labels stay readable; `merged` is `prs.merged` whose `mergedAt` falls in the 7 days before `generatedAt`. Each stage drills into its items, linked to GitHub. The claims table renders `claims.items` — already joined to issue state by the collector — with a ref `onClosedIssue` flagged; the cloud lane renders `cloudLane.items` (status, claim status, agent id), each linked to its issue. **Timeline** (`#/timeline`, #475): `sessions.items`, `prs.merged` and `metrics.releases` merged onto one day-by-day axis (`timeline.ts`), newest first, over the 14 days ending `generatedAt`'s own day — fixed so the page stays a bounded size as sessions and releases keep accumulating, rather than one row per release back to the project's first tag; a day outside that window's data still renders, saying "No activity." A session's title links to its record on GitHub, a merge to its PR, a release to its tag. **Charts** (`#/charts`, #478): four column charts over time, inline SVG drawn to the `dataviz` skill (its categorical slots in fixed order, light and dark each validated, a legend past one series, a table view under each chart): the layer ratchet, a point per commit in `metrics.ratchet.history`; merges per day and verdict coverage (with / without a verdict), per UTC merge day over `prs.merged` — the last 60, so the first day may be cut short; open tasks by project, `metrics.openTasks` plus the snapshot's own reading for its day, the first five portfolio rows as series and the rest as other, a day with no reading a gap. Hover or focus shows a point's values; a click, Enter or Space lists what is behind it: the commit and its PR, the day's PRs, or the day's tasks. A section `partial` or `error` keeps its data under a stale banner; one never fetched says so rather than show zeros it did not count. **Roadmap, Ledger, ADRs** (`#/roadmap`, `#/ledger`, `#/adrs`, #479): three read-only views of the process records, each opening the document behind it on GitHub. The roadmap renders `roadmap.phases` as one table per `group` (the README's "Active Phase Sequence" and "Future Platform Phases"), each phase linking its `docs/roadmap/phases/` file, under the README's own `lastUpdated` and how many days that is before `generatedAt` — the roadmap is hand-edited, so its staleness is shown, not fixed (#160). The ledger renders `ledger.items` with a Mechanised filter (all, yes, no, partly, other): a row counts by the first word of its `mechanised` cell, the rule `byMechanised` counts by, so each filter shows that many rows. The ADR list renders `adrs.items` in number order with the verdict of each Status bullet (its text before the first ` — ` or ` (`, the full line on hover). The collector parses all three already; `collect.logic.test.mjs` pins the parsing on trimmed copies (`fixtures/mission-control/roadmap.md`, `ledger.md`, `decisions/`) and the views render `snapshot-2026-09-29.json`, which carries the ledger's Id and Decision columns. **Queue an improvement, Needs human** (`#/needs-human`, #480): a link only — the site writes nothing and calls no API. Each ledger row, stale claim (`onClosedIssue`), red check (`checks.items` that failed or read BLOCK) and the Process view itself carry a "Queue an improvement" link that opens a prefilled `process-improvement.yml` issue form (`buildIssueUrl`: `template`, `title` and the form's `context` field, holding the ids and links), so the issue stays the queue (ADR-0013) and the owner submits it on GitHub. The Needs human list shows every `tasks.items` entry labelled `needs-human`, linked to its issue. **Lineage** (`#/lineage`, #481): `lineage` drawn as one inline SVG, no layout library: a band per kind (ADRs, rulings, premises), each ordered by id along the x axis, an edge a curve between two decisions. A click, Enter or Space on a decision shows what it rests on (`trace`: its `builds-on`, `assumes`, `amends`, `implements` and `introduced-by` edges followed upward, the walk `lineage.mjs trace` makes) and what rests on it (`radius`), highlights both in the graph, and lists the artefacts citing it, each linked to its issue or ledger row on GitHub. A premise whose `status` begins `expired` is marked `✕` in the graph and in every tree it appears in.

- **Build** — `pnpm run build:control`: `collect.mjs --json` into `mission-control/public/data/snapshot.json` (git-ignored), then `vite build` of the second root `mission-control/` (`base`: `BASE_PATH` + `control/`). The page fetches `data/snapshot.json` from beside itself, so `/control/data/snapshot.json` is the one file people and agents read.
- **Deploy** — `mission-control.yml` (#476) refreshes `control/` hourly, on `workflow_dispatch`, and on a push to `docs/**`, `scripts/**` or `mission-control/**`: collect (with `--previous` the newest archived snapshot) → build → archive → deploy, sharing the `gh-pages` concurrency group with `deploy.yml` and `pr-preview.yml` so pushes never race. `deploy.yml` also builds and deploys it, after the app, on every push to `main`; both leave the app's own files alone (`clean-exclude`) and, since #476, leave `control/history/` alone too (below). `pr-preview.yml` builds it into `pr-preview/pr-<n>/control/` when a PR touches `mission-control/**` or `scripts/mission-control/**`, and links it from the preview comment.
- **Boundary** — it imports nothing from `src/`: `mission-control/imports.test.mjs` runs a dependency-cruiser rule over it, resolving as the app does. Plain CSS, plain React state, hand-rolled hash routes; no router or chart library (MC-7's charts are inline SVG).
- **Tests** — `pnpm exec vitest run mission-control`, in the `jsdom` project, over `scripts/fixtures/mission-control/snapshot.json`: the real collector's output, kept valid v1 by `collect.logic.test.mjs`. The Overview's and Process's numbers are pinned against it, so a recaptured fixture means re-pinning them. The
fields v1 declared after its capture are spliced in from its own data at its own time instead (the list is in
`collect.logic.test.mjs`); the fixture's claims are all on open issues, so the flagged-claim case is shown on a copy of the fixture with one claim's issue state overridden closed. The fixture's own `2026-09-20` — between two active days, with no session, merge or release — is the Timeline's empty-day case; no synthetic fixture needed. The charts render `snapshot-2026-09-29.json` instead, the newest archived snapshot that day, whole: `snapshot.json` predates the archive, so it holds no series. The Lineage view renders `lineage-graph.json`, 15 of the 430 decisions cut around ADR-0020 and the expired premise P-001, as `snapshot.json`'s `lineage`.

**The contract.** `SCHEMA_V1` in `collect.logic.mjs` is the checked shape, and this page its meaning. Adding a field
keeps v1; renaming, removing or retyping one bumps `schemaVersion`, and a `--previous` of another version is not kept.
Nor is one of its sections that no longer conforms, such as one written before a field was declared. That section
reads as having no previous: empty, `fetchedAt: null` (#539).

**Privacy.** Public data only, and no issue, PR or comment body is copied — only verdict and claim fields; the cloud
inbox gives its table, never the meter readings under it. Usage meters, org ids and lane files are never read.

## The history archive: `control/history/`

Every `mission-control.yml` run appends the snapshot it just built to `control/history/<generatedAt>.json` on
`gh-pages` — one file per run, named for the snapshot's own `generatedAt` (`Date#toISOString()`, so the names sort
chronologically) — so past snapshots accumulate into a series later work (charts, trend lines; MC-7) can read
directly, rather than reconstructing one from `gh-pages`'s own commit history the way `metrics.ratchet.history`
reconstructs the layer ratchet's from `git log` (a single, simple counter — not what a whole snapshot needs). The
next run reads the newest of these as `--previous`, so a GitHub call that fails for one hour still shows that
section's last-known data rather than going empty.

The collector reads the archive back for `metrics.openTasks` (#478): `git ls-tree` of `origin/gh-pages`'s
`control/history/`, then `git show` of each UTC day's last snapshot from before the run (`archiveDays`,
`collect.logic.mjs`) — one file a day, not one an hour, about 0.1 s for five days on 2026-09-29. It reads the clone's
own `origin/gh-pages`, which `fetch-depth: 0` fetches in `mission-control.yml`; a clone without that ref leaves
`openTasks` null and `metrics` `partial`, and a day whose `tasks` was in `error` gives no reading. The site cannot list
the folder itself, so the snapshot carries the series: people and agents read the same numbers.

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
