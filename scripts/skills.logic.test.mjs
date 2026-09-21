import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { findAbsolutePaths } from './hooks/docPaths.logic.mjs'
import {
  BRIEF_INVARIANTS,
  SECRET_PATTERNS,
  SKILL_FRONTMATTER_KEYS,
  checkSkillFrontmatter,
  containsPhrases,
  findSecrets,
  normaliseProse,
  parseFrontmatter,
} from './skills.logic.mjs'

// These tests read the LIVE briefs and skills, not fixtures: a rewrite that drops a
// load-bearing rule has to fail here, which a fixture copy of the rule could never do.
const repoRoot = path.join(import.meta.dirname, '..')
const skillsDir = path.join(repoRoot, '.claude', 'skills')
const skillSlugs = readdirSync(skillsDir)
  .filter((slug) => existsSync(path.join(skillsDir, slug, 'SKILL.md')))
  .sort()
const readSkill = (slug) => readFileSync(path.join(skillsDir, slug, 'SKILL.md'), 'utf8')
const readBrief = (file) => readFileSync(path.join(repoRoot, file), 'utf8')

// Built by concatenation so no committed file ever holds a whole secret-shaped literal.
const fakeSecrets = [
  ['a GitHub token', `ghp_${'A1b2C3d4E5'.repeat(3)}f6g7h8`],
  ['a fine-grained GitHub token', `github_pat_${'x'.repeat(30)}`],
  ['an Anthropic key', `sk-ant-${'api03-'}${'z'.repeat(30)}`],
  ['an AWS access key id', `AKIA${'ABCDEFGHIJ123456'}`],
  ['a private key block', `-----BEGIN${' RSA'} PRIVATE KEY-----`],
  ['an inline credential', `api_key${':'} "${'s3cret'.repeat(4)}"`],
]

describe('parseFrontmatter', () => {
  it('reads the keys of a --- block and ignores the body', () => {
    const text = ['---', 'name: tdd', 'description: Use when implementing.', '---', '# Body', 'name: not-this'].join('\n')
    expect(parseFrontmatter(text)).toMatchObject({ name: 'tdd', description: 'Use when implementing.' })
  })

  it('strips quotes around a value', () => {
    expect(parseFrontmatter(['---', 'name: "tdd"', '---'].join('\n')).name).toBe('tdd')
  })

  it('returns null when there is no frontmatter block', () => {
    expect(parseFrontmatter('# Just a heading')).toBeNull()
    expect(parseFrontmatter('')).toBeNull()
  })
})

describe('checkSkillFrontmatter', () => {
  const frontmatter = (...lines) => ['---', ...lines, '---', '# Body'].join('\n')

  it('passes a skill whose name is its folder and which has a description', () => {
    expect(checkSkillFrontmatter('tdd', frontmatter('name: tdd', 'description: Use when.'))).toEqual([])
  })

  it('reports a missing frontmatter block', () => {
    expect(checkSkillFrontmatter('tdd', '# Body')).toEqual(['tdd: no frontmatter block'])
  })

  it.each(SKILL_FRONTMATTER_KEYS)('reports a missing %s', (key) => {
    const lines = SKILL_FRONTMATTER_KEYS.filter((k) => k !== key).map((k) => `${k}: something`)
    expect(checkSkillFrontmatter('tdd', frontmatter(...lines))).toEqual([`tdd: frontmatter has no ${key}`])
  })

  it('reports a name that is not the folder name — the folder is what loads the skill', () => {
    expect(checkSkillFrontmatter('tdd', frontmatter('name: TDD', 'description: Use when.'))).toEqual([
      'tdd: frontmatter name is "TDD", not the folder name',
    ])
  })
})

describe('every live skill', () => {
  it('is a folder with a SKILL.md — there is at least one', () => {
    expect(skillSlugs.length).toBeGreaterThan(0)
  })

  it.each(skillSlugs)('%s has valid frontmatter naming itself', (slug) => {
    expect(checkSkillFrontmatter(slug, readSkill(slug))).toEqual([])
  })
})

