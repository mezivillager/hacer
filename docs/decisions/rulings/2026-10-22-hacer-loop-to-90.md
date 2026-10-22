# Rulings — 2026-10-22 hacer-loop-to-90

The coordinator loop run of 2026-10-22 from 13:51Z, the second run of the day. Owner's hand-over: "run
the loop until weekly usage reaches 90%". Weekly usage was 84% at the start (13:50Z); the meter resets
on 2026-10-23T03:00Z. Publishing `on-green` under the standing grant. The run judged the first inbox
entries of the judge queue built the same day (R889) and fixed and merged the one build the 80% run had
left open, #959. It stopped starting new chains at 87%.

## R890 — the run stops at weekly_all 90% or the 2026-10-23T03:00Z reset, whichever comes first; no new chain at 87% or above, and the records start at 88%
Builds on: R880
Coordinator, 2026-10-22T13:51Z; the owner: "run the loop until weekly usage reaches 90%". The margins
are R852's and R880's.
Cost if wrong: the run stops a little early or late of the owner's line.

## R891 — the weekly meter is read from Claude Code's own status-line capture, not the browser
Builds on: R880
Coordinator, 2026-10-22T13:51Z; the owner: "claude itself is now displaying weekly usage ... if you can
easily check usage with that, check it out". The owner's status line (`statusLine` in the user
settings) receives Claude Code's `rate_limits` and saves them every 60 s to a per-session file in
Claude Code's state directory as `{captured_at, rate_limits: {five_hour, seven_day: {used_percentage,
resets_at}}}`. This session's file read seven_day 84% (resets 2026-10-23T03:00Z, matching the browser's
weekly_all reset) at 13:50:36Z. No browser tab, no bot check, no extension. The browser endpoint stays
the fallback when the file is older than 5 minutes.
Cost if wrong: if `seven_day` is not the same meter as `weekly_all`, the stop line is read from the
wrong number; the next browser reading checks it once.

## R892 — PR #959 traces id twins (`7` and `"7"`) as two entities, where `main` conflates them
Builds on: R888
Coordinator, 2026-10-22T14:08Z. The #959 fix keys the wiring index and the walk by JSON value, as the
deserializer does (`src/core/serialization/deserialize.test.ts:243-249`). `main` keys its own trace by
a template string. That makes it read twin `"7"` from twin `7` as a loop, and lets it reuse one twin's
cached reading for the other. No walk reproduces that collision: keeping `main`'s keys still differed
on 252 of 3,000 twin documents. The builder's probe matched `main` on 37,000 string-id and 12,000
numeric-id documents, and differs only on twin documents (1,479 of 12,000). Each of those differences
is `main`'s own collision: on its repros `main` reports a false "reads nothing at junction 7" or "only
loops back to itself". The issue's unchanged-output criterion covers its corpora, which carry string
ids only.
Cost if wrong: a document that names one junction or joiner `7` and another `"7"` imports differently
from `main`, without `main`'s false notes; the fresh verifier judges it.

## R893 — HRN inbox entries are reviewed in batches; R844 amended for HRN
Builds on: R844
Amends: R844
Judge, 2026-10-22T14:14Z, decision JDG-002 on #968 (issuecomment-6342964262); recorded by the
coordinator. HRN entries are reviewed at most five per `inbox-review` issue, with one panel per batch.
A `policy` entry that changes a correctness gate keeps its own review and panel: the verifier's verdict
or block rule, ADR-0018's fidelity review, or what `merge-on-green` or a required check accepts. FID,
PRD and JDG entries stay one review per entry. There is no cap on harness builds, because the
2026-10-22 run's 1 harness build against 4 foundation builds shows it would never bind. Built by #978.
Cost if wrong: a batch thins each entry's review; any entry can be re-proposed and reviewed alone.

## R894 — the loop gets a weekly cloud start, after a probe
Builds on: R889
Judge, 2026-10-22T14:40Z, decision JDG-003 on #969 (issuecomment-6343469295); recorded by the
coordinator. A one-off cloud probe (#980) measures clone, push, `gh`, `backlog.mjs ready`, Chromium
install and the PR-preview host. An owner step is filed as `needs-human` only for a line that fails.
Then one weekly routine (#981) runs on Wednesdays at 21:17Z, before the Thursday 03:00Z reset. It picks
one `risk:0`/`risk:1` issue per fire, never a `judge-review` or `inbox-review` one, stands down when
another session holds a live claim (#955), and merges only after a verifier PASS. It takes the one
recurring-routine slot. The weekly-meter guard (R741, R747) binds coordinator runs, not this routine,
which cannot read the meter. The coordinator creates both routines under the 2026-09-19 permission
(R98), and the owner can disable them at claude.ai/code/routines. #257 waits on the probe's browser
lines.
Cost if wrong: one routine fire a week spends usage the owner did not schedule himself; he disables it
in one click.
