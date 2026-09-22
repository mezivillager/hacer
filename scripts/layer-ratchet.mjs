#!/usr/bin/env node
// layer-ratchet: the layer rules as a ratchet (#329). Part of `pnpm run lint`.
//
//   pnpm run lint:layers          # check, and print the count the foundation plan tracks
//   pnpm run lint:layers:shrink   # after fixing one: drop it from the baseline, for good
//
// Cruises src/ with the rules in .dependency-cruiser.cjs, ignoring the violations recorded in
// .dependency-cruiser-known-violations.json. Today's violations therefore pass; a NEW one exits 1.
// The baseline is only ever rewritten with `--baseline-mode shrink-only`, so a violation that has
// been fixed can never be re-added. Rules live in the config, counting in layer-ratchet.logic.mjs.

import { cruise } from 'dependency-cruiser'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import {
  CONFIG_FILE,
  ESLINT_SUPPRESSIONS_FILE,
  EXIT,
  KNOWN_VIOLATIONS_FILE,
  countSuppressions,
  formatReport,
  summarise,
} from './layer-ratchet.logic.mjs'

const root = path.resolve(import.meta.dirname, '..')
const read = (file) => (existsSync(path.join(root, file)) ? readFileSync(path.join(root, file), 'utf8') : null)

const config = createRequire(import.meta.url)(path.join(root, CONFIG_FILE))
const baseline = read(KNOWN_VIOLATIONS_FILE)
if (baseline === null) {
  console.error(`layer-ratchet: ${KNOWN_VIOLATIONS_FILE} is missing — regenerate it with \`pnpm run lint:layers:shrink\``)
  process.exit(EXIT.usage)
}

let cruised
try {
  cruised = await cruise(['src'], {
    ...config.options,
    ruleSet: { forbidden: config.forbidden },
    // Known violations are re-labelled `ignore` rather than dropped, so one cruise yields both
    // halves of the metric: what is known, and what is new.
    knownViolations: JSON.parse(baseline),
    validate: true,
    baseDir: root,
  })
} catch (error) {
  console.error(`layer-ratchet: dependency-cruiser failed — ${error?.message ?? error}`)
  process.exit(EXIT.usage)
}

const summary = summarise(cruised.output, {
  suppressedGlobals: countSuppressions(read(ESLINT_SUPPRESSIONS_FILE)),
})

console.log(formatReport(summary))
process.exit(summary.ok ? EXIT.ok : EXIT.newViolations)
