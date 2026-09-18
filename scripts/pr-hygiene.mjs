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
// Prints one greppable `HYGIENE: PASS|WARN|FAIL …` line, appends a report to
// $GITHUB_STEP_SUMMARY when set, and exits 1 on FAIL. Rules live in pr-hygiene.logic.mjs.

import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { evaluate, formatConsole, formatSummary, nextPageUrl } from './pr-hygiene.logic.mjs'

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

const attributesPath = path.join(import.meta.dirname, '..', '.gitattributes')
const gitattributes = existsSync(attributesPath) ? readFileSync(attributesPath, 'utf8') : ''

const result = evaluate({
  body: pull.body,
  author: pull.user?.login,
  labels: pull.labels.map((label) => label.name),
  files,
  gitattributes,
})

console.log(formatConsole(result))
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatSummary(result))
process.exit(result.verdict === 'FAIL' ? 1 : 0)
