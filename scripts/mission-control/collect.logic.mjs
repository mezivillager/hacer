// Pure transforms for scripts/mission-control/collect.mjs — no I/O; unit-tested in collect.logic.test.mjs over
// recorded `gh` and `git` output. In: every source the collector read, as {source, value} or {source, error}.
// Out: one snapshot, schema v1 (docs/harness/mission-control.md), with a freshness record per section. Every
// pick-rule number comes from ../backlog.logic.mjs, so the snapshot cannot disagree with `backlog.mjs ready`.

import {
  AUX_ROTATION, DEFAULT_ALLOWLIST, PICK_ROTATION, claimHistory, claimRefs, dormantMode, historyGap, latestClaim, parsePortfolio,
  planReady, readClaims, summarizeProjects,
} from '../backlog.logic.mjs'
import { CHECK_LINES, readCheckRun } from '../check-lines.logic.mjs'
import { parseSnapshotTime } from './prune.logic.mjs'

export { claimHistoryQuery, claimsQuery, parsePortfolio, readClaimHistory } from '../backlog.logic.mjs'

export const SCHEMA_VERSION = 1
const STATUSES = ['ok', 'partial', 'error']

const countBy = (keys) => keys.reduce((counts, key) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 }), {})
const camelCase = (text) => text.toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, next = '') => next.toUpperCase())
const cellsOf = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) => cell.trim())

