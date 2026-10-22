# The harness — how work gets chosen, built, verified and merged

This directory *is* the process. Everything an agent follows lives here or is linked from here, and
it is changed the same way as anything else: an issue under the `harness` epic, a small PR, a
merge. If a step below is wrong, fix it here — not in a chat.

## The loop, end to end

```
  docs/portfolio.md ──► GitHub Issues ──► backlog.mjs ready ──► claim ──► ha-prompt-it (Light)
   (order, pick rule)    (epics → tasks)   (what is pickable)              issue = spec
                                                                            red → green → DoD
                                                                                 │
  ledger.md ◄── retro ◄── merge on green + PASS ◄── verifier (fresh context) ◄── PR (one sub-issue,
                                                                                 ≤ 400 reviewable lines)
```

Exception: a `risk:0` docs-only PR may merge on the coordinator's own review instead of a fresh
verifier, posted with the verdict heading and `Verified on: coordinator`. A fix after a **BLOCK**
always goes back to a fresh verifier — never the coordinator (`verifier-brief.md`,
`.claude/skills/ha-next/SKILL.md` §4).

| Step | Where the knob lives | What you can adjust |
|---|---|---|
| Which projects, in what order, how picks rotate | `docs/portfolio.md` | row order, the eight-slot cycle (`foundation → lineage → harness → foundation → mission-control → spine → foundation → aux`), the foundation gate, the hand-in-hand rule, dormant-mode caps — *amended 2026-09-18 (#259): was the 2:2:1 ratio; amended 2026-09-21 (#330) while the foundation plan (#318) runs: was `surfaces → harness → spine → aux → surfaces → harness`; amended again 2026-09-25 (#482): added `lineage` and `mission-control`, one slot each, "equal footing as the other priority projects"* |
| What a task must contain before an agent may take it | `issue-form.md` (issue form and labels) | acceptance criteria as tests, verification command, risk |
| Whether the facts an issue or a brief states are true (#394) | **Measured facts before dispatch:** run `node scripts/issue-facts.mjs <n>` on the issue, or `--file` on the brief, and fix every package or path it reports that the text says exists; every other fact the text asserts, such as a count, a date, a behaviour or an inference, gets a Measured-facts row naming the command that measured it, because no scanner can tell which sentence is a claim or which command proves it. Mechanised: a package the text calls a dependency (and any scoped name or `name@version`) against `package.json` and `pnpm-lock.yaml`, and each cited path against the tracked files; only a package finding exits 1, since an issue names the files it will create. Not mechanised, so a checklist: every other claim, since each needs its own command; a fact registered as a premise is re-run by `node scripts/lineage.mjs verify --for #<n>`. Of the seven occurrences #394 and ledger L059 record, the scanner catches one, #355's `fast-check` | `DEPENDENCY_WORDS` in `scripts/issue-facts.logic.mjs` |
| Who may author pickable tasks | `scripts/backlog.mjs` allowlist (`BACKLOG_ALLOWLIST`) | the identities agents trust on a public repo |
| How a task is built | `.claude/skills/ha-prompt-it/SKILL.md` + `implementer-brief.md` · agent `.claude/agents/hacer-builder.md` | tiers, TDD mechanics, worktree rules |
| How a PR is judged | `verifier-brief.md` | what blocks, what is a nit, what must be tried |
| What must be green | `main-rules` ruleset (required checks `ci`, `pr-hygiene`, `browser-qa`, 0 approvals, no bypass) + `docs/harness/implementer-brief.md` definition of done — when one of them will not go green, read *When a required check is stuck* below | add a required check here after it is green on its own PR |
| How a green PR merges | `node scripts/merge-on-green.mjs <pr>` (#536): merges itself on green and never arms auto-merge (it disarms one it finds), updates the branch when `main` moved after the checks started (#407, *Green alone, red merged* below), re-runs one cancelled run at a time, clears a stuck merge box with one body edit (R746); exit 4 means it needs a person; `--dry-run` prints the next action and does nothing. Its last stdout line is `MERGE-ON-GREEN: <merged|check-failed|timeout|needs-person|dry-run|usage|error> pr=<n> head=<sha> exit=<code>` (`merge=<sha>` on merged, `next=<action>` on a dry run): a wait greps the tool's log for `MERGE-ON-GREEN:`, never for an `exit=` marker only the shell's task output carries | the deadline (third argument, minutes); `MAX_UPDATES` |
| PR size and shape | ADR-0013 (400 reviewable lines, one sub-issue per PR) — enforced by the `pr-hygiene` check (`scripts/pr-hygiene.logic.mjs`, which also carries the layer-ratchet growth rule — row below). Two exemptions — *amended 2026-09-21 (#326)*: a **deletion-only** PR is outside the budget ("refactor deletion prs can be any size they need to be"), where deletion-only means it deletes more than it adds and adds at most 5 lines to a file, 20 in all and 5% of what it deletes — the fix-ups a removal forces, since the check sees counts, never the diff; and **research evidence** (`docs/research/*/evidence/`) is excluded, while the report beside it counts. Both reasons print in the check's output; the linked-issue rule is unaffected. That rule also fails a closing keyword on an issue the body says is done only in part — `Part of` the same issue anywhere, or *in part* / *partial* / *partly* / *remaining* on the keyword's own line, outside code and HTML comments — because GitHub closes on the keyword alone, even in "this does not close #n" (#485, after #396 and #443 closed theirs early); the `HYGIENE:` line says `linked=fixes` or `linked=part-of` | the budget numbers, `FIXUP_MAX_*` |
| Which layer may import what | `.dependency-cruiser.cjs` (import direction, cycles, engine packages, `src/` → `e2e/`) and `eslint.config.js` → "the engine layer" (`console.*`, DOM globals — globals are not dependencies, so no import graph can see them). Today's violations are recorded in `.dependency-cruiser-known-violations.json` and `eslint-suppressions.json`; a **new** one fails. Checked by `pnpm run lint:layers`, which `pnpm run lint` runs, so it is in the definition of done and in CI. After fixing one, `pnpm run lint:layers:shrink` drops it from the baseline for good — the baseline only ever shrinks, so a fixed violation cannot be re-added, and a stale ESLint suppression fails the lint until it is pruned. The line it prints is the foundation plan's one tracked metric (#329, 2026-09-23: 16 production edges · 8 test-only · 10 cycle edges in 3 cycles · 35 engine globals). Arming a *new* rule is the one thing shrink-only cannot do, so it needs the full `depcruise … --baseline` write — which also absorbs anything else broken at that moment, silently, in a file nobody line-reviews. `pr-hygiene`'s **`ratchet`** rule is what catches that (#406): it reads the baseline at the PR's merge base and at the head and fails any row that arrives under a rule name the PR does not **newly declare in `.dependency-cruiser.cjs`**, naming it. Every verdict is a **set** difference — the row count judges nothing, so fixing one violation while absorbing another still fails (#432; it used to warn, which is the ordinary shape of a refactor moving files between layers). Growth under a rule name that config declares for the first time in the same PR, with nothing removed, passes (#404's real 34 → 77 is a test — and #404 edited the config, as any real arming must); rows leaving *and* arriving under newly declared names warns, because a rule **renamed** there to carry its old rows looks exactly like an arming in the baseline. Deriving "a new rule is being armed" from the baseline *rows* instead was the round-2 hole (#432): `engine-no-ui-packages` sits in the config with 0 of 72 rows, so a real `zustand` import under `src/core/` plus the documented baseline write read `PASS ratchet=armed` with no config edit, no declaration and nothing reviewable, and an invented rule name passed the same way — a hole that widened as the ratchet shrank. The residual that remains cannot be closed in the baseline: a rule *declared* in the config in the same PR — renamed, copied, or widened to cover the edge — reads `armed` or `swapped`, and the fence on it is that the declaration is an added line in a reviewed file. A rule name in a **comment** or a **string literal** there reaches `armed` too — the config is scanned as text, never run — and that is not a false pass: dependency-cruiser's `knownViolations` matching is rule-name-sensitive, so a row under a name no real rule emits suppresses nothing (measured on #432: still `1 new`, exit 1). It leans on the scan finding every rule the base config declares: a config that has text but scans to **no** rule names fails closed as `ratchet=unreadable` (#438), and so does a name read as newly declared that already has rows at the merge base, which only a rule the scan missed can have (#456). **The rules themselves are guarded too (#489):** `lint:layers` fails a baseline row under a rule name no rule in the config reports — deleted, renamed without its rows, commented out or set to `ignore` — where an emptied config used to read `0 known violations … 0 new`; and `pr-hygiene` reads every PR that edits the config, not only one that also edits the baseline, failing a rule name the merge base declares and the head does not as `ratchet=disarmed`, rows or none — a rename gets past it only with all its rows moved to the new name, and still warns as `swapped`. A rule with **no** rows that keeps its name while it stops checking — commented out, set to `ignore`, narrowed — or that is added in a form the scan cannot read is still fenced by review alone (#505). `Baseline-growth: <rule>: <from> → <to> — <why>` in the PR body turns a fail into a warn, on the record: it has to **name every row** it excuses (prose only — a line in a fenced code block is an example, not a claim), and `ratchet=absorbed` stays on the `HYGIENE:` line either way. **One caveat, and it is where a reader trips:** `pr-hygiene.yml` runs on `pull_request_target`, so GitHub always uses `main`'s copy — the rule never checks the PR that changes it, and a change to it takes effect for every PR the moment it lands (§ *When a required check is stuck*, *One gap*). `eslint-suppressions.json` is the second baseline in the same comparison (#429): a row is `(file, rule id)`, and a new row or a risen `count` fails unless the PR's `eslint.config.js` newly names that rule id as a quoted key and the merge base suppresses nothing under it — absence from the base file alone would be the zero-row hole again, and a rule with base suppressions was armed already. It has no `disarmed` check, since ESLint itself fails a suppression its rule no longer reports; the `HYGIENE:` line carries it as `suppressions=`. `scripts/hooks/docPathExists.baseline.json` is the third (#685): a row per grandfathered doc with the count of dead citations `lint:docs` holds it to, so a new doc or a risen count fails — no config can arm a dead citation — unless `Baseline-growth: dead-path: <doc> — <why>` names it (a renamed doc, say), and the `HYGIENE:` line carries it as `docPaths=`. `scripts/lineage-unlinked.baseline.json` is the fourth (#699): one row, the unlinked count `lint:lineage` holds the repo to — which `lint:lineage` compares with the file alone, so a PR that raised both passed it — and a higher count fails unless `Baseline-growth: Builds on: unknown — <why>` names it; the `HYGIENE:` line carries it as `lineage=` | the rules themselves — widen one only with a measurement, and narrow any rule that fires on legitimate code rather than suppressing it case by case |
| Whether the decision graph is sound | `pnpm run lint:lineage`, which `pnpm run lint` runs: `node scripts/lineage.mjs check --summary` (rules in `scripts/lineage.logic.mjs`) prints `LINEAGE: N decisions · M unlinked · K unresolved · J superseded-cited` and **fails** (#471) on any unresolved id, on any ruling in a rulings file not named `<YYYY-MM-DD>-<run>.md` (#699), on any ruling dated from the cut-over without `Builds on:`, and on an unlinked count (`Builds on: unknown`) other than the one in `scripts/lineage-unlinked.baseline.json` (a missing file allows 0) — the ratchet: the count only falls. A PR that annotates an `unknown` runs `node scripts/lineage.mjs check --shrink`, which lowers the file to the new count and never raises it, and commits the file; a raised file fails `pr-hygiene` (row above). Two PRs that each lower it to the same count merge cleanly and leave `main` red, which `scripts/merge-on-green.mjs`'s stale-green re-check catches (`docs/decisions/README.md` § Lineage). Superseded-cited and reverse-link findings are listed and do not fail. `check` without `--summary` lists every finding with its `file:line`; `check --fix` writes a missing reverse link. Commands and schema: `docs/decisions/README.md` § Lineage | the checks themselves; the cut-over date in `docs/decisions/README.md` (#469); the baseline only through `--shrink` |
| Whether two tracked paths are one path on macOS | `pnpm run lint:case`, which `pnpm run lint` runs: `node scripts/case-collisions.mjs` (rules in `scripts/case-collisions.logic.mjs`) reads `git ls-files` and fails on any group a case-insensitive filesystem — APFS's default, so every local worktree — reads as one path, which Linux CI never sees: whole paths of files and of directories, and extension-less module stems in one directory (`Foo.tsx` beside `foo.ts`, or beside a `foo/` holding an index module), the shape of #511 and #515. Prints `CASE-COLLISIONS: PASS|FAIL N file · M directory · K stem` and names each group | the resolvable extensions (`MODULE_EXTENSIONS`) |
| Whether a premise still holds | `node scripts/lineage.mjs verify` (weekly `.github/workflows/lineage-verify.yml`, plus `workflow_dispatch`). Expired premises file one `project:lineage` issue each. A `manual` Verify cell and a `gh` command with no token are reported and do not fail the run. Register: `docs/decisions/premises.md` | the Verify commands and Expect matchers |
| Which PRs get a browser run, and which suites | ADR-0016 (critical = the PR changes the UI: `src/components`, `src/App.tsx`, `src/gates`, `src/nodes`, `src/store`, `src/utils`, `src/styles`, `index.html`, `e2e`, `playwright.config.ts`, later `src/surfaces`; or the `critical` / `sev:*` labels on the PR or an issue it links) — the `browser-qa` check (`scripts/browser-qa.logic.mjs`) runs `@store` only, cloud only, never a local gate; `@ui` (3D) runs only by hand via `e2e.yml`; locally, only suites that do not mount the 3D canvas: today the canvas-less `@shell`, `pnpm exec playwright test --project shell`, a pre-flight and never a gate (ADR-0016 amendment 2026-09-29, #316) — *amended 2026-09-19 (#282): was `src/store/actions` only, plus `@ui` on canvas paths* | the critical paths (`CRITICAL_PATHS`) |
| What the human still does | the `on-green` publishing grant in the workspace `CLAUDE.md`; `needs-human` issues, which are owner actions only (a ruleset or security setting, an account connection, a secret, his machine's configuration, outside content to vouch for). His decisions go to the judge (`judge-brief.md`, R889), and he may override any | revoke or narrow the grant |
| What went wrong, and whether it was mechanised | `ledger.md` | second occurrence → a lint, test or hook |
| Whether the second-occurrence rule fired, and what the window says about policy | the retro role: `retro-brief.md` · agent `.claude/agents/hacer-retro.md` → `harness-inbox.md` | its cadence (`retro-brief.md` § Cadence), the five-per-run cap on policy entries |
| Keeping `gh-pages` preview folders tidy | `pr-preview.yml`'s `sweep-previews` job (daily + `workflow_dispatch`, `gh-pages` concurrency group) calls `scripts/pr-preview-sweep.mjs`; the removal decision is the pure `scripts/pr-preview-sweep.logic.mjs` (#484) — safety net for what the PR's own `closed`-event cleanup misses | the schedule, `foldersToRemove`'s open-PR matching |

## When a required check is stuck

`gh pr checks` reports everything green, `gh pr view <n> --json mergeStateStatus` says `BLOCKED`,
and nothing on the PR explains it. Three things look like that, and two of them are faults.

**Not a signal:** `gh api repos/mezivillager/hacer/commits/<sha>/status` returning `pending`. That
endpoint reports *legacy commit statuses*, which this repo never posts — it answers
`state=pending total_count=0` on every commit, merged ones included. Read the check runs instead.

**Fault 1 (#530): a required workflow's newest check suite is empty.** The merge box lists the
context as "Expected — Waiting for status to be reported" while every check run of that name is
green, and `gh pr checks --required` says `pass`, because it reads check runs, not suites. A run
that its concurrency group dropped while still *pending* creates no job and no check run, but it
leaves a check suite, `completed/cancelled` with nothing in it, and the merge box judges a workflow
by its newest suite. In suite order, that workflow's last run on the head is `cancelled`, with no
jobs:

```sh
gh api "repos/mezivillager/hacer/actions/runs?head_sha=<sha>&per_page=100" --jq \
  '.workflow_runs | sort_by(.check_suite_id)[]
   | "\(.name) \(.conclusion) run=\(.id) suite=\(.check_suite_id)"'
gh api repos/mezivillager/hacer/actions/runs/<run>/jobs --jq .total_count   # 0: the empty suite
```

Recovery, on the same SHA: an `edited` event. Append an HTML comment to the PR body — a reader
sees nothing — and `pr-hygiene` and `browser-qa`, which both run on `edited`, each get one fresh
run whose suite is now the newest. Keep issue numbers out of the comment; both workflows read the
body's links.

```sh
gh pr edit <n> --body "$(gh pr view <n> --json body --jq .body)

<!-- re-run the required checks $(date -u +%FT%TZ) -->"
```

Proven on #517, `BLOCKED` since 2026-09-25: its body edit on 2026-09-27 started one run of each
workflow (36305841051, 36305840748), both green within 13 s, and the PR merged 18 s after the edit.

**Fault 2 (#295): a `cancelled` check run under a required context.**

```sh
gh api repos/mezivillager/hacer/commits/<sha>/check-runs --jq \
  '.check_runs[] | select(.name=="ci" or .name=="pr-hygiene" or .name=="browser-qa")
   | "\(.name) \(.conclusion) \(.started_at)"'
```

GitHub judges a required context by the **newest** check run carrying that name, so a single
`cancelled` run blocks the merge although an older run of the same context succeeded.

Recovery, on the same SHA, with no new commit and no force-push:

```sh
gh run list -R mezivillager/hacer --branch <branch> --json databaseId,name,conclusion
gh run rerun <id> -R mezivillager/hacer      # one cancelled run, then wait for it
```

Re-run them **one at a time**: before #530 the re-runs joined the workflow's concurrency group,
and before #295 they cancelled each other there exactly as the originals had — that is what the
second round of `cancelled` runs on #360 was.

**A force-push is never the recovery**, for either fault. A new SHA does clear both — #486 and
#511 were recovered that way — but it replaces the commit every check and verdict was given on,
and the coordinator's permission classifier refused it on 2026-09-26, which left #517 waiting 36
hours. Both recoveries above keep the SHA. Nor is `gh pr update-branch --rebase`, which rewrites
the branch the same way.

**Why they happened, and what now stops them.** GitHub sends one webhook action *per label*, so
`gh pr edit --add-label a,b` on a fresh PR delivers `opened`, `labeled`, `labeled` within seconds;
every workflow listing `labeled` starts a run per action. `.github/workflows/pr-hygiene.yml` and
`.github/workflows/browser-qa.yml` used to put those runs in one concurrency group per PR, and the
group cancelled some of them: in progress while it set `cancel-in-progress: true` (fault 2, until
#295), and still pending once it set `false` (fault 1, until #530). Which run was dropped was a
race, so fault 1 stranded some PRs and not others (#486, #511, #517, #525).
Since #530 neither workflow declares a concurrency group: every run finishes, and a workflow's
newest suite is always one that ran. `scripts/required-checks.logic.mjs` fails the unit suite if a
workflow that posts a required context declares a group its runs share. The price is the extra
runs — seconds each, ~4 minutes when `browser-qa` runs Playwright — and a superseded push is no
longer cancelled. Both workflows genuinely need the `labeled` trigger, so narrowing `types:` was
not an option: `size-override` and `dependencies` change the `pr-hygiene` verdict (#360's
`pr-hygiene` went red, then green when `size-override` was applied) and `critical` / `sev:*`
change `browser-qa`'s.

**A hand re-check does not judge the PR (#368).** A `workflow_dispatch` run posts its check run on
the head of the ref it was dispatched from, and GitHub judges a required context by the newest check
run with that name (L042). Measured: a dispatch with `--ref ci/220-browser-qa` (run 35347165462,
event `workflow_dispatch`) posted `browser-qa` on #273's head `2b197dbf`, beside its `pull_request`
runs, and `pr-hygiene`'s documented re-check did the same on #629's head `d223ca75` (run
36592605152) — using the branch's own copy of the guard. A manual run could
therefore overrule the PR's verdict, or, cancelled, strand it. Since #368 both jobs are named
`<context> (manual)` on `workflow_dispatch`, so only `pull_request` / `pull_request_target` runs
post `browser-qa` and `pr-hygiene`; a manual run reports under its own name and decides nothing.
Serialising it with the PR's runs instead was rejected: #530 forbids a group they share.
`scripts/required-checks.logic.mjs` fails the unit suite if a required context is reachable from
`workflow_dispatch`. A job-level `if:` is no substitute: a skipped job still posts its check run,
and `skipped` satisfies a required check.

**Green alone, red merged (#407): a check that saw an older `main`.** Not stuck — the opposite: the
PR merges, and `main` goes red. #404 armed the `core-through-index` rule and #399 added three
imports it forbids; each PR was green, and the two merged together failed `pnpm run lint` with
`3 new core-through-index`. Which required checks see the merge result, measured on #647's runs
(2026-10-01):

- `ci` (`.github/workflows/ci.yml:10`) and `browser-qa` (`.github/workflows/browser-qa.yml:21`)
  run on `pull_request` and check out `refs/pull/<n>/merge` — CI run 36933401110 logs
  `HEAD is now at 7931ae2 Merge b1bdf4d… into 0651e73…`. They test the PR merged into `main` **as
  `main` was when the run started**.
- `pr-hygiene` (`.github/workflows/pr-hygiene.yml:47`) runs on `pull_request_target` and checks
  out `main` (run 36933403060: `git checkout -B main refs/remotes/origin/main`); it reads the PR's
  diff through the API, from the merge base to the head, and never runs the PR's code.

So `ci` would have caught #404 + #399 — had it run after the first of them landed. Since `strict`
went off (ledger L014) nothing re-runs it when `main` moves, and GitHub keeps reporting `CLEAN`,
never `BEHIND`. Of the 40 PRs merged up to #647, 19 merged after `main` had moved past their last
`ci` run; #646's `ci` started at 22:01:13 against `0c37a1e`, `main` moved to `59cc2f0` at
22:02:45, and #646 merged at 22:06:32.

**The `MERGEABLE` trap:** `gh pr view <n> --json mergeable` says `MERGEABLE` whenever git can merge
the text. A semantic conflict — a rule on one side, an edge it forbids on the other — never shows
there, and neither does a stale green.

What catches it now: `scripts/merge-on-green.mjs` compares when each required `pull_request` run
started with the base branch's moves (`gh api "repos/mezivillager/hacer/activity?ref=refs/heads/main"`).
If `main` moved since, it says so — `ci ran at <time> against <sha>; main moved to <sha> since` —
rebases the branch on `main` (GitHub's GraphQL `updatePullRequestBranch` with
`updateMethod: REBASE`, pinned to the head it judged by `expectedHeadOid`), waits for the fresh
runs, and merges only on their green. When `main` keeps moving it updates at most three times,
then exits 4; when GitHub refuses the REBASE update (a fork or a protected head, for instance) it
exits 4 at once, in GitHub's words. It no longer arms auto-merge, and disarms one it finds:
GitHub's auto-merge merges on the first green, stale or not. Left open: a push to `main` in the
seconds between the tool's last read and its merge (`--match-head-commit` pins the head, not the
base). To check a PR by hand:

```sh
gh api "repos/mezivillager/hacer/actions/runs?head_sha=<sha>&event=pull_request" --jq \
  '.workflow_runs[] | select(.name=="CI") | .created_at'          # when ci built its merge commit
gh api "repos/mezivillager/hacer/activity?ref=refs/heads/main&per_page=5" --jq \
  '.[] | "\(.timestamp) \(.after[0:7])"'                         # any move after that is unseen
```

**A merge commit on the branch (#667, 2026-10-02).** The `main-rules` ruleset requires linear
history, so the tool merges by rebase, and GitHub cannot rebase a branch that carries a merge
commit. #667's builder had merged `origin/main` into it (`181b3c3`); the tool read `CLEAN`, and
GitHub refused three times with `GraphQL: This branch can't be rebased (mergePullRequest)` before
the tool gave up. Its own update was the same trap: until #669 it ran `gh pr update-branch`,
GitHub's REST update, which merges `main` into the branch, so every stale green it updated would
then have been refused. Since #669 the update is a rebase, and on `can't be rebased` the tool stops
after the first refusal and names the merge commits (from
`gh api repos/mezivillager/hacer/pulls/<n>/commits`, the commits with two parents). The fix is the
builder's: rebase the branch on `main`, which drops the merge, and push. Recorded in
`scripts/fixtures/merge-on-green/rebase-refused.json`.

**One gap.** `pr-hygiene.yml` runs on `pull_request_target`, so GitHub always uses **`main`'s** copy
of it. A PR that changes that file cannot test its own change; the change takes effect for every PR
the moment it lands on `main`. Use the recoveries above on any PR whose runs predate it.

## The five sentences it answers

| You say | What happens |
|---|---|
| "list the priority projects" | `node scripts/backlog.mjs projects` — rows in portfolio order with open / ready / in-progress / needs-human counts and the next pick |
| "what's open in *surfaces*?" | `node scripts/backlog.mjs tasks surfaces` — the row's epic tree, each task with its pick number or its reason, then the tasks a `project:` label files under the row from elsewhere |
| "what can you do next?" | the **`ha-next`** skill: `backlog.mjs ready`, present the top pick with its why, claim it, build it through `ha-prompt-it`, PR, verifier, merge |
| "work the next N" | locally: `/autonomous` over `ha-next` N times; in the cloud: N `claude --cloud` sessions, one issue each |
| "queue up: …" | triage: shape the idea into issues in the form, split to fit the budget, `agent-ready` only if risk:0/1, the criteria are unambiguous, and the seeds are within the blast-radius threshold (*How wide is an issue?*); otherwise the question, with the recommended answer, is a `judge-inbox.md` entry for the judge (R889). `risk:2` means what `issue-form.md` says it means. Exactly three exceptions make a `risk:2` issue `agent-ready`, each still with unambiguous criteria and seeds within the threshold; any other `risk:2` issue goes to the judge. (1) Product-role polish issues, when the fix is concrete (owner's ruling on #269; `product-brief.md`). (2) An issue the inbox panel files on approval, or the judge files or labels on its decision, at any risk, with no ruling in front of it (R844, R889; `inbox-panel-brief.md` §3 item 5, `judge-brief.md` §3 item 5). (3) **Plan slices at `risk:2`:** the coordinator may file a `risk:2` issue `agent-ready` only when all four hold: it is a slice of an owner-approved plan, or a follow-up filed from a review of a PR in that plan's series and inside the plan's scope; its body links the owner's approval of that plan; a ruling names the issue and the plan and makes the issue `agent-ready` (a ruling that only reports a label applied against this rule does not count); and an Opus builder builds it and a fresh Opus verifier checks it, with an ADR-0018 §2 fidelity review added when it changes semantics under `src/core/**` or `src/simulation/**`. No exception lifts the `issue-form.md` security boundary (content triaged from outside stays `needs-human`, and a `bot-filed` issue becomes `agent-ready` only by the owner, or by the judge when the loop measured its defect), the `risk:0`/`risk:1` cap on retro mechanise drafts (`retro-brief.md` § Outputs), or the foundation gate (`docs/portfolio.md`). |

## How wide is an issue?

An issue whose seed files have more than 20 production importers is not `agent-ready` as written — split it, or spike first and go expand → migrate → contract. The knob is `AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD` in `scripts/blast-radius.logic.mjs`, and the evidence for 20 is recorded beside that constant. Do not move it without a new measurement.

Run `node scripts/blast-radius.mjs` on the seeds before `agent-ready` is applied (`--issue <n>` reads them from the issue's "Files likely touched" section; `--json` prints the same report as JSON). The command resolves the `@/` alias and index re-exports, excludes `*.test.*` from the production count, and reports tests separately.

Direct importers are a proxy for blast radius, not the real edit set. A throwaway spike is what shows which of those files the change actually touches.

## Standing roles

Eight fresh-context roles judge work, and none of them builds it. Only the inbox panel and the judge
decide for the owner, the panel on a proposal (#778) and the judge on a decision (R889), and the
owner may override either.

| Role | Judges | Brief | Writes |
|---|---|---|---|
| **verifier** (code) | a PR against its issue and the code | `verifier-brief.md` · agent `.claude/agents/hacer-verifier.md` | one verdict comment |
| **QA** (browser) | a critical PR's changed flow, in a browser against the preview | `qa-brief.md` (#257, in flight) | one QA verdict |
| **fidelity** (engineering truth) | an epic, ADR, spec or semantic PR against physics, digital logic and the domain's oracle | `fidelity-brief.md` · ADR-0018 · agent `.claude/agents/hacer-fidelity.md` | one verdict comment; proposals queued in `fidelity-inbox.md` for the inbox panel to decide, never filed as issues |
| **product** (usability & design) | the app's screens and flows, from the cloud UI tour (`.github/workflows/ui-tour.yml`) and the code, or one UI-facing PR or issue | `product-brief.md` · agent `.claude/agents/hacer-product.md` | at most five `project:polish` issues per review under #144, filed directly (owner, 2026-09-19); strategy proposals queued in `product-inbox.md` for the inbox panel to decide |
| **process** (the flow itself) | the autonomous flow — how the platform moves forward without the owner — at least every two weeks: `node scripts/backlog.mjs ready` prints `process review due:` 14 days after the newest cycle with a `SYNTHESIS.md`, and the coordinator then starts the cycle: it issues the brief and starts the reviewers, two on Opus by default (`process-review-brief.md` §7) | `process-review-brief.md`, issued per cycle in `reviews/<date>/BRIEF.md` | one numbered review per reviewer in `reviews/<date>/reviews/`; the coordinator consolidates them in `SYNTHESIS.md` and files what survives |
| **retro** (refinement) | a window of merged PRs: the ledger, the session records, the four numbers, verdicts, follow-ups, flake reruns and the three inboxes — at the first orient after a run's close record lands on `main`, or once `main` has moved and 7 days have passed since the last retro | `retro-brief.md` · agent `.claude/agents/hacer-retro.md` | mechanise drafts and policy proposals in `harness-inbox.md` for the inbox panel to decide, plus one run row; never an issue, never a policy edit |
| **inbox panel** (decisions) | one `proposed` inbox entry, from an Opus (verify) and a Grok (read-only) review run by the `multi-review` skill on the owner's machine; the review issues come from `node scripts/inbox.mjs queue` | `inbox-panel-brief.md` | one verdict comment on the review issue; on approval, the entry's issue, filed `agent-ready`. The owner may override any status |
| **judge** (the owner's decisions) | one `proposed` entry in `judge-inbox.md`, a decision that used to wait for the owner, from a Fable (verify) and a Grok (read-only) review; `ready` picks its `judge-review` issue ahead of every other task | `judge-brief.md` | one decision comment; the issues or labels the decision needs, and a `needs-human` issue for what only the owner's hand can do. The owner may override any status |

The `hacer-*` types register in a session started in the parent workspace only through the owner's
link `../.claude/agents` → `.claude/agents`, set outside this repo (#870); the link serves the main
checkout's working tree, and a session whose agent list has no `hacer-*` types uses the
general-purpose fallback (`retro-brief.md` § *Cadence*).

## How this process changes

Four paths, from the smallest to the largest. Why they are shaped this way:
`docs/research/2026-09-continual-refinement.md`.

1. **A failure becomes a mechanism.** Each failure gets one line in `ledger.md` (`ha-next` §6). The
   **second** time the same thing appears, it becomes a lint, test, hook or check. That rule is
   stated once, in the ledger's header.
2. **The retro checks the rule fired.** The retro role (`retro-brief.md`) runs on its cadence. A
   class seen twice with no mechanism becomes a *mechanise* draft in `harness-inbox.md`. The inbox
   panel decides it (`inbox-panel-brief.md`), and an approved draft is filed as an `agent-ready`
   `project:harness` issue.
3. **Policy changes go through the inbox panel.** A finding that a gate, brief, rotation, tier,
   budget or cadence is wrong becomes a *policy* entry in `harness-inbox.md`. The inbox panel decides
   it, and the owner may override the decision. An approved change lands as a PR, and if it
   outlives the run it is recorded as an ADR or an ADR amendment (`docs/decisions/`). A call that
   binds only one run is a ruling. No role and no coordinator changes a standing knob on its own
   (L019).
4. **Prune, quarterly and when the default model changes.** Pick one component: a brief section, a
   hook, a check, a skill or a rule. Delete it on a branch, and run the definition of done plus
   whatever replay or window exercises it. If nothing breaks, propose the deletion as a policy entry,
   with that evidence. Remove one component at a time, never a wholesale rewrite, and delete whole
   rules rather than shortening them. The first retro run of each quarter carries the proposal; the
   first is due in the week of 2026-12-18, one quarter after the loop's first run.

The fortnightly process review (`process-review-brief.md`) sits above all four. It asks whether the
flow moves the platform forward. The retro asks the narrower question, more often.

## Rules that are conventions, not controls (yet)

Agents act under the owner's GitHub identity, so every label an agent respects is one an agent could
also apply. The ruleset (required `ci`, no bypass) is the only hard control today. A separate bot
identity (harness epic) turns labels into controls. Until then: the allowlist in `backlog.mjs` reads
issue bodies and comments only from trusted authors, `bot-filed` issues are never `agent-ready`
without the owner or, for a defect the loop measured, the judge, and anything shaped from outside
content is `needs-human`.

## Cloud sessions and routines

They clone this repo and nothing else. Anything the loop needs must be in here — which is why
`ha-prompt-it`, the North Star and these briefs moved in. `/autonomous` (the local queue driver) is
a personal skill and is *not* available there; in the cloud, one session = one issue.

## Measurement rules

Set 2026-09-21, after a lane run exited 0 while `verdict=PASS` and its only act had been deleting a
file, and a separate run reported `UNPARSED` for a run that never reached a model at all — both
caught by looking, not by the exit code. Applies to every number this harness reports about itself.

- **exit 0 is not acceptance** — acceptance is the coordinator's decision about a result.
- **Unknown cost stays unknown** — `0` is only known when the basis is measured or included.
- **Failed attempts stay in the denominator** — cost per accepted task counts every attempt.
- **Record the model a run resolved to**, not only the one requested.
- **A successful demo is not qualification** — label a smoke test as a smoke test.
- **Never rank lanes by the harness's own dollar figure** — it prices every model at Anthropic's
  rates (evidence: `docs/harness/cursor-lane.md`).

## Budgets (cost limits)

Set 2026-09-19 at the owner's request ("we need to setup reasonable limit, especially for claude"; "subagents should be mainly opus for significant difficulty work, and sonnet only if it's routine and easy work").
Change them here, in a PR, like any other knob.

| Limit | Value | Where it is enforced |
|---|---|---|
| Coordinator model | the owner's choice per session — **Opus** typically, **Fable** for harder work | set by the owner when starting a session; not configured here |
| Default subagent model | **Opus** (`CLAUDE_CODE_SUBAGENT_MODEL=opus`) — significant work: features, fixes, design, fidelity, and verification of `risk:2` or engine changes | `.claude/settings.json` `env` |
| Sonnet for | routine, easy work: docs-only edits and their review, mechanical changes, issue/label housekeeping, gardening — **and verifying any PR that is not `risk:2` and touches neither `src/core/` nor `src/simulation/`** (`model-tiering.md` §2) | an explicit `model: sonnet` per dispatch (or agent `model:` frontmatter) |
| Concurrent subagents per session | **4** committed (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4`; default is 20): it applies to a session started in a hacer checkout with no local override, and R205 kept it at 4 for cloud sessions. The owner's laptop is capped at **3** by the workspace's `../.claude/settings.local.json`, his own machine-specific file outside this repo, which overrides the committed value (R205, R316). Read 2026-10-21: that file sets 3, and a session started in the workspace reads 3 in its environment while the committed file says 4. Nothing in this repo raises the 3 | the committed 4 in `.claude/settings.json` `env`; the laptop's 3 in `../.claude/settings.local.json` (owner-set, not in this repo) |
| Agents at once on the laptop | **2** while the owner is awake (R782, R798); **3** only after his going-to-bed message (R782); **2** whenever the laptop is hot (R777), judged from `uptime`'s load average as R780 did. 3 is the ceiling. Behind R777 is L060 in `ledger.md` (three test runs at once; its `test.maxWorkers: 3` fix is done); the agent-count incident is load 76 with three builders installing (`sessions/2026-10-02.md` §3), after which the owner set 2 (R782) | the coordinator |
| What the cap counts | The session's own subagents only. Agents in other sessions on the laptop are not counted: the `run-reviews` reviewers (separate `claude -p` and `agent -p` processes) and a second coordinator. The laptop-wide total is the coordinator's to hold | the coordinator |
| Subagent tokens per coordinator run | stop dispatching new work and report at **~2M** (summed from task notifications), unless the owner asked for a longer run | the coordinator (`ha-next`, `/autonomous`) |
| Run length | bounded by **outcomes** — the queue exhausted, or a stated N merges — never by calendar time alone; the weekly Claude meter is a guard, re-read at each pick. A meter that will not read is retried once; if it is still unreadable, dispatch stops and in-flight work finishes. A weekly reset is not permission to continue (R741, R747) | the coordinator, at the run's start |
| Agents after their PR | report and **stop** — never keep watching CI | `implementer-brief.md` |
| Cloud routines | **Sonnet** for routine runs (spikes, gardening), Opus when the run does significant work; one-off or at most weekly, change-triggered; at most **1** recurring routine until #255 reports | routine config |
| Cursor second opinion (local `cursor-agent`) | advisory, never a gate; standard `composer-2.5`, one run per PR head on `risk:1`/`risk:2` or `src/core`, `src/simulation`, `.github/workflows`, `scripts` changes; read-only config and 15-min timeout from `cursor-lane.md` §1. Bugbot is **not** used (owner, 2026-09-19: usage-based, not cost-effective) | the coordinator (wrapper: #296) |
| Cursor daily ration | **6M tokens a local day** (12M burst ceiling), ≈17 measured reviews; the lane is skipped with exit 7 when the day is spent or included usage is unconfirmed — the policy, its arithmetic and the dashboard re-read are in `usage-rationing.md` | `scripts/lane-budget.mjs`, run by `scripts/second-opinion.mjs` before every lane run (#302) |

Which tier each role gets, the replay that decided it, and what would change it: `model-tiering.md`
(#255). It **refines the two rows above, and on one point overrides them**: verification is tiered by
the PR, not by the word "significant" — `risk:2` and engine changes on Opus, everything else on
Sonnet. Where the table above and `model-tiering.md` disagree about verification, `model-tiering.md`
is the one to follow.

Account-level caps only the owner can set: Claude **extra usage** (claude.ai → Settings → Usage) and
Cursor **on-demand spend limit** (cursor.com dashboard → Spending). Recommended values are in #255.

**Reading Claude's own meters is not a matter of looking at the page.** A JSON endpoint behind
Settings → Usage returns the session, weekly-all and premium-tier percentages as numbers; the recipe,
the field to read (`limits`), and why it needs a real browser session are in `usage-rationing.md`.
Read it before dispatching a batch of agents — the meter does not move linearly with tokens.

## What to measure (four numbers)

Median reviewable lines per PR · the owner's minutes per merged PR · escaped defects, found after
the gates passed (each adds a test at the layer that missed it) · **tokens per merged PR**. The
conformance pass count is already a gate. The fourth was added by #255.

**Tokens per merged PR is one run average, not a per-PR count:** every subagent usage report in the
run (builders, verifiers, fixers, reviewers, panels, retros, and attempts that never merged),
divided by the run's merged PRs less dependabot. Unmerged attempts are in the numerator for the same
reason as § *Measurement rules*: "Failed attempts stay in the denominator". The first reading is
~1.4M subagent tokens for 8 verified PRs (~175k each) on the first execution run. A sum missing any
dispatched agent's count is `unmeasured`, never a partial figure.

**Owner minutes per merged PR stays `unmeasured`** until it has a source that agents do not share:
agents post under the owner's GitHub account, so a comment from that account on a PR cannot be told
from an agent's. The separate bot identity in § *Rules that are conventions, not controls (yet)* is
that source. The retro reports the `needs-human` issues opened in its window as that count, never as
minutes.

`scripts/agent-orient` (#156) prints the measured numbers once it exists, not all four, because
owner minutes has no source. Until then the coordinator reports tokens per merged PR when it
reports the run.

## Multiple coordinators and paused claims

The loop does not assume a single chat. **Product progress** is in portfolio, Issues, claim refs,
PRs, and `ledger.md`. **Who is coordinating, and why a claim is idle**, is not — unless written down.

- Claim comments name `Claimed by`, `Intent` (`building` | `paused:<reason>` | `handing-off`), and
  `Handoff:` — a path, required when `Intent` is `paused:*` or `handing-off`, otherwise `none`. See
  `sessions/COORDINATOR-HANDOFF.md` and `ha-next` §2.
- Prefer **not claiming** while blocked on metering or other pauses that delay the builder; release
  or mark `paused:` if a claim already exists.
- At orient, list open `claim/*` refs and any `sessions/*-handoff.md` (until #156 prints them).

## Ledger rows and merge conflicts

`docs/harness/ledger.md` is append-at-end, so two open PRs that each add a row conflict. `.gitattributes`
gives it `merge=union` (keep both sides), which a local rebase and `gh pr update-branch` honour.

**GitHub's own mergeability check does not honour it.** Measured 2026-09-29 with two throwaway PRs (#604, #605,
closed unmerged) that each appended one row, the attribute present on the base branch: the PR that
merges into the other reported `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`, while a local
`git merge-tree` merged the same two heads clean. So a PR can still show a conflict in the merge box:
rebase locally, or `gh pr update-branch`. The fallback, one file per row under `docs/harness/ledger.d/`
assembled by a script, is filed as #607 and not built.

The attribute is applied only where rows are independent single lines. `DECISIONS.md` and
`docs/decisions/rulings/*.md` hold multi-line sections, and a union merge would interleave two edits of
one section without warning, so they keep the default merge.

## Files

- `README.md` — this page.
- `COVERAGE.md` — one owner per rule: which file states each standing rule, and why the rest link to it.
- `ledger.md` — failures and what they became.
- `implementer-brief.md` — the brief a builder agent receives for one issue.
- `verifier-brief.md` — the brief a fresh-context verifier receives for one PR.
- `fidelity-brief.md` — the brief the fidelity role receives for one epic, ADR, spec or semantic PR.
- `fidelity-inbox.md` — proposals from fidelity reviews, which the inbox panel decides.
- `retro-brief.md` — the brief the retro role receives for one window of merged PRs: cadence, inputs and the command for each number, outputs.
- `harness-inbox.md` — mechanise drafts and policy proposals from retro runs, which the inbox panel decides, and the run log.
- `routines/fidelity-digest.md` — the change-triggered re-check of the roadmap (ADR-0018 §5).
- `product-brief.md` — the brief the product role receives for a usability and design review.
- `product-inbox.md` — product-strategy proposals from product reviews, which the inbox panel decides.
- `inbox-panel-brief.md` — how one `proposed` inbox entry is decided: the review issue `node scripts/inbox.mjs queue` files, the Opus and Grok reviews, the panel's verdict, and the status `inbox.mjs set` writes; the owner may override.
- `judge-inbox.md` — decisions that used to wait for the owner, which the judge decides on his behalf (R889).
- `judge-brief.md` — how one `judge-inbox.md` entry is decided: the `judge-review` issue picked first, the Fable and Grok reviews, the Opus judge's decision, and the status `inbox.mjs set` writes; the owner may override.
- `model-tiering.md` — which model tier each role gets, measured by replaying the verifier brief.
- `cursor-lane.md` — what Cursor can carry: the local `cursor-agent` second opinion (verified read-only setup, trial, budget) and keep/skip verdicts for the rest.
- `usage-rationing.md` — the Cursor lane's daily token ration, how a run is measured, and the dashboard reading the "Included" guard rests on (`cursor-usage.json`).
- `mission-control.md` — the snapshot `scripts/mission-control/collect.mjs --json` prints (schema v1): every section, where it comes from, and how a failed source is flagged rather than fatal — what Mission Control's site and the coordinator's orient step both read.
- `../research/2026-09-18-agent-readiness/` — why the process looks like this.
- `sessions/` — dated session records: the goal, the owner's rulings, what was built, the state at close, how to resume. **The one close record — no separate end-of-run file:** a run's close lives here, and lists the PRs the run merged, from `node scripts/run-prs.mjs --from <run start> --to <the time you count>`, not `--to <run end>`: the record is written before the run ends, and a later `--to` lets a re-run count more. The records PR itself merges after the count, so the record adds it by hand as "and this one" (`sessions/2026-10-17.md` §2). When `run-prs` prints `window open`, the record uses the instant that line prints as its `--to`. Start with the latest one when picking the work back up. A close record's §2 carries one line: `Subagent tokens: <total> over <k> agents · <n> merged PRs less dependabot · <total ÷ n> per merged PR (run average)`, or `Subagent tokens: unmeasured (<why>)` when any dispatched agent's count is missing. A partial sum is never written as the figure.
- `sessions/COORDINATOR-HANDOFF.md` — claim-comment fields, when to write a `*-handoff.md`, and how a second coordinator resumes or releases idle claims. Product “what’s next” still comes from `docs/portfolio.md` and Issues; handoffs carry **coordinator meta-state** only.
- `process-review-brief.md` — the standing brief for the fortnightly process review; `reviews/` holds every cycle in one layout (`reviews/README.md`).
- `cloud-queue.md` — standing Claude → Grok Bot queue for cloud-heavy work that nothing else waits on (verification, second opinions, differential runs, large install/build/test; R742). Local Claude enqueues; Grok Bot runs those rows when the owner triggers it; what it reports becomes a local follow-up. Not a second picker for ordinary local work.
- `sessions/cloud-queue-inbox.md` — the live inbox for that queue. Append rows; do not invent state.