describe('findSecrets', () => {
  it.each(fakeSecrets)('flags %s', (_label, secret) => {
    expect(findSecrets(`export FOO=${secret}`)).toHaveLength(1)
  })

  it('reports the 1-based line and the shape it matched', () => {
    const [hit] = findSecrets(['first', `token: "${'k'.repeat(20)}"`].join('\n'))
    expect(hit).toMatchObject({ line: 2 })
    expect(SECRET_PATTERNS.map(([label]) => label)).toContain(hit.label)
  })

  it.each([
    ['prose about tokens', 'the agents `gh` token lacked the `workflow` scope'],
    ['an env var name', 'set `GITHUB_TOKEN` in the environment'],
    ['a short quoted value', 'password: "hunter2"'],
  ])('passes %s', (_label, text) => {
    expect(findSecrets(text)).toEqual([])
  })

  it('handles empty input', () => {
    expect(findSecrets('')).toEqual([])
    expect(findSecrets(undefined)).toEqual([])
  })
})

describe('no live skill or brief leaks a path or a secret', () => {
  const docs = [
    ...skillSlugs.map((slug) => [`.claude/skills/${slug}/SKILL.md`, () => readSkill(slug)]),
    ...BRIEF_INVARIANTS.map((invariant) => [invariant.file, () => readBrief(invariant.file)]),
  ]

  it.each(docs)('%s cites no machine-absolute path', (_file, read) => {
    expect(findAbsolutePaths(read())).toEqual([])
  })

  it.each(docs)('%s carries no secret-shaped string', (_file, read) => {
    expect(findSecrets(read())).toEqual([])
  })
})

describe('containsPhrases', () => {
  it('matches a rule that has been re-wrapped across lines', () => {
    expect(containsPhrases('**Never** edit code, or render the app\n  on a local machine.', [
      '**Never** edit code',
      'render the app on a local machine',
    ])).toBe(true)
  })

  it('ignores runs of whitespace', () => {
    expect(normaliseProse(' a  b\n\tc ')).toBe(' a b c ')
    expect(containsPhrases('BLOCK   only    with `file:line`', ['BLOCK only with', '`file:line`'])).toBe(true)
  })

  it('requires the phrases in order', () => {
    expect(containsPhrases('file:line after BLOCK only with', ['BLOCK only with', 'file:line'])).toBe(false)
  })

  it('fails when a phrase is gone', () => {
    expect(containsPhrases('**BLOCK** whenever you disagree', ['**BLOCK** only with', '`file:line`'])).toBe(false)
  })

  it('is case-sensitive, so a weakened rewrite does not pass', () => {
    expect(containsPhrases('never for taste.', ['Never for taste.'])).toBe(false)
  })

  it('handles empty input', () => {
    expect(containsPhrases('', ['x'])).toBe(false)
    expect(containsPhrases('x', [])).toBe(true)
  })
})

describe('the harness briefs keep their load-bearing rules', () => {
  const present = BRIEF_INVARIANTS.flatMap((i) => i.present.map((rule) => [i.file, rule.id, rule.phrases]))
  const absent = BRIEF_INVARIANTS.flatMap((i) => i.absent.map((rule) => [i.file, rule.id, rule.phrases]))

  it('pins every brief in docs/harness, each with at least one rule', () => {
    expect(BRIEF_INVARIANTS.map((i) => i.file)).toEqual([
      'docs/harness/implementer-brief.md',
      'docs/harness/verifier-brief.md',
      'docs/harness/product-brief.md',
      'docs/harness/fidelity-brief.md',
    ])
    expect(BRIEF_INVARIANTS.every((i) => i.present.length > 0)).toBe(true)
    expect(absent.length).toBeGreaterThan(0)
  })

  it.each(present)('%s still says: %s', (file, _id, phrases) => {
    expect(containsPhrases(readBrief(file), phrases)).toBe(true)
  })

  it.each(absent)('%s no longer says: %s', (file, _id, phrases) => {
    expect(containsPhrases(readBrief(file), phrases)).toBe(false)
  })
})
