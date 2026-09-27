# Independent controls and foundation-run trace

Read-only process assessment at repository revision `eeb9253`, 2026-09-27. The existing
process-review report was not consulted before forming these findings. Commands below make no
network changes; the claim experiment creates and deletes isolated temporary repositories.
Observed command results are **measured**; consequences and recommendations are **inferred**.

## Claim exclusion is not enforced by the documented command

**High; effort S; coordinator.** `.claude/skills/ha-next/SKILL.md:39` says an ordinary
`git push origin HEAD:refs/heads/claim/<n>` rejects a second creation. Git updates refs: an
existing ref at the same commit returns success, and an existing ancestor can fast-forward.
The command therefore does not establish which coordinator acquired an exclusive claim.
`BRIEF.md:52` overstates the control as atomic. Atomic ref updates and exclusive acquisition
are different properties.

Measured local-only reproducer, from the repo root:

```sh
python3 <<'PY'
import pathlib, subprocess, tempfile
with tempfile.TemporaryDirectory(prefix='hacer-claim-review-') as root:
    root=pathlib.Path(root); remote=root/'remote.git'; work=root/'work'
    def git(*args):
        return subprocess.run(['git', '-c', 'core.hooksPath=/dev/null',
            '-c', 'commit.gpgsign=false', '-c', 'user.name=Fixture',
            '-c', 'user.email=fixture@example.invalid', *map(str,args)],
            text=True, capture_output=True)
    for args in [('init','--bare',remote), ('init',work),
                 ('-C',work,'commit','--allow-empty','-m','test: claim fixture'),
                 ('-C',work,'remote','add','origin',remote)]:
        result=git(*args); assert result.returncode==0, result.stderr
    ref='refs/heads/claim/1'
    for label in ['first claim','second claimant, same HEAD']:
        result=git('-C',work,'push','origin',f'HEAD:{ref}')
        print(f'{label}: exit={result.returncode}; '+
            ('up-to-date' if 'Everything up-to-date' in result.stderr else
             'created' if '[new branch]' in result.stderr else result.stderr.strip()))
    result=git('-C',work,'push',f'--force-with-lease={ref}:','origin',f'HEAD:{ref}')
    print(f'empty lease, same HEAD: exit={result.returncode}; '+
        ('up-to-date' if 'Everything up-to-date' in result.stderr else result.stderr.strip()))
    result=git('-C',work,'commit','--allow-empty','-m','test: descendant claim fixture')
    assert result.returncode==0, result.stderr
    result=git('-C',work,'push',f'--force-with-lease={ref}:','origin',f'HEAD:{ref}')
    print(f'empty lease, unique descendant HEAD: exit={result.returncode}; '+
        ('rejected stale info' if '(stale info)' in result.stderr else result.stderr.strip()))
    result=git('-C',work,'push','origin',f'HEAD:{ref}')
    print(f'second claimant, descendant HEAD: exit={result.returncode}; '+
        ('fast-forwarded' if result.returncode==0 else result.stderr.strip()))
PY
```

```text
first claim: exit=0; created
second claimant, same HEAD: exit=0; up-to-date
empty lease, same HEAD: exit=0; up-to-date
empty lease, unique descendant HEAD: exit=1; rejected stale info
second claimant, descendant HEAD: exit=0; fast-forwarded
```

Cost if unfixed: duplicate builders, overwritten ownership and premature release of another
coordinator's claim. Use a unique claim identity plus create-if-absent semantics; require the
same owner when releasing. An empty expected-old lease **alone** is insufficient for the
same-commit case. Test two simultaneous claimants before shipping a replacement.

Strongest counterargument: `ha-next` first lists refs (`:16`) and tells the coordinator to skip
existing claims (`:50`), so attentive agents usually avoid the defect. That pre-check cannot
close a check-then-create race, and no duplicate production build was demonstrated here.

## The eight-slot cycle exists within one listing, not across successive picks

