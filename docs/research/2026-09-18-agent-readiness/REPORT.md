# Repositioning HACER for autonomous agent development

Research report · 2026-09-18 · revision 3 (after an adversarial review and a fact-check) · for owner review
Companion files: `WORK-SYSTEM.md` (how work is queued, picked up, gated, merged) · the seed backlog (now GitHub issues under the `epic` parents) · `DECISIONS.md` (every decision made on your behalf, with revert cost) · the research tracks (kept outside the repo in the run directory; summarised in §2) (seven raw research reports with sources) · the two reviews (same place) (the two reviews of this draft).

---

## 0. What I understood you to be asking

Not "build these five things", but: **change the shape of the project so an agent can carry it forward and prove its own work, with you steering rather than supervising — including when you are away for weeks.** Your hints (easier surfaces, cloud 3D, AI QA, surfaces in parallel, small PRs, a queue, a reliable workflow) are instances of one idea the research supports strongly:

> **An agent's autonomy is bounded by the quality of the verifier it works against.** Where "is this right?" is answered by a fast, deterministic command, agents run for hours unattended. Where it needs a human looking at a 3D canvas, the human is the bottleneck however good the agent is.

So the report is one move made several ways: **take verification off the 3D canvas and off you, and put it onto oracles.** HACER is unusually lucky: it has a published reference implementation and official test vectors for every chip. Almost no product has that.

Two of your ideas I deliberately did **not** take literally:

- *"Run the 3D part in the cloud."* Don't buy GPU cloud. The repo is public, so GitHub's 4-vCPU/16 GB runners are free; agents can run in Claude cloud sessions with no compute charge; and most 3D correctness can be asserted from the scene graph with no GPU. What should leave your laptop is the *agent's build/test loop*, not the rendering. (§5)
- *"Three surfaces grow in parallel."* Yes — but the cheap mechanism is not three UIs built side by side; it is **one scenario suite with a thin driver per surface**, and a report that shows where a surface has fallen behind. (§4, G5)

And one thing you did not say but the evidence insists on: **the system must degrade gracefully when you disappear.** You were active 10 days of the last 120. A design where every PR waits for you does not give "little oversight"; it gives a queue of stale PRs. That is why "make merge cheap" is goal post G1, not an afterthought.

---

## 1. Where HACER actually stands (verified 2026-09-18)

### Better than the docs say

| Finding | Source |
|---|---|
| **The core already runs headless.** The store loads in plain Node in 539 ms; a NAND built only through `circuitActions` + `simulationTick()` gives 1,1,1,0. | track 1 |
| **The oracle loop already works.** All 16 Project-1 chips pass their real `.tst`/`.cmp` from both sources (builtin, and HDL built from NAND): 32/32 in 65 ms. | track 1 |
| The HDL → chip registry → simulation pipeline **is wired in** (`topologicalEval.ts` evaluates every canvas gate through the chip registry). | verified |
| A GPU-free 3D test layer exists (`src/test/r3f/` on `@react-three/test-renderer`, ADR-0008); a `low-power` render mode exists; a scene test bridge exists. | verified |
| Per-PR preview URLs already deploy to GitHub Pages. CI is ~2.5–3 min and mirrors the local definition of done. The ADR log is current — the healthiest doc set in the repo. | track 2 |
| A scenario/driver split already exists (`e2e/scenarios/*` vs `e2e/fixtures/{store,ui}`), but only inside Playwright. | track 5 |

### Worse than it feels

