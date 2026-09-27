// Pure pick-rule logic for scripts/backlog.mjs — no I/O, unit-tested in backlog.logic.test.mjs.
//
// Input: the open issues from one `gh issue list --json …` call plus the rows of the table in
// docs/portfolio.md, whose "Pick rule" section is what this file computes, the open claims (#531,
// `readClaims` at the foot of this file), the claims made before, from which the cycle resumes (#535,
// `claimHistory`), and the open PRs, which set dormant mode (#540). Output: plain data.

export const DEFAULT_ALLOWLIST = ['mezivillager']

/**
 * Pick rule 2: the eight-slot cycle, one pick per slot, repeated until every bucket is drained. This
 * is the literal line under "Pick rule" in docs/portfolio.md; the test keeps the two in step.
 *
 * Amended 2026-09-21 (#330) while the foundation plan (#318) runs — foundation first, process
 * alongside. `harness`, `spine` and `aux` stay in the cycle on purpose: BUCKET_ORDER is derived from
 * this list and anything outside it is filed `on-request`, so dropping a row erases it rather than
 * deprioritising it. `surfaces`/`pubdocs` work the plan needs is pulled forward by one label instead
 * (PRIORITY_ROWS). Reverting to `['surfaces', 'harness', 'spine', 'aux', 'surfaces', 'harness']`
 * lifts that amendment.
 *
 * Amended again 2026-09-25 (#482): the owner approved `lineage` (#457) and `mission-control` (#458)
 * "equal footing as the other priority projects" — one slot each, literally equal to `harness` and
 * `spine`; `foundation` keeps its three picks, spaced further apart to make room.
 */
export const PICK_ROTATION = [
  'foundation', 'lineage', 'harness', 'foundation', 'mission-control', 'spine', 'foundation', 'aux',
]

/** The `aux` slot takes these buckets in turn, skipping an empty one. */
export const AUX_ROTATION = ['verify', 'upkeep', 'bugs']

/**
 * Rows whose `research` tasks come first inside a slot (docs/portfolio.md "Design first").
 * `foundation` is here so the ADR the plan waits on (#327) leads its own slot.
 */
export const DESIGN_FIRST_SLUGS = ['foundation', 'surfaces', 'core']

/**
 * Rows that win over whatever `project:` label GitHub happens to list first — label-creation order,
 * an accident. Pulling an issue forward is one added label: it files here while keeping its original
 * row's label, so that epic's progress and the hand-in-hand rule still count it. Empty this list to
 * go back to "first label wins".
 */
const PRIORITY_ROWS = ['foundation']

/**
 * The foundation gate (`docs/research/2026-09-21-foundation-audit/REPORT.md` §7), in force for as
 * long as the rotation above is: a `risk:2` task outside the rows below is held, and `ready` prints
 * GATE_REASON so the output says why. That label already marks the store, UI, R3F and architecture
 * paths the plan is replacing — which is
 * where new hand-editing work (wire drawing, junction placement, dragging, previews) lands — so the
 * safe-to-proceed test is this filter, not a second label. `sev:critical` is never held: a bug that
 * corrupts evaluation is still fixed in the evaluation layer. `lineage` and `mission-control` join
 * for the same reason `harness` is exempt: their `risk:2` work is CI checks, not the store/UI/R3F or
 * architecture paths this gate protects.
 */
const GATED_RISK_LABEL = 'risk:2'
const GATE_EXEMPT_ROWS = ['foundation', 'harness', 'lineage', 'mission-control']
const GATE_REASON = 'foundation-gate'
const heldByGate = (task) =>
  task.labels.includes(GATED_RISK_LABEL) && !GATE_EXEMPT_ROWS.includes(task.project)

const AUX_SLOT = 'aux'
/** Rows that queue in another row's bucket: `pubdocs` shares the `surfaces` slot — both `on-request` while #330's rotation runs. */
const SHARED_BUCKET = new Map([['pubdocs', 'surfaces']])
/** Every bucket the cycle can draw from, in cycle order (the aux buckets last). */
const BUCKET_ORDER = [...new Set(PICK_ROTATION.filter((slot) => slot !== AUX_SLOT)), ...AUX_ROTATION]
const bucketOf = (slug) => SHARED_BUCKET.get(slug) ?? slug

