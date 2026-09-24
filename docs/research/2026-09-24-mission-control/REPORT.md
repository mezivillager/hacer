# Mission Control — the platform's status, process and roadmap as one interactive site

**Status:** research report for the owner's review. Nothing in this report is built or filed. Parked
idea: [#458](https://github.com/mezivillager/hacer/issues/458). Sibling report:
`../2026-09-24-decision-lineage/REPORT.md`.

Every number below was measured on 2026-09-24 at `origin/main` `97f109b` unless it says otherwise.
Numbers are a snapshot, not maintained.

## 1. What the owner asked

> creating visibility of the entire process … this is mainly for me but can be useful for the
> coordinator agent and even for the process itself, and for anyone joining the platform or looking
> from the outside or learning about it etc … some kind of page/website that I can visit to see the
> status of the platform, how the process is running, where the status of each project is, what the
> timeline and roadmap looks like, etc … but I don't want a docs page, I want more like an interactive
> website … that has graphs and diagrams, and when I click on them can openup to more details … so
> consider this as the control center of the platform … and even in future we might make it editable
> (for admin of course) so process improvements can be made (queued up) through that website (or
> rather a tool) as well.

He also asked for a better name than "process monitor" / "control center".

## 2. The name: Mission Control

**Mission Control** — the room where a mission's telemetry is watched *and* from which it is
steered. That is exactly the two phases the owner described: read-only telemetry first, commands
later. It is understood instantly by a newcomer or an outsider, which is two of the five audiences he
named. Slug `mission-control`; URL `https://mezivillager.github.io/hacer/control/`.

Alternatives considered: *Observatory* (says read-only well, says "editable later" badly),
*Control Tower* (fine, less distinctive), *Atlas* (drill-down maps, but says nothing about status or
control), *Bridge* / *Cockpit* (collide with circuit terms and with an existing Linux admin tool).

## 3. What exists today, measured

Status lives in six kinds of artefact. None of them can be read as one thing, two need a browser, and
the instrument the coordinator uses to orient is a list of shell commands (`ha-next/SKILL.md:27-28`,
because `scripts/agent-orient` — #156 — does not exist).

| Source | Where | Machine-readable? | Needs |
|---|---|---|---|
| Priority projects, pick rule | `docs/portfolio.md` (12 rows) + `scripts/backlog.mjs` — **only `ready` and `projects` exist**, both with `--json` (`backlog.mjs:20-23`); `tasks`/`next`/`claim` are #149, still open | yes | `gh` |
| Tasks, epics, labels | 141 open issues = 12 epics + 129 tasks; 42 labels; 97 of 129 tasks have a sub-issue parent, 32 do not; 19 carry two `project:` labels (#349) | yes | REST 60/h unauthenticated, GraphQL needs a token |
| Claims | `refs/heads/claim/*` — 8 refs, **5 point at closed issues**; the claim comment's fixed fields (`COORDINATOR-HANDOFF.md:23-33`) — two `in-progress` issues have no such comment | half | `gh` |
| Verifier verdicts | one PR comment headed `## Verifier verdict: PASS \| BLOCK` (`verifier-brief.md:34-47`). Over the last 60 PRs: 28 have a verdict (28 PASS / 7 BLOCK across 35 comments), **27 merged PRs have none** | by regex; model name is free text | token for GraphQL |
| The process's own records | `docs/harness/sessions/` (8 files, 1,186 lines); `ledger.md` (53 rows, `Date \| What went wrong \| Should have been caught by \| Mechanised?` — 39 yes / 12 no / 1 partly); `cloud-queue-inbox.md` (8 columns, 6 rows); `observed-bugs.md`; `fidelity-inbox.md` | tables yes, everything else prose | — |
| Roadmap and phase status | `docs/roadmap/README.md:40-75` (9 active + 20 future phases), status written into headings, **"Last Updated: 2026-05-12"** (#160 is open on this) | no | — |
| Decisions | 21 ADRs, each with a `- **Status:**` line; coordinator rulings live outside the repo (see the lineage report) | partly | — |
| CI health | required checks `ci`, `pr-hygiene`, `browser-qa` (ruleset 13907542); the summary lines `HYGIENE: …`, `BROWSER-QA: …`, `LAYER-RATCHET: 71 known violations …` exist **only in Actions logs** (check-run output is null) | no | Actions log access |
| The one tracked metric | `.dependency-cruiser-known-violations.json` — 71 rows; its whole history is **4 commits**: 34 → 77 → 72 → 71 | yes, from git | — |
| Releases | 75 tags, latest v2.29.1 (2026-09-24); `package.json` frozen at 2.11.0 by ADR-0015; `CHANGELOG.md` stopped at 2.11.0 | yes | — |
| Usage meters | Claude: browser-only, never commit the org id (`usage-rationing.md:39-45`); Cursor: hand-copied JSON; Grok Bot: a Spending screenshot | no | a person |

Two things this table shows that nobody had seen: the verdict-coverage gap (27 of the last 60 merges
had no independent reader — a number a status instrument would have surfaced weeks ago), and that the
process's health is invisible outside the coordinator's own context window. Every session's §7
"state at close" exists because there is no other way to hand the state over.

Build and deploy, for the site's design: one SPA, no router (`App.tsx` renders a single `<Shell>`;
the only URL handling is `?notour=1`), no chart or diagram library, Vite 8 + React 19 + Tailwind 4.
Deploy is GitHub Pages from `gh-pages` via `JamesIves/github-pages-deploy-action` with
`BASE_PATH: /hacer/` and `clean-exclude: pr-preview` (`deploy.yml:32,44`); PR previews land at
`/hacer/pr-preview/pr-<n>/` (`pr-preview.yml:35,47`). `/hacer/control/` is unclaimed (404). The app
already calls unauthenticated GitHub REST from the browser with a one-hour cache
(`src/lib/githubRelease.ts`), so a read-only site fetching public data is precedented.

## 4. The problem, precisely

- **Six artefacts, no view.** Answering "what is the state of project X and what happens next" means
  running two scripts, reading three markdown files and opening GitHub. The coordinator does this at
  every session start; a newcomer cannot do it at all.
- **Prose where data is needed.** Phase status, session state, ledger outcomes, verdict fields, meter
  readings — all prose, so nothing can be charted or checked.
- **Numbers that only the logs know.** The three summary lines that describe every PR's health are
  unreadable without Actions log access.
- **Data that already disagrees**, invisibly: 5 claim refs on closed issues; 29 preview folders for 3
  open PRs; `package.json` 2.11.0 vs tag v2.29.1; label counts vs `projects` counts. A status site
  makes drift visible the hour it happens.

## 5. The principle: a read-only projection of the platform's own state

This is ADR-0020's shape applied to the process itself. The **spec** is GitHub (issues, PRs, labels,
refs, check runs, releases) plus the repo's own files (portfolio, sessions, ledger, ADRs, roadmap,
inbox). Mission Control **projects** that spec into views and never holds state of its own. When it
becomes "editable", edits go **to the spec** — an issue is opened, a label changes — and the projection
follows; the site never becomes a second place where truth lives.

Two consequences the owner's vision makes load-bearing:

- **Agent parity** (`docs/roadmap/vision.md:162`). The same snapshot the site renders is what the
  coordinator's orient step reads. `collect --json` *is* #156's `agent-orient`. A human and an agent
  look at the same numbers; neither re-derives them.
- **Outsiders and learners** see how an AI-run project actually runs — which is the research-lab
  purpose in the North Star — from public data only. Nothing private is needed for any view.

## 6. Options

**A. GitHub Projects / Insights, no code.** Free, immediate. Rejected: no roadmap from the docs, no
process diagram, no ledger, no charts over the ratchet, not agent-readable in our shape, and it is a
GitHub page — the owner asked for the platform's own site.

**B. A static site on GitHub Pages fed by a collector — recommended.** A script turns the spec into
one versioned `snapshot.json` at build time (in Actions, with `GITHUB_TOKEN`, so rate limits and log
access are non-issues); a small Vite/React app renders it at `/control/`; a scheduled workflow rebuilds
hourly and on every push to `main`. No server, no secrets, no new hosting, previews for free through
the existing PR-preview workflow. Time series come from git and GitHub history (ratchet, merges,
releases) plus an archive of past snapshots appended to `gh-pages`.

**C. A hosted dashboard stack** (Grafana, Backstage, a Notion/Linear board). Rejected: infrastructure
the project does not have, a login the outsider does not have, and the state would live off-repo —
the session records exist precisely so that the work resumes "from the repo alone".

## 7. Recommended shape

```
GitHub (issues · PRs · refs · checks · releases)      repo files (portfolio · sessions · ledger ·
        │                                              ADRs · roadmap · inbox · baseline history)
        └──────────────┬───────────────────────────────────────┘
                       ▼
        scripts/mission-control/collect.mjs  ──►  snapshot.json (versioned schema)
        (I/O)  +  collect.logic.mjs (pure, unit-tested; reuses backlog.logic.mjs)
                       │                                  │
                       ▼                                  ▼
        mission-control/  (Vite + React, hash routes)   `collect --json` → the coordinator's orient
                       │
                       ▼
        gh-pages: /control/  (hourly + on push)   ·   /pr-preview/pr-N/control/  (PRs)
```

**Collector.** One `gh`/REST pass with the token Actions provides, one git pass, one read of the
docs. It emits `snapshot.json` with a `schemaVersion`, a `generatedAt`, the `head` sha, and — per
section — a `freshness` record (`source`, `fetchedAt`, `ok | partial | error`). A section that fails
keeps its last-known data and is flagged; the collector fails the build only when the snapshot does
not validate. It **reuses `backlog.logic.mjs`** for every pick-rule computation rather than
re-implementing it, so the site can never disagree with `backlog.mjs ready`.

**Snapshot v1 sections.** `portfolio` (rows + `projects` summary + epic sub-issue counts), `pickRule`
(the rotation and the next picks), `tasks`, `prs` (open and the last 60 merged, with verdicts parsed
from the `## Verifier verdict:` heading, model and round), `claims` (refs joined to issue state and the
latest claim-comment fields), `cloudLane`, `sessions`, `ledger`, `adrs`, `roadmap` (with the date it
was last updated, shown as-is), `metrics` (ratchet count + by-rule + history from git; releases;
merges per day), `checks` (once the summary lines are published — §9, MC-6).

**Site.** A second Vite root at `mission-control/` with its own `vite.config.ts`
(`base: BASE_PATH + 'control/'`), plain React state, **hash routing** for drill-down
(`#/projects/foundation`, `#/prs/451`) so a static sub-folder needs no 404 tricks. It imports nothing
from `src/` — the layer ratchet does not cover a new root, and the 3D app's bundle must not grow.
Every list row links to the thing it describes (issue, PR, doc). Every view shows the snapshot's
`generatedAt` and any section's staleness.

**Views, phase 1:** *Overview* (tiles: open tasks by project, PRs open/merging, last session, CI on
`main`, ratchet count, version, verdict coverage), *Projects* (the portfolio with progress, and
"next" exactly as `ready` computes it), *Process* (the loop as a diagram — ready → claimed → building →
PR → verified → merged — with live counts on each stage, claims, the cloud lane), *Timeline*
(sessions, merges, releases on one axis; a session opens its record). **Phase 2:** *Roadmap*,
*Ledger*, *Decisions* (ADRs; the lineage graph once the sibling project has data), and charts over
time. **Phase 3:** the "editable" phase — see §10.

**Refresh.** `mission-control.yml`: `schedule` hourly, `workflow_dispatch`, and `push` to `main` on
`docs/**`, `scripts/**`, `mission-control/**`. It runs collect → build → deploy to `target-folder:
control` in the shared `gh-pages` concurrency group, and appends the snapshot to `control/history/`
so later charts have a series the git history cannot give (open tasks per project over time, verdict
coverage over time).

**Error handling.** Partial data is rendered with its flag, never hidden; an empty section says why
("GraphQL unavailable — showing REST-only fields"); a snapshot older than two hours shows a banner.

**Testing.** `collect.logic.test.mjs` over committed fixtures of real `gh` JSON, including one
fixture built to produce a wrong count so the test is **shown red before it is trusted** (the repo's
rule since the vacuous-generator rows in the ledger). A snapshot-schema test. Site components under
the jsdom project rendering a fixture snapshot, with a golden test for the Overview numbers. The
site build runs in `ci` and deploys a preview on every PR that touches it. No Playwright in the
definition of done (ADR-0012).

**Privacy.** Public. Excluded by construction: the Claude org id and any usage meter, Cursor and
API keys, `.git/hacer-lane-runs/`, billing fields. Cloud-agent ids and the owner's verbatim rulings are
already public in the repo.

## 8. What Mission Control is not

Not Phase 22's marketing website (Next.js, `docs/roadmap/phases/phase-22-public-website.md`) and not
Phase 19's learning analytics for users of the simulator. It is the process's own instrument. If the
public website is ever built, Mission Control is a page it links to, not a thing it replaces.

## 9. Project shape

**Epic:** convert #458 into the epic (keep the owner's words, drop `idea`, add `project:mission-control`
and `epic`). **Lane:** `process`. **Progress is:** `/control/` live and refreshed within the hour; each
view answers its question from the snapshot; the coordinator's orient reads `collect --json`.