**High; effort M; coordinator.** `scripts/backlog.logic.mjs:137` initializes rotation on every
call; `:139` also resets the auxiliary cursor. `scripts/backlog.mjs:51` supplies only current
issues, portfolio rows and an allowlist. There is no previous-pick input. Conversely,
`ha-next/SKILL.md:19` tells a new invocation to show the top pick. A coordinator repeatedly
taking the top ready item can exhaust foundation, then lineage, then harness while postponing
the spine. This disproves enforcement of a persistent cycle, not the ordering of one listing.

Measured pure-function reproducer:

```sh
node --input-type=module <<'NODE'
import {planReady, summarizeProjects} from './scripts/backlog.logic.mjs';
const rows=['foundation','lineage','harness','mission-control','spine','verify','upkeep','horizon']
  .map((slug,i)=>({slug,rank:i+1,epicNumber:900+i,lane:'feature'}));
let issues=rows.flatMap((r,i)=>[1,2,3].map(k=>({
  number:(i+1)*100+k,title:r.slug,author:{login:'mezivillager'},
  labels:[{name:'agent-ready'},{name:`project:${r.slug}`}]
})));
console.log('one full ready list:',planReady(issues,rows).filter(x=>x.reason===null)
  .map(x=>x.project).join(','));
const taken=[];
for(let i=0;i<8;i++){
  const next=planReady(issues,rows).find(x=>x.reason===null);
  taken.push(next.project);issues=issues.filter(x=>x.number!==next.number);
}
console.log('eight sequential top-picks:',taken.join(','));
console.log('horizon task:',JSON.stringify(planReady(issues,rows).find(x=>x.project==='horizon')));
console.log('horizon summary:',JSON.stringify(summarizeProjects(issues,rows).find(x=>x.slug==='horizon')));
NODE
```

```text
one full ready list: foundation,lineage,harness,foundation,mission-control,spine,foundation,verify,lineage,harness,mission-control,spine,upkeep,lineage,harness,mission-control,spine,verify,upkeep,verify,upkeep
eight sequential top-picks: foundation,foundation,foundation,lineage,lineage,lineage,harness,harness
horizon task: {"number":801,"title":"horizon","labels":["agent-ready","project:horizon"],"blocking":[],"project":"horizon","rank":8,"lane":"feature","pickable":true,"reason":"on-request"}
horizon summary: {"slug":"horizon","epicNumber":907,"open":3,"ready":3,"inProgress":0,"needsHuman":0,"next":{"number":801,"title":"horizon"}}
```

Cost if unfixed: the promised allocation depends on coordinator memory. Persist a minimal
pick cursor or derive it from an authoritative claim history; advance it with successful
acquisition. Test separate invocations, restarts and competing coordinators. Preserve the
foundation gate and critical-bug precedence.

Strongest counterargument: a coordinator can consume the whole ordered list or explicitly
remember its place. The fixture demonstrates potential starvation, not measured starvation
in the actual runs. It still means `BRIEF.md:49` confuses ordering code with execution control.

Two adjacent gaps from the same sources:

- **Medium; effort S; coordinator:** `on-request` and `not-pulled` tasks retain
  `pickable: true` at `backlog.logic.mjs:190`; `summarizeProjects` uses that flag for ready
  counts and next suggestions at `:200–207`. The horizon fixture above is visibly on-request
  yet counted ready. `formatReady` and Mission Control's main next-pick list instead filter
  `reason === null` (`:217`; `scripts/mission-control/collect.logic.mjs:184`), so this is a
  reporting inconsistency, not proof that the normal ready listing launches horizon work.
- **Medium; effort S/M; coordinator:** dormant mode requires PR count and last human merge
  (`docs/portfolio.md:106`), neither present in planner inputs. `ha-next:13` manually checks
  open PRs; it does not implement the last-human-merge condition. `BRIEF.md:49` therefore
  cannot describe dormant mode as enforced by `backlog.logic.mjs`. Identity shared by owner
  and agents also makes a literal human-merge signal ambiguous.

## Whole-run trace: foundation, 2026-09-23

Inspected the run's local `queue.json`, `rulings.md` and `END-OF-RUN.md` as requested. Those
serve dispatch state, decisions and closeout respectively. The trace and facts below cite
only repository material and public GitHub metadata; no private run contents are reproduced.