| Finding | Source |
|---|---|
| **No backlog an agent can pull from.** 0 open GitHub issues. "What's next" is split across five files that contradict each other. No priority, size, readiness or claim field anywhere. | verified |
| **PRs are huge — and mostly documents.** Your 57 PRs: median **850** changed lines, 26 over 1,000, max 36,091. Counted the way the proposed budget counts (no tests, lockfile, snapshots) the median is **604**, 32 of 57 over 400; leave out `docs/` too and it drops to **168**. In the five bulkiest PRs sampled, specs + plans were 30–57% of the diff (AGENTS.md asks plans for a "complete code snippet"). One ticket = one PR. | 850 verified by me; 604/168 and the 30–57% are the fact-checker's recomputation |
| **Review is nominal.** 105 of 108 merged PRs merged without an approval; median time-to-merge under an hour; bot review threads unresolved (0/4, 0/5, 0/7); no finding has ever become a follow-up issue. | track 2, fact-check |
| **The ruleset binds nobody who merges — and only a bypass *can* merge.** `main-rules` requires 1 approval (which a solo owner can never give himself), restricts updates, requires a `github-pages` deployment that no PR branch produces, and requires CodeQL results while CodeQL is not configured — then exempts the admin role from all of it. It has no required status checks (AGENTS.md says CI is required; it is not). Adding checks alone would change nothing, and removing the bypass alone would lock you out. | verified |
| **Every merge to `main` is also a release and a production deploy** (`release.yml`, `deploy.yml` on push). That is what makes merging feel like a Gate-4 act. (semantic-release does skip `docs/test/chore/refactor` commits; the Pages deploy runs regardless.) | verified |
| **Agent docs mislead.** 45 of 118 `REPO_MAP.md` paths don't exist; the "add a gate" recipe is wrong in five places; ~3,000 lines of onboarding; the definition of done restated in 6+ files. | track 2, verified |
| **The process layer is invisible to cloud agents.** `ha/CLAUDE.md` (your North Star) and `ha-prompt-it` live in `ha/`, not a git repo. A cloud session or routine clones only `hacer/` and sees neither; neither is versioned. | verified |
| After ADR-0011/0012 the automated safety net is lint + unit + build (the ADRs say so). Nothing automatic watches the 3D surface. | ADRs |

### The architectural seams that matter

The core is *nearly* headless. What blocks a CLI or MCP surface is a short list, not a rewrite (track 1):

1. An import cycle: `core/serialization/deserialize` → store actions → `circuitStore` → persistence → `core/serialization`.
2. `three` imported inside store `pinHelpers.ts`; pure layout code filed under `components/scene`; `src/` importing from `e2e/`.
3. 74 `notify.*` toast calls inside store actions (58 in `wiringActions.ts`); four different error conventions.
4. **Non-deterministic IDs** (`Date.now()` + `Math.random()`, 7 sites, plus two bare-timestamp sites) — runs cannot be replayed; contradicts `vision.md` principle 9.
5. **No semantic `connect(from, to)`** — the only high-level wiring path is an 18-action UI gesture machine needing world coordinates.
6. `CircuitState` mixes the netlist with gesture/UI state; positions and routed wire segments sit on domain entities.
7. **Two graph schedulers** (`evaluateCircuit` for the canvas, `compileHDL` for chips), neither with a clock yet. *Inference, flagged:* they collide when Phase 0.6 adds tick/tock. Decide by ADR before then (R16).

---

## 2. What the outside world has learned (the parts that transfer)

Sources, dates and confidence ratings are in the research tracks (kept outside the repo in the run directory; summarised in §2). Several of these are single studies or vendor reports; where a track flagged a caveat I have kept it.

**Repos agents can work in.** OpenAI's zero-human-code team (the post itself returned 403; read through a mirror): a ~100-line AGENTS.md that is a table of contents; `docs/` as the system of record; architecture enforced by lints and structural tests *with the fix in the lint message*; review comments converted into lints; doc-gardening agents; short-lived PRs. Two studies disagree on whether context files help at all (ETH: no gain, +20% cost; Augment, a vendor: gains for 100–150-line files, and long architecture overviews measurably hurt). Both point the same way: short, and only the non-obvious. Anthropic's long-running harness: a machine-readable work list, "unacceptable to remove or edit tests", and the same orient → smoke-test → take-one-item start to every session. Carlini's 16-agent compiler: the task verifier must be "nearly perfect, otherwise Claude will solve the wrong problem"; terse, greppable test output; an oracle is what let agents work in parallel. Böckeler: *when an issue happens twice, improve a guide or a sensor.*