**Tasks** (each becomes an issue on approval; risk and model tier per `docs/harness/model-tiering.md`):

| Id | Task | Risk | Tier |
|---|---|---|---|
| MC-1 | **Snapshot v1 + collector.** `scripts/mission-control/collect{,.logic}.mjs`; `--json`; fixtures + tests, one shown red first; reuses `backlog.logic.mjs`; validates its own output; runs under 60 s with a token. Absorbs #156's "orient" list as the `--json` consumer. | 1 | Opus (new subsystem) |
| MC-2 | **Site skeleton at `/control/`: Overview + Projects.** Second Vite root; hash routes; freshness stamp; `deploy.yml` gains the `control` target; `pr-preview.yml` builds it into `pr-preview/pr-N/control/` when its paths change. | 1 | Opus (new app + deploy) |
| MC-3 | **Process view.** The loop diagram with live stage counts; claims joined to issue state (surfacing the 5 stale refs); the cloud lane. | 1 | Sonnet |
| MC-4 | **Timeline view.** Sessions, merges, releases; a session drills into its record. | 1 | Sonnet |
| MC-5 | **Hourly refresh workflow + history archive.** | 1 | Sonnet |
| MC-6 | **Checks publish their summary line** (`HYGIENE:`, `BROWSER-QA:`, `LAYER-RATCHET:`) into check-run output / job summary so the collector reads them without log access. Touches a required check. | 2 | Opus |
| MC-7 | **Charts.** Ratchet history, merges per day, open tasks by project, verdict coverage — built with the `dataviz` skill. | 1 | Sonnet |
| MC-8 | **Roadmap, Ledger, ADR views.** Roadmap shows its own last-updated date; blocked by #160 for a real phase-status source. | 1 | Sonnet |
| MC-9 | **"Queue an improvement" and the needs-human list.** Prefilled `issues/new` links from the site — the zero-backend first step of the editable phase. | 0 | Sonnet |

