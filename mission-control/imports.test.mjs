// The boundary (#473): Mission Control imports nothing from src/. The layer ratchet cruises src/ only, and the 3D app's
// bundle must not move. Resolved as the app resolves (tsconfig.app.json's aliases), so `@/…` counts as src/ too.
import { cruise } from 'dependency-cruiser'
import path from 'node:path'
import { expect, it } from 'vitest'

const RULE = { name: 'control-no-src', severity: 'error', from: { path: '^mission-control/' }, to: { path: '^src/' } }

it('mission-control/ imports nothing from src/', async () => {
  const { output } = await cruise(['mission-control'], {
    ruleSet: { forbidden: [RULE] }, validate: true, baseDir: path.join(import.meta.dirname, '..'),
    exclude: { path: '^mission-control/(dist|public)/' }, doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true, tsConfig: { fileName: 'tsconfig.app.json' },
  })
  expect(output.summary.violations).toEqual([])
  // It read the site itself, tests included — not an empty folder that passes by default.
  expect(output.modules.map((module) => module.source)).toEqual(expect.arrayContaining([
    'mission-control/src/App.tsx', 'mission-control/src/App.test.tsx', 'scripts/fixtures/mission-control/snapshot.json',
  ]))
})
