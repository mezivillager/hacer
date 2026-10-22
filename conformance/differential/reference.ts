// The reference simulator: web-ide at the commit reference.json pins, cloned and built under node_modules/.cache,
// never a sibling checkout and never committed (docs/testing/differential.md). Runs alone as `node <this file>`.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface Pin {
  repository: string
  commit: string
  packages: string[]
  dependencies: Record<string, string>
}

interface Provenance {
  pin: Pin
  typeErrors: number
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PIN = JSON.parse(readFileSync(path.join(HERE, 'reference.json'), 'utf-8')) as Pin

export const referenceDir = path.resolve(HERE, '../../node_modules/.cache/hacer-differential', PIN.commit)
const PROVENANCE = path.join(referenceDir, 'provenance.json')
export const BUILT = ['simulator/build/chip/builder.js', 'simulator/build/languages/tst.js', 'simulator/build/test/chiptst.js']

const run = (cmd: string, args: string[]): string =>
  execFileSync(cmd, args, { cwd: referenceDir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000 })

function checkout(): void {
  rmSync(referenceDir, { recursive: true, force: true })
  mkdirSync(referenceDir, { recursive: true })
  run('git', ['init', '-q'])
  run('git', ['remote', 'add', 'origin', PIN.repository])
  run('git', ['sparse-checkout', 'set', '--no-cone', '/LICENSE', '/tsconfig.base.json', ...PIN.packages.map((p) => `/${p}/`)])
  run('git', ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', PIN.commit])
  run('git', ['checkout', '-q', 'FETCH_HEAD'])
  const head = run('git', ['rev-parse', 'HEAD']).trim()
  if (head !== PIN.commit) throw new Error(`reference checkout is at ${head}, not the pinned ${PIN.commit}`)
}

const installedVersion = (name: string): string =>
  (JSON.parse(readFileSync(path.join(referenceDir, 'node_modules', name, 'package.json'), 'utf-8')) as { version: string }).version

/** A manifest of our own replaces web-ide's: only the pinned packages, and exact versions every one of them resolves to. */
function install(): void {
  const manifest = {
    name: 'hacer-differential-reference',
    private: true,
    workspaces: PIN.packages,
    dependencies: PIN.dependencies,
  }
  writeFileSync(path.join(referenceDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  run('npm', ['install', '--omit=dev', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund'])
  for (const [name, version] of Object.entries(PIN.dependencies)) {
    const actual = installedVersion(name)
    if (actual !== version) throw new Error(`reference install resolved ${name}@${actual}, not the pinned ${version}`)
  }
}

/** Upstream's sources carry type errors that do not stop the emit, so the emit is the gate, not tsc's exit code. */
function build(): number {
  let output = ''
  for (const pkg of PIN.packages) {
    try {
      output += run(process.execPath, ['node_modules/typescript/bin/tsc', '--build', pkg])
    } catch (e) {
      output += (e as { stdout?: string }).stdout ?? ''
    }
  }
  const missing = BUILT.filter((file) => !existsSync(path.join(referenceDir, file)))
  if (missing.length > 0) throw new Error(`tsc did not emit ${missing.join(', ')}:\n${output}`)
  return (output.match(/error TS\d+/g) ?? []).length
}

export function current(dir: string = referenceDir): boolean {
  const provenance = path.join(dir, 'provenance.json')
  if (!existsSync(provenance)) return false
  const { pin } = JSON.parse(readFileSync(provenance, 'utf-8')) as Provenance
  return JSON.stringify(pin) === JSON.stringify(PIN)
}

/** The built reference's directory, fetched and built first unless its provenance already matches the pin. */
export function ensureReference(log: (line: string) => void = () => {}): string {
  if (current()) {
    log(`reference: web-ide ${PIN.commit}, already built`)
    return referenceDir
  }
  log(`reference: cloning ${PIN.repository} at ${PIN.commit}`)
  checkout()
  log('reference: npm install (pinned versions)')
  install()
  const typeErrors = build()
  log(`reference: built; tsc reported ${typeErrors} upstream type error(s), emit complete`)
  const provenance: Provenance = { pin: PIN, typeErrors }
  writeFileSync(PROVENANCE, `${JSON.stringify(provenance, null, 2)}\n`)
  return referenceDir
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(ensureReference(console.log))
}