const byNumber = (a, b) => a.number - b.number
const designFirst = (task) => (DESIGN_FIRST_SLUGS.includes(task.project) && task.labels.includes('research') ? 0 : 1)
const byDesignFirstThenNumber = (a, b) => designFirst(a) - designFirst(b) || a.number - b.number

/**
 * Parse the portfolio table `| rank | slug | Project | [#epic](…) | lane | … |`.
 * @returns {{rank:number, slug:string, epicNumber:number, lane:string}[]} in file order
 */
export function parsePortfolio(markdown) {
  const rows = []
  for (const line of (markdown ?? '').split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim())
    const epicRef = /#(\d+)/.exec(cells[4] ?? '')
    if (cells.length < 7 || !/^\d+$/.test(cells[1]) || !epicRef) continue
    rows.push({ rank: Number(cells[1]), slug: cells[2], epicNumber: Number(epicRef[1]), lane: cells[5] })
  }
  return rows
}

/** The row an issue files under: a PRIORITY_ROWS label, else its first `project:<slug>` label, else its parent epic. */
function portfolioRowOf(issue, labels, rowBySlug, rowByEpic) {
  const slugs = labels.filter((name) => name.startsWith('project:')).map((name) => name.slice('project:'.length))
  const slug = slugs.find((candidate) => PRIORITY_ROWS.includes(candidate)) ?? slugs[0]
  if (slug !== undefined) return rowBySlug.get(slug) ?? null
  return rowByEpic.get(issue.parent?.number) ?? null
}

const openNumbers = (relation) =>
  (relation?.nodes ?? []).filter((node) => node.state !== 'CLOSED').map((node) => node.number)

/** Why a task is not pickable — first match wins — or null when it is. An open claim ref wins over every label. */
function unpickableReason(issue, labels, row, allowlist, claim) {
  if (claim) return claim.stale ? 'stale-claim' : 'claimed'
  if (!allowlist.includes(issue.author?.login)) return 'author'
  if (labels.includes('in-progress')) return 'in-progress'
  if (labels.includes('needs-human')) return 'needs-human'
  if (!labels.includes('agent-ready') || !row) return 'unshaped'
  const blockers = openNumbers(issue.blockedBy)
  return blockers.length > 0 ? `blocked:${blockers.map((number) => `#${number}`).join(',')}` : null
}

/** Every open non-epic issue as a task, by number: its portfolio row, whether it is pickable, and why not. */
export function triageTasks(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST, claims = []) {
  const claimByNumber = new Map(claims.map((claim) => [claim.number, claim]))
  const rowBySlug = new Map(portfolioRows.map((row) => [row.slug, row]))
  const rowByEpic = new Map(portfolioRows.map((row) => [row.epicNumber, row]))
  const tasks = []
  for (const issue of issues) {
    const labels = (issue.labels ?? []).map((label) => label.name)
    if (labels.includes('epic')) continue
    const row = portfolioRowOf(issue, labels, rowBySlug, rowByEpic)
    const reason = unpickableReason(issue, labels, row, allowlist, claimByNumber.get(issue.number))
    tasks.push({
      number: issue.number, title: issue.title, labels, blocking: openNumbers(issue.blocking),
      project: row?.slug ?? null, rank: row?.rank ?? null, lane: row?.lane ?? null,
      pickable: reason === null, reason,
    })
  }
  return tasks.sort(byNumber)
}

/** The aux bucket to draw from: the first non-empty one at or after `from`, in AUX_ROTATION order; -1 if none. */
function nextAux(buckets, from) {
  for (let step = 0; step < AUX_ROTATION.length; step++) {
    const index = (from + step) % AUX_ROTATION.length
    if (buckets.get(AUX_ROTATION[index]).length > 0) return index
  }
  return -1
}

/** One pick per PICK_ROTATION slot from `start` on, an empty slot skipped, repeated until every bucket is drained. */
function rotate(buckets, start) {
  const picks = []
  let aux = start.aux
  const take = (name) => {
    if (buckets.get(name).length > 0) picks.push(buckets.get(name).shift())
  }
  while ([...buckets.values()].some((bucket) => bucket.length > 0)) {
    for (let step = 0; step < PICK_ROTATION.length; step++) {
      const slot = PICK_ROTATION[(start.slot + step) % PICK_ROTATION.length]
      if (slot !== AUX_SLOT) {
        take(slot)
        continue
      }
      const index = nextAux(buckets, aux)
      if (index < 0) continue
      take(AUX_ROTATION[index])
      aux = (index + 1) % AUX_ROTATION.length
    }
  }
  return picks
}