| Step | Public evidence | Assessment |
|---|---|---|
| Intent and budget | `docs/harness/sessions/2026-09-23.md:25` and `:39` | Foundation work, a stated ceiling and a standing publishing grant. |
| Investigate before architecture | session `:47–57`; rulings R301 (`2026-09-23-foundation.md:5`) and R318 (`:168`) | Two spikes exposed engine defects and changed the architecture choice. |
| Build and claims | session PR inventory `:61–72`; merged PRs below | Claims and worktree cleanup were recorded, but exclusive acquisition is not guaranteed by the documented command. |
| Independent verification | session `:200–207`, `:224–238`; rulings R395 (`:988`) | Verifiers corrected a false reproduction claim, required post-rebase verification and found regressions introduced by fixes. |
| Recover required checks | R315 (`:141`); session `:286–288` | Bulk reruns worsened cancellation; serialized recovery became a tool. Preserve the diagnosis and regression check. |
| Recover concurrent merge interaction | R390–R396 (`:931–1008`) | A new rule and a second PR could be green separately but violate the combined tree. A builder noticed; rebase and verification recovered it before shipping. |
| First close, then continued work | session `:138–145`, `:243–259`; R352 (`:529`) | The initial record described an earlier state. A later closeout records the continuation and final ceiling reading. |
| Memory and next run | session `:248–270`; public rulings R301–R408 | Resume pointers exist, but earlier next-pick and close statements remain beside later corrections. Readers must reconstruct chronology. |

**The brief's run total is wrong under its own apparent counting convention.** Measured:
the session's first merged table has 10 PRs, its closing addition has 5 more, and 2 PRs wrote
and closed the record: **17 distinct merged PRs**, or **15 excluding records**, not 13
(`BRIEF.md:113`). This is a historical reconciliation, not a live-state change after the brief.
The overall run-sum claim (`BRIEF.md:104`) should be re-derived, not adjusted by guesswork.

Public query used (the locally installed authenticated `gh` binary):

```sh
gh pr list -R mezivillager/hacer --state merged --search 'merged:2026-09-22..2026-09-24' \
  --limit 100 --json number,mergedAt,title \
  --jq '.[] | select(.number == 351 or .number == 358 or .number == 360 or .number == 362 or .number == 365 or .number == 366 or .number == 370 or .number == 375 or .number == 387 or .number == 388 or .number == 393 or .number == 396 or .number == 398 or .number == 399 or .number == 404 or .number == 409 or .number == 412) | [.number,.mergedAt] | @tsv'
```

Measured merged timestamps, all UTC on 2026-09-23:

```text
351 02:13:37   358 01:32:30   360 00:15:54   362 00:26:19
365 00:45:29   366 00:41:49   370 01:26:49   375 02:05:54
387 02:21:59   388 02:24:24   393 02:44:03   396 03:55:10
398 03:22:17   399 05:10:02   404 04:13:12   409 05:46:43
412 05:52:32
```

## Protect, simplify, and bound

Protect independent executable review. The strongest evidence is not the number of verdict
comments: R395 records regressions introduced while addressing earlier blockers, and the
session at `:281–285` records a property generator finding zero defects until dependency
depths varied. Preserve red-against-the-original-defect checks and oracle comparisons; do
not equate extra review rounds with wasted ceremony.

Simplify memory to one derived current-state record plus decision deltas. Preserve the useful
rulings that explain why a choice changed. The run-count error and old close/next statements
show the cost of copying state into several narratives. A collector can preserve history
while rendering a single authoritative closeout from PRs, claims and run events.

Biggest autonomy risk, inferred: a coordinator still supplies missing execution state and
transition checks. A month without the owner is not demonstrated by absence of `needs-human`
labels. Stops need a run-specific expiry/reset boundary; claim acquisition needs ownership;
picks need a durable cursor; merging needs validation of the current combined state. The
local hook and helper paths were inspected for purpose, not published as portable controls.

Limits: no laptop app or browser tests ran; no real claim races or abandoned runs were
induced; no settings, hooks, skills, issues or PRs were changed. Local-only implementations
were not executed. This assessment does not establish an escaped-defect rate or explain the
GitHub stuck-merge root cause.