Related open issues, to re-file rather than duplicate on approval: **#156** (becomes MC-1's `--json`
consumer), **#149** (`tasks`/`next`/`claim` — MC-1 computes per-project task lists from the same
issue call; #149 can reuse them), **#160** (phase-status source of truth — MC-8 depends on it),
**#271** (the harness inbox is what MC-9's links open), **#269**/**#257** (UI-tour captures and QA
verdicts are natural later sections).

## 10. The editable phase, and why it starts with links

"Process improvements can be queued through the site." The cheapest true version needs no login
code at all: a **prefilled GitHub issue form** (`issues/new?template=…&title=…&body=…`) opened from
the view that prompted it — from a ledger row, from a stale claim, from a red check. The issue *is*
the queue (ADR-0013); the site stays a projection. Only if link-outs prove insufficient does an
in-site editor with GitHub OAuth (a GitHub App and a small worker, since Pages is static) become
worth its cost. Decide then, on evidence of use.

## 11. Decisions taken on the owner's behalf

| Id | Decision | Cost if wrong | Revert |
|---|---|---|---|
| D-MC-1 | Name it **Mission Control**, slug `mission-control`, path `/control/`. | A rename of one label, one folder, one path. | trivial |
| D-MC-2 | Public site, same repo, GitHub Pages sub-folder. | If it must be private, it needs hosting with auth — a different project. | before MC-2 |
| D-MC-3 | Build-time snapshot, no server; optional client-side live refresh of a few public numbers using the app's existing cache pattern. | Data is up to an hour old between builds. | MC-5's cadence is one line |
| D-MC-4 | A separate Vite root that imports nothing from `src/`. | Some duplication of ui-kit styling. | none needed |
| D-MC-5 | Phase 1 is four views; charts and the decisions graph are phase 2; editing starts as prefilled-issue links. | A view the owner wanted first arrives one phase later. | reorder the tasks |
| D-MC-6 | Reuse `backlog.logic.mjs` for pick computations; never re-implement the pick rule. | None — this is the safe direction. | — |
| D-MC-7 | The checks are changed to publish their summary lines (MC-6) rather than the collector reading logs. | One `risk:2` change to a required check's output; the collector waits for it. | — |

## 12. Open questions for the owner — each has a default I will proceed on

1. **The name.** Default: Mission Control. Alternatives in §2.
2. **Its slot in the pick rule.** Default: its own slot, equal to `harness` — see the lineage report
   §10 for the proposed eight-slot cycle, which serves both projects.
3. **Public from day one?** Default: yes — nothing in phase 1 is private, and the outsider audience is
   in the ask.

## 13. Risks

- **Scope creep.** A status site can absorb any feature. The phase gates and the "projection only"
  principle are the fence; anything that wants to *store* state is out of scope by definition.
- **Rate limits and API drift.** Mitigated by building in Actions with a token, by per-section
  freshness, and by fixtures pinned to real API shapes.
- **A second app to maintain.** Mitigated by keeping it small, dependency-light, and independent of
  the 3D app; if it rots, nothing else does.
- **The numbers disagree with GitHub.** Mitigated by reusing the pick logic and by a golden test —
  and, honestly, surfacing disagreement is half the point (§4).
