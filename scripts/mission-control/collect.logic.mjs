// Pure transforms for scripts/mission-control/collect.mjs — no I/O; unit-tested in collect.logic.test.mjs over
// recorded `gh` and `git` output. In: every source the collector read, as {source, value} or {source, error}.
// Out: one snapshot, schema v1 (docs/harness/mission-control.md), with a freshness record per section. Every
// pick-rule number comes from ../backlog.logic.mjs, so the snapshot cannot disagree with `backlog.mjs ready`.

import { AUX_ROTATION, DEFAULT_ALLOWLIST, PICK_ROTATION, parsePortfolio, planReady, summarizeProjects } from '../backlog.logic.mjs'
import { CHECK_LINES, readCheckRun } from '../check-lines.logic.mjs'

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

// Claims: a `claim/<n>` ref plus the issue's latest claim comment (sessions/COORDINATOR-HANDOFF.md).
const claimRefs = (lsRemote) => lsRemote.split('\n').filter(Boolean).map((line) => line.split('\t'))
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
  [key, new RegExp(`^${label}:[ \\t]*(.*?)(?:[ \\t]+#.*)?[ \\t]*$`, 'm').exec(body)?.[1] || null]))

function buildClaims({ claimRefs: lsRemote = '', claimIssues }, { allowlist }) {
  const answered = Object.values(claimIssues?.data?.repository ?? {}).filter(Boolean)
  const issues = new Map(answered.map((issue) => [issue.number, issue]))
  const items = claimRefs(lsRemote).map(({ sha, ref, number }) => {
    const issue = issues.get(number)
    const comment = issue?.comments.nodes
      .filter((node) => allowlist.includes(node.author?.login) && /^\s*Claimed by:/.test(node.body)).at(-1)
    return {
      number, ref, sha, state: issue?.state ?? null, title: issue?.title ?? null, url: issue?.url ?? null,
      labels: issue?.labels.nodes.map((label) => label.name) ?? null, onClosedIssue: issue ? issue.state === 'CLOSED' : null,
      claim: comment ? { ...claimFields(comment.body), author: comment.author.login, at: comment.createdAt, url: comment.url } : null,
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

// Portfolio, pick rule and tasks: all three from one planReady over the one issue list.
function planOf({ issues = [], portfolio = '' }, { allowlist }) {
  const rows = parsePortfolio(portfolio)
  return { rows, plan: planReady(issues, rows, allowlist), projects: summarizeProjects(issues, rows, allowlist) }
}

function buildPortfolio(values, options) {
  const { rows, projects } = planOf(values, options)
  const epic = (number) => (values.issues ?? []).find((issue) => issue.number === number)
  return { projects: projects.map((summary, index) => ({ rank: rows[index].rank, lane: rows[index].lane, ...summary,
    title: epic(summary.epicNumber)?.title ?? null, subIssues: epic(summary.epicNumber)?.subIssuesSummary ?? null })) }
}

const tasksOf = (plan) => ({ items: plan, byProject: Object.fromEntries(Object.entries(Object.groupBy(plan, (task) => task.project ?? 'unfiled'))
  .map(([slug, tasks]) => [slug, tasks.map((task) => task.number)])) })

function buildMetrics({ baseline = [], ratchetLog, releases = [], prsMerged = [] }) {
  const history = (ratchetLog?.log ?? '').split('\n').filter(Boolean).map((line) => {
    const [sha, date, ...subject] = line.split('\t')
    return { sha, date, subject: subject.join('\t'), count: ratchetLog.rows[sha].length }
  })
  const merges = Object.entries(countBy(prsMerged.map((pr) => pr.mergedAt.slice(0, 10)))).sort()
  return {
    ratchet: { count: baseline.length, byRule: countBy(baseline.map((row) => row.rule?.name)), history: history.reverse() },
    releases: releases.map(({ tagName, publishedAt, isLatest }) => ({ tag: tagName, publishedAt, isLatest })),
    mergesPerDay: merges.map(([date, count]) => ({ date, merges: count })),
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

/** Each section: the inputs it cannot do without, those it can, and how it is built from their values. */
const SECTIONS = {
  portfolio: { needs: ['portfolio', 'issues'], build: buildPortfolio },
  pickRule: {
    needs: ['portfolio', 'issues'],
    build: (values, options) => ({ rotation: PICK_ROTATION, auxRotation: AUX_ROTATION, next: planOf(values, options).plan
      .filter((task) => task.reason === null).map(({ number, title, project }) => ({ number, title, project })) }),
  },
  tasks: { needs: ['portfolio', 'issues'], build: (values, options) => tasksOf(planOf(values, options).plan) },
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
  metrics: { needs: ['baseline'], optional: ['ratchetLog', 'releases', 'prsMerged'], build: buildMetrics },
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
 *  snapshot's data, flagged `error` and dated when it was fetched; a failed optional input leaves it `partial`. */
export function buildSnapshot(inputs, { now, head, previous = null, allowlist = DEFAULT_ALLOWLIST }) {
  const values = Object.fromEntries(Object.entries(inputs).filter(([, input]) => !('error' in input)).map(([id, input]) => [id, input.value]))
  const broken = (ids) => ids.filter((id) => !(id in values)).map((id) => `${id}: ${inputs[id]?.error ?? 'not collected'}`)
  const kept = previous?.schemaVersion === SCHEMA_VERSION ? previous : null
  const snapshot = { schemaVersion: SCHEMA_VERSION, generatedAt: now, head, freshness: {} }
  for (const [name, { needs = [], optional = [], build }] of Object.entries(SECTIONS)) {
    const source = [...needs, ...optional].map((id) => inputs[id]?.source ?? id).join(' · ') || 'none'
    let errors = broken(needs)
    if (errors.length === 0) {
      try {
        snapshot[name] = build(values, { allowlist })
        const invalid = conform(snapshot[name], SCHEMA_V1[name], name, [])
        if (invalid.length > 0) throw new Error(invalid.join('; '))
        const missing = broken(optional)
        const status = missing.length > 0 ? { status: 'partial', error: missing.join('; ') } : { status: 'ok' }
        snapshot.freshness[name] = { source, fetchedAt: now, ...status }
        continue
      } catch (error) {
        errors = [`could not build: ${error.message}`]
      }
    }
    snapshot[name] = kept?.[name] ?? build({}, { allowlist })
    const fetchedAt = kept?.[name] ? kept.freshness?.[name]?.fetchedAt ?? null : null
    snapshot.freshness[name] = { source, fetchedAt, status: 'error', error: errors.join('; ') }
  }
  return snapshot
}

const PR = { number: 'number', title: 'string', verdicts: [{ verdict: 'verdict', round: 'number', model: 'string?' }] }
const FRESHNESS = { source: 'string', fetchedAt: 'iso?', status: 'status' }

/** Schema v1 — the contract the site and the coordinator read; docs/harness/mission-control.md gives the meaning. */
export const SCHEMA_V1 = {
  schemaVersion: 'v1', generatedAt: 'iso', head: { sha: 'sha', date: 'iso', subject: 'string' },
  freshness: Object.fromEntries(Object.keys(SECTIONS).map((name) => [name, FRESHNESS])),
  portfolio: { projects: [{ slug: 'string', epicNumber: 'number', open: 'number', ready: 'number', inProgress: 'number', needsHuman: 'number' }] },
  pickRule: { rotation: ['string'], auxRotation: ['string'], next: [{ number: 'number', title: 'string' }] },
  tasks: { items: [{ number: 'number', title: 'string', pickable: 'boolean' }], byProject: 'object' },
  prs: { open: [PR], merged: [PR], coverage: { merged: 'number', withVerdict: 'number', withoutVerdict: 'number', pass: 'number', block: 'number' } },
  claims: { items: [{ number: 'number', sha: 'sha' }], onClosedIssues: 'number' },
  cloudLane: { items: [{ number: 'number?' }] },
  sessions: { items: [{ file: 'string', date: 'string', kind: 'string' }] },
  ledger: { items: [{ date: 'string' }], byMechanised: 'object' },
  adrs: { items: [{ number: 'number', file: 'string' }] },
  roadmap: { lastUpdated: 'string?', phases: [{ phase: 'string' }] },
  metrics: { ratchet: { count: 'number', byRule: 'object', history: [{ sha: 'sha', count: 'number' }] },
    releases: [{ tag: 'string', publishedAt: 'iso' }], mergesPerDay: [{ date: 'string', merges: 'number' }] },
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
