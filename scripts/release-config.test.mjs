import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requireFromProject = createRequire(path.join(ROOT, 'package.json'))
const releaseConfig = JSON.parse(readFileSync(path.join(ROOT, '.releaserc.json'), 'utf8'))

const silentLogger = { log() {}, error() {}, success() {}, warn() {} }

async function loadPlugin(name) {
  return import(pathToFileURL(requireFromProject.resolve(name)).href)
}

function optionsOf(name) {
  const entry = releaseConfig.plugins.find((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name)
  if (entry === undefined) throw new Error(`.releaserc.json has no ${name} plugin`)
  return Array.isArray(entry) ? (entry[1] ?? {}) : {}
}

function releaseContext(message, type, version) {
  return {
    cwd: ROOT,
    env: {},
    logger: silentLogger,
    commits: [{ hash: 'abc1234def5678', message, committerDate: '2026-10-16T00:00:00.000Z' }],
    lastRelease: { gitTag: 'v1.0.0', version: '1.0.0' },
    nextRelease: { gitTag: `v${version}`, version, type },
    options: { repositoryUrl: 'https://example.invalid/owner/repo.git' },
  }
}

function sectionOf(notes, heading) {
  const start = notes.indexOf(`### ${heading}`)
  if (start === -1) return ''
  const rest = notes.slice(start + heading.length + 4)
  const next = rest.indexOf('\n### ')
  return next === -1 ? rest : rest.slice(0, next)
}

const CASES = [
  {
    message: 'fix(core): refuse a wire to a missing pin',
    subject: 'refuse a wire to a missing pin',
    type: 'patch',
    version: '1.0.1',
    heading: 'Bug Fixes',
  },
  {
    message: 'feat: add wire color customization',
    subject: 'add wire color customization',
    type: 'minor',
    version: '1.1.0',
    heading: 'Features',
  },
]

describe('release configuration loads and runs offline', () => {
  describe.each(CASES)('$message', ({ message, subject, type, version, heading }) => {
    it(`analyzeCommits returns ${type}`, async () => {
      const { analyzeCommits } = await loadPlugin('@semantic-release/commit-analyzer')
      const result = await analyzeCommits(
        optionsOf('@semantic-release/commit-analyzer'),
        releaseContext(message, type, version),
      )
      expect(result).toBe(type)
    })

    it(`generateNotes lists the subject under ${heading}`, async () => {
      const { generateNotes } = await loadPlugin('@semantic-release/release-notes-generator')
      const notes = await generateNotes(
        optionsOf('@semantic-release/release-notes-generator'),
        releaseContext(message, type, version),
      )
      expect(sectionOf(notes, heading)).toContain(subject)
    })
  })
})