**AI checking AI.** In one 116-task study, same-model review of finished code added nothing (Claude-reviews-Claude 91.4% → 91.4%) — medium confidence; the authors note reviewer strength and draft quality are confounded. Vendor-relayed benchmarks put the best AI reviewers near 50% recall. → **AI review is a net, not the gate of record.** Reward hacking is mostly agents editing tests; in ImpossibleBench two cheap levers each cut it sharply: an explicit "blocked/impossible" exit (54% → 9%) and a strict prompt (92% → 1%), while LLM monitors caught only 42–65%. A separate evaluator with done-criteria agreed *before* coding helps, after tuning against human judgment. The few public bug-hunting bots share one pattern: a repro-required, deduplicated, capped issue contract.

**Small PRs.** Google: 100 lines reasonable, 1,000 too large. SmartBear/Cisco: detection falls past 200–400 LOC. DORA 2025: AI raises throughput *and* instability; small batches are the named countermeasure. METR: maintainers would reject about half of test-passing agent PRs. Cloudflare's AI review at scale: depth tiered by diff size, generated files stripped, only Critical findings block.

**Oversight.** What practitioners keep for the human: priorities; acceptance criteria for risky work; taste; irreversible actions; and every change to the harness itself. Auto-approval only for machine-classified low-risk classes.

**Claude-native infrastructure.** *Checked by me against code.claude.com docs:* cloud sessions — `claude --cloud "<task>"`, parallel, survive a closed laptop, no separate compute charge (they draw on subscription limits); they clone the GitHub remote — **only what is in the repo exists for them** (that includes your `/autonomous` skill and hooks, which live in `~/.claude/`). *From track 6, not re-checked:* the VM is ~4 vCPU/16 GB with Node 22 + pnpm, and `claude-code-action` can authenticate with a subscription OAuth token. Routines: schedule (≥1 h) / API / GitHub PR triggers, unattended, act as *your* GitHub identity, daily run cap, "green run ≠ task succeeded". Managed Code Review is Team/Enterprise-only and never blocks; for you the independent reviewer is `anthropics/claude-code-action` on free public-repo runners. Playwright inside Claude cloud sessions has an open proxy caveat — **unverified**; keep browser runs in GitHub Actions until a short spike proves otherwise.

---

## 3. The target shape

```
   YOU   portfolio order · ADRs · harness changes · opt-in to each auto-merge tier ·
         taste (UI polish) · dispatching a release/deploy
                                   │
   WORK  docs/portfolio.md (ordered projects, pick ratio) → GitHub Issues (epics → tasks,
         blocked-by, agent-ready) → `backlog next` → ha-prompt-it → one small PR per sub-issue
                                   │
   GATES (all Node/jsdom, no browser on the PR path)
         lint + layer walls + doc paths → unit (node | jsdom) → conformance (.tst/.cmp)
         → scenarios × drivers → build → PR hygiene + tamper flag → advisory verifier
         change-triggered, off the PR path: differential vs web-ide · fuzz · doc gardening
                                   │
   PRODUCT   kernel (no DOM): document · sim · hdl · chips · tst
             surfaces, in order of cost-to-verify: CLI · HDL text · MCP/API · 2D SVG · 3D (R3F)
             all run the same scenarios; a report shows any surface that has fallen behind
```

---

## 4. Goal posts

Each has an exit test a command can prove. Task detail is in `SEED-BACKLOG.md`. **G0 and G1 are a short, strictly-first foundation; after that, work is pulled by the product spine** (pick ratio 2 spine : 2 enabler : 1 upkeep — an enabler task is eligible only when an open spine task is blocked by it).

