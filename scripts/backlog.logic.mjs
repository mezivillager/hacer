// Pure pick-rule logic for scripts/backlog.mjs — no I/O, unit-tested in backlog.logic.test.mjs.
//
// Input: the open issues from one `gh issue list --json …` call plus the rows of the table in
// docs/portfolio.md, whose "Pick rule" section is what this file computes. Output: plain data.

export const DEFAULT_ALLOWLIST = ['mezivillager']

/** Portfolio row whose tasks come strictly first while any are pickable (pick rule 2). */
export const FOUNDATION_SLUG = 'harness'

/** Pick rule 3: tasks each lane contributes per round. A lane absent here is picked on request only. */
const ROTATION = [['spine', 2], ['enabler', 2], ['upkeep', 1]]

const byNumber = (a, b) => a.number - b.number
const byRankThenNumber = (a, b) => a.rank - b.rank || a.number - b.number

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

/** The row an issue files under: its `project:<slug>` label first, else its parent epic. */
function portfolioRowOf(issue, labels, rowBySlug, rowByEpic) {
  const projectLabel = labels.find((name) => name.startsWith('project:'))
  if (projectLabel) return rowBySlug.get(projectLabel.slice('project:'.length)) ?? null
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

/** Round-robin over the lane buckets in ROTATION order until every bucket is drained. */
function rotate(buckets) {
  const picks = []
  while ([...buckets.values()].some((bucket) => bucket.length > 0)) {
    for (const [lane, take] of ROTATION) picks.push(...buckets.get(lane).splice(0, take))
  }
  return picks
}

/**
 * The pick rule over the pickable tasks: any `sev:critical` first; then the foundation row; then the
 * spine : enabler : upkeep rotation, an enabler only while it blocks an open spine task (pull, don't
 * push); on-request lanes never. Every task comes back exactly once — the picks in pick order with
 * `reason: null`, then the rest by number, each with its one-word reason.
 */
export function planReady(issues, portfolioRows, allowlist = DEFAULT_ALLOWLIST) {
  const tasks = triageTasks(issues, portfolioRows, allowlist)
  const spineNumbers = new Set(tasks.filter((task) => task.lane === 'spine').map((task) => task.number))
  const pullsSpine = (task) => task.blocking.some((number) => spineNumbers.has(number))

  const critical = []
  const foundation = []
  const buckets = new Map(ROTATION.map(([lane]) => [lane, []]))
  const unpicked = tasks.filter((task) => !task.pickable)
  for (const task of tasks.filter((task) => task.pickable).sort(byRankThenNumber)) {
    if (task.labels.includes('sev:critical')) critical.push(task)
    else if (task.project === FOUNDATION_SLUG) foundation.push(task)
    else if (task.lane === 'enabler' && !pullsSpine(task)) unpicked.push({ ...task, reason: 'not-pulled' })
    else if (buckets.has(task.lane)) buckets.get(task.lane).push(task)
    else unpicked.push({ ...task, reason: 'on-request' })
  }
  return [...critical, ...foundation, ...rotate(buckets), ...unpicked.sort(byNumber)]
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
