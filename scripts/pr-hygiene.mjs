#!/usr/bin/env node
// pr-hygiene: linked issue + size budget (ADR-0013, #150).
//
//   node scripts/pr-hygiene.mjs <pr-number>
//
// Needs GITHUB_TOKEN (or GH_TOKEN; locally: `GITHUB_TOKEN=$(gh auth token)`). GITHUB_REPOSITORY
// defaults to mezivillager/hacer. The PR is read through the REST API only — its body, author,
// labels and per-file line counts — so this script, checked out from the base branch, never sees or
// runs the PR's code. `.gitattributes` (linguist-generated) is read from the checkout, i.e. main.
//
// The one exception is the layer-ratchet baseline (#406): when a PR changes it, the file's
// *contents* are read through the same API at the merge base and at the PR head, so the check can
// tell an armed rule from an absorbed violation. Contents are data, never code that is run here.
//
// Prints one greppable `HYGIENE: PASS|WARN|FAIL …` line, appends a report to
// $GITHUB_STEP_SUMMARY when set, and exits 1 on FAIL. Rules live in pr-hygiene.logic.mjs.

import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  RATCHET_BASELINE_FILE,
  evaluate,
  formatConsole,
  formatSummary,
  nextPageUrl,
  readAtRef,
} from './pr-hygiene.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
const number = Number(process.argv[2])

if (!Number.isInteger(number) || number <= 0) {
  console.error('usage: node scripts/pr-hygiene.mjs <pr-number>')
  process.exit(2)
}
if (!TOKEN) {
  console.error('GITHUB_TOKEN (or GH_TOKEN) is required')
  process.exit(2)
}

async function get(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`)
  return { json: await res.json(), next: nextPageUrl(res.headers.get('link')) }
}

/** A file's raw bytes at one commit, or null when the contents API answers 404 — see `readAtRef`. */
async function getContent(ref, filePath) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${ref}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.raw',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${filePath}@${ref}`)
  return res.text()
}

/**
 * Does this ref resolve in this repo? A 404 from the contents API means nothing until it does.
 * Measured 2026-09-24: this endpoint answers 200 for a real sha and **422** for one it cannot
 * resolve — a bogus sha and a branch that does not exist both — while the contents API answers a
 * flat 404 for all three. Either code here means "no such ref"; anything else is a real failure.
 */
async function refExists(ref) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${ref}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.sha',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 404 || res.status === 422) return false
  if (!res.ok) throw new Error(`GitHub API ${res.status} for commit ${ref}`)
  return true
}

async function getAll(url) {
  const items = []
  for (let page = url; page; ) {
    const { json, next } = await get(page)
    items.push(...json)
    page = next
  }
  return items
}

const pullUrl = `https://api.github.com/repos/${REPO}/pulls/${number}`
const [{ json: pull }, files] = await Promise.all([get(pullUrl), getAll(`${pullUrl}/files?per_page=100`)])

// The layer-ratchet baseline (#406), read only when the PR touches it, and only ever as *content*
// through the API — at the merge base (not `base.sha`, which drifts while a PR is open) and at the
// PR head. Reading two blobs is not checking out a PR: nothing from the head is executed, and the
// copy of this script doing the reading is always main's.
let ratchet = null
if (files.some((file) => file.filename === RATCHET_BASELINE_FILE)) {
  const { json: comparison } = await get(
    `https://api.github.com/repos/${REPO}/compare/${pull.base.sha}...${pull.head.sha}?per_page=1`,
  )
  const mergeBase = comparison.merge_base_commit?.sha ?? pull.base.sha
  // A 404 is only "the path is absent here" once the ref itself resolves (#432): the contents API
  // answers 404 for an unresolvable ref too, and reading that as an empty baseline would make the
  // whole head file look like a legitimate arming. The extra request is only made on a 404.
  const io = { readPath: getContent, refExists }
  const [base, head] = await Promise.all([
    readAtRef(io, mergeBase, RATCHET_BASELINE_FILE),
    readAtRef(io, pull.head.sha, RATCHET_BASELINE_FILE),
  ])
  ratchet = { base, head }
}

const attributesPath = path.join(import.meta.dirname, '..', '.gitattributes')
const gitattributes = existsSync(attributesPath) ? readFileSync(attributesPath, 'utf8') : ''

const result = evaluate({
  body: pull.body,
  author: pull.user?.login,
  labels: pull.labels.map((label) => label.name),
  files,
  gitattributes,
  ratchet,
})

console.log(formatConsole(result))
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatSummary(result))
process.exit(result.verdict === 'FAIL' ? 1 : 0)