### The tracer bullet comes first *(3–4 days)*
Before building any of the system, prove the whole loop once, by hand where needed: a cloud session can build and test the repo (T0.1) → six labels, `docs/portfolio.md`, ten hand-filed issues → a 60-line `backlog ready` → **P05-31 (truth-table generator — pure logic) taken from an issue to a PR ≤ 200 lines, through CI and an advisory verifier run, merged from your phone.** Everything that hurts during that run is the real priority list.

### G0 — Truthful ground
- One place answers "what's next": `docs/portfolio.md` + issues. The 13 open P05 tickets and 3 open observed-bugs become issues; `tasks/todo.md` and the checklist are frozen as history (AGENTS.md Step 1.0 updated in the same change).
- `AGENTS.md` ≤ ~120 lines as a table of contents; **one** definition of done, referenced not restated; dead paths removed or `REPO_MAP.md` generated; the "add a gate" recipe corrected everywhere it appears (five places, including `CONTRIBUTING.md`). `lint:docs` today only rejects machine-specific absolute paths — **a does-this-path-exist check and a line budget have to be built** (H10).
- North Star and `ha-prompt-it` reachable by cloud agents (your call where — see decision 6: this publishes them).
- Housekeeping cleared: 7 dependabot PRs, 5 merged branches, 2 stale worktrees, `.stryker-tmp/`.
- **Exit:** `lint:docs` reports 0 dead paths in AGENTS.md/REPO_MAP; `backlog projects` prints live counts; a fresh cloud session runs lint + tests + build from a cached setup script.

### G1 — Small, gated PRs and a cheap merge
- **Make merge cheap:** release + deploy move from `push: main` to dispatch / tag / weekly cron. A merge becomes an ordinary, revertible commit.
- **Make the ruleset real, in this order:** approvals → 0; drop the `required_deployments` rule (or make it satisfiable); configure CodeQL default setup (free on a public repo) or drop that rule; review the `update` restriction; add required checks; prove a trivial PR can merge *without* bypass; **only then** remove the admin exemption. Green CI then binds you and agents alike. Secrets move into a GitHub environment restricted to `main`.
- PR hygiene: linked issue; size budget (warn 200 / fail 400 reviewable lines); one sub-issue per PR. Runs under `pull_request_target` reading the diff by API only, so a PR cannot edit its own guard.
- Tamper **flag** (not gate): touching vectors, CI, lint/test config, portfolio, AGENTS.md or harness scripts, or removing `expect(` / adding `.skip`, posts a loud notice you see at merge time. *Honest limit: while agents act under your GitHub identity, any "human-applied label" is a convention, not a control.*
- Plans carry contracts and test names, **not complete code**.
- **Dormant mode:** ≤5 open agent PRs; at the cap agents do only no-PR work; scheduled jobs stand down; `agent-orient` prints a welcome-back digest ordered by mergeability.
- Offered from here, your opt-in: **Tier 0 auto-merge** (docs, tests-only, dependency patches) on green.
- **Exit:** median reviewable lines over the last 20 agent PRs ≤ 200; no merge without green checks; a merge no longer deploys.

### G2 — Headless core *(pulled by spine tasks)*
- Vitest split into `node` and `jsdom` projects (core, simulation and utils first — 8 of 21 store test files still touch `localStorage`/`window`); dependency-cruiser walls in `lint`, **shipped with a baseline of today's known violations** that the seam fixes burn down; a no-DOM `tsconfig.core.json`.
- Seams 1, 2 and 4 closed (cycle, `three` in the store, deterministic IDs); semantic `connect(from, to)`.
- A `hacer` CLI: `hacer test Xor.hdl Xor.tst Xor.cmp` on real files.
- **Decide, don't build yet (ADRs you approve):** document/layout/session split · command registry · **one engine before the Phase 0.6 clock**. The registry build and the 74-site toast refactor wait until a second surface that *writes* to the circuit exists.
- **Exit:** `vitest --project node` green with no DOM lib; the wall baseline is empty; `hacer test` passes every Project-1 vector from files (delivered by S1 + V1).