/**
 * The bucket whose slot a task takes, or null for none: `sev:critical` goes ahead of the cycle, the gate holds, an
 * enabler takes the slot of the earliest bucket holding an open task it blocks (pull, don't push), and a row outside
 * the cycle is on-request.
 */
function slotting(tasks) {
  const bucketByNumber = new Map(tasks.map((task) => [task.number, bucketOf(task.project)]))
  return (task) => {
    if (task.labels.includes('sev:critical') || heldByGate(task)) return null
    const blocked = new Set(task.blocking.map((number) => bucketByNumber.get(number)))
    const bucket = task.lane === 'enabler' ? BUCKET_ORDER.find((name) => blocked.has(name)) : bucketOf(task.project)
    return BUCKET_ORDER.includes(bucket) ? bucket : null
  }
}

/** The PICK_ROTATION slot that serves `bucket`: its own, or `aux` for an aux bucket. */
const servingSlot = (bucket) => (AUX_ROTATION.includes(bucket) ? AUX_SLOT : bucket)

/** The place after a pick from `bucket`: past the next slot from `place.slot` on that serves it, as rotate took it. */
function advance(place, bucket) {
  const auxIndex = AUX_ROTATION.indexOf(bucket)
  const step = PICK_ROTATION.findIndex((_, offset) => PICK_ROTATION[(place.slot + offset) % PICK_ROTATION.length] === servingSlot(bucket))
  return { slot: (place.slot + step + 1) % PICK_ROTATION.length, aux: auxIndex < 0 ? place.aux : (auxIndex + 1) % AUX_ROTATION.length }
}

/** Each pick of `history` with the bucket whose slot it took by today's issues, or null for none (resumePoint's replay). */
function slotsTaken(issues, portfolioRows, history, allowlist) {
  const slotOf = slotting(triageTasks(issues, portfolioRows, allowlist))
  const earlier = new Map(triageTasks(history, portfolioRows, allowlist).map((task) => [task.number, task]))
  return history.map((pick) => ({ pick, bucket: earlier.has(pick.number) ? slotOf(earlier.get(pick.number)) : null }))
}

/**
 * Where the cycle resumes (#535): each earlier pick in `history` (claimHistory's, oldest claim first) advances to the
 * next slot serving its bucket, as rotate took it. A bucket with one slot pins the place, so the replay is exact from
 * the first such pick on. A pick that took no slot — `sev:critical`, held by the gate, an on-request row, unfiled, an
 * enabler pulled by nothing — leaves the place where it was. With no history, the cycle starts at its first slot.
 * @returns {{slot:number, aux:number, after:{number:number, bucket:string, at:string|null}|null}}
 */
export function resumePoint(issues, portfolioRows, history = [], allowlist = DEFAULT_ALLOWLIST) {
  let place = { slot: 0, aux: 0, after: null }
  for (const { pick, bucket } of slotsTaken(issues, portfolioRows, history, allowlist)) {
    if (bucket) place = { ...advance(place, bucket), after: { number: pick.number, bucket, at: pick.claimedAt ?? null } }
  }
  return place
}

/** The line `ready` prints beside its list: the slot the cycle resumes at, and the claim that put it there. */
export const formatResume = ({ slot, after }) => `cycle: slot ${slot + 1} of ${PICK_ROTATION.length} (${PICK_ROTATION[slot]}), ` +
  (after ? `after #${after.number} · ${after.bucket}, claimed ${after.at}` : 'no earlier claim on record')

/**
 * The pick rule over the pickable tasks: any `sev:critical` first; then the foundation gate holds
 * what is not safe to proceed on; then the eight-slot cycle over the buckets, `pubdocs` sharing the
 * `surfaces` slot, an enabler only while it blocks an open task of a bucket and then in that
 * bucket's slot (pull, don't push); on-request rows never. The cycle resumes after the latest pick
 * in `history`, the claims before this call (resumePoint), so successive top picks follow it too. Inside a slot,
 * `research` tasks of DESIGN_FIRST_SLUGS come first, then the oldest issue. Every task comes back
 * exactly once — the picks in pick order with `reason: null`, then the rest by number, each with
 * its one-word reason.
 */
