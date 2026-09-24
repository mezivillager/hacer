#!/usr/bin/env node
// Extract .hdl/.tst/.cmp text from a web-ide checkout that sync-vectors.sh has already
// pinned. The checkout is data: this process imports the upstream string modules and
// writes their template text. It does not run web-ide.
//
//   node --experimental-strip-types scripts/sync-vectors.mjs <web-ide-root> <vectors-root>

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { VENDORED_PROJECTS, filesForChip, licenseNotice } from './sync-vectors.logic.mjs'

const [webIdeRoot, vectorsRoot] = process.argv.slice(2)
if (!webIdeRoot || !vectorsRoot) {
  console.error('usage: node --experimental-strip-types scripts/sync-vectors.mjs <web-ide-root> <vectors-root>')
  process.exit(2)
}

for (const project of VENDORED_PROJECTS) {
  const sourceDir = path.join(webIdeRoot, 'projects', 'src', `project_${project}`)
  const outDir = path.join(vectorsRoot, project)
  mkdirSync(outDir, { recursive: true })
  const modules = readdirSync(sourceDir)
    .filter((name) => /^\d{2}_.+\.ts$/.test(name))
    .sort()
  if (modules.length === 0) throw new Error(`no chip modules in ${sourceDir}`)
  for (const fileName of modules) {
    const mod = await import(pathToFileURL(path.join(sourceDir, fileName)).href)
    const chip = filesForChip(mod)
    writeFileSync(path.join(outDir, `${chip.name}.hdl`), chip.hdl)
    writeFileSync(path.join(outDir, `${chip.name}.tst`), chip.tst)
    writeFileSync(path.join(outDir, `${chip.name}.cmp`), chip.cmp)
  }
}

mkdirSync(vectorsRoot, { recursive: true })
writeFileSync(path.join(vectorsRoot, 'LICENSE'), licenseNotice())