### G3 — Oracle-backed verification
- Official vectors vendored (MIT, sync script); conformance grows with the phase (P1 now → P2–3 at 0.6 → P5 at 0.7); its pass count may only rise.
- Scenarios move to a pure module; drivers start with **core** and **store**, add **cli** when it lands. The scenario × driver matrix is a generated **report** until there are three drivers, then a required check.
- Change-triggered, off the PR path: differential testing against web-ide's simulator on generated circuits (failures minimised into permanent fixtures); command fuzz; HDL parser fuzz.
- Offered from here, your opt-in: **Tier 1 auto-merge** (pure logic under conformance).
- **Exit:** capability matrix generated in CI; differential job green on 7 consecutive runs.

### G4 — Independent AI QA *(advisory; tuned by your disagreements)*
- Verifier on risk:1/2 PRs over ~100 reviewable lines: fresh context, reads the issue's acceptance criteria + diff + CI artifacts, cannot edit, emits a JSON verdict. It stays **advisory** — by the evidence it is the weakest gate. Findings become ≤3 follow-up issues, depth 1 only.
- Builder has a first-class **blocked** exit (`needs-human` + the question + a recommended answer), then takes the next task.
- Bot issue contract: executable repro or no issue; fingerprint dedupe against open *and* closed; ≤3 per run; ≤10 open bot-filed issues, overflow into one rolling issue; bot issues are never `agent-ready` by themselves.
- You tune it by applying an `overturned` label when you disagree — no sampling ritual.
- **Exit:** your time per merged PR ≤ 2 min; every escaped defect adds a test at the layer that missed it.

### G5 — Surfaces in parallel
Order by cost-to-verify: **CLI/HDL → MCP → 2D → (3D keeps up).**
- HDL: one-way HDL → circuit with auto-layout first; canonical printer + round-trip property second; true bidirectional editing last, layout in a sidecar.
- MCP: start with one hand-written tool that gives agents the oracle loop (`hacer_hdl`: load, simulate, run `.tst`); grow to ~6 workflow-level tools — never one tool per action. A committed `.mcp.json` means **every agent working on HACER dogfoods HACER's agent API** — AI-Agent Parity, pulled forward from Phase 7.
- 2D: layout as a pure function (netlist → ELK → positions) testable in Node; React SVG with `data-*`/ARIA so jsdom can assert on it; the same SVG serves `hacer render` and MCP.
- **Exit:** every scenario passes through ≥3 headless drivers.

### G6 — Widening autonomy
A separate bot identity (GitHub App or machine user) so label gates and approvals become real controls; Tier 2 (store/UI/architecture) stays a ~90-second human concept review.

### G7 — 3D sustainability *(background lane)*
- Low-power default on Intel/SwiftShader; a `test` render mode (`frameloop="never"`, fixed clock, seeded RNG); `__SCENE_HELPERS__.describe()` returning ids, world/screen positions and signal state, so agents assert on JSON and click projected coordinates, **never pixels**. Instancing and a draw-call budget asserted through the bridge. Playwright against `vite preview`, not the dev server.
- **Proposed amendment to ADR-0012, yours to accept or reject — not a goal post:** ~10–20 fixture goldens generated only in a pinned Playwright container, and an exploratory browser agent against the preview URL; both change-triggered, advisory, silent in dormant mode. Your ADR removed scheduled browser runs because nobody was watching them; that reasoning still holds unless the results land in one rolling issue you actually read.
- **Do not buy:** GPU runners, pixel streaming, browser grids. If money is spent, a used M-series mini beats all of them.

**UI polish** has no oracle. It gets its own project with its own protocol: batches of ≤5 changes, before/after screenshots from the PR preview, always your review.

---

## 5. Your machine, and your subscription