/** Every markdown table as {heading, rows}, each row keyed by the camelCased header cells. */
function parseTables(markdown = '') {
  const lines = markdown.split('\n')
  let heading = null
  return lines.flatMap((line, index) => {
    if (/^#{1,6} /.test(line)) heading = line.replace(/^#+ /, '')
    if (!line.startsWith('|') || !/^\|[-:| ]+\|$/.test(lines[index + 1]?.trim() ?? '')) return []
    const [keys, rows] = [cellsOf(line).map(camelCase), []]
    for (let next = index + 2; lines[next]?.startsWith('|'); next++) rows.push(cellsOf(lines[next]))
    return [{ heading, rows: rows.map((cells) => Object.fromEntries(cells.map((cell, column) => [keys[column], cell]))) }]
  })
}

// Pull requests: a verdict is a comment that opens with `## Verifier verdict: PASS | BLOCK` (verifier-brief.md).
const VERDICT = /^\s*##\s+\**Verifier verdict\s*(?:\(([^)]*)\))?\s*:[\s*]*(PASS|BLOCK)\b/i
const VERIFIED_ON = /^\W*Verified on[:*\s]+(.+)$/m

/** Trusted verdict comments; the round is the heading's `(round N, …)`, else the verdict's position on the PR. */
const verdictsOf = (comments, allowlist) => comments
  .filter((comment) => allowlist.includes(comment.author?.login) && VERDICT.test(comment.body))
  .map((comment, index) => {
    const [, qualifier = '', verdict] = VERDICT.exec(comment.body)
    const model = VERIFIED_ON.exec(comment.body)?.[1].replace(/[*`]/g, '').split(/ · | — |\. /)[0].trim()
    const round = Number(/round\s+(\d+)/i.exec(qualifier)?.[1] ?? index + 1)
    return { verdict: verdict.toUpperCase(), round, model: model ?? null, at: comment.createdAt, url: comment.url }
  })

const prOf = (allowlist) => (pr) => ({
  number: pr.number, title: pr.title, url: pr.url, author: pr.author?.login ?? null, labels: pr.labels.map((label) => label.name),
  headRefName: pr.headRefName, isDraft: pr.isDraft, createdAt: pr.createdAt, mergedAt: pr.mergedAt,
  closes: pr.closingIssuesReferences.map((issue) => issue.number), verdicts: verdictsOf(pr.comments, allowlist),
})

function buildPrs({ prsOpen = [], prsMerged = [] }, { allowlist }) {
  const [open, merged] = [prsOpen, prsMerged].map((prs) => prs.map(prOf(allowlist)))
  const count = (test) => merged.filter(test).length
  const withVerdict = count((pr) => pr.verdicts.length > 0)
  const latest = (verdict) => count((pr) => pr.verdicts.at(-1)?.verdict === verdict)
  const coverage = { merged: merged.length, withVerdict, withoutVerdict: merged.length - withVerdict, pass: latest('PASS'), block: latest('BLOCK') }
  return { open, merged, coverage }
}

// Claims: a `claim/<n>` ref plus the issue's latest claim comment (sessions/COORDINATOR-HANDOFF.md), both read by
// ../backlog.logic.mjs, so this section and `backlog.mjs release` agree on who holds a claim.
function buildClaims({ claimRefs: lsRemote = '', claimIssues }, { allowlist }) {
  const answered = Object.values(claimIssues?.data?.repository ?? {}).filter(Boolean)
  const issues = new Map(answered.map((issue) => [issue.number, issue]))
  const items = claimRefs(lsRemote).map(({ sha, ref, number }) => {
    const issue = issues.get(number)
    return {
      number, ref, sha, state: issue?.state ?? null, title: issue?.title ?? null, url: issue?.url ?? null,
      labels: issue?.labels.nodes.map((label) => label.name) ?? null, onClosedIssue: issue ? issue.state === 'CLOSED' : null,
      claim: issue ? latestClaim(issue.comments.nodes, allowlist) : null,
    }
  })
  return { items, onClosedIssues: items.filter((item) => item.onClosedIssue).length }
}

// Checks (MC-6, #477): each required check publishes its line as a notice, an annotation on its own check run. The
// rollup holds a head's own checks, as `gh pr checks` shows them, and leaves out a workflow_dispatch re-check.
const RUNS = 'statusCheckRollup { contexts(first: 50) { nodes { ... on CheckRun { databaseId name conclusion completedAt detailsUrl ' +
  'annotations(first: 50) { nodes { message } } } } } }'

/** One GraphQL query: the check runs, with their annotations, on main's head commit and on every open PR's. */
export function checksQuery(repo) {
  const [owner, name] = repo.split('/')
  return `query { repository(owner: "${owner}", name: "${name}") { ` +
    `main: ref(qualifiedName: "refs/heads/main") { target { ... on Commit { oid ${RUNS} } } } ` +
    `pullRequests(states: OPEN, first: 100) { nodes { number commits(last: 1) { nodes { commit { oid ${RUNS} } } } } } } }`
}

/** Each required check's newest run on one head — GitHub judges a required context by its newest check run — with the
 *  line it published, or null for a run that published none (still going, or run before MC-6), read under its
 *  conclusion: a run that did not succeed never reads PASS (readCheckRun). */
const checksOn = ([pr, commit]) => Object.entries(CHECK_LINES).flatMap(([check, prefix]) => {
  const run = (commit.statusCheckRollup?.contexts.nodes ?? []).filter((node) => node.name === check)
    .reduce((newest, node) => (newest?.databaseId > node.databaseId ? newest : node), null)
  if (!run) return []
  const line = (run.annotations?.nodes ?? []).map((node) => node.message).findLast((message) => message.startsWith(`${prefix}: `)) ?? null
  const { conclusion, completedAt, detailsUrl: url } = run
  return [{ pr, sha: commit.oid, check, conclusion, completedAt, url, line, ...readCheckRun({ conclusion, line }) }]
})

/** main's head (`pr: null`), then each open PR's, in the query's order. */
function buildChecks({ checkRuns }) {
  const { main, pullRequests } = checkRuns?.data?.repository ?? {}
  const heads = [[null, main?.target], ...(pullRequests?.nodes ?? []).map((pr) => [pr.number, pr.commits.nodes[0]?.commit])]
  return { items: heads.filter(([, commit]) => commit).flatMap(checksOn) }
}

// Portfolio, pick rule and tasks: all three from one planReady over the one issue list and the claims `ready` reads
// (#531): an issue holding a claim ref is `claimed` or `stale-claim`, never a pick; the cycle resumes after the latest
// claim in the claim history, as `ready` does (#535).
const CLAIM_INPUTS = ['claimRefs', 'claimIssues', 'prsOpen', 'claimHistory']
function planOf(values, { allowlist, now }) {
  const { issues = [], portfolio = '', claimRefs: lsRemote, claimIssues: answer, prsOpen: openPrs, claimHistory: recent } = values
  const [rows, history] = [parsePortfolio(portfolio), claimHistory(recent, allowlist)]
  const claims = readClaims({ lsRemote, answer, openPrs, allowlist, now })
  return { rows, plan: planReady(issues, rows, allowlist, claims, history), projects: summarizeProjects(issues, rows, allowlist, claims, history) }
}

/** What the claim history leaves a guess (historyGap, as `ready` warns of it): the pick sections read `partial` with it. */
function historyCaveat({ issues = [], portfolio = '', claimHistory: recent }, { allowlist }) {
  const gap = recent ? historyGap(recent, issues, parsePortfolio(portfolio), allowlist) : null
  return gap && `claimHistory: ${gap}`
}

function buildPortfolio(values, options) {
  const { rows, projects } = planOf(values, options)
  const epic = (number) => (values.issues ?? []).find((issue) => issue.number === number)
  return { projects: projects.map((summary, index) => ({ rank: rows[index].rank, lane: rows[index].lane, ...summary,
    title: epic(summary.epicNumber)?.title ?? null, subIssues: epic(summary.epicNumber)?.subIssuesSummary ?? null })) }
}

const tasksOf = (plan) => ({ items: plan, byProject: Object.fromEntries(Object.entries(Object.groupBy(plan, (task) => task.project ?? 'unfiled'))
  .map(([slug, tasks]) => [slug, tasks.map((task) => task.number)])) })

// Flow (#539): the numbers docs/harness/reviews/2026-09-26/evidence/brief-measure-flow.mjs counted by hand, by its
// definitions, over the PRs merged in the FLOW_DAYS to the run; a verdict is the one `prs` reads.
export const FLOW_DAYS = 14
/** The most pages readFlowPages reads: 1,000 PRs, as many as GitHub's search serves. */
export const FLOW_PAGES = 10
const flowSince = (now) => new Date(Date.parse(now) - FLOW_DAYS * 864e5).toISOString()

/** One page of the PRs merged in the FLOW_DAYS to `now`: when each opened and merged, its author, files and comments. */
export function flowQuery(repo, now, after = null) {
  const since = flowSince(now).replace(/\.\d{3}Z$/, '+00:00')
  return `query { search(query: "repo:${repo} is:pr is:merged merged:>=${since}", type: ISSUE, first: 100` +
    `${after ? `, after: ${JSON.stringify(after)}` : ''}) { pageInfo { hasNextPage endCursor } nodes { ... on PullRequest { ` +
    'number createdAt mergedAt author { login } files(first: 100) { nodes { path } } ' +
    'comments(first: 100) { nodes { author { login } body createdAt url } } } } } }'
}

/** flowQuery's pages, each read by `fetchPage(after)` (`after` null for the first), to the last or FLOW_PAGES. */
export async function readFlowPages(fetchPage) {
  const pages = [await fetchPage(null)]
  const next = () => pages.at(-1)?.data?.search?.pageInfo
  while (next()?.hasNextPage && pages.length < FLOW_PAGES) pages.push(await fetchPage(next().endCursor))
  return pages
}

// brief-measure-flow.mjs's `kind`, folded into its CODE set: code touches src/ (engine, other src/), mission-control/
// (the app), scripts/ or .github/ (process tooling); docs only, other non-src (config, .claude/, root docs) and
// Dependabot's PRs are not.
const CODE_PATH = /^(src|mission-control|scripts|\.github)\//
const isCode = (pr) => !/dependabot/.test(pr.author?.login ?? '') && (pr.files?.nodes ?? []).some((file) => CODE_PATH.test(file.path))

function buildFlow(pages, { allowlist, now }) {
  const [since, from, to] = [flowSince(now), Date.parse(flowSince(now)), Date.parse(now)]
  const nodes = new Map(pages.flatMap((page) => page?.data?.search?.nodes ?? []).map((pr) => [pr.number, pr]))
  const prs = [...nodes.values()].filter((pr) => Date.parse(pr.mergedAt) >= from && Date.parse(pr.mergedAt) <= to)
    .sort((a, b) => a.number - b.number)
    .map((pr) => ({ ...pr, verdicts: verdictsOf(pr.comments.nodes, allowlist).map((each) => each.verdict) }))
  // The value at floor(n × p) of the sorted hours, as brief-measure-flow.mjs's `pct`, in tenths of an hour.
  const hours = prs.map((pr) => (Date.parse(pr.mergedAt) - Date.parse(pr.createdAt)) / 36e5).sort((a, b) => a - b)
  const rank = (p) => (hours.length > 0 ? Math.round(hours[Math.min(hours.length - 1, Math.floor(hours.length * p))] * 10) / 10 : null)
  const verified = prs.filter((pr) => pr.verdicts.length > 0)
  const blocked = verified.filter((pr) => pr.verdicts.includes('BLOCK')).map((pr) => pr.number)
  const coverage = (code) => {
    const kind = prs.filter((pr) => isCode(pr) === code)
    return { merged: kind.length, withVerdict: kind.filter((pr) => pr.verdicts.length > 0).length,
      without: kind.filter((pr) => pr.verdicts.length === 0).map((pr) => pr.number) }
  }
  return { days: FLOW_DAYS, since, merged: prs.length, openToMergeHours: { median: rank(0.5), p90: rank(0.9) },
    blockedOnce: { count: blocked.length, of: verified.length, prs: blocked }, coverage: { code: coverage(true), nonCode: coverage(false) } }
}

// The history archive (#476): gh-pages' control/history/, a snapshot per workflow run, named for its generatedAt.
/** The archive files collect.mjs reads: each UTC day's last snapshot from before `now`, oldest first. A name that is not
 *  exactly one snapshot's own is never read. */
export function archiveDays(names, now) {
  const times = names.map(parseSnapshotTime).filter((at) => at !== null && at < now).sort()
  return Object.values(Object.fromEntries(times.map((at) => [at.slice(0, 10), `${at}.json`])))
}

/** Each archived day's reading of `tasks.byProject`, oldest first, none from after `now`. A reading whose tasks section
 *  was in error holds an earlier run's data, so it is not that day's. */
const openTasksOf = (snapshots, now) => snapshots
  .filter((snapshot) => snapshot.generatedAt < now && snapshot.freshness?.tasks?.status !== 'error' && isObject(snapshot.tasks?.byProject))
  .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
  .map(({ generatedAt: at, tasks }) => ({ date: at.slice(0, 10), at, byProject: tasks.byProject }))

/** The vendored nand2tetris projects (#539): each directory under conformance/vectors/, its files counted by extension.
 *  Nothing runs them yet (#194), so `runner` is null: a pass count arrives with a runner, never before. */
function buildConformance(files) {
  const byProject = Object.groupBy(files.filter((file) => file.includes('/')), (file) => file.split('/')[0])
  const projects = Object.entries(byProject).sort(([a], [b]) => a.localeCompare(b)).map(([project, names]) =>
    ({ project, files: names.length, byExtension: countBy(names.map((name) => /\.([^./]+)$/.exec(name)?.[1] ?? 'none')) }))
  return { projects, files: projects.reduce((sum, project) => sum + project.files, 0), runner: null }
}

function buildMetrics({ baseline = [], ratchetLog, releases = [], prsMerged = [], flowPrs, vectors, archive }, options) {
  const history = (ratchetLog?.log ?? '').split('\n').filter(Boolean).map((line) => {
    const [sha, date, ...subject] = line.split('\t')
    return { sha, date, subject: subject.join('\t'), count: ratchetLog.rows[sha].length }
  })
  const merges = Object.entries(countBy(prsMerged.map((pr) => pr.mergedAt.slice(0, 10)))).sort()
  return {
    ratchet: { count: baseline.length, byRule: countBy(baseline.map((row) => row.rule?.name)), history: history.reverse() },
    releases: releases.map(({ tagName, publishedAt, isLatest }) => ({ tag: tagName, publishedAt, isLatest })),
    mergesPerDay: merges.map(([date, count]) => ({ date, merges: count })),
    flow: flowPrs ? buildFlow(flowPrs, options) : null,
    conformance: vectors ? buildConformance(vectors) : null,
    openTasks: archive ? openTasksOf(archive, options.now) : null,
  }
}

const mechanised = (cell = '') =>
  ['yes', 'no', 'partly'].find((word) => cell.replace(/[*_`]/g, '').trim().toLowerCase().startsWith(word)) ?? 'other'
const tableRows = (markdown) => parseTables(markdown)[0]?.rows ?? []

function buildRoadmap({ roadmap = '' }) {
  const phases = parseTables(roadmap).filter((table) => 'phase' in (table.rows[0] ?? {})).flatMap((table) =>
    table.rows.map((row) => {
      const [, phase = row.phase, href = null] = /\[([^\]]*)\]\(([^)]*)\)/.exec(row.phase) ?? []
      return { ...row, phase, doc: href && `docs/roadmap/${href}`, group: table.heading }
    }))
  return { lastUpdated: /\*\*Last Updated:\*\*\s*(\S+)/.exec(roadmap)?.[1] ?? null, phases }
}

const sessionOf = ({ file, text }) => {
  const date = /\/(\d{4}-\d{2}-\d{2})[^/]*\.md$/.exec(file)?.[1]
  const [title, status] = [/^# (.+)$/m, /^\*\*Status[^*]*:\*\*\s*\**([\w-]+)/m].map((pattern) => pattern.exec(text)?.[1] ?? null)
  return date ? [{ file, date, kind: file.endsWith('-handoff.md') ? 'handoff' : 'record', title, status, lines: text.split('\n').length }] : []
}

const adrOf = ({ file, text }) => {
  const number = Number(/\/(\d{4})-[^/]*\.md$/.exec(file)?.[1] ?? 0)
  const [title, status] = [/^# \d+\.\s*(.+)$/m, /^- \*\*Status:\*\*\s*(.+)$/m].map((pattern) => pattern.exec(text)?.[1] ?? null)
  return number > 0 ? [{ number, file, title, status }] : []
}

/** Each section: the inputs it cannot do without, those it can, how it is built from their values, and what can leave
 *  its data a guess though every input was read (`caveat`: a reason, or null). */
const SECTIONS = {
  portfolio: { needs: ['portfolio', 'issues'], optional: CLAIM_INPUTS, caveat: historyCaveat, build: buildPortfolio },
  pickRule: {
    needs: ['portfolio', 'issues'],
    optional: CLAIM_INPUTS,
    caveat: historyCaveat,
    build: (values, options) => ({
      rotation: PICK_ROTATION,
      auxRotation: AUX_ROTATION,
      next: planOf(values, options).plan.filter((task) => task.reason === null).map(({ number, title, project }) => ({ number, title, project })),
      dormant: dormantMode(values.prsOpen, options.allowlist),
    }),
  },
  tasks: {
    needs: ['portfolio', 'issues'], optional: CLAIM_INPUTS, caveat: historyCaveat, build: (values, options) => tasksOf(planOf(values, options).plan),
  },
  prs: { needs: ['prsOpen', 'prsMerged'], build: buildPrs },
  claims: { needs: ['claimRefs'], optional: ['claimIssues'], build: buildClaims },
  cloudLane: {
    needs: ['inbox'],
    build: ({ inbox }) => ({ items: tableRows(inbox).map((row) => ({ number: Number(/#(\d+)/.exec(row.issue)?.[1]) || null, ...row })) }),
  },
  sessions: { needs: ['sessions'], build: ({ sessions = [] }) => ({ items: sessions.flatMap(sessionOf) }) },
  ledger: {
    needs: ['ledger'],
    build: ({ ledger }) => ({ items: tableRows(ledger), byMechanised: countBy(tableRows(ledger).map((row) => mechanised(row.mechanised))) }),
  },
  adrs: { needs: ['adrs'], build: ({ adrs = [] }) => ({ items: adrs.flatMap(adrOf).sort((a, b) => a.number - b.number) }) },
  roadmap: { needs: ['roadmap'], build: buildRoadmap },
  metrics: { needs: ['baseline'], optional: ['ratchetLog', 'releases', 'prsMerged', 'flowPrs', 'vectors', 'archive'], build: buildMetrics },
  checks: { needs: ['checkRuns'], build: buildChecks },
  lineage: { build: () => ({ until: 'DL-7', items: [] }) }, // the decision graph, once DL-7 draws it
}

/** The `--previous` file's text as a snapshot, or null for "no previous" — a missing, empty or unparseable file
 *  (collect.mjs:73, #476) is never a crash, only ever this. collect.mjs reads the file; this only parses its text. */
export function parsePrevious(text) {
  if (typeof text !== 'string' || text.trim() === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** A section whose required input failed, or whose data came out of schema (a changed API shape), keeps the previous
 *  snapshot's data, flagged `error` and dated when it was fetched; a failed optional input, or a caveat, leaves it `partial`
 *  (an optional input's own field, where it has one, null). */
export function buildSnapshot(inputs, { now, head, previous = null, allowlist = DEFAULT_ALLOWLIST }) {
  const values = Object.fromEntries(Object.entries(inputs).filter(([, input]) => !('error' in input)).map(([id, input]) => [id, input.value]))
  const broken = (ids) => ids.filter((id) => !(id in values)).map((id) => `${id}: ${inputs[id]?.error ?? 'not collected'}`)
  const kept = previous?.schemaVersion === SCHEMA_VERSION ? previous : null
  const snapshot = { schemaVersion: SCHEMA_VERSION, generatedAt: now, head, freshness: {} }
  for (const [name, { needs = [], optional = [], caveat, build }] of Object.entries(SECTIONS)) {
    const source = [...needs, ...optional].map((id) => inputs[id]?.source ?? id).join(' · ') || 'none'
    let errors = broken(needs)
    if (errors.length === 0) {
      try {
        snapshot[name] = build(values, { allowlist, now })
        const invalid = conform(snapshot[name], SCHEMA_V1[name], name, [])
        if (invalid.length > 0) throw new Error(invalid.join('; '))
        const guess = caveat?.(values, { allowlist, now })
        const missing = [...broken(optional), ...(guess ? [guess] : [])]
        const status = missing.length > 0 ? { status: 'partial', error: missing.join('; ') } : { status: 'ok' }
        snapshot.freshness[name] = { source, fetchedAt: now, ...status }
        continue
      } catch (error) {
        errors = [`could not build: ${error.message}`]
      }
    }
    // Last-known data is kept only while it is still v1: a section written before a field was declared is not.
    const last = conform(kept?.[name], SCHEMA_V1[name], name, []).length === 0 ? kept[name] : null
    snapshot[name] = last ?? build({}, { allowlist, now })
    const fetchedAt = last ? kept.freshness?.[name]?.fetchedAt ?? null : null
    snapshot.freshness[name] = { source, fetchedAt, status: 'error', error: errors.join('; ') }
  }
  return snapshot
}

const PR = { number: 'number', title: 'string', verdicts: [{ verdict: 'verdict', round: 'number', model: 'string?' }] }
const FRESHNESS = { source: 'string', fetchedAt: 'iso?', status: 'status' }
const OR_NULL = Symbol('or null')
/** A field an optional input fills: its shape, or null when that input failed. */
const orNull = (spec) => ({ [OR_NULL]: spec })
const COVERAGE = { merged: 'number', withVerdict: 'number', without: ['number'] }

/** Schema v1 — the contract the site and the coordinator read; docs/harness/mission-control.md gives the meaning. */
export const SCHEMA_V1 = {
  schemaVersion: 'v1', generatedAt: 'iso', head: { sha: 'sha', date: 'iso', subject: 'string' },
  freshness: Object.fromEntries(Object.keys(SECTIONS).map((name) => [name, FRESHNESS])),
  portfolio: { projects: [{ slug: 'string', epicNumber: 'number', open: 'number', ready: 'number', inProgress: 'number', needsHuman: 'number',
    agentReady: 'number' }] },
  pickRule: { rotation: ['string'], auxRotation: ['string'], next: [{ number: 'number', title: 'string' }],
    dormant: { dormant: 'boolean', agentPrs: ['number'] } },
  tasks: { items: [{ number: 'number', title: 'string', pickable: 'boolean' }], byProject: 'object' },
  prs: { open: [PR], merged: [PR], coverage: { merged: 'number', withVerdict: 'number', withoutVerdict: 'number', pass: 'number', block: 'number' } },
  claims: { items: [{ number: 'number', sha: 'sha' }], onClosedIssues: 'number' },
  cloudLane: { items: [{ number: 'number?' }] },
  sessions: { items: [{ file: 'string', date: 'string', kind: 'string' }] },
  ledger: { items: [{ date: 'string' }], byMechanised: 'object' },
  adrs: { items: [{ number: 'number', file: 'string' }] },
  roadmap: { lastUpdated: 'string?', phases: [{ phase: 'string' }] },
  metrics: { ratchet: { count: 'number', byRule: 'object', history: [{ sha: 'sha', count: 'number' }] },
    releases: [{ tag: 'string', publishedAt: 'iso' }], mergesPerDay: [{ date: 'string', merges: 'number' }],
    flow: orNull({ days: 'number', since: 'iso', merged: 'number', openToMergeHours: { median: 'number?', p90: 'number?' },
      blockedOnce: { count: 'number', of: 'number', prs: ['number'] }, coverage: { code: COVERAGE, nonCode: COVERAGE } }),
    conformance: orNull({ projects: [{ project: 'string', files: 'number', byExtension: 'object' }], files: 'number', runner: 'object?' }),
    openTasks: orNull([{ date: 'string', at: 'iso', byProject: 'object' }]) },
  checks: { items: [{ pr: 'number?', sha: 'sha', check: 'string', conclusion: 'string?', completedAt: 'iso?', url: 'string?',
    line: 'string?', verdict: 'string?', fields: 'object', disagrees: 'boolean' }] },
  lineage: { items: 'array' },
}

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isIso = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const TYPES = {
  v1: [(value) => value === SCHEMA_VERSION, String(SCHEMA_VERSION)], iso: [isIso, 'an ISO date'],
  sha: [(value) => /^[0-9a-f]{40}$/.test(value), 'a commit sha'], number: [Number.isFinite, 'a number'],
  string: [(value) => typeof value === 'string', 'a string'], boolean: [(value) => typeof value === 'boolean', 'a boolean'],
  array: [Array.isArray, 'an array'], object: [isObject, 'an object'], status: [(value) => STATUSES.includes(value), STATUSES.join('|')],
  verdict: [(value) => ['PASS', 'BLOCK'].includes(value), 'PASS|BLOCK'],
}
for (const [type, [test, what]] of Object.entries(TYPES)) TYPES[`${type}?`] = [(value) => value === null || test(value), `${what} or null`]

function conform(value, spec, path, errors) {
  if (spec?.[OR_NULL]) return value === null ? errors : conform(value, spec[OR_NULL], path, errors)
  const [test, what] = typeof spec === 'string' ? TYPES[spec] : TYPES[Array.isArray(spec) ? 'array' : 'object']
  if (!test(value)) errors.push(`${path || 'the snapshot'} must be ${what}`)
  else if (Array.isArray(spec)) value.forEach((item, index) => conform(item, spec[0], `${path}[${index}]`, errors))
  else if (typeof spec === 'object') {
    for (const [key, field] of Object.entries(spec)) conform(value[key], field, path ? `${path}.${key}` : key, errors)
  }
  return errors
}

/** Every departure from schema v1, as `<path> must be <what>`; [] when the snapshot conforms. */
export const validateSnapshot = (snapshot) => conform(snapshot, SCHEMA_V1, '', [])

/** The run: an invalid snapshot is never printed and exits 1; the summary line goes to stderr beside `--json`. */
export function report(snapshot, { json = false } = {}) {
  const errors = validateSnapshot(snapshot)
  const tally = (status) => {
    const names = Object.entries(snapshot?.freshness ?? {}).filter(([, record]) => record?.status === status).map(([name]) => name)
    return `${status} ${names.length}${status !== 'ok' && names.length > 0 ? ` (${names.join(', ')})` : ''}`
  }
  const summary = `MISSION-CONTROL: ${errors.length > 0 ? 'INVALID' : 'VALID'} schema ${snapshot?.schemaVersion} · ${STATUSES.map(tally).join(' · ')}`
  if (errors.length > 0) return { exitCode: 1, stdout: '', stderr: [summary, ...errors.map((error) => `  invalid: ${error}`)].join('\n') }
  return json ? { exitCode: 0, stdout: JSON.stringify(snapshot, null, 2), stderr: summary } : { exitCode: 0, stdout: summary, stderr: '' }
}
