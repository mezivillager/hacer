# The first retro run, 2026-10-15: measurements

**Window and why.** #271 names the tracer-bullet day, 2026-09-18 (16 merged PRs, 12 ledger rows).
This run uses the three latest completed runs instead. They hold 75 merges and ledger rows
L058–L067, and they are what the process looks like now. Rows L001–L057 count only as earlier
occurrences of a class.

**Numbers.** Each is `measured` with its command, or marked otherwise.

| Number | Value | How |
|---|---|---|
| merged PRs | 75: 36 · 27 · 12 per run, 10 of them dependabot | `node scripts/run-prs.mjs --from … --to … --json`, per window |
| median reviewable lines | **73** (by run: 63.5 · 89 · 65.5); over 400: 1 (#650, `size-override`, R784) | `measure()` from `scripts/pr-hygiene.logic.mjs` over `pulls/<n>/files` for the 65 non-dependabot PRs |
| verdicts | 65 of 65 with a verdict; 2 BLOCK (#586, #634), both fixed and passed by a fresh verifier | verdict headings in each PR's comments |
| overturned | **0**: the `overturned` label has never been applied, to any issue or PR | `gh search issues --repo mezivillager/hacer --label overturned`; `gh pr list --state all --label overturned` |
| escaped defects | **2, inferred**: #669 (in #651's merge path, L065) and #665 (`.claude/agents/hacer-product.md`'s frontmatter); no label marks them | reading the window's issues |
| tokens per merged PR | **unmeasured**: none of the three records reports it | `grep -i token` over the three records |
| owner minutes per merged PR | **unmeasured**; proxy: 1 `needs-human` issue opened (#677) | `gh issue list --search "created:2026-09-29..2026-10-05 label:needs-human"` |
| follow-up volume | 31 issues opened 2026-09-29..10-05, 6 still open | `gh issue list --state all --search "created:2026-09-29..2026-10-05"` |
| flake reruns | **0** workflow re-runs (`run_attempt > 1`) in 1,999 runs; 0 failed pushes to `main` | `gh api "repos/mezivillager/hacer/actions/runs?created=<day>"`, one query per day |
| recurrences in the records | stale premises in all 3 records (13 issues); "already delivered" in all 3 (4 issues) | §3 and §2 of each record |

Windows, from the three session records' own `run-prs` lines:
`2026-09-29T09:00:00Z 2026-09-29T23:59:00Z`, `2026-10-01T21:20:00Z 2026-10-02T03:00:00Z` and
`2026-10-04T16:50:00Z 2026-10-04T23:59:00Z`. The per-PR rows the script printed are below.

## The script

Run from anywhere, with Node 22 and an authenticated `gh`:
`node retro-measure.mjs <hacer checkout> <from> <to> [<from> <to> …]`. It applies the
`pr-hygiene` size rule itself (`measure()`), so the median is the number the budget check sees.

```js
// usage: node retro-measure.mjs <repoDir> <from> <to> [<from> <to> ...]
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repo = process.argv[2]
const windows = []
for (let i = 3; i < process.argv.length; i += 2) windows.push([process.argv[i], process.argv[i + 1]])
const { measure, parseGeneratedPatterns } = await import(path.join(repo, 'scripts/pr-hygiene.logic.mjs'))
const generated = parseGeneratedPatterns(readFileSync(path.join(repo, '.gitattributes'), 'utf8'))
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const prs = []
for (const [from, to] of windows) {
  const list = JSON.parse(execFileSync('node', [path.join(repo, 'scripts/run-prs.mjs'), '--from', from, '--to', to, '--json'], { encoding: 'utf8', cwd: repo }))
  prs.push(...list.map((p) => ({ ...p, window: from.slice(0, 10) })))
}

const rows = []
for (const pr of prs) {
  const files = JSON.parse(gh('api', '--paginate', '--slurp', `repos/mezivillager/hacer/pulls/${pr.number}/files?per_page=100`)).flat()
  const m = measure(files, generated)
  const comments = JSON.parse(gh('api', '--paginate', '--slurp', `repos/mezivillager/hacer/issues/${pr.number}/comments?per_page=100`)).flat()
  const verdicts = comments.map((c) => /##\s*(?:Verifier verdict|Verdict)[^\n]*?\b(PASS|BLOCK)\b/i.exec(c.body)?.[1]?.toUpperCase()).filter(Boolean)
  const author = JSON.parse(gh('api', `repos/mezivillager/hacer/pulls/${pr.number}`)).user.login
  rows.push({ n: pr.number, window: pr.window, author, risk: pr.labels.find((l) => l.startsWith('risk:')) ?? '-', reviewable: m.reviewable.lines, test: m.test.lines, verdicts: verdicts.join(','), title: pr.title.slice(0, 70) })
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const k = s.length; return k === 0 ? null : k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2 }
for (const r of rows) console.log([r.n, r.window, r.author, r.risk, r.reviewable, r.test, r.verdicts || '-', r.title].join('\t'))
const human = rows.filter((r) => !r.author.includes('dependabot'))
const byWindow = Object.groupBy(human, (r) => r.window)
for (const [w, rs] of Object.entries(byWindow)) {
  console.log(`WINDOW ${w}: merged=${rs.length} medianReviewable=${median(rs.map((r) => r.reviewable))} over400=${rs.filter((r) => r.reviewable > 400).length} withVerdict=${rs.filter((r) => r.verdicts).length} blocked=${rs.filter((r) => r.verdicts.includes('BLOCK')).length}`)
}
console.log(`ALL (non-dependabot): merged=${human.length} medianReviewable=${median(human.map((r) => r.reviewable))} dependabot=${rows.length - human.length} blocked=${human.filter((r) => r.verdicts.includes('BLOCK')).map((r) => r.n).join(' ')}`)
```

## Per-PR output (number, window, author, risk, reviewable, test, verdicts, title)

```text
583	2026-09-29	mezivillager	risk:2	225	421	PASS	feat(scene): __SCENE_HELPERS__.describe() returns every gate, pin, wir
585	2026-09-29	mezivillager	risk:1	315	215	PASS	feat(mission-control): charts — ratchet history, merges per day, open 
586	2026-09-29	mezivillager	risk:0	10	0	BLOCK,PASS	docs: point stale gate recipe lines at the chipName guide
520	2026-09-29	dependabot[bot]	-	2	0	-	chore(deps-dev): bump @testing-library/user-event from 14.6.1 to 14.6.
521	2026-09-29	dependabot[bot]	-	2	0	-	chore(deps-dev): bump @types/node from 25.8.0 to 26.6.3
588	2026-09-29	mezivillager	risk:1	21	87	PASS	feat(shell): ?renderer=none boots the app with no scene (ADR-0019 slic
522	2026-09-29	dependabot[bot]	-	2	0	-	chore(deps): bump @radix-ui/react-switch from 1.2.6 to 1.3.7
410	2026-09-29	dependabot[bot]	-	14	0	-	chore(deps): bump the react-and-react-three group across 1 directory w
590	2026-09-29	mezivillager	risk:2	191	107	PASS	chore(backlog): tasks <slug>, next, zero-row portfolio guard, unknown 
589	2026-09-29	mezivillager	risk:1	178	167	PASS	feat(cli): hacer test <hdl> <tst> <cmp> on real files
592	2026-09-29	mezivillager	risk:1	93	343	PASS	fix(scene): split describe() into scene() and project(id); hop midpoin
593	2026-09-29	mezivillager	risk:1	151	158	PASS	feat(mission-control): roadmap, ledger and ADR views
594	2026-09-29	mezivillager	risk:0	36	0	PASS	docs: E2E suites run in CI or the cloud only (ADR-0016)
596	2026-09-29	mezivillager	risk:1	73	67	PASS	test(e2e): canvas-less @shell Playwright project and first spec
600	2026-09-29	mezivillager	risk:1	391	393	PASS	feat(cli): hacer run-tst and the cli scenario driver
601	2026-09-29	mezivillager	risk:0	2	0	PASS	docs(repo-map): point Phase 5+ sample at the real chips registry
609	2026-09-29	mezivillager	risk:0	36	0	PASS	chore(harness): ledger merges by union; verifier reads the PR's own CI
610	2026-09-29	mezivillager	risk:1	49	44	PASS	fix(cli): refuse a BUILTIN stand-in, JSON usage errors, bus values in 
606	2026-09-29	mezivillager	risk:1	12	410	PASS	test(serialization): characterize legacy evaluation before and after a
612	2026-09-29	mezivillager	risk:0	0	49	PASS	test: explicit timeouts for tests that time out at 5 s under load
614	2026-09-29	mezivillager	risk:1	75	128	PASS	fix(core): one .out formatter, and a cli driver that reports a missing
616	2026-09-29	mezivillager	risk:0	137	0	PASS	docs(rulings): R761–R772 from the 2026-09-29 hacer-loop-60 run
615	2026-09-29	mezivillager	risk:1	18	211	PASS	test(scene): characterize the legacy renderer's ADR-0008 circuits as h
617	2026-09-29	mezivillager	risk:1	126	273	PASS	test(store): characterize the legacy store actions the @store suite dr
618	2026-09-29	mezivillager	risk:1	14	38	PASS	test(core): characterization catches a lossy round trip and an orphane
621	2026-09-29	mezivillager	risk:0	52	34	PASS	chore(harness): protected-path warning names each glob and its reason
619	2026-09-29	mezivillager	risk:2	54	69	PASS	fix(core): fail a .tst that names a pin the chip lacks
623	2026-09-29	mezivillager	risk:0	15	48	PASS	test(test-utils): characterization suites share one golden guard that 
626	2026-09-29	mezivillager	risk:0	127	94	PASS	feat(mission-control): queue-an-improvement links and the needs-human 
628	2026-09-29	mezivillager	risk:0	10	0	PASS	chore(test): cap vitest at 3 workers so parallel agents don't throttle
629	2026-09-29	mezivillager	risk:1	176	71	PASS	chore(ci): pin every workflow action by commit SHA and grant token wri
630	2026-09-29	mezivillager	risk:2	325	3	PASS	refactor(core): move hacer test's engine path from runCli into @/core
631	2026-09-29	mezivillager	risk:2	248	213	PASS	feat(mcp): hacer_hdl, a read-only MCP tool that tests an HDL chip
635	2026-09-29	mezivillager	risk:0	8	1	PASS	chore(layers): surfaces-through-core rule for cli and mcp
634	2026-09-29	mezivillager	risk:1	26	46	BLOCK,PASS	chore(harness): pr-hygiene deletion exemption fails closed; refusals n
636	2026-09-29	mezivillager	risk:0	169	0	PASS	docs(harness): session record 2026-09-29, rulings R773–R778, ledger L0
644	2026-10-01	mezivillager	risk:1	30	34	PASS	chore(backlog): name filed-elsewhere issues, on-request before the gat
645	2026-10-01	mezivillager	risk:0	34	26	PASS	fix(mission-control): Process view labels at 375 px, Verifying drill-d
643	2026-10-01	mezivillager	risk:2	13	57	PASS	fix(hdl): accept the reference BUILTIN form without PARTS:
646	2026-10-01	mezivillager	risk:0	98	0	PASS	docs(research): fidelity review of the BUILTIN form without PARTS: (#6
647	2026-10-01	mezivillager	risk:0	4	9	PASS	fix(mission-control): Ready counts only tasks with no reason
650	2026-10-01	mezivillager	risk:2	1398	0	PASS	chore(skills): one skill per job, a sync that cannot re-add, one spec/
652	2026-10-01	mezivillager	risk:1	250	119	PASS	chore(harness): hold eslint-suppressions.json to the ratchet as a seco
651	2026-10-01	mezivillager	risk:1	154	115	PASS	chore(harness): merge-on-green refuses a stale green (#407)
653	2026-10-01	mezivillager	risk:1	227	57	PASS	feat(mission-control): the lineage graph as a view (DL-7)
660	2026-10-01	mezivillager	risk:0	7	0	PASS	docs: one source of truth for phase status
661	2026-10-01	mezivillager	risk:2	16	27	PASS	chore(harness): docs-only exemption needs every changed file to be doc
662	2026-10-01	mezivillager	risk:2	89	74	PASS	chore(harness): harden lint:docs fence tracking, line:col suffixes, ti
663	2026-10-01	mezivillager	risk:0	9	0	PASS	docs: close the three malformed code fences the fence check reports
666	2026-10-01	mezivillager	risk:0	92	0	PASS	docs: retire WORK-SYSTEM.md's live sections
664	2026-10-01	mezivillager	risk:1	96	99	PASS	chore(harness): pin agent definitions; verifier tier sentence must mat
668	2026-10-01	mezivillager	risk:1	8	0	PASS	docs: one owner and one escape hatch for the no-main rule
670	2026-10-01	mezivillager	risk:1	110	61	PASS	chore(ci): a manual dispatch no longer posts a required check
654	2026-10-01	dependabot[bot]	-	18	0	-	chore(deps): bump pnpm/action-setup from 6.0.10 to 6.1.0
672	2026-10-01	mezivillager	risk:2	120	109	PASS	fix(harness): merge-on-green rebases a stale branch and stops at the f
655	2026-10-01	dependabot[bot]	-	2	0	-	chore(deps-dev): bump jsdom from 30.1.0 to 30.1.1
656	2026-10-01	dependabot[bot]	-	2	0	-	chore(deps): bump @radix-ui/react-scroll-area from 1.2.10 to 1.2.18
657	2026-10-01	dependabot[bot]	-	2	0	-	chore(deps): bump tailwind-merge from 3.6.0 to 3.7.0
658	2026-10-01	dependabot[bot]	-	2	0	-	chore(deps-dev): bump @vitejs/plugin-react from 6.0.2 to 6.1.1
659	2026-10-01	dependabot[bot]	-	2	0	-	chore(deps-dev): bump @commitlint/cli from 21.0.1 to 21.2.3
673	2026-10-01	mezivillager	risk:0	2	21	PASS	fix(harness): agent frontmatter parses strictly
674	2026-10-01	mezivillager	risk:0	249	0	PASS	docs(harness): session record for the 2026-10-02 run, rulings R779–R79
675	2026-10-01	mezivillager	risk:0	18	0	PASS	docs(harness): the 2026-10-02 run closed at 01:41Z, before the reset (
678	2026-10-04	mezivillager	risk:0	20	0	PASS	docs(harness): claim and release the cloud lane's claims through backl
679	2026-10-04	mezivillager	risk:1	42	27	PASS	chore(harness): required-checks guard refuses a job name it cannot rea
680	2026-10-04	mezivillager	risk:0	3	0	PASS	docs(harness): Handoff is required when a claim is paused or handed of
681	2026-10-04	mezivillager	risk:1	114	156	PASS	chore(harness): lint:case — fail on case-only path and module-stem col
683	2026-10-04	mezivillager	risk:1	295	182	PASS	chore(harness): lint:docs checks every cited path under docs/
684	2026-10-04	mezivillager	risk:1	184	146	PASS	chore(harness): issue-facts checks package and path claims before disp
686	2026-10-04	mezivillager	risk:1	25	64	PASS	chore(harness): lint:case catches NFC/NFD twins and reports a collidin
687	2026-10-04	mezivillager	risk:1	89	39	PASS	chore(harness): one owned-skills list for the sync and the doc-path ch
690	2026-10-04	mezivillager	risk:0	6	2	PASS	chore(wiring): spec citations point at docs/specs after the move
688	2026-10-04	mezivillager	risk:0	6	0	PASS	docs(decisions): ADR-0010 and rule 021 name the shared owned-skills li
689	2026-10-04	mezivillager	risk:1	321	286	PASS	chore(harness): doc-path baseline counts dead citations per doc, resol
691	2026-10-04	mezivillager	risk:0	149	0	PASS	docs(harness): session record for the 2026-10-04 run, rulings R796–R80
WINDOW 2026-09-29: merged=32 medianReviewable=63.5 over400=0 withVerdict=32 blocked=2
WINDOW 2026-10-01: merged=21 medianReviewable=89 over400=1 withVerdict=21 blocked=0
WINDOW 2026-10-04: merged=12 medianReviewable=65.5 over400=0 withVerdict=12 blocked=0
ALL (non-dependabot): merged=65 medianReviewable=73 dependabot=10 blocked=586 634
```