| Load | Where it goes | Cost |
|---|---|---|
| Agent's edit → lint → unit → build loop | Claude cloud sessions (`claude --cloud`), a few in parallel | subscription limits |
| Browser runs, when you ask for them | GitHub Actions (public repo: free, 4 vCPU/16 GB) | $0 |
| Advisory verifier | `claude-code-action` on Actions, tiered by risk and size | subscription limits |
| Differential / fuzz / gardening | Actions cron or routines, **only when `main` moved** | $0 / subscription |
| Looking at 3D yourself | PR preview URL on a phone/tablet; `low-power` on the Mac | $0 |

Every recurring Claude job carries a usage-budget line and is change-triggered: during a 12-week gap nothing fires. I did not estimate absolute usage — your plan is unknown to me and routine caps differ by plan — so the design assumes the lower tier.

Local friction worth removing once: `/usr/local/bin/node` is v14.15.3, which any shell that does not load nvm picks up (the nvm default is already 22 — remove or upgrade the stray binary); worktree `node_modules` repair (`scripts/wt-new`); and never running dev server + Playwright + agent together.

---

## 6. What stays yours

1. The order and pick ratio in `docs/portfolio.md`.
2. ADRs, and acceptance criteria for Tier-2 work.
3. Every change to the harness: CI, lint/test config, vectors, AGENTS.md, hooks.
4. Opting each tier into auto-merge; dispatching releases and deploys; anything a person reads.
5. UI taste.
6. Being able to explain the system without asking the agent — the ADR log is how.

---

## 7. Start next week — about 20 minutes of your time, then the tracer bullet

1. Answer the decisions below (defaults are safe).
2. In repo settings: the ruleset steps in G1, **in that order, bypass last**; turn on "delete branch on merge" (a repo setting, not a ruleset rule); create a `main`-restricted environment and move `RELEASE_TOKEN` into it.
3. Say "publish on-green for hacer" (opening PRs and filing issues only).
4. Say "run the tracer bullet".

| # | Decision | Default I proceed on |
|---|---|---|
| 1 | Grant `publish: on-green` for **opening** PRs and filing issues in `hacer`? CI and the verifier only run on PRs. | hold |
| 2 | GitHub Issues as the backlog, plus `docs/portfolio.md` (R10)? | yes |
| 3 | Project rows and the 2:2:1 pick ratio (R21, R27)? | as listed |
| 4 | PR budget 400/200 and no complete code in plans (R12)? | yes |
| 5 | Decouple release + deploy from merge, and rewrite the ruleset (R19, R20)? | yes |
| 6 | Put the North Star and `ha-prompt-it` into the **public** `hacer` repo — or a private companion repo (R28)? | public, after you read them once for anything personal |
| 7 | Opt Tier 0 into auto-merge once G1's exit test passes? | no, until you say so |
| 8 | Accept the ADR-0012 amendment for change-triggered browser runs (R24)? | no |
| 9 | Store a Claude OAuth token as an environment-scoped secret for the verifier (R31)? | no — run the verifier manually first |
| 10 | Which Claude plan are you on? | unknown; design for the lower tier |

---

## 8. Honest limits

- The PR budget, tier boundaries, pick ratio and project order are judgment, not evidence.
- "One engine" (seam 7) is an inference from reading the code.
- Unverified: Playwright inside Claude cloud sessions; whether `@nand2tetris/*` is installable from npm (my check errored — assume not; vendor the vectors); several vendor benchmarks the tracks flag themselves.
- Track 7 (Claude Code capabilities) was the weakest report; its claims are used only where I re-checked them against the docs, and the two cloud-VM facts taken from track 6 are marked as such.
- The 604/168 PR-size medians and the 30–57% docs share are the fact-checker's recomputation; I verified only the raw 850.
- The first draft of this report had the oversight model wrong (it kept you as the merge bottleneck and proposed controls your own GitHub identity defeats); an adversarial reviewer caught it. A fact-checker then found a finished ticket listed as ready (P05-32), an exit test resting on a check that does not exist, ruleset advice that would have locked you out, and several research claims stated more strongly than their sources. All are corrected here; both reviews are in the two reviews (same place). Expect the tracer bullet to catch more — that is what it is for.
