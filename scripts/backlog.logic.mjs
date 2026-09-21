// Pure pick-rule logic for scripts/backlog.mjs — no I/O, unit-tested in backlog.logic.test.mjs.
//
// Input: the open issues from one `gh issue list --json …` call plus the rows of the table in
// docs/portfolio.md, whose "Pick rule" section is what this file computes. Output: plain data.

export const DEFAULT_ALLOWLIST = ['mezivillager']

/**
 * Pick rule 2: the six-slot cycle, one pick per slot, repeated until every bucket is drained. This is
 * the literal line under "Pick rule" in docs/portfolio.md; the test keeps the two in step.
 *
 * Amended 2026-09-21 (#330) while the foundation plan (#318) runs — foundation first, process
 * alongside. `harness`, `spine` and `aux` stay in the cycle on purpose: BUCKET_ORDER is derived from
 * this list and anything outside it is filed `on-request`, so dropping a row erases it rather than
 * deprioritising it. `surfaces`/`pubdocs` work the plan needs is pulled forward by one label instead
 * (PRIORITY_ROWS). Reverting to `['surfaces', 'harness', 'spine', 'aux', 'surfaces', 'harness']`
 * lifts the amendment.
 */
export const PICK_ROTATION = ['foundation', 'foundation', 'harness', 'foundation', 'spine', 'aux']

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
 * corrupts evaluation is still fixed in the evaluation layer.
 */
const GATED_RISK_LABEL = 'risk:2'
const GATE_EXEMPT_ROWS = ['foundation', 'harness']
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

/** Why a task is not pickable — first match wins — or null when it is. */
function unpickableReason(issue, labels, row, allowlist) {
  if (!allowlist.includes(issue.author?.login)) return 'author'
  if (labels.includes('in-progress')) return 'in-progress'
  if (labels.includes('needs-human')) return 'needs-human'
  if (!labels.includes('agent-ready') || !row) return 'unshaped'
  const blockers = openNumbers(issue.blockedBy)
  return blockers.length > 0 ? `blocked:${blockers.map((number) => `#${number}`).join(',')}` : null
}

/** Every open non-epic issue as a task, by number: its portfolio row, whether it is pickable, and why not. */
export function triageTasks(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST) {
  const rowBySlug = new Map(portfolioRows.map((row) => [row.slug, row]))
  const rowByEpic = new Map(portfolioRows.map((row) => [row.epicNumber, row]))
  const tasks = []
  for (const issue of issues) {
    const labels = (issue.labels ?? []).map((label) => label.name)
    if (labels.includes('epic')) continue
    const row = portfolioRowOf(issue, labels, rowBySlug, rowByEpic)
    const reason = unpickableReason(issue, labels, row, allowlist)
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

/** One pick per PICK_ROTATION slot, an empty slot skipped, repeated until every bucket is drained. */
function rotate(buckets) {
  const picks = []
  let aux = 0
  const take = (name) => {
    if (buckets.get(name).length > 0) picks.push(buckets.get(name).shift())
  }
  while ([...buckets.values()].some((bucket) => bucket.length > 0)) {
    for (const slot of PICK_ROTATION) {
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
 * The pick rule over the pickable tasks: any `sev:critical` first; then the foundation gate holds
 * what is not safe to proceed on; then the six-slot cycle over the buckets, `pubdocs` sharing the
 * `surfaces` slot, an enabler only while it blocks an open task of a bucket and then in that
 * bucket's slot (pull, don't push); on-request rows never. Inside a slot,
 * `research` tasks of DESIGN_FIRST_SLUGS come first, then the oldest issue. Every task comes back
 * exactly once — the picks in pick order with `reason: null`, then the rest by number, each with
 * its one-word reason.
 */
export function planReady(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST) {
  const tasks = triageTasks(issues, portfolioRows, allowlist)
  const bucketByNumber = new Map(tasks.map((task) => [task.number, bucketOf(task.project)]))
  /** The bucket a pulled enabler takes a slot of: the earliest in the cycle holding an open task it blocks. */
  const pulledInto = (task) => {
    const blocked = new Set(task.blocking.map((number) => bucketByNumber.get(number)))
    return BUCKET_ORDER.find((name) => blocked.has(name)) ?? null
  }

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
    const bucket = task.lane === 'enabler' ? pulledInto(task) : bucketOf(task.project)
    if (buckets.has(bucket)) buckets.get(bucket).push(task)
    else unpicked.push({ ...task, reason: task.lane === 'enabler' ? 'not-pulled' : 'on-request' })
  }
  return [...critical, ...rotate(buckets), ...unpicked.sort(byNumber)]
}

/** One summary per portfolio row, in file order: live counts and the next pick for that row. */
export function summarizeProjects(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST) {
  const plan = planReady(issues, portfolioRows, allowlist)
  return portfolioRows.map((row) => {
    const tasks = plan.filter((task) => task.project === row.slug)
    const next = tasks.find((task) => task.pickable) ?? null
    return {
      slug: row.slug,
      epicNumber: row.epicNumber,
      open: tasks.length,
      ready: tasks.filter((task) => task.pickable).length,
      inProgress: tasks.filter((task) => task.labels.includes('in-progress')).length,
      needsHuman: tasks.filter((task) => task.labels.includes('needs-human')).length,
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

/** `slug · open N · ready N · in-progress N · needs-human N · next: #n title`, one row per line. */
export function formatProjects(summaries) {
  const nextLabel = (next) => (next ? `#${next.number} ${next.title}` : '—')
  return summaries.map((s) => `${s.slug} · open ${s.open} · ready ${s.ready} · in-progress ${s.inProgress}` +
    ` · needs-human ${s.needsHuman} · next: ${nextLabel(s.next)}`).join('\n')
}
