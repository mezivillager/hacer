// Pure logic for the "a rewrite cannot silently drop a load-bearing rule" guard (ADR-0014's
// sibling, #299). No I/O — text is injected, so skills.logic.test.mjs feeds it the *live*
// briefs and skills: a fixture copy of a rule could never notice the live rule going missing.
//
// Three checks, one per thing a rewrite gets wrong:
//   1. a skill's frontmatter still names itself (the folder is what loads it)
//   2. no secret-shaped string reaches a file an agent loads verbatim
//   3. each brief still carries its load-bearing rules — and the superseded ones stay gone

/** Frontmatter keys every `.claude/skills/<slug>/SKILL.md` must carry. */
export const SKILL_FRONTMATTER_KEYS = ['name', 'description']

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---/
const FRONTMATTER_FIELD = /^([A-Za-z][\w-]*):\s*(.*)$/

/**
 * The top-level keys of a markdown frontmatter block.
 * @param {string} text
 * @returns {Record<string, string> | null} null when there is no block
 */
export function parseFrontmatter(text) {
  const block = FRONTMATTER_BLOCK.exec(text || '')
  if (!block) return null
  const fields = {}
  for (const line of block[1].split('\n')) {
    const field = FRONTMATTER_FIELD.exec(line)
    if (field) fields[field[1]] = field[2].trim().replace(/^["']|["']$/g, '')
  }
  return fields
}

/**
 * What is wrong with one skill's frontmatter, as greppable lines.
 * @param {string} slug the skill's folder name — what `Skill(<slug>)` loads
 * @param {string} text the SKILL.md
 * @returns {string[]} empty when the skill is well-formed
 */
export function checkSkillFrontmatter(slug, text) {
  const fields = parseFrontmatter(text)
  if (!fields) return [`${slug}: no frontmatter block`]
  const problems = SKILL_FRONTMATTER_KEYS.filter((key) => !fields[key]).map(
    (key) => `${slug}: frontmatter has no ${key}`,
  )
  if (fields.name && fields.name !== slug) {
    problems.push(`${slug}: frontmatter name is "${fields.name}", not the folder name`)
  }
  return problems
}

/**
 * Shapes a real credential has. Kept narrow on purpose: a doc that merely *talks* about
 * tokens is normal here, so only a literal long enough to be a live secret counts.
 */
export const SECRET_PATTERNS = [
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{22,}/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{24,}/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['private key block', /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/],
  ['inline credential', /\b(?:api[_-]?key|secret|token|password)["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i],
]

/**
 * Every secret-shaped string in `text`.
 * @param {string} text
 * @returns {{ line: number, label: string }[]}
 */
export function findSecrets(text) {
  const hits = []
  ;(text || '').split('\n').forEach((line, index) => {
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(line)) hits.push({ line: index + 1, label })
    }
  })
  return hits
}

/** Collapse every whitespace run to one space, so a re-wrap is not a failure. */
export function normaliseProse(text) {
  return (text || '').replace(/\s+/g, ' ')
}

/**
 * Does `text` carry every phrase, in order? Only the load-bearing words are matched —
 * line breaks and whatever sits between the phrases are free, so the check survives an
 * edit to the prose around a rule but not the removal of the rule itself.
 * @param {string} text
 * @param {string[]} phrases
 */
export function containsPhrases(text, phrases) {
  const prose = normaliseProse(text)
  let cursor = 0
  return phrases.every((phrase) => {
    const needle = normaliseProse(phrase)
    const at = prose.indexOf(needle, cursor)
    if (at === -1) return false
    cursor = at + needle.length
    return true
  })
}

/**
 * The rules each harness brief exists to state. `present` must still be there; `absent`
 * was deliberately taken out and must not come back.
 * @type {{ file: string, present: { id: string, phrases: string[] }[],
 *          absent: { id: string, phrases: string[], why: string }[] }[]}
 */
export const BRIEF_INVARIANTS = [
  {
    file: 'docs/harness/implementer-brief.md',
    present: [
      { id: 'never-edit-main', phrases: ['Never edit the `main` checkout'] },
      { id: 'reviewable-line-budget', phrases: ['400 reviewable changed lines'] },
      { id: 'red-is-a-compiling-stub', phrases: ['Red commit', 'smallest compiling stub'] },
      { id: 'no-ai-attribution', phrases: ['no AI attribution trailers'] },
      // #483: no claim paragraph existed before this — #403 and #438 sat `in-progress` with no
      // claim comment, so a second coordinator had nothing to read.
      {
        id: 'claim-before-building',
        phrases: ['## Claim', 'before building', '`Claimed by`', 'docs/harness/sessions/COORDINATOR-HANDOFF.md'],
      },
      // #483, from the 2026-09-23 vacuous-generator ledger row: a property test that passes
      // 400/400 against an unfixed engine proves nothing unless the red count is on record.
      { id: 'property-test-records-failure-count', phrases: ['**Property tests:**', 'failure count', 'gone vacuous'] },
      // #483, from #454: the brief had one TDD shape (test, then a production fix) and no path
      // for a test-only deliverable, so a fuzz red commit broke production on #444.
      {
        id: 'test-only-issue-path',
        phrases: ['**Test-only issues:**', 'never as a production change', '`fix:` stays for bugs that shipped'],
      },
      // #483, from the #149 ledger row: an exact new file path in a verification command broke
      // on the repo's own `x.logic.test.mjs` convention.
      {
        id: 'verification-command-names-a-behaviour',
        phrases: ['A verification command names a behaviour, not an exact new file path'],
      },
      { id: 'model-per-risk-tier', phrases: ['**Model:**', '`risk:0`', 'Sonnet', '`risk:2`', 'Opus'] },
      {
        id: 'five-definition-of-done-commands',
        phrases: ['pnpm run lint', 'pnpm run test:run', 'pnpm run build', 'pnpm run lint:docs', 'verification command'],
      },
      { id: 'stop-after-the-pr', phrases: ['do **not** keep watching CI'] },
      // #485: twice a PR that finished only part of an issue closed it on merge (#396, #443) — GitHub
      // acts on a closing keyword alone. One phrase, so the rule is pinned as the whole sentence.
      { id: 'fixes-only-when-the-whole-issue-is-done', phrases: ['`Fixes` only when the whole issue is done; otherwise `Part of`'] },
    ],
    absent: [
      { id: 'e2e-in-the-definition-of-done', phrases: ['test:e2e'], why: 'ADR-0012 took E2E out of the definition of done' },
      { id: 'stryker-mutation-testing', phrases: ['Stryker'], why: 'ADR-0011 removed Stryker' },
    ],
  },
  {
    file: 'docs/harness/verifier-brief.md',
    present: [
      { id: 'fresh-context', phrases: ['has **not** seen the builder'] },
      { id: 'block-needs-evidence', phrases: ['**BLOCK** only with', '`file:line`', 'Never for taste.'] },
      { id: 'nits-never-block', phrases: ['**NIT** ≤ 3', 'Nits never block'] },
      { id: 'pass-without-blockers', phrases: ['**PASS** when there are no blockers'] },
      { id: 'try-to-break-it', phrases: ['Try to break it:', 'Do not commit them.'] },
      // The tier split itself, as ONE phrase. `containsPhrases` is an ordered-subsequence match, so a
      // list of short phrases pins only their order: a rewrite that preserves word order while saying
      // the opposite passes (verified on #351). A whole sentence is an exact substring match, which is
      // what pinning a mapping requires. Owner's call, 2026-09-21; the evidence is model-tiering.md §1a.
      {
        id: 'model-per-risk-tier',
        phrases: [
          '**Model:** a PR touching `src/core/` or `src/simulation/`, or labelled `risk:2`, is verified on **Opus**; every other PR, at `risk:0` or `risk:1`, on **Sonnet**',
        ],
      },
      // Without this the tier that reviewed a PR is unrecorded, so no future tier claim is auditable.
      // One phrase per entry on purpose: `containsPhrases` is an ordered subsequence, so several
      // phrases in one entry couple the rule to document order — an innocent section reorder then
      // fails with a misleading message. Split, each of these is order-independent.
      { id: 'verdict-has-a-model-field', phrases: ['**Verified on:**'] },
      // #483: measured 2026-09-25 over the last 60 merged PRs, five non-docs cloud-lane merges
      // (#441, #442, #443, #445, #449) posted a verdict as free text a regex cannot see.
      {
        id: 'verdict-heading-required-every-lane',
        phrases: ['required in every lane, cloud included', 'what a verdict collector counts'],
      },
      // "always" is the load-bearing word: a rewrite asking for the field only when off-tier passed
      // an earlier version of this invariant.
      { id: 'verdict-names-its-model', phrases: ['**Name the model you ran on**, in the `Verified on:` field, always.'] },
      // The unsafe direction is running low on the engine; a rewrite that dropped this half passed.
      { id: 'off-tier-disclosed-both-ways', phrases: ['whichever direction it is wrong in'] },
    ],
    absent: [
      { id: 'stryker-mutation-testing', phrases: ['Stryker'], why: 'ADR-0011 removed Stryker' },
    ],
  },
  {
    file: 'docs/harness/product-brief.md',
    present: [
      { id: 'no-evidence-no-finding', phrases: ['No evidence, no finding.'] },
      { id: 'never-self-apply-sev-critical', phrases: ['**Never set `sev:critical` yourself**'] },
      { id: 'never-render-locally', phrases: ['**Never**', 'render the app on a local machine'] },
    ],
    absent: [
      { id: 'render-the-app-locally', phrases: ['pnpm run dev'], why: "ADR-0016: browser QA runs in the cloud, never on the owner's laptop" },
    ],
  },
  {
    file: 'docs/harness/fidelity-brief.md',
    present: [
      { id: 'no-plausible-claim', phrases: ['Never fill a gap with a plausible claim.', '`unverified` is a verdict'] },
      { id: 'vectors-decide', phrases: ['the vectors decide'] },
      { id: 'never-files-a-proposal', phrases: ['**Never** file an issue for a proposal'] },
    ],
    // Nothing has been taken out of this brief yet. An `absent` rule goes in only when a
    // real removal backs it — an ADR or a ledger row — never a sentence nobody ever wrote.
    absent: [],
  },
]
