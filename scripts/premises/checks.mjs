// Premise commands for docs/decisions/premises.md (#468). Exit 0 when the check ran; non-zero is unverifiable.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' })

function fastCheck() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const bags = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
  const inPkg = bags.some((bag) => pkg[bag] && Object.hasOwn(pkg[bag], 'fast-check'))
  const inLock = /(^|\n)  fast-check@/.test(readFileSync('pnpm-lock.yaml', 'utf8'))
  process.stdout.write(inPkg || inLock ? 'present' : 'absent')
}

function mainRules() {
  const ruleset = JSON.parse(gh(['api', 'repos/mezivillager/hacer/rulesets/13907542']))
  const contexts = ruleset.rules
    .filter((rule) => rule.type === 'required_status_checks')
    .flatMap((rule) => rule.parameters.required_status_checks.map((check) => check.context))
    .sort()
  process.stdout.write(contexts.join() === ['browser-qa', 'ci', 'pr-hygiene'].join() ? 'those three' : contexts.join(','))
}

function bogusRef() {
  let out = ''
  try {
    out = gh(['api', 'repos/mezivillager/hacer/commits/not-a-real-ref-lineage-verify', '-i'])
  } catch (error) {
    if (error.status == null) throw error
    out = String(error.stdout ?? '')
  }
  const status = /^HTTP\/\S+\s+(\d+)/m.exec(out)
  if (!status) process.exit(1)
  process.stdout.write(status[1])
}

function peerInstall() {
  const dir = mkdtempSync(path.join(tmpdir(), 'hacer-peer-'))
  let result
  try {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name: 'peer-warning', private: true,
      dependencies: { react: '19.3.0' },
      devDependencies: { '@react-three/fiber': '9.7.0' },
    }))
    result = spawnSync('pnpm', ['install', '--ignore-workspace'], { cwd: dir, encoding: 'utf8' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  // Only a peer refusal answers the premise. Any other failure (a registry fetch, a rate limit, no
  // pnpm) is a lookup that did not happen: unverifiable, never a false `exit 1`.
  const said = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.error || result.status === null || (result.status !== 0 && !said.includes('ERR_PNPM_PEER_DEP_ISSUES'))) {
    console.error(result.error?.message ?? said)
    process.exit(1)
  }
  process.stdout.write(`exit ${result.status}`)
}

// A command that calls `gh` carries it in its name, so its Verify text shows it and `verify` skips it with no token.
const commands = { 'fast-check': fastCheck, 'gh-main-rules': mainRules, 'gh-bogus-ref': bogusRef, 'peer-install': peerInstall }
const run = commands[process.argv[2]]
if (!run) {
  console.error(`usage: node scripts/premises/checks.mjs <${Object.keys(commands).join('|')}>`)
  process.exit(2)
}
run()
