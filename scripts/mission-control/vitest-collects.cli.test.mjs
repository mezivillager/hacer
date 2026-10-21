import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

// PR #512's verifier BLOCK: vite.config.ts's ALL_TESTS glob for mission-control/ was
// `*.{test,spec}.{tsx,mjs}` — no `.ts` — so mission-control/src/snapshot.test.ts (this issue's own
// freshness-banner tests) was silently never collected, by any command, anywhere: not `test:run`,
// not the issue's own verification command, not CI. vite.config.ts's own comment already named
// this exact failure mode once (#313, a different extension, a different root); it recurred one PR
// later in a place that fix did not cover.
//
// Deliberately a subprocess test of vitest's own collection (`vitest list`), not a reimplementation
// of its glob matching in this file — the bug lived entirely in that untested gap between "the glob
// looks right" and "vitest actually collects the file", the same rationale pr-preview-sweep.cli.test.mjs
// gives for being the other place this repo tests wiring directly. Scoped to mission-control/ (what
// broke); a repo-wide version would also re-litigate #436's separate, already-filed node/jsdom gaps.

const ROOT = path.join(import.meta.dirname, '..', '..')
const TEST_FILE = /\.(test|spec)\.[^/.]+$/
const VITEST_BIN = path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs')
const run = promisify(execFile)

// `--filesOnly` lists what the config's globs match without importing any test file, so the child
// takes seconds, not tens of seconds, on a loaded laptop. The child is killed at CHILD_LIMIT_MS so a
// collection that never ends fails this one test with that message instead of stalling the whole run.
const CHILD_LIMIT_MS = 60_000
const TEST_LIMIT_MS = CHILD_LIMIT_MS + 15_000

/** Every real test/spec file under a directory, repo-relative and forward-slashed — plain fs, no glob library:
 *  this must ask what is really on disk, not what a pattern says should be there. */
function testFilesUnder(dir) {
  return readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .map((entry) => `${dir}/${entry.split(path.sep).join('/')}`)
    .filter((file) => TEST_FILE.test(file))
}

describe('vite.config.ts collects every mission-control test file', () => {
  it('every mission-control/**/*.test.* or *.spec.* file on disk is one `vitest list` actually reports', async () => {
    const onDisk = testFilesUnder('mission-control')
    expect(onDisk.length).toBeGreaterThan(0) // otherwise the check below is vacuous, not green

    const { stdout: listed } = await run(process.execPath, [VITEST_BIN, 'list', 'mission-control', '--filesOnly'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: CHILD_LIMIT_MS,
    })
    for (const file of onDisk) expect(listed, `${file} was not collected by any vitest project`).toContain(file)
  }, TEST_LIMIT_MS)
})