export function planReady(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST, claims = [], history = []) {
  const tasks = triageTasks(issues, portfolioRows, allowlist, claims)
  const slotOf = slotting(tasks)
  const critical = []
  const buckets = new Map(BUCKET_ORDER.map((name) => [name, []]))
  const unpicked = tasks.filter((task) => !task.pickable)
  for (const task of tasks.filter((task) => task.pickable).sort(byDesignFirstThenNumber)) {
    if (task.labels.includes('sev:critical')) {
      critical.push(task)
      continue
    }
    if (heldByGate(task)) {
      unpicked.push({ ...task, pickable: false, reason: GATE_REASON })
      continue
    }
    const bucket = slotOf(task)
    if (bucket) buckets.get(bucket).push(task)
    else unpicked.push({ ...task, reason: task.lane === 'enabler' ? 'not-pulled' : 'on-request' })
  }
  return [...critical, ...rotate(buckets, resumePoint(issues, portfolioRows, history, allowlist)), ...unpicked.sort(byNumber)]
}

/** A row with more open `agent-ready` issues than this has outgrown shaping (reviews/2026-09-26 F12): `projects` warns. */
export const ROW_AGENT_READY_CAP = 12

/**
 * One summary per portfolio row, in file order: live counts, its stale claims and the next pick for that row. `ready`
 * counts what `ready` picks — a task with a reason (`on-request`, `not-pulled`, …) is not ready (#540); `next` is still
 * the row's first pickable task, what the owner gets on request. `agentReady` counts its open `agent-ready` issues.
 */
export function summarizeProjects(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST, claims = [], history = []) {
  const plan = planReady(issues, portfolioRows, allowlist, claims, history)
  return portfolioRows.map((row) => {
    const tasks = plan.filter((task) => task.project === row.slug)
    const next = tasks.find((task) => task.pickable) ?? null
    return {
      slug: row.slug,
      epicNumber: row.epicNumber,
      open: tasks.length,
      ready: tasks.filter((task) => task.reason === null).length,
      inProgress: tasks.filter((task) => task.labels.includes('in-progress')).length,
      needsHuman: tasks.filter((task) => task.labels.includes('needs-human')).length,
      staleClaims: tasks.filter((task) => task.reason === 'stale-claim').map((task) => task.number),
      agentReady: tasks.filter((task) => task.labels.includes('agent-ready')).length,
      next: next && { number: next.number, title: next.title },
    }
  })
}

const taskLine = (task) => `#${task.number} · ${task.project ?? '-'} · ${task.title}`

/** The picks, a blank line, then every other task with its reason as a trailing column. */
export function formatReady(plan) {
  const picks = plan.filter((task) => task.reason === null).map(taskLine)
  const rest = plan.filter((task) => task.reason !== null).map((task) => `${taskLine(task)} · ${task.reason}`)
  return [...picks, ...(picks.length > 0 && rest.length > 0 ? [''] : []), ...rest].join('\n')
}

