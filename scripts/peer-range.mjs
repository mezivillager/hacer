#!/usr/bin/env node
// Fail when an installed react, react-dom, three or @react-three/* peer is unmet (#455).
//   node scripts/peer-range.mjs [--modules <dir>] [--allow <file>]
// Exit 0 passes, 1 is a violation, 2 means the tree or allow-list could not be read.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkPeerRanges, formatReport, inPeerSet, parseArgs } from './peer-range.logic.mjs'

function isDirectory(dir) {
  try {
    return statSync(dir).isDirectory()
  } catch {
    return false
  }
}

function readPackage(file) {
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`peer-range: cannot read ${file}: ${message}`)
  }
  if (typeof data?.name !== 'string' || typeof data?.version !== 'string') return null
  const declared = data.peerDependencies && typeof data.peerDependencies === 'object' ? data.peerDependencies : {}
  const meta = data.peerDependenciesMeta && typeof data.peerDependenciesMeta === 'object' ? data.peerDependenciesMeta : {}
  const peers = Object.entries(declared).map(([name, range]) => ({
    name,
    range: typeof range === 'string' ? range : String(range),
    optional: meta[name]?.optional === true,
  }))
  return { name: data.name, version: data.version, peers }
}

function resolvePeer(modulesDir, dependent, peer) {
  const candidates = [
    path.join(modulesDir, ...dependent.split('/'), 'node_modules', ...peer.split('/'), 'package.json'),
    path.join(modulesDir, ...peer.split('/'), 'package.json'),
  ]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const pkg = readPackage(file)
    if (pkg) return pkg.version
  }
  return null
}

/** Top-level packages in the set. A nested copy wins for that dependent's peer. Symlinks count. */
export function readInstalledSet(modulesDir) {
  if (!isDirectory(modulesDir)) throw new Error(`peer-range: modules directory not found: ${modulesDir}`)
  const byName = new Map()
  const consider = (file) => {
    if (!existsSync(file)) return
    const pkg = readPackage(file)
    if (pkg && inPeerSet(pkg.name)) byName.set(pkg.name, pkg)
  }
  for (const entry of readdirSync(modulesDir)) {
    if (entry.startsWith('.') || !isDirectory(path.join(modulesDir, entry))) continue
    if (entry.startsWith('@')) {
      if (entry !== '@react-three') continue
      for (const child of readdirSync(path.join(modulesDir, entry))) {
        if (!child.startsWith('.')) consider(path.join(modulesDir, entry, child, 'package.json'))
      }
      continue
    }
    consider(path.join(modulesDir, entry, 'package.json'))
  }
  const packages = [...byName.values()].map((pkg) => {
    const resolved = {}
    for (const peer of pkg.peers) resolved[peer.name] = resolvePeer(modulesDir, pkg.name, peer.name)
    return { name: pkg.name, version: pkg.version, peers: pkg.peers, resolved }
  })
  packages.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return { packages }
}

function main() {
  const root = path.resolve(import.meta.dirname, '..')
  const parsed = parseArgs(process.argv.slice(2), {
    modules: path.join(root, 'node_modules'),
    allow: path.join(import.meta.dirname, 'peer-range.allow.json'),
  })
  if (!parsed.ok) {
    console.error(parsed.error)
    process.exit(2)
  }
  let set
  try {
    set = readInstalledSet(parsed.modules)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
  let allow
  try {
    allow = JSON.parse(readFileSync(parsed.allow, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`peer-range: cannot read allow-list: ${message}`)
    process.exit(2)
  }
  if (!Array.isArray(allow)) {
    console.error('peer-range: allow-list must be a JSON array')
    process.exit(2)
  }
  const result = checkPeerRanges({ packages: set.packages, allow })
  process.stdout.write(formatReport(result))
  process.exit(result.ok ? 0 : 1)
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) main()
