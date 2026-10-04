import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import ownedSkills from './owned-skills.json' with { type: 'json' }
import { findAbsolutePaths, isScannedFile } from './hooks/docPaths.logic.mjs'
import {
  AGENT_INVARIANTS,
  BRIEF_INVARIANTS,
  SECRET_PATTERNS,
  SKILL_FRONTMATTER_KEYS,
  TWIN_SENTENCES,
  VERIFIER_TIER_SENTENCE,
  checkSkillFrontmatter,
  checkTwinAgreement,
  containsPhrases,
  findSecrets,
  normaliseProse,
  parseFrontmatter,
  sentenceAfter,
  stripFrontmatter,
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
    const lines = SKILL_FRONTMATTER_KEYS.filter((k) => k !== key).map((k) => `${k}: ${k === 'name' ? 'tdd' : 'something'}`)
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
    ...AGENT_INVARIANTS.map((invariant) => [invariant.file, () => readBrief(invariant.file)]),
  ]
  // `.claude/skills/` is vendored (scripts/sync-superpowers.sh overwrites it), so the
  // house style is policed only where we own the file — isScannedFile knows which.
  const authored = docs.filter(([file]) => isScannedFile(file))

  it('polices the briefs and the skills this repo owns', () => {
    expect(authored.map(([file]) => file)).toEqual([
      ...ownedSkills.toSorted().map((slug) => `.claude/skills/${slug}/SKILL.md`),
      ...BRIEF_INVARIANTS.map((invariant) => invariant.file),
      ...AGENT_INVARIANTS.map((invariant) => invariant.file),
    ])
  })

  it.each(authored)('%s cites no machine-absolute path', (_file, read) => {
    expect(findAbsolutePaths(read())).toEqual([])
  })

  // A secret is never waived, vendored or not: these files are loaded verbatim.
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

describe('stripFrontmatter', () => {
  it('drops the --- block and keeps the body', () => {
    expect(stripFrontmatter(['---', 'name: x', '---', '# Body'].join('\n'))).toBe('\n# Body')
  })

  it('returns the whole text when there is no block', () => {
    expect(stripFrontmatter('# Body')).toBe('# Body')
  })
})

describe('sentenceAfter', () => {
  it('returns the sentence after the anchor, through its full stop, whitespace collapsed', () => {
    expect(sentenceAfter('- **Model:** a PR is\n  verified on **Opus**. The engine wins.', '**Model:** ')).toBe(
      'a PR is verified on **Opus**.',
    )
  })

  it('returns null when the anchor or the full stop is missing', () => {
    expect(sentenceAfter('no anchor here.', '**Model:** ')).toBeNull()
    expect(sentenceAfter('**Model:** never ends', '**Model:** ')).toBeNull()
  })
})