/** `slug · open N · ready N · in-progress N · needs-human N [· stale-claim #n,…] [· over cap: N agent-ready > 12] · next: #n title`. */
export function formatProjects(summaries) {
  const nextLabel = (next) => (next ? `#${next.number} ${next.title}` : '—')
  const stale = (numbers) => (numbers.length > 0 ? ` · stale-claim ${numbers.map((number) => `#${number}`).join(',')}` : '')
  const overCap = (count) => (count > ROW_AGENT_READY_CAP ? ` · over cap: ${count} agent-ready > ${ROW_AGENT_READY_CAP}` : '')
  return summaries.map((s) => `${s.slug} · open ${s.open} · ready ${s.ready} · in-progress ${s.inProgress}` +
    ` · needs-human ${s.needsHuman}${stale(s.staleClaims)}${overCap(s.agentReady)} · next: ${nextLabel(s.next)}`).join('\n')
}

/** Dormant mode (docs/portfolio.md): at this many open agent PRs, no new PR-producing work. */
export const DORMANT_OPEN_PRS = 5

/** The open agent PRs — by the allowlist, whose identity agents share; drafts count, Dependabot's do not — and whether
 *  there are DORMANT_OPEN_PRS of them. `openPrs` is `gh pr list --state open --json number,author,…`. */
export function dormantMode(openPrs, allowlist = DEFAULT_ALLOWLIST) {
  const agentPrs = (openPrs ?? []).filter((pr) => allowlist.includes(pr.author?.login)).map((pr) => pr.number)
  return { dormant: agentPrs.length >= DORMANT_OPEN_PRS, agentPrs }
}

/** The banner `ready` prints first in dormant mode; null otherwise. */
export const formatDormant = ({ dormant, agentPrs }) => (dormant ? `DORMANT MODE — ${agentPrs.length} open agent PRs ` +
  `(${agentPrs.map((number) => `#${number}`).join(', ')}), cap ${DORMANT_OPEN_PRS}: no new PR-producing work; ` +
  'only horizon notes and issue shaping (docs/portfolio.md § Dormant mode)' : null)

// Claims (#531, sessions/COORDINATOR-HANDOFF.md). A claim is a `claim/<n>` ref that `backlog.mjs claim` creates through
// GitHub's create-ref API, which refuses a ref that exists; its holder is the `Claimed by` of the issue's latest claim
// comment — the latest comment by an allowlisted author that opens with that field.

/** A claim with no open PR is stale this long after its latest claim comment; `ready` then prints `stale-claim`. */
export const STALE_CLAIM_HOURS = 48
const STALE_CLAIM_MS = STALE_CLAIM_HOURS * 60 * 60 * 1000

/** `git ls-remote origin 'refs/heads/claim/*'` as {sha, ref, number}; a ref that is not `claim/<n>` is skipped. */
export const claimRefs = (lsRemote = '') => lsRemote.split('\n').filter(Boolean).map((line) => line.split('\t'))
  .map(([sha, ref]) => ({ sha, ref, number: Number(ref.split('/').pop()) })).filter((claim) => Number.isInteger(claim.number))

/** One GraphQL query for every claimed issue: its state, labels, and the comments that carry the claim fields. */
export function claimsQuery(repo, lsRemote) {
  const numbers = claimRefs(lsRemote).map((claim) => claim.number)
  if (numbers.length === 0) return null
  const [owner, name] = repo.split('/')
  const issue = (number) => `i${number}: issue(number: ${number}) { number title state url ` +
    'labels(first: 30) { nodes { name } } comments(last: 50) { nodes { author { login } createdAt url body } } }'
  return `query { repository(owner: "${owner}", name: "${name}") { ${numbers.map(issue).join(' ')} } }`
}

const CLAIM_FIELDS = { claimedBy: 'Claimed by', intent: 'Intent', session: 'Session/run', branch: 'Branch', handoff: 'Handoff' }
const claimFields = (body) => Object.fromEntries(Object.entries(CLAIM_FIELDS).map(([key, label]) =>
  [key, new RegExp(`^[ \\t]*${label}:[ \\t]*(.*?)(?:[ \\t]+#.*)?[ \\t]*$`, 'm').exec(body)?.[1] || null]))
/** A claim comment is by an allowlisted author and opens with the `Claimed by:` line — blank lines and indentation
 *  aside, which claimFields skips as well, so every claim it accepts names the holder that line names. */
const isClaim = (allowlist) => (node) => allowlist.includes(node.author?.login) && /^[ \t\r\n]*Claimed by:/.test(node.body ?? '')

/** The latest claim comment's fields, `author`, `at` and `url`; null when the issue has none. */
export function latestClaim(comments = [], allowlist = DEFAULT_ALLOWLIST) {
  const comment = comments.filter(isClaim(allowlist)).at(-1)
  return comment ? { ...claimFields(comment.body), author: comment.author.login, at: comment.createdAt, url: comment.url } : null
}

/** The issues whose claim comments claimHistory reads: the most recently updated, open or closed — one page of them. */
export const CLAIM_HISTORY_WINDOW = 50
/** The most pages readClaimHistory reads before it leaves the rest to historyGap. */
export const CLAIM_HISTORY_PAGES = 10

/** One GraphQL query for a page of the CLAIM_HISTORY_WINDOW most recently updated issues — the first, or the one after
 *  cursor `after` — how each files, and its comments. */
export function claimHistoryQuery(repo, after = null) {
  const [owner, name] = repo.split('/')
  return `query { repository(owner: "${owner}", name: "${name}") { issues(first: ${CLAIM_HISTORY_WINDOW}, ` +
    `${after ? `after: ${JSON.stringify(after)}, ` : ''}orderBy: {field: UPDATED_AT, direction: DESC}) { pageInfo { hasNextPage endCursor } ` +
    'nodes { number updatedAt parent { number } labels(first: 30) { nodes { name } } ' +
    'blocking(first: 20) { nodes { number state } } comments(last: 50) { nodes { author { login } createdAt body } } } } } }'
}

/** claimHistoryQuery's answer, or its pages newest first, as the issue connections they hold. */
const historyPages = (answer) => [answer].flat().map((page) => page?.data?.repository?.issues).filter(Boolean)
/** Whether the pages reach the oldest issue: the last has no next page, or (a page without pageInfo) is not full. */
const reachesEnd = (pages) => pages.length > 0 &&
  (pages.at(-1).pageInfo ? !pages.at(-1).pageInfo.hasNextPage : pages.at(-1).nodes.length < CLAIM_HISTORY_WINDOW)

/**
 * The picks resumePoint replays (#535), oldest first: every issue of claimHistoryQuery's answer — or its pages, read as
 * one window — with a claim comment, in the gh issue shape plus `claimedAt`, its first claim comment — the pick; later
 * ones change intent or resume it. A claim posts a comment, which updates the issue, so the window holds every claim
 * made since its oldest update; until it reaches the oldest issue, it drops the claims before that, which it cannot
 * show complete.
 */
export function claimHistory(answer, allowlist = DEFAULT_ALLOWLIST) {
  const pages = historyPages(answer)
  const nodes = [...new Map(pages.flatMap((page) => page.nodes).map((issue) => [issue.number, issue])).values()]
  const since = reachesEnd(pages) ? -Infinity : Math.min(...nodes.map((issue) => Date.parse(issue.updatedAt)))
  return nodes.flatMap(({ number, parent, labels, blocking, comments }) => {
    const first = comments.nodes.find(isClaim(allowlist))
    return first && Date.parse(first.createdAt) > since ? [{ number, parent, labels: labels.nodes, blocking, claimedAt: first.createdAt }] : []
  }).sort((a, b) => Date.parse(a.claimedAt) - Date.parse(b.claimedAt))
}

/**
 * What resumePoint's place leaves a guess, or null when nothing (#540; #555's verifier, nit 3). Short of the oldest
 * issue the replay starts from slot 1 unseen: a pick of a one-slot bucket fixes the slot from there on — foundation's
 * three do not — and an aux pick fixes the aux turn. Each matters only while two slots (two aux buckets) have a task
 * to order; claims aside, so it errs toward reading further.
 */
export function historyGap(answer, issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST) {
  const pages = historyPages(answer)
  if (pages.length === 0 || reachesEnd(pages)) return null
  const taken = slotsTaken(issues, portfolioRows, claimHistory(answer, allowlist), allowlist).map(({ bucket }) => bucket).filter(Boolean)
  const tasks = triageTasks(issues, portfolioRows, allowlist)
  const live = [...new Set(tasks.filter((task) => task.pickable).map(slotting(tasks)).filter(Boolean))]
  const oneSlot = (bucket) => PICK_ROTATION.filter((slot) => slot === servingSlot(bucket)).length === 1
  const isAux = (bucket) => AUX_ROTATION.includes(bucket)
  const unknown = [
    new Set(live.map(servingSlot)).size > 1 && !taken.some(oneSlot) && 'the slot',
    live.filter(isAux).length > 1 && !taken.some(isAux) && 'the aux turn',
  ].filter(Boolean)
  const count = pages.reduce((sum, page) => sum + page.nodes.length, 0)
  return unknown.length > 0 ? `no claim in the ${count} most recently updated issues fixes ${unknown.join(' or ')}` : null
}

/**
 * claimHistoryQuery's pages, newest first, each read by `fetchPage(after)` (`after` null for the first) until
 * historyGap has nothing to say, the pages reach the oldest issue, or CLAIM_HISTORY_PAGES are read. `fetchPage` does
 * the only I/O; backlog.mjs and the Mission Control collector both read through here.
 */
export async function readClaimHistory(fetchPage, issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST) {
  const pages = [await fetchPage(null)]
  const next = () => {
    const info = pages.at(-1)?.data?.repository?.issues?.pageInfo
    return info?.hasNextPage && pages.length < CLAIM_HISTORY_PAGES && historyGap(pages, issues, portfolioRows, allowlist) ? info.endCursor : null
  }
  for (let after = next(); after; after = next()) pages.push(await fetchPage(after))
  return pages
}

/** An open PR carries issue n when it closes #n or its head branch is `<type>/<n>-…` (scripts/wt-new's convention). */
const carries = (pr, number) => (pr.closingIssuesReferences ?? []).some((issue) => issue.number === number) ||
  new RegExp(`^[^/]+/${number}(?:-|$)`).test(pr.headRefName ?? '')

/**
 * Every claim ref with its holder, the open PR carrying its issue, and whether it is stale: no open PR, and its latest
 * claim comment older than STALE_CLAIM_HOURS — or no claim comment at all, since `claim` posts one the moment the ref
 * exists. Without the comments (`answer`, claimsQuery's) or the open PRs, nothing is stale: a claim holds until shown
 * otherwise. `now` is a time or an ISO date.
 * @returns {{number:number, claimedBy:string|null, at:string|null, openPr:number|null, stale:boolean}[]}
 */
export function readClaims({ lsRemote = '', answer = null, openPrs = null, allowlist = DEFAULT_ALLOWLIST, now }) {
  const answered = new Map(Object.values(answer?.data?.repository ?? {}).filter(Boolean).map((issue) => [issue.number, issue]))
  const nowMs = new Date(now).getTime()
  return claimRefs(lsRemote).map(({ number }) => {
    const issue = answered.get(number)
    const claim = issue ? latestClaim(issue.comments.nodes, allowlist) : null
    const openPr = openPrs?.find((pr) => carries(pr, number))?.number ?? null
    const old = claim === null || nowMs - Date.parse(claim.at) > STALE_CLAIM_MS
    return { number, claimedBy: claim?.claimedBy ?? null, at: claim?.at ?? null, openPr, stale: Boolean(issue && openPrs) && openPr === null && old }
  })
}

/** The claim comment `claim` posts: the handoff convention's fields, one per line, `Claimed by` first. */
export function claimComment({ by, intent = 'building', session, branch, handoff = 'none' }) {
  if (!/^[\w.-]+$/.test(by ?? '')) throw new Error(`--by must be one word, like claude-local (got ${JSON.stringify(by ?? '')})`)
  const fields = [['Claimed by', by], ['Intent', intent], ['Session/run', session], ['Branch', branch], ['Handoff', handoff]]
  if (fields.some(([, value]) => /[\r\n]/.test(value ?? ''))) throw new Error('every claim field must be one line')
  return fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join('\n')
}

const holderOf = (claim) => (claim.claimedBy === null ? 'none named (no claim comment)' : `${claim.claimedBy} (claimed ${claim.at})`)

/** What a second claimant is told: the ref exists, who holds it, and how a stale one is freed. */
export const claimTaken = (claim) => `claim/${claim.number} is taken; holder: ${holderOf(claim)}` +
  (claim.stale ? `; it is stale, so \`release ${claim.number} --by <you> --force-stale\` frees it` : '')

/** Why `release` refuses, or null to go ahead: the holder releases a claim; anyone else only a stale one, with --force-stale. */
export function releaseRefusal(claim, { by, forceStale = false }) {
  if (claim.claimedBy !== null && claim.claimedBy === by) return null
  if (claim.stale && forceStale) return null
  if (forceStale) {
    return `claim/${claim.number} is not stale — holder: ${holderOf(claim)}${claim.openPr ? `, open PR #${claim.openPr}` : ''}; only its holder releases it`
  }
  return `claim/${claim.number}'s holder is ${holderOf(claim)}, not ${by}: only the holder releases it` +
    (claim.stale ? ', or anyone with --force-stale now that it is stale' : '')
}

/** The comment `release` posts when it frees another holder's stale claim, as the handoff convention asks; null otherwise. */
export function releaseComment(claim, { by, reason }) {
  if (claim.claimedBy !== null && claim.claimedBy === by) return null
  return [`Released a stale claim: claim/${claim.number}, holder ${holderOf(claim)}, with no open PR.`,
    `Released by: ${by}`, ...(reason ? [`Reason: ${reason}`] : [])].join('\n')
}

