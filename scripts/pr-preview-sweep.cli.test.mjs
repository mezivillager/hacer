import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Reproduces the verifier's PR #491 finding at the process level: `gh pr list` exiting 0 with an
// empty body must never read as "every PR is closed" and destructively sweep every folder. A
// thin subprocess test — deliberately the one place this repo tests a *.mjs CLI directly and not
// just its *.logic.mjs — because the bug lived entirely in the untested wiring between the two
// (verifier's nit), not in the pure decision.

const SCRIPT = path.join(import.meta.dirname, 'pr-preview-sweep.mjs')
const cleanupDirs = []

afterEach(() => {
  while (cleanupDirs.length > 0) rmSync(cleanupDirs.pop(), { recursive: true, force: true })
})

/**
 * A disposable `gh` on PATH: `pr list` -> `[]`/exit 0 (the verifier's exact trigger); `pr view`
 * -> exit 1 for every number, standing in for gh being unavailable across the board — the worst
 * case, where neither the pre-filter nor a single per-folder lookup can produce evidence.
 */
function fakeGhBin() {
  const dir = mkdtempSync(path.join(tmpdir(), 'pr-preview-sweep-gh-'))
  cleanupDirs.push(dir)
  const script = [
    '#!/bin/sh',
    'if [ "$1" = "pr" ] && [ "$2" = "list" ]; then echo "[]"; exit 0; fi',
    'if [ "$1" = "pr" ] && [ "$2" = "view" ]; then echo "gh: unavailable (test double)" >&2; exit 1; fi',
    'echo "unexpected gh invocation: $*" >&2',
    'exit 1',
    '',
  ].join('\n')
  const ghPath = path.join(dir, 'gh')
  writeFileSync(ghPath, script)
  chmodSync(ghPath, 0o755)
  return dir
}

/** A disposable git checkout standing in for a `gh-pages` worktree, seeded with preview folders. */
function disposableGhPagesRepo(folders) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pr-preview-sweep-repo-'))
  cleanupDirs.push(dir)
  const git = (args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' })
  git(['init', '-q'])
  git(['config', 'user.name', 'test'])
  git(['config', 'user.email', 'test@example.com'])
  for (const folder of folders) {
    mkdirSync(path.join(dir, 'pr-preview', folder), { recursive: true })
    writeFileSync(path.join(dir, 'pr-preview', folder, 'index.html'), `<html>${folder}</html>`)
  }
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'seed'])
  return dir
}

describe('pr-preview-sweep.mjs (subprocess, gh stubbed)', () => {
  it('an empty gh pr list, with every gh pr view also unavailable, removes nothing', () => {
    const ghBinDir = fakeGhBin()
    const folders = ['pr-1', 'pr-2', 'pr-3']
    const repoDir = disposableGhPagesRepo(folders)

    const result = spawnSync('node', [SCRIPT, '--dir', repoDir], {
      env: { ...process.env, PATH: `${ghBinDir}:${process.env.PATH}`, GITHUB_TOKEN: 'test-token' },
      encoding: 'utf8',
    })

    for (const folder of folders) {
      expect(existsSync(path.join(repoDir, 'pr-preview', folder, 'index.html'))).toBe(true)
    }
    const log = execFileSync('git', ['log', '--oneline'], { cwd: repoDir, encoding: 'utf8' }).trim().split('\n')
    expect(log).toHaveLength(1) // only the seed commit — no destructive sweep commit landed
    expect(result.status).toBe(0)
    expect(result.stdout).not.toMatch(/^SWEEP: removed/m)
  })
})
