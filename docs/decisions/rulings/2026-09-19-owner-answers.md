# Rulings — 2026-09-19 owner-answers

Imported by #466 on 2026-09-25 from the coordinator's run directory `2026-09-19-hacer-owner-answers`; wording unchanged except machine paths. `Builds on: unknown` marks a ruling nobody has annotated; a restated ruling carries a new id and `Amends:` the original.

## R91 — Publish = on-green
Builds on: unknown
for mezivillager/hacer, relying on the owner's grants ("all necessary permissions are granted, no restriction on github pushing, deploying, releasing", 2026-09-18; "I have given you the permission", 2026-09-19). Recorded as a standing grant in `ha/CLAUDE.md` so future runs stop asking.
Revert: delete that line.


## R92 — Browser QA per the owner (2026-09-19):
Builds on: unknown
browser suites run automatically only in CI, for PRs that change the UI (DOM shell, app flows, store, routing, e2e config) — the `@store` suite as a UI-regression net; the `@ui` canvas suite (3D browser testing) never runs automatically and becomes a far-future, cloud-only research task; local browser tests are allowed only for suites that do not mount the 3D canvas (the future 2D surface, the DOM shell). `src/simulation/**` and `src/core/**` stay out (the conformance oracle covers them).
Cost if wrong: a UI regression in a 3D-only change slips past CI until the research lands.


## R93 — Fidelity proposals FID-001…005 deferred (owner: "they need to wait until other surfaces have caught up first")
Builds on: unknown
Status set to `deferred`; the #190 finding stays posted on #190 as a verdict comment, so the design-first ADR still sees it without any issue being filed.
Cost if wrong: 0.6 clock work is not scheduled — it is not scheduled anyway until the spine reaches 0.6.


## R94 — RELEASE_TOKEN is removed, not moved
Builds on: unknown
Since ADR-0015 the release job only pushes a tag and creates a GitHub Release, which the job's own short-lived `GITHUB_TOKEN` can do; a long-lived personal token readable by any workflow on any branch of the repo is the risk, and deleting it is strictly better than fencing it.
Cost if wrong: a release run fails for lack of permission — caught by the first release run after merge; revert is one workflow line.


## R95 — The product agent files UI-polish issues itself
Builds on: unknown
(≤5 per review, evidence required, `agent-ready` when concrete), while product *strategy* proposals (roadmap/epic changes) still queue for the owner. Owner 2026-09-19: "you are supposed to find that out, not me … for me to not be a blocker"; his earlier approval rule ("when product agents want to create tasks … it should get my approval") is read as covering roadmap-level proposals, not UI defects.
Cost if wrong: up to five polish issues per review the owner would not have picked — cheap to close. *Revert:* route polish through `product-inbox.md` too.


## R96 — The product agent's eyes are a cloud UI tour
Builds on: unknown
(Playwright `@tour` spec + `workflow_dispatch` workflow uploading screenshots and accessibility snapshots), never a local browser: the app mounts the 3D canvas, and the owner's rule is no 3D rendering on his laptop.


## R97 — CodeQL enabled via the API (default setup, default suite), advisory only
Builds on: unknown
First scan: 2 medium alerts (`actions/missing-workflow-permissions` on `ci.yml`, `e2e.yml`) → fixed in the same run (#287). The ruleset's `code_scanning` rule stays off; revisit after a few weeks of alert volume.
Cost if wrong: an extra ~5-min CodeQL check on PRs; free on a public repo.


## R98 — Cloud spike #158 blocked on one owner step:
Builds on: unknown
the owner's Claude account has no GitHub connection, so a cloud routine cannot clone the repo; `/web-setup` (or https://claude.ai/connect-github) is the only fix and only he can run it. The routine prompt is drafted; creating it is one call once connected.


## R99 — `ha/CLAUDE.md` records the standing publish grant and the owner's minimal-involvement preference; memory `owner-minimal-involvement` saved
Builds on: unknown