describe('checkTwinAgreement', () => {
  const owner = '**Model:** a PR touching `src/core/` is verified on **Opus**; every other PR on **Sonnet**. More.'

  it('passes twins that carry the owner\'s sentence verbatim, re-wrapped or not', () => {
    expect(checkTwinAgreement(owner, '**Model:** ', [
      { label: 'description', text: 'Tier: a PR touching `src/core/` is verified on **Opus**; every other PR on **Sonnet**. Rest.' },
      { label: 'body', text: 'a PR touching `src/core/` is verified\non **Opus**; every other PR on **Sonnet**.' },
    ])).toEqual([])
  })

  it('flags a twin that differs by one word — the defect L037 and L044 record', () => {
    const problems = checkTwinAgreement(owner, '**Model:** ', [
      { label: 'body', text: 'a PR touching `src/core/` is verified on **Sonnet**; every other PR on **Sonnet**.' },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^body: /)
  })

  it('flags an owner that no longer states the sentence', () => {
    expect(checkTwinAgreement('nothing here', '**Model:** ', [{ label: 'body', text: 'x' }])).toHaveLength(1)
  })
})

describe('every agent frontmatter survives a strict YAML read', () => {
  // The five prompt-it seats (prompt-reviewer, researcher, implementer, reviewer, data-lane) live in the owner's global ~/.claude/agents/, outside this repo.
  const agentFiles = readdirSync('.claude/agents')
    .filter((name) => name.endsWith('.md'))
    .map((name) => `.claude/agents/${name}`)
  const frontmatterLines = (file) => /^---\n([\s\S]*?)\n---/.exec(readBrief(file))[1].split('\n')

  it.each(agentFiles)('%s has no " #" in a frontmatter value', (file) => {
    expect(frontmatterLines(file).filter((line) => line.includes(' #'))).toEqual([])
  })

  it.each(agentFiles)('%s description and model equal the lines as written', (file) => {
    const lines = frontmatterLines(file)
    const fields = parseFrontmatter(readBrief(file))
    for (const key of ['description', 'model']) {
      const line = lines.find((l) => l.startsWith(`${key}:`))
      if (line) expect(fields[key]).toBe(line.slice(key.length + 1).trim())
    }
  })
})

describe('the agent definitions keep their load-bearing rules', () => {
  const partOf = (text, part) => (part === 'description' ? parseFrontmatter(text)?.description ?? '' : stripFrontmatter(text))
  const pins = AGENT_INVARIANTS.flatMap((i) =>
    ['description', 'body'].flatMap((part) => (i[part] ?? []).map((rule) => [i.file, part, rule.id, rule.phrases])),
  )

  it('pins every agent definition in .claude/agents', () => {
    expect(AGENT_INVARIANTS.map((i) => i.file)).toEqual([
      '.claude/agents/hacer-builder.md',
      '.claude/agents/hacer-verifier.md',
      '.claude/agents/hacer-product.md',
      '.claude/agents/hacer-fidelity.md',
    ])
    expect(AGENT_INVARIANTS.every((i) => (i.body ?? []).length > 0)).toBe(true)
  })

  it.each(AGENT_INVARIANTS.map((i) => [i.file, i.model]))('%s keeps model: %s', (file, model) => {
    expect(parseFrontmatter(readBrief(file)).model).toBe(model)
  })

  it.each(pins)('%s %s still says: %s', (file, part, _id, phrases) => {
    expect(containsPhrases(partOf(readBrief(file), part), phrases)).toBe(true)
  })

  it('pins the verifier\'s tier rule as one whole sentence in the description and the body', () => {
    const verifier = AGENT_INVARIANTS.find((i) => i.file === '.claude/agents/hacer-verifier.md')
    for (const part of ['description', 'body']) {
      expect(verifier[part].map((rule) => rule.phrases)).toContainEqual([VERIFIER_TIER_SENTENCE])
    }
  })

  it.each(TWIN_SENTENCES.map((t) => [t.id, t]))('%s: every twin carries the owner\'s sentence', (_id, twin) => {
    const twins = twin.twins.map(({ file, part }) => ({ label: `${file} ${part}`, text: partOf(readBrief(file), part) }))
    expect(checkTwinAgreement(readBrief(twin.owner), twin.anchor, twins)).toEqual([])
  })

  it('checks the verifier\'s tier sentence against its brief', () => {
    expect(TWIN_SENTENCES.map((t) => [t.owner, ...t.twins.map((w) => `${w.file} ${w.part}`)])).toContainEqual([
      'docs/harness/verifier-brief.md',
      '.claude/agents/hacer-verifier.md description',
      '.claude/agents/hacer-verifier.md body',
    ])
  })
})

describe('the measured-facts rule (#394)', () => {
  const anchor = '**Measured facts before dispatch:** '
  const readme = () => readBrief('docs/harness/README.md')

  it('the harness README states the check and the checklist it leaves to the writer', () => {
    expect(containsPhrases(readme(), [anchor, '`node scripts/issue-facts.mjs <n>`', 'a Measured-facts row'])).toBe(true)
  })

  it('ha-next carries the README\'s sentence verbatim', () => {
    expect(checkTwinAgreement(readme(), anchor, [{ label: 'ha-next', text: readSkill('ha-next') }])).toEqual([])
  })
})
